import { GatewayAlert, NetworkPacket, SystemEvent, generateEventId } from '../models/types.js';
import { dbService } from '../models/db.js';

export interface AlertTriggerCallback {
  (alert: GatewayAlert): void;
}

export class GatewayService {
  private alerts: GatewayAlert[] = [];
  private onAlertTriggered?: AlertTriggerCallback;
  private minConfidenceThreshold = 0.70;
  private minNeighbourRatio = 0.5; // at least 50% neighbours confirming

  constructor(onAlert?: AlertTriggerCallback) {
    this.onAlertTriggered = onAlert;
  }

  public setCallback(cb: AlertTriggerCallback) {
    this.onAlertTriggered = cb;
  }

  public setThresholds(minConfidence: number, minNeighbourRatio: number) {
    this.minConfidenceThreshold = minConfidence;
    this.minNeighbourRatio = minNeighbourRatio;
  }

  /**
   * Process packet arriving at the Gateway
   */
  public processIncomingPacket(packet: NetworkPacket): GatewayAlert | null {
    if (packet.destination !== 'GATEWAY' || packet.status !== 'DELIVERED') {
      return null;
    }

    if (packet.type !== 'EMERGENCY ALERT' && packet.type !== 'SUSPICIOUS EVENT') {
      return null; // normal telemetry logged, not an alert
    }

    const payload = packet.payload;
    const fireSig = payload.fire_signature || 0.0;
    const hasSatellite = Boolean(payload.satellite_evidence);
    const hasGround = Boolean(payload.ground_evidence);
    const neighbourRatio = payload.neighbour_ratio || '0/0';
    const [confirmed, total] = neighbourRatio.split('/').map(Number);
    const neighbourPassing = total > 0 ? (confirmed / total) >= this.minNeighbourRatio : false;

    // Multi-factor verification rule:
    // Alert only triggers if Fire Inhale signature exceeds threshold AND (neighbour verification passes OR satellite confirms)
    const isValidWildfire = fireSig >= this.minConfidenceThreshold && (neighbourPassing || hasSatellite);

    const alertId = `ALERT-TRN-${Date.now().toString().slice(-5)}`;
    const zone = payload.zone || 'Zone C';
    const sourceNode = packet.source;
    const pathStr = packet.path.join(' → ');

    const evidenceSummary: string[] = [
      `Fire Inhale Signature: ${(fireSig * 100).toFixed(0)}%`,
      `Multi-Modal Ground Sensors: ${hasGround ? 'CRITICAL ANOMALY' : 'NORMAL'}`,
      `Satellite Thermal Anomaly: ${hasSatellite ? 'CONFIRMED' : 'UNAVAILABLE / ABSENT'}`,
      `Cooperative Verification: ${neighbourRatio} adjacent nodes corroborating`,
      `Wi-Fi HaLow Ingress Route: ${pathStr} (${packet.hop_count} hops, ${packet.latency_ms}ms latency)`
    ];

    if (payload.reasons && Array.isArray(payload.reasons)) {
      evidenceSummary.push(...payload.reasons.slice(0, 3));
    }

    const alert: GatewayAlert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      title: isValidWildfire ? `🚨 WILDFIRE CONFIRMED — ${zone}` : `⚠️ ELEVATED SIGNATURE — ${zone}`,
      zone,
      source_node: sourceNode,
      fire_signature: fireSig,
      satellite_evidence: hasSatellite,
      ground_evidence: hasGround,
      neighbour_verification: neighbourRatio,
      network_path: pathStr,
      severity: isValidWildfire ? 'CRITICAL' : 'WARNING',
      status: 'DELIVERED',
      evidence_summary: evidenceSummary
    };

    this.alerts.unshift(alert);
    dbService.recordAlert(alert);

    // Also record system event
    const event: SystemEvent = {
      id: generateEventId(),
      timestamp: new Date().toISOString(),
      type: isValidWildfire ? 'WILDFIRE_ALERT' : 'SUSPICIOUS_SIGNATURE',
      source: `GATEWAY [${sourceNode}]`,
      description: `${alert.title} via route ${pathStr}`,
      severity: isValidWildfire ? 'critical' : 'warning'
    };
    dbService.recordEvent(event);

    if (this.onAlertTriggered) {
      this.onAlertTriggered(alert);
    }

    return alert;
  }

  public getRecentAlerts(): GatewayAlert[] {
    return this.alerts;
  }

  public reset() {
    this.alerts = [];
  }
}

export const gatewayService = new GatewayService();
