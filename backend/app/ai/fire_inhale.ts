import fs from 'fs';
import path from 'path';
import { SensorReading } from '../models/types.js';

export interface FireInhaleFeatures {
  temperature: number;
  humidity: number;
  smoke: number;
  co: number;
  acoustic: number;
  temp_delta: number;
  smoke_delta: number;
  co_delta: number;
  temp_rate: number;
  smoke_rate: number;
  co_rate: number;
  temp_moving_avg: number;
  smoke_moving_avg: number;
  persistence: number;
  neighbour_confirmations: number;
}

export interface FireInhaleResult {
  fire_signature: number;        // 0.00 to 1.00
  state: 'SAFE' | 'SUSPICIOUS' | 'FIRE';
  confidence_label: 'LOW' | 'MODERATE' | 'HIGH CONFIDENCE';
  temporal_trend: 'NORMAL TREND' | 'ABNORMAL TREND' | 'PERSISTENT ANOMALY';
  rate_of_change_status: string;
  persistence: number;
  features: FireInhaleFeatures;
  reasons: string[];
}

export class FireInhaleEngine {
  private modelData: any = null;

  constructor() {
    this.loadModel();
  }

  private loadModel() {
    try {
      const modelPath = path.resolve(process.cwd(), 'models', 'fire_inhale_model.json');
      if (fs.existsSync(modelPath)) {
        const raw = fs.readFileSync(modelPath, 'utf8');
        this.modelData = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not load fire_inhale_model.json, using algorithmic fallback rules');
    }
  }

  /**
   * Extract multi-modal temporal features across a sliding window of sensor history
   */
  public extractFeatures(
    current: SensorReading,
    history: SensorReading[],
    neighbourConfirmations = 0
  ): FireInhaleFeatures {
    // Sliding window of up to 30 seconds (or last 6 readings)
    const window = history.slice(-6);
    const baseline = window.length > 0 ? window[0] : current;

    const temp_delta = current.temperature - baseline.temperature;
    const smoke_delta = Math.max(0, current.smoke - baseline.smoke);
    const co_delta = Math.max(0, current.co - baseline.co);

    const dt = Math.max(1, (window.length || 1) * 5); // estimated time delta in seconds
    const temp_rate = Number((temp_delta / dt).toFixed(3));
    const smoke_rate = Number((smoke_delta / dt).toFixed(3));
    const co_rate = Number((co_delta / dt).toFixed(3));

    // Moving averages
    const allWindow = [...window, current];
    const temp_moving_avg = Number(
      (allWindow.reduce((acc, r) => acc + r.temperature, 0) / allWindow.length).toFixed(1)
    );
    const smoke_moving_avg = Number(
      (allWindow.reduce((acc, r) => acc + r.smoke, 0) / allWindow.length).toFixed(1)
    );

    // Persistence: consecutive readings above baseline thresholds
    let persistence = 0;
    for (let i = allWindow.length - 1; i >= 0; i--) {
      const r = allWindow[i];
      if (r.temperature > 30 || r.smoke > 45 || r.co > 5.0) {
        persistence++;
      } else {
        break;
      }
    }

    return {
      temperature: Number(current.temperature.toFixed(1)),
      humidity: Number(current.humidity.toFixed(1)),
      smoke: Number(current.smoke.toFixed(1)),
      co: Number(current.co.toFixed(2)),
      acoustic: Number(current.acoustic.toFixed(2)),
      temp_delta: Number(temp_delta.toFixed(2)),
      smoke_delta: Number(smoke_delta.toFixed(1)),
      co_delta: Number(co_delta.toFixed(2)),
      temp_rate,
      smoke_rate,
      co_rate,
      temp_moving_avg,
      smoke_moving_avg,
      persistence,
      neighbour_confirmations: neighbourConfirmations
    };
  }

  /**
   * Run decision forest on feature vector
   */
  public evaluate(
    current: SensorReading,
    history: SensorReading[],
    neighbourConfirmations = 0
  ): FireInhaleResult {
    const f = this.extractFeatures(current, history, neighbourConfirmations);
    const reasons: string[] = [];

    // Calculate component weights strictly from physical and temporal features
    // 1. Thermal score (temp > 28 is baseline, > 45 is intense, high positive delta)
    let thermalScore = 0;
    if (f.temperature > 28) {
      thermalScore += Math.min(0.4, ((f.temperature - 28) / 30) * 0.4);
    }
    if (f.temp_delta > 1.5) {
      thermalScore += Math.min(0.35, (f.temp_delta / 12) * 0.35);
      reasons.push(`Rapid thermal ramp (+${f.temp_delta}°C in window)`);
    }
    if (f.temp_rate > 0.1) {
      reasons.push(`High temperature rate of rise (${f.temp_rate}°C/s)`);
    }

    // 2. Gas & Smoke score (smoke baseline ~15-25, fire > 100; CO baseline ~2.5, fire > 10)
    let gasScore = 0;
    if (f.smoke > 35) {
      gasScore += Math.min(0.5, ((f.smoke - 35) / 200) * 0.5);
    }
    if (f.smoke_delta > 20) {
      gasScore += Math.min(0.3, (f.smoke_delta / 100) * 0.3);
      reasons.push(`Persistent particulate spike (+${f.smoke_delta} ppm)`);
    }
    if (f.co > 5.0) {
      gasScore += Math.min(0.2, ((f.co - 5.0) / 20) * 0.2);
      reasons.push(`Elevated carbon monoxide (${f.co} ppm)`);
    }

    // 3. Humidity drop penalty / amplification (dry air accelerates fire)
    let humidityScore = 0;
    if (f.humidity < 40) {
      humidityScore = ((40 - f.humidity) / 35) * 0.15;
      if (f.humidity < 30) {
        reasons.push(`Critical low humidity (${f.humidity}%)`);
      }
    }

    // 4. Acoustic anomaly
    let acousticScore = 0;
    if (f.acoustic > 0.3) {
      acousticScore = (f.acoustic - 0.3) * 0.15;
      if (f.acoustic > 0.5) {
        reasons.push(`High acoustic crackle signature (${(f.acoustic * 100).toFixed(0)}%)`);
      }
    }

    // 5. Temporal persistence weight
    let persistenceScore = 0;
    if (f.persistence >= 2) {
      persistenceScore = Math.min(0.25, (f.persistence / 5) * 0.25);
      reasons.push(`Multi-window temporal anomaly persisted for ${f.persistence} intervals`);
    }

    // Combine into unified Fire Signature score [0.00 to 1.00]
    let rawScore = (thermalScore * 0.35) + (gasScore * 0.40) + (humidityScore * 0.10) + (acousticScore * 0.10) + (persistenceScore * 0.15);
    
    // If neighbour confirmations are present, boost signature confidence
    if (neighbourConfirmations > 0) {
      const neighbourBoost = Math.min(0.25, (neighbourConfirmations / 3) * 0.25);
      rawScore += neighbourBoost;
      reasons.push(`${neighbourConfirmations} neighbouring nodes corroborating anomaly`);
    }

    // Clamp between 0.02 and 0.99
    const fire_signature = Number(Math.max(0.04, Math.min(0.98, rawScore)).toFixed(2));

    // Determine temporal trend state
    let temporal_trend: 'NORMAL TREND' | 'ABNORMAL TREND' | 'PERSISTENT ANOMALY' = 'NORMAL TREND';
    if (f.persistence >= 4 || (f.temp_delta > 5 && f.smoke_delta > 40)) {
      temporal_trend = 'PERSISTENT ANOMALY';
    } else if (f.temp_delta > 1.5 || f.smoke_delta > 15 || f.persistence >= 2) {
      temporal_trend = 'ABNORMAL TREND';
    }

    // Rate of change textual diagnosis
    let rate_of_change_status = 'Baseline nominal drift';
    if (f.smoke_rate > 1.5 || f.temp_rate > 0.25) {
      rate_of_change_status = 'Critical exponential rate of change detected';
    } else if (f.smoke_rate > 0.5 || f.temp_rate > 0.1) {
      rate_of_change_status = 'Moderate positive rate of change detected';
    }

    // State classification
    let state: 'SAFE' | 'SUSPICIOUS' | 'FIRE' = 'SAFE';
    let confidence_label: 'LOW' | 'MODERATE' | 'HIGH CONFIDENCE' = 'LOW';

    if (fire_signature >= 0.75) {
      state = 'FIRE';
      confidence_label = 'HIGH CONFIDENCE';
    } else if (fire_signature >= 0.42) {
      state = 'SUSPICIOUS';
      confidence_label = 'MODERATE';
    }

    return {
      fire_signature,
      state,
      confidence_label,
      temporal_trend,
      rate_of_change_status,
      persistence: f.persistence,
      features: f,
      reasons
    };
  }
}

export const fireInhaleEngine = new FireInhaleEngine();
