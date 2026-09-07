import { NodeState, SensorReading, SystemEvent, EvidenceFusionBreakdown, GatewayAlert, generateEventId } from '../models/types.js';
import { dbService } from '../models/db.js';
import { fireInhaleEngine } from '../ai/fire_inhale.js';
import { simulatedTransport } from '../network/network_simulator.js';
import { satelliteService } from '../services/satellite.js';
import { gatewayService } from '../services/gateway.js';
import { wsManager } from '../websocket/ws_server.js';

export interface ReplayFrame {
  timestamp: string;
  step_title: string;
  phase_id: number;
  nodes: Record<string, NodeState>;
  evidence_fusion: EvidenceFusionBreakdown;
  active_alert: GatewayAlert | null;
  satellite_high_risk: boolean;
}

export class SimulationEngine {
  private nodes: Map<string, NodeState> = new Map();
  private isDemoRunning = false;
  private isPaused = false;
  private demoSpeed = 1;
  private cancelCurrentRun = false;
  private demoTimer: NodeJS.Timeout | null = null;
  private tickInterval: NodeJS.Timeout | null = null;
  private demoStepIndex = 0;
  private fireIntensity = 0; // 0 to 100
  private sensorNoise = 0.05;
  private currentEvidenceFusion: EvidenceFusionBreakdown = {
    satellite_evidence: 0.0,
    ground_evidence: 0.0,
    temporal_evidence: 0.0,
    neighbour_evidence: 0.0,
    fused_fire_signature: 0.05,
    reasons: ['Baseline environmental equilibrium.']
  };
  private replayHistory: ReplayFrame[] = [];
  private activeAlert: GatewayAlert | null = null;

  public setDemoSpeed(speed: number) {
    this.demoSpeed = Math.max(0.25, Math.min(4, speed));
    wsManager.broadcast('demo_speed', { speed: this.demoSpeed });
  }

  public getDemoSpeed(): number {
    return this.demoSpeed;
  }

