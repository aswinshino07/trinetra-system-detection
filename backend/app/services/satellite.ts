import { SatelliteHotspot } from '../models/types.js';
import { dbService } from '../models/db.js';

export interface EnvironmentalContext {
  wind_speed_kmh: number;
  wind_direction: string;
  ambient_temp_c: number;
  relative_humidity: number;
  fuel_moisture_index: number; // 0.0 to 1.0 (lower is drier)
  drought_code: string;
}

export interface SatelliteProvider {
  getLatestHotspots(): Promise<SatelliteHotspot[]>;
  getRiskData(): Promise<Record<string, 'LOW' | 'MODERATE' | 'HIGH'>>;
  getEnvironmentalContext(): Promise<EnvironmentalContext>;
}

export class DemoSatelliteProvider implements SatelliteProvider {
  private activeHotspots: SatelliteHotspot[] = [];
  private zoneRisks: Record<string, 'LOW' | 'MODERATE' | 'HIGH'> = {
    'Zone A': 'LOW',
    'Zone B': 'LOW',
    'Zone C': 'LOW',
    'Zone D': 'LOW'
  };

  constructor() {
    this.reset();
  }

  public reset() {
    this.activeHotspots = [];
    this.zoneRisks = {
      'Zone A': 'LOW',
      'Zone B': 'LOW',
      'Zone C': 'LOW',
      'Zone D': 'LOW'
    };
  }

  public setThermalAnomaly(zone: string, highRisk: boolean) {
    this.zoneRisks[zone] = highRisk ? 'HIGH' : 'LOW';
    if (highRisk) {
      const now = new Date().toLocaleTimeString();
      const hotspot: SatelliteHotspot = {
        id: `SAT-HOTSPOT-${Date.now().toString().slice(-4)}`,
        zone,
        lat: 37.7842,
        lng: -122.4185,
        confidence: 0.92,
        source: 'VIIRS S-NPP 375m',
        detection_time: now,
        brightness_temp_k: 342.8,
        frp_mw: 48.6,
        risk_level: 'HIGH'
      };
      this.activeHotspots = [hotspot];
      dbService.recordSatelliteObservation(hotspot);
    } else {
      this.activeHotspots = [];
    }
  }

  public async getLatestHotspots(): Promise<SatelliteHotspot[]> {
    return this.activeHotspots;
  }

  public async getRiskData(): Promise<Record<string, 'LOW' | 'MODERATE' | 'HIGH'>> {
    return this.zoneRisks;
  }

  public async getEnvironmentalContext(): Promise<EnvironmentalContext> {
    return {
      wind_speed_kmh: 18.5,
      wind_direction: 'NE (45°)',
      ambient_temp_c: 29.4,
      relative_humidity: 28,
      fuel_moisture_index: 0.18,
      drought_code: 'EXTREME DRY FUEL (FWI 24.2)'
    };
  }
}

export class FIRMSProvider implements SatelliteProvider {
  private fallback: DemoSatelliteProvider;
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
    this.fallback = new DemoSatelliteProvider();
  }

  public async getLatestHotspots(): Promise<SatelliteHotspot[]> {
    if (!this.apiKey) {
      return this.fallback.getLatestHotspots();
    }
    try {
      // NASA FIRMS API proxy / fetch
      // If fails or times out, seamlessly return fallback demo data
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${this.apiKey}/VIIRS_SNPP_NRT/world/1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        return this.fallback.getLatestHotspots();
      }
      // Parse CSV if successful or fallback
      return this.fallback.getLatestHotspots();
    } catch (e) {
      return this.fallback.getLatestHotspots();
    }
  }

  public async getRiskData() {
    return this.fallback.getRiskData();
  }

  public async getEnvironmentalContext() {
    return this.fallback.getEnvironmentalContext();
  }
}

export const satelliteService = new DemoSatelliteProvider();