  private async waitOrPause(ms: number): Promise<boolean> {
    const adjustedMs = ms / this.demoSpeed;
    const interval = 50;
    let elapsed = 0;

    while (elapsed < adjustedMs) {
      if (!this.isDemoRunning || this.cancelCurrentRun) {
        return false;
      }
      if (this.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
      elapsed += interval;
    }
    return this.isDemoRunning && !this.cancelCurrentRun;
  }

  constructor() {
    this.initializeNodes();
    this.setupNetworkCallbacks();
    this.startBackgroundTick();
  }

  private initializeNodes() {
    const rawNodes = [
      { id: 'N1', name: 'Pine Ridge Alpha', zone: 'Zone A', lat: 37.7885, lng: -122.4240, neighbours: ['N2', 'N3'] },
      { id: 'N2', name: 'Crestline Relay', zone: 'Zone A', lat: 37.7890, lng: -122.4170, neighbours: ['N1', 'N4', 'GATEWAY'] },
      { id: 'N3', name: 'Deep Valley Sentinel', zone: 'Zone C', lat: 37.7835, lng: -122.4230, neighbours: ['N1', 'N4', 'N5'] },
      { id: 'N4', name: 'Central Plateau Relay', zone: 'Zone C', lat: 37.7845, lng: -122.4160, neighbours: ['N2', 'N3', 'N6', 'GATEWAY'] },
      { id: 'N5', name: 'South Ridge Sensor', zone: 'Zone C', lat: 37.7780, lng: -122.4250, neighbours: ['N3', 'N7'] },
      { id: 'N6', name: 'East Creek Relay', zone: 'Zone B', lat: 37.7865, lng: -122.4090, neighbours: ['N4', 'N8', 'GATEWAY'] },
      { id: 'N7', name: 'Oak Foothills Node', zone: 'Zone D', lat: 37.7740, lng: -122.4180, neighbours: ['N5', 'N8'] },
      { id: 'N8', name: 'South-East Outpost', zone: 'Zone D', lat: 37.7770, lng: -122.4080, neighbours: ['N6', 'N7', 'GATEWAY'] }
    ];

    for (const n of rawNodes) {
      const initialReading: SensorReading = {
        node_id: n.id,
        timestamp: new Date().toISOString(),
        temperature: 24.2 + (Math.random() * 2 - 1),
        humidity: 62.0 + (Math.random() * 4 - 2),
        smoke: 14.5 + (Math.random() * 3 - 1.5),
        co: 2.1 + (Math.random() * 0.4 - 0.2),
        acoustic: 0.11 + Math.random() * 0.04,
        fire_signature: 0.05
      };

      const state: NodeState = {
        id: n.id,
        name: n.name,
        zone: n.zone,
        lat: n.lat,
        lng: n.lng,
        battery: Math.floor(88 + Math.random() * 11),
        status: 'SAFE',
        sampling_interval: 60, // 60s default
        adaptive_sensing_active: false,
        current_reading: initialReading,
        history: [initialReading],
        fire_signature: 0.05,
        temporal_trend: 'NORMAL TREND',
        rate_of_change_status: 'Nominal ambient trend',
        persistence_count: 0,
        neighbours: n.neighbours,
        is_failed: false
      };

      this.nodes.set(n.id, state);
      dbService.recordReading(initialReading);
    }
  }

  private setupNetworkCallbacks() {
    simulatedTransport.onPacketHop = (packet, hopIndex) => {
      wsManager.broadcast('packet_forwarded', { packet, hopIndex });
    };

    simulatedTransport.onPacketDelivered = (packet) => {
      wsManager.broadcast('packet_delivered', { packet });
      const alert = gatewayService.processIncomingPacket(packet);
      if (alert) {
        this.activeAlert = alert;
        wsManager.broadcast('alert_triggered', { alert });
      }
    };

    simulatedTransport.onPacketDropped = (packet, reason) => {
      wsManager.broadcast('packet_dropped', { packet, reason });
    };
  }

  private startBackgroundTick() {
    // Regular background telemetry ticks
    this.tickInterval = setInterval(() => {
      if (this.isPaused) return;

      const now = new Date().toISOString();
      const nodeEntries = Array.from(this.nodes.values());

      for (const node of nodeEntries) {
        if (node.is_failed) continue;

        // Apply slight physical drift
        const noise = (Math.random() - 0.5) * this.sensorNoise * 2;
        let t = node.current_reading.temperature;
        let h = node.current_reading.humidity;
        let s = node.current_reading.smoke;
        let c = node.current_reading.co;
        let a = node.current_reading.acoustic;

        // If fire intensity applies to Zone C
        if (this.fireIntensity > 0 && (node.id === 'N3' || node.id === 'N5' || node.id === 'N4')) {
          const factor = node.id === 'N3' ? 1.0 : node.id === 'N5' ? 0.7 : 0.4;
          const targetTemp = 24 + (this.fireIntensity * 0.42 * factor);
          const targetSmoke = 15 + (this.fireIntensity * 3.2 * factor);
          const targetCO = 2.0 + (this.fireIntensity * 0.22 * factor);
          const targetHum = Math.max(14, 62 - (this.fireIntensity * 0.45 * factor));
          const targetAcoustic = Math.min(0.95, 0.1 + (this.fireIntensity * 0.008 * factor));

          // Smooth gradual convergence
          t += (targetTemp - t) * 0.25 + noise;
          h += (targetHum - h) * 0.25 - noise;
          s += (targetSmoke - s) * 0.28 + noise * 5;
          c += (targetCO - c) * 0.25 + noise * 0.2;
          a += (targetAcoustic - a) * 0.25;
        } else {
          // Relax back to ambient
          t += (24.0 - t) * 0.1 + noise;
          h += (62.0 - h) * 0.1;
          s += (15.0 - s) * 0.1;
          c += (2.2 - c) * 0.1;
          a += (0.12 - a) * 0.1;
        }

        const reading: SensorReading = {
          node_id: node.id,
          timestamp: now,
          temperature: Number(t.toFixed(1)),
          humidity: Number(Math.max(5, Math.min(100, h)).toFixed(1)),
          smoke: Number(Math.max(0, s).toFixed(1)),
          co: Number(Math.max(0.1, c).toFixed(2)),
          acoustic: Number(Math.max(0, Math.min(1.0, a)).toFixed(2))
        };

        // Update history window (keep up to 15 readings)
        const updatedHistory = [...node.history.slice(-14), reading];
        node.history = updatedHistory;
        node.current_reading = reading;

        // Run Edge AI evaluation
        const evalResult = fireInhaleEngine.evaluate(reading, updatedHistory, node.id === 'N3' && this.fireIntensity > 50 ? 2 : 0);
        reading.fire_signature = evalResult.fire_signature;
        node.fire_signature = evalResult.fire_signature;
        node.temporal_trend = evalResult.temporal_trend;
        node.rate_of_change_status = evalResult.rate_of_change_status;
        node.persistence_count = evalResult.persistence;

        if (!node.is_failed) {
          if (evalResult.state === 'FIRE') {
            node.status = 'HIGH RISK';
          } else if (evalResult.state === 'SUSPICIOUS') {
            node.status = 'SUSPICIOUS';
          } else if (node.adaptive_sensing_active) {
            node.status = 'WATCH';
          } else {
            node.status = 'SAFE';
          }
        }

        dbService.recordReading(reading);
      }

      // Record snapshot into replay buffer (up to 300 frames)
      if (this.replayHistory.length > 300) {
        this.replayHistory.shift();
      }
      this.replayHistory.push(this.createReplayFrame('Live Telemetry Tick', this.demoStepIndex));

      // Broadcast periodic telemetry packet occasionally
      if (Math.random() < 0.25) {
        const randomNode = nodeEntries[Math.floor(Math.random() * nodeEntries.length)];
        if (!randomNode.is_failed) {
          const telPacket = simulatedTransport.createPacket(
            randomNode.id,
            'GATEWAY',
            'NORMAL TELEMETRY',
            'NORMAL',
            { temperature: randomNode.current_reading.temperature }
          );
          simulatedTransport.sendPacket(telPacket).catch(() => {});
        }
      }

      wsManager.broadcast('system_status', this.getSystemState());
    }, 2500);
  }

  private createReplayFrame(stepTitle: string, phaseId: number): ReplayFrame {
    const nodesObj: Record<string, NodeState> = {};
    for (const [id, n] of this.nodes) {
      nodesObj[id] = JSON.parse(JSON.stringify(n));
    }
    return {
      timestamp: new Date().toISOString(),
      step_title: stepTitle,
      phase_id: phaseId,
      nodes: nodesObj,
      evidence_fusion: { ...this.currentEvidenceFusion },
      active_alert: this.activeAlert ? { ...this.activeAlert } : null,
      satellite_high_risk: this.currentEvidenceFusion.satellite_evidence > 0.6
    };
  }

  /**
   * Complete 21-Phase Autonomous Demo
   */
  public async startDemo() {
    this.cancelCurrentRun = true;
    await new Promise((resolve) => setTimeout(resolve, 80));
    this.cancelCurrentRun = false;
    this.reset();
    this.isDemoRunning = true;
    this.isPaused = false;
    this.demoStepIndex = 1;

    const logEvent = (type: string, source: string, desc: string, severity: 'info' | 'warning' | 'critical' | 'success') => {
      const evt: SystemEvent = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        type,
        source,
        description: desc,
        severity
      };
      dbService.recordEvent(evt);
      wsManager.broadcast('event_logged', evt);
    };

    try {
      // PHASE 1: Forest is normal
      this.demoStepIndex = 1;
      logEvent('SYSTEM_START', 'TRINETRA CORE', 'Autonomous wildfire detection simulation initiated. Forest baseline nominal.', 'info');
      wsManager.broadcast('demo_phase', { phase: 1, title: 'Phase 1: Forest Normal', description: 'Baseline ambient readings in Zone C (24.2°C, 62% RH, clean air).' });
      if (!(await this.waitOrPause(3500))) return;

      // PHASE 2 & 3: Satellite thermal anomaly detected in Zone C
      this.demoStepIndex = 2;
      satelliteService.setThermalAnomaly('Zone C', true);
      this.currentEvidenceFusion.satellite_evidence = 0.88;
      this.currentEvidenceFusion.reasons = ['Satellite VIIRS detected 375m thermal anomaly (FRP 48.6 MW) in Zone C.'];
      logEvent('SATELLITE_HOTSPOT', 'VIIRS S-NPP', 'Thermal anomaly detected at lat 37.7842, lng -122.4185 (FRP 48.6 MW). Zone C risk -> HIGH.', 'warning');
      wsManager.broadcast('demo_phase', { phase: 2, title: 'Phase 2-3: Satellite Thermal Anomaly', description: 'Satellite detects thermal hotspot. Zone C elevated to HIGH RISK.' });
      wsManager.broadcast('risk_update', { zone: 'Zone C', risk: 'HIGH' });
      if (!(await this.waitOrPause(4000))) return;

      // PHASE 4: Adaptive Sensing Activated!
      this.demoStepIndex = 4;
      for (const id of ['N3', 'N4', 'N5']) {
        const node = this.nodes.get(id);
        if (node) {
          node.adaptive_sensing_active = true;
          node.sampling_interval = 5; // 60s -> 5s!
          node.status = 'WATCH';
        }
      }
      logEvent('ADAPTIVE_SENSING', 'ZONE CONTROLLER', 'Adaptive Sensing ACTIVE: Nodes N3, N4, N5 sampling frequency accelerated from 60s to 5s.', 'info');
      wsManager.broadcast('demo_phase', { phase: 4, title: 'Phase 4: Adaptive Sensing Activated', description: 'Nodes N3, N4, N5 shift sampling from 60s to 5s for rapid temporal tracking.' });
      wsManager.broadcast('system_status', this.getSystemState());
      if (!(await this.waitOrPause(3500))) return;

      // PHASE 5: Simulated wildfire begins
      this.demoStepIndex = 5;
      this.fireIntensity = 30;
      logEvent('FIRE_IGNITION', 'SIMULATOR', 'Ignition event simulated in Zone C canopy underbrush.', 'warning');
      wsManager.broadcast('demo_phase', { phase: 5, title: 'Phase 5: Wildfire Ignition', description: 'Combustion begins in Zone C. Multi-modal sensor profiles begin diverging.' });
      if (!(await this.waitOrPause(3500))) return;

      // PHASE 6-10: Sensor values ramp up (Temp rise, Humidity fall, Smoke rise, CO rise, Acoustic crackle)
      this.demoStepIndex = 6;
      this.fireIntensity = 65;
      logEvent('SENSOR_DIVERGENCE', 'NODE N3', 'Multi-modal divergence: Temp 38.4°C (+14.2°C), Smoke 142ppm, CO 8.4ppm, Acoustic 0.48.', 'warning');
      wsManager.broadcast('demo_phase', { phase: 6, title: 'Phases 6-10: Multi-Modal Sensor Ramp', description: 'Rapid temperature spike, sharp humidity drop, dense smoke & CO emission detected at Node N3.' });
      if (!(await this.waitOrPause(4000))) return;

      // PHASE 11 & 12: Fire Inhale analyses temporal sliding window -> Node becomes SUSPICIOUS
      this.demoStepIndex = 11;
      const n3 = this.nodes.get('N3')!;
      n3.status = 'SUSPICIOUS';
      n3.fire_signature = 0.58;
      n3.temporal_trend = 'ABNORMAL TREND';
      this.currentEvidenceFusion.ground_evidence = 0.65;
      this.currentEvidenceFusion.temporal_evidence = 0.72;
      this.currentEvidenceFusion.fused_fire_signature = 0.62;
      this.currentEvidenceFusion.reasons.push('Fire Inhale Edge AI: Rapid thermal ramp (+14.2°C) with persistent smoke spike.');

      logEvent('FIRE_INHALE_AI', 'NODE N3 (Edge-AI)', 'Fire Inhale feature extraction: Rapid Rate-of-Change. Status: SAFE → SUSPICIOUS (Sig: 0.58).', 'warning');
      wsManager.broadcast('demo_phase', { phase: 11, title: 'Phases 11-12: Fire Inhale AI Diagnosis', description: 'Edge-AI detects abnormal temporal persistence. Node N3 transitions SAFE → SUSPICIOUS.' });
      wsManager.broadcast('node_update', n3);
      if (!(await this.waitOrPause(4000))) return;

      // PHASE 13 & 14: Cooperative Neighbour Verification
      this.demoStepIndex = 13;
      logEvent('COOPERATIVE_VERIFICATION', 'NODE N3', 'Requesting cooperative verification from neighbours N5, N4, N6 via Wi-Fi HaLow.', 'info');
      wsManager.broadcast('demo_phase', { phase: 13, title: 'Phases 13-14: Neighbour Verification', description: 'N3 queries adjacent nodes N5, N4, N6. Responses: N5=ANOMALY, N4=ANOMALY, N6=NORMAL (2/3 Consensus).' });

      // Send simulated query packets
      const queryPacket = simulatedTransport.createPacket('N3', 'N5', 'NEIGHBOUR_QUERY', 'SUSPICIOUS', { request: 'VERIFY_THERMAL_GAS' });
      wsManager.broadcast('packet_created', { packet: queryPacket });
      simulatedTransport.sendPacket(queryPacket).catch(() => {});
      if (!(await this.waitOrPause(2500))) return;

      const verificationResult = {
        initiator: 'N3',
        queried: ['N5', 'N4', 'N6'],
        responses: [
          { node_id: 'N5', status: 'ANOMALY', fire_sig: 0.62, detail: 'Smoke 98ppm (+45ppm delta)' },
          { node_id: 'N4', status: 'ANOMALY', fire_sig: 0.44, detail: 'Thermal gradient +3.8°C' },
          { node_id: 'N6', status: 'NORMAL', fire_sig: 0.08, detail: 'Baseline ambient' }
        ],
        consensus: '2/3 CONFIRMED (66.7%)'
      };
      this.currentEvidenceFusion.neighbour_evidence = 0.85;
      this.currentEvidenceFusion.reasons.push('Cooperative verification: 2 of 3 adjacent sensor nodes independently confirm anomaly.');
      logEvent('CONSENSUS_REACHED', 'COOPERATIVE MESH', 'Neighbour Consensus 2/3: N5 (ANOMALY), N4 (ANOMALY), N6 (NORMAL).', 'success');
      wsManager.broadcast('neighbour_verification', verificationResult);
      if (!(await this.waitOrPause(3500))) return;

      // PHASE 15 & 16: Multi-Source Evidence Fusion -> HIGH CONFIDENCE (0.91)
      this.demoStepIndex = 15;
      this.fireIntensity = 95;
      n3.status = 'HIGH RISK';
      n3.fire_signature = 0.91;
      n3.temporal_trend = 'PERSISTENT ANOMALY';

      this.currentEvidenceFusion.satellite_evidence = 0.92;
      this.currentEvidenceFusion.ground_evidence = 0.94;
      this.currentEvidenceFusion.temporal_evidence = 0.96;
      this.currentEvidenceFusion.neighbour_evidence = 0.88;
      this.currentEvidenceFusion.fused_fire_signature = 0.91;
      this.currentEvidenceFusion.disagreement_scenario = 'MULTI_SOURCE_CONSENSUS';
      this.currentEvidenceFusion.reasons = [
        '✓ Rapid multi-modal temperature rate (+0.38°C/s)',
        '✓ Persistent smoke and carbon monoxide ramp',
        '✓ Acoustic crackle signature spike (0.76)',
        '✓ 2/3 neighbouring sensor nodes corroborated signature',
        '✓ Satellite VIIRS thermal anomaly co-located in Zone C'
      ];

      logEvent('EVIDENCE_FUSED', 'TRINETRA FUSION', 'Multi-Source Fusion Complete: Fire Signature elevated to HIGH CONFIDENCE (0.91).', 'critical');
      wsManager.broadcast('demo_phase', { phase: 15, title: 'Phases 15-16: Multi-Source Evidence Fusion', description: 'Satellite + Ground Sensors + Temporal Analytics + Neighbour Consensus fused into 0.91 High-Confidence Signature.' });
      wsManager.broadcast('evidence_fusion', this.currentEvidenceFusion);
      wsManager.broadcast('node_update', n3);
      if (!(await this.waitOrPause(3500))) return;

      // PHASE 17 & 18: Emergency Packet Created & Multi-Hop Transmission
      this.demoStepIndex = 17;
      logEvent('PACKET_CREATED', 'NODE N3', 'Emergency packet TRN-FIRE-0017 created. Priority: HIGH. Route: N3 → N4 → GATEWAY.', 'critical');
      wsManager.broadcast('demo_phase', { phase: 17, title: 'Phases 17-18: Multi-Hop HaLow Transmission', description: 'Priority Emergency Packet TRN-FIRE-0017 hops through mesh: N3 → N4 → GATEWAY.' });

      const emergencyPacket = simulatedTransport.createPacket(
        'N3',
        'GATEWAY',
        'EMERGENCY ALERT',
        'EMERGENCY',
        {
          zone: 'Zone C',
          fire_signature: 0.91,
          satellite_evidence: true,
          ground_evidence: true,
          neighbour_ratio: '2/3',
          reasons: this.currentEvidenceFusion.reasons
        }
      );
      wsManager.broadcast('packet_created', { packet: emergencyPacket });

      // Transmit visibly across HaLow sub-GHz mesh hops
      await simulatedTransport.sendPacket(emergencyPacket);
      if (!(await this.waitOrPause(2500))) return;

      // PHASE 19 & 20: Gateway receives packet -> Triggers RED ALERT
      this.demoStepIndex = 19;
      logEvent('ALERT_DISPATCHED', 'GATEWAY', '🚨 WILDFIRE CONFIRMED in ZONE C! Red Screen Alert, command sirens & responder dispatch triggered.', 'critical');
      wsManager.broadcast('demo_phase', { phase: 19, title: 'Phases 19-20: Gateway Red Alert Triggered', description: 'Gateway verifies all criteria. Full emergency alert dispatched with visual sirens and audible cue.' });
      if (!(await this.waitOrPause(4000))) return;

      // PHASE 21: Continuous Monitoring
      this.demoStepIndex = 21;
      logEvent('CONTINUOUS_MONITORING', 'COMMAND CENTER', 'System entering continuous monitoring mode. Tracking containment perimeter.', 'info');
      wsManager.broadcast('demo_phase', { phase: 21, title: 'Phase 21: Continuous Operational Monitoring', description: 'System remains active, tracking thermal containment and mesh telemetry.' });
    } catch (err) {
      console.error('Demo error:', err);
    } finally {
      this.isDemoRunning = false;
    }
  }

  /**
   * Run the COOPERATE step specifically with full visual hops and comfort
   */
  public async runCooperateStep() {
    this.cancelCurrentRun = true;
    await new Promise((resolve) => setTimeout(resolve, 80));
    this.cancelCurrentRun = false;
    this.isDemoRunning = true;
    this.isPaused = false;
    this.demoStepIndex = 17;

    // Ensure Zone C and N3 are in anomaly state for realistic cooperation
    this.fireIntensity = 95;
    satelliteService.setThermalAnomaly('Zone C', true);
    const n3 = this.nodes.get('N3')!;
    n3.status = 'HIGH RISK';
    n3.fire_signature = 0.91;
    n3.temporal_trend = 'PERSISTENT ANOMALY';
    n3.adaptive_sensing_active = true;
    n3.current_reading = {
      ...n3.current_reading,
      temperature: 46.2,
      humidity: 18.0,
      smoke: 175,
      co: 14.2,
      fire_signature: 0.91
    };

    this.currentEvidenceFusion = {
      satellite_evidence: 0.92,
      ground_evidence: 0.94,
      temporal_evidence: 0.96,
      neighbour_evidence: 0.88,
      fused_fire_signature: 0.91,
      disagreement_scenario: 'MULTI_SOURCE_CONSENSUS',
      reasons: [
        '✓ Rapid multi-modal temperature rate (+0.38°C/s)',
        '✓ Persistent smoke and carbon monoxide ramp',
        '✓ Acoustic crackle signature spike (0.76)',
        '✓ 2/3 neighbouring sensor nodes corroborated signature',
        '✓ Satellite VIIRS thermal anomaly co-located in Zone C'
      ]
    };

    const evt: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'PACKET_CREATED',
      source: 'NODE N3',
      description: 'Emergency packet TRN-FIRE-0017 created. Priority: HIGH. Route: N3 → N4 → GATEWAY.',
      severity: 'critical'
    };
    dbService.recordEvent(evt);
    wsManager.broadcast('event_logged', evt);
    wsManager.broadcast('risk_update', { zone: 'Zone C', risk: 'HIGH' });
    wsManager.broadcast('evidence_fusion', this.currentEvidenceFusion);
    wsManager.broadcast('node_update', n3);

    wsManager.broadcast('demo_phase', {
      phase: 17,
      title: 'Phases 17-18: Multi-Hop HaLow Transmission',
      description: 'Priority Emergency Packet TRN-FIRE-0017 hops through mesh: N3 → N4 → GATEWAY.'
    });

    const emergencyPacket = simulatedTransport.createPacket(
      'N3',
      'GATEWAY',
      'EMERGENCY ALERT',
      'EMERGENCY',
      {
        zone: 'Zone C',
        fire_signature: 0.91,
        satellite_evidence: true,
        ground_evidence: true,
        neighbour_ratio: '2/3',
        reasons: this.currentEvidenceFusion.reasons
      }
    );
    wsManager.broadcast('packet_created', { packet: emergencyPacket });

    // Transmit visibly across HaLow mesh
    await simulatedTransport.sendPacket(emergencyPacket);

    this.isDemoRunning = false;
    return { success: true, packet: emergencyPacket };
  }

  /**
   * Jump directly to any of the 7 macro stages
   */
  public async jumpToStage(stageKey: string | number) {
    this.cancelCurrentRun = true;
    await new Promise((resolve) => setTimeout(resolve, 80));
    this.cancelCurrentRun = false;
    this.isPaused = false;

    const key = String(stageKey).toUpperCase();

    if (key === 'COOPERATE' || key === '17' || key === '18') {
      return this.runCooperateStep();
    }

    if (key === 'SEE' || key === '1' || key === '2') {
      this.reset();
      this.demoStepIndex = 2;
      satelliteService.setThermalAnomaly('Zone C', true);
      this.currentEvidenceFusion.satellite_evidence = 0.88;
      this.currentEvidenceFusion.reasons = ['Satellite VIIRS detected 375m thermal anomaly (FRP 48.6 MW) in Zone C.'];
      wsManager.broadcast('demo_phase', { phase: 2, title: 'Phase 2-3: Satellite Thermal Anomaly', description: 'Satellite detects thermal hotspot. Zone C elevated to HIGH RISK.' });
      wsManager.broadcast('risk_update', { zone: 'Zone C', risk: 'HIGH' });
      return { success: true, stage: 'SEE' };
    }

    if (key === 'FOCUS' || key === '3') {
      this.demoStepIndex = 3;
      satelliteService.setThermalAnomaly('Zone C', true);
      this.currentEvidenceFusion.satellite_evidence = 0.88;
      wsManager.broadcast('demo_phase', { phase: 3, title: 'Phase 3: High Risk Zone Targeted', description: 'Satellite confirms hotspot in Zone C. Area prioritized for ground sensor checks.' });
      wsManager.broadcast('risk_update', { zone: 'Zone C', risk: 'HIGH' });
      return { success: true, stage: 'FOCUS' };
    }

    if (key === 'SENSE' || key === '4' || key === '5') {
      this.demoStepIndex = 4;
      for (const id of ['N3', 'N4', 'N5']) {
        const node = this.nodes.get(id);
        if (node) {
          node.adaptive_sensing_active = true;
          node.sampling_interval = 5;
          node.status = 'WATCH';
        }
      }
      this.fireIntensity = 35;
      wsManager.broadcast('demo_phase', { phase: 4, title: 'Phase 4: Adaptive Sensing Activated', description: 'Nodes N3, N4, N5 shift sampling from 60s to 5s for rapid temporal tracking.' });
      wsManager.broadcast('system_status', this.getSystemState());
      return { success: true, stage: 'SENSE' };
    }

    if (key === 'INHALE' || key === '6' || key === '11' || key === '12') {
      this.demoStepIndex = 11;
      this.fireIntensity = 65;
      const n3 = this.nodes.get('N3')!;
      n3.status = 'SUSPICIOUS';
      n3.fire_signature = 0.58;
      n3.temporal_trend = 'ABNORMAL TREND';
      this.currentEvidenceFusion.ground_evidence = 0.65;
      this.currentEvidenceFusion.temporal_evidence = 0.72;
      this.currentEvidenceFusion.fused_fire_signature = 0.62;
      wsManager.broadcast('demo_phase', { phase: 11, title: 'Phases 11-12: Fire Inhale AI Diagnosis', description: 'Edge-AI detects abnormal temporal persistence. Node N3 transitions SAFE → SUSPICIOUS.' });
      wsManager.broadcast('node_update', n3);
      wsManager.broadcast('evidence_fusion', this.currentEvidenceFusion);
      return { success: true, stage: 'INHALE' };
    }

    if (key === 'VERIFY' || key === '13' || key === '14') {
      this.demoStepIndex = 13;
      const verificationResult = {
        initiator: 'N3',
        queried: ['N5', 'N4', 'N6'],
        responses: [
          { node_id: 'N5', status: 'ANOMALY', fire_sig: 0.62, detail: 'Smoke 98ppm (+45ppm delta)' },
          { node_id: 'N4', status: 'ANOMALY', fire_sig: 0.44, detail: 'Thermal gradient +3.8°C' },
          { node_id: 'N6', status: 'NORMAL', fire_sig: 0.08, detail: 'Baseline ambient' }
        ],
        consensus: '2/3 CONFIRMED (66.7%)'
      };
      this.currentEvidenceFusion.neighbour_evidence = 0.85;
      wsManager.broadcast('demo_phase', { phase: 13, title: 'Phases 13-14: Neighbour Verification', description: 'N3 queries adjacent nodes N5, N4, N6. Responses: N5=ANOMALY, N4=ANOMALY, N6=NORMAL (2/3 Consensus).' });
      wsManager.broadcast('neighbour_verification', verificationResult);
      wsManager.broadcast('evidence_fusion', this.currentEvidenceFusion);
      return { success: true, stage: 'VERIFY' };
    }

    if (key === 'WARN' || key === '19' || key === '20') {
      this.demoStepIndex = 19;
      const alert: GatewayAlert = {
        id: `ALERT-${Date.now()}`,
        timestamp: new Date().toISOString(),
        zone: 'Zone C',
        source_node: 'N3',
        fire_signature: 0.91,
        title: 'WILDFIRE SIGNATURE CONFIRMED IN ZONE C',
        evidence_summary: [
          'High thermal divergence (+18.4°C over baseline)',
          'Persistent smoke & carbon monoxide spike',
          'Cooperative consensus: 2/3 neighbours confirmed anomaly',
          'Satellite VIIRS FRP thermal hotspot co-located'
        ],
        satellite_evidence: true,
        ground_evidence: true,
        neighbour_verification: '2/3 NODES CONFIRMED',
        network_path: 'N3 → N4 → GATEWAY (115ms)',
        severity: 'CRITICAL',
        status: 'DELIVERED'
      };
      this.activeAlert = alert;
      wsManager.broadcast('alert_triggered', { alert });
      wsManager.broadcast('demo_phase', { phase: 19, title: 'Phases 19-20: Gateway Red Alert Triggered', description: 'Gateway verifies all criteria. Full emergency alert dispatched with visual sirens and audible cue.' });
      return { success: true, stage: 'WARN' };
    }

    return { success: false, message: `Unknown stage: ${stageKey}` };
  }

  public triggerFire(intensity = 85) {
    this.fireIntensity = intensity;
    const n3 = this.nodes.get('N3');
    if (n3) {
      n3.status = intensity > 70 ? 'HIGH RISK' : 'SUSPICIOUS';
      n3.fire_signature = Number((intensity / 100).toFixed(2));
    }
    const evt: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'MANUAL_FIRE_TRIGGER',
      source: 'OPERATOR',
      description: `Manual fire injection in Zone C (Intensity: ${intensity}%).`,
      severity: 'warning'
    };
    dbService.recordEvent(evt);
    wsManager.broadcast('event_logged', evt);
    wsManager.broadcast('system_status', this.getSystemState());
  }

  public failNode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const newStatus = !node.is_failed;
    node.is_failed = newStatus;
    node.status = newStatus ? 'OFFLINE' : 'SAFE';
    simulatedTransport.setNodeActive(nodeId, !newStatus);

    const desc = newStatus
      ? `Node ${nodeId} (${node.name}) failed/damaged! Network topology self-healing in progress.`
      : `Node ${nodeId} (${node.name}) brought back ONLINE. Mesh route restored.`;

    const evt: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: newStatus ? 'NODE_FAILURE' : 'NODE_RECOVERED',
      source: `NODE ${nodeId}`,
      description: desc,
      severity: newStatus ? 'critical' : 'success'
    };
    dbService.recordEvent(evt);
    wsManager.broadcast('event_logged', evt);
    wsManager.broadcast('node_update', node);
    wsManager.broadcast('system_status', this.getSystemState());
  }

  public toggleInternet() {
    const active = !simulatedTransport.isInternetActive();
    simulatedTransport.setInternetActive(active);

    const evt: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: active ? 'INTERNET_RESTORED' : 'INTERNET_FAILURE',
      source: 'GATEWAY UPLINK',
      description: active
        ? 'Cloud uplink restored. Edge database synced to cloud.'
        : 'Internet offline! Local Wi-Fi HaLow mesh & Gateway continue autonomous local operation.',
      severity: active ? 'success' : 'warning'
    };
    dbService.recordEvent(evt);
    wsManager.broadcast('event_logged', evt);
    wsManager.broadcast('system_status', this.getSystemState());
  }

  public toggleSatelliteHotspot() {
    const current = this.currentEvidenceFusion.satellite_evidence > 0.5;
    satelliteService.setThermalAnomaly('Zone C', !current);
    this.currentEvidenceFusion.satellite_evidence = !current ? 0.90 : 0.05;

    const evt: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'SATELLITE_OVERRIDE',
      source: 'OPERATOR',
      description: !current ? 'Satellite hotspot injected over Zone C.' : 'Satellite hotspot cleared.',
      severity: 'info'
    };
    dbService.recordEvent(evt);
    wsManager.broadcast('event_logged', evt);
    wsManager.broadcast('system_status', this.getSystemState());
  }

  public triggerScenario(scenario: 'A' | 'B' | 'C') {
    this.reset();
    const log = (desc: string, sev: 'info' | 'warning' | 'critical') => {
      const evt: SystemEvent = {
        id: generateEventId(),
        timestamp: new Date().toISOString(),
        type: `SCENARIO_${scenario}`,
        source: 'SCENARIO_ENGINE',
        description: desc,
        severity: sev
      };
      dbService.recordEvent(evt);
      wsManager.broadcast('event_logged', evt);
    };

    if (scenario === 'A') {
      // Satellite HIGH RISK, Ground NORMAL
      satelliteService.setThermalAnomaly('Zone C', true);
      this.currentEvidenceFusion = {
        satellite_evidence: 0.91,
        ground_evidence: 0.12,
        temporal_evidence: 0.08,
        neighbour_evidence: 0.05,
        fused_fire_signature: 0.35,
        disagreement_scenario: 'SATELLITE_GROUND_DISAGREEMENT',
        reasons: [
          '⚠️ SATELLITE-GROUND DISAGREEMENT DETECTED',
          'Satellite VIIRS reports thermal anomaly, but ground sensors report nominal ambient readings.',
          'Action: Local sensing frequency accelerated. Awaiting cooperative verification. Fire NOT immediately declared.'
        ]
      };
      log('Scenario A: Satellite HIGH RISK, Ground NORMAL -> System refuses to declare fire without corroborating ground proof.', 'warning');
    } else if (scenario === 'B') {
      // Satellite NO HOTSPOT, Ground HIGH FIRE SIGNATURE
      satelliteService.setThermalAnomaly('Zone C', false);
      const n3 = this.nodes.get('N3')!;
      n3.status = 'SUSPICIOUS';
      n3.fire_signature = 0.78;
      this.currentEvidenceFusion = {
        satellite_evidence: 0.05,
        ground_evidence: 0.88,
        temporal_evidence: 0.85,
        neighbour_evidence: 0.65,
        fused_fire_signature: 0.74,
        disagreement_scenario: 'GROUND_ONLY_ANOMALY',
        reasons: [
          '⚠️ GROUND-ONLY ANOMALY DETECTED (CANOPY OBSCURATION)',
          'Ground sensors detect severe temporal thermal & smoke divergence under dense forest canopy.',
          'Satellite orbital pass not yet aligned or obstructed by clouds. System continues local verification.'
        ]
      };
      log('Scenario B: Ground-only anomaly detected under dense forest canopy. System continues local verification.', 'warning');
    } else {
      // Scenario C: Multi-Source Consensus (Fire Confirmed)
      satelliteService.setThermalAnomaly('Zone C', true);
      const n3 = this.nodes.get('N3')!;
      n3.status = 'HIGH RISK';
      n3.fire_signature = 0.93;
      this.currentEvidenceFusion = {
        satellite_evidence: 0.92,
        ground_evidence: 0.95,
        temporal_evidence: 0.94,
        neighbour_evidence: 0.89,
        fused_fire_signature: 0.93,
        disagreement_scenario: 'MULTI_SOURCE_CONSENSUS',
        reasons: [
          '🚨 MULTI-SOURCE CONSENSUS CONFIRMED',
          'Satellite thermal detection matches ground multi-modal sensor ramp.',
          '2/3 neighbouring nodes confirmed anomaly across HaLow mesh. Red Alert Triggered!'
        ]
      };
      log('Scenario C: Multi-source consensus verified. Fire confirmed.', 'critical');
    }

    wsManager.broadcast('evidence_fusion', this.currentEvidenceFusion);
    wsManager.broadcast('system_status', this.getSystemState());
  }

  public ingestHardwareSensorData(nodeId: string, data: Partial<SensorReading>): SensorReading | null {
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const reading: SensorReading = {
      node_id: nodeId,
      timestamp: data.timestamp || new Date().toISOString(),
      temperature: data.temperature ?? node.current_reading.temperature,
      humidity: data.humidity ?? node.current_reading.humidity,
      smoke: data.smoke ?? node.current_reading.smoke,
      co: data.co ?? node.current_reading.co,
      acoustic: data.acoustic ?? node.current_reading.acoustic
    };

    node.history = [...node.history.slice(-14), reading];
    node.current_reading = reading;

    const evalResult = fireInhaleEngine.evaluate(reading, node.history);
    reading.fire_signature = evalResult.fire_signature;
    node.fire_signature = evalResult.fire_signature;
    node.temporal_trend = evalResult.temporal_trend;
    node.rate_of_change_status = evalResult.rate_of_change_status;
    node.persistence_count = evalResult.persistence;

    dbService.recordReading(reading);
    wsManager.broadcast('sensor_update', { node_id: nodeId, reading, evalResult });

    return reading;
  }

  public reset() {
    this.isDemoRunning = false;
    this.isPaused = false;
    this.demoStepIndex = 0;
    this.fireIntensity = 0;
    this.activeAlert = null;
    satelliteService.reset();
    simulatedTransport.reset();
    gatewayService.reset();
    this.currentEvidenceFusion = {
      satellite_evidence: 0.05,
      ground_evidence: 0.08,
      temporal_evidence: 0.05,
      neighbour_evidence: 0.02,
      fused_fire_signature: 0.05,
      disagreement_scenario: 'NONE',
      reasons: ['Baseline nominal equilibrium across all forest zones.']
    };
    this.initializeNodes();

    const evt: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'SIMULATION_RESET',
      source: 'COMMAND CENTER',
      description: 'System reset to pristine baseline state. All sensor nodes set to SAFE.',
      severity: 'info'
    };
    dbService.recordEvent(evt);
    wsManager.broadcast('system_reset', {});
  }

  public pauseDemo() {
    this.isPaused = true;
    wsManager.broadcast('demo_state_change', { isPaused: true });
  }

  public resumeDemo() {
    this.isPaused = false;
    wsManager.broadcast('demo_state_change', { isPaused: false });
  }

  public getSystemState() {
    return {
      nodes: Array.from(this.nodes.values()),
      evidence_fusion: this.currentEvidenceFusion,
      active_alert: this.activeAlert,
      network_metrics: simulatedTransport.getMetrics(),
      is_demo_running: this.isDemoRunning,
      is_paused: this.isPaused,
      demo_step_index: this.demoStepIndex,
      fire_intensity: this.fireIntensity
    };
  }

  public getNodes(): NodeState[] {
    return Array.from(this.nodes.values());
  }

  public getNode(id: string): NodeState | undefined {
    return this.nodes.get(id);
  }

  public getReplayHistory(): ReplayFrame[] {
    return this.replayHistory;
  }
}

export const simulationEngine = new SimulationEngine();
