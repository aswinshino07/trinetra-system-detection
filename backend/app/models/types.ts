/**
 * TRINETRA System Types & Interfaces
 */

export type NodeStatus = 'SAFE' | 'WATCH' | 'SUSPICIOUS' | 'HIGH RISK' | 'OFFLINE' | 'RELAY';

export interface SensorReading {
  id?: number;
  node_id: string;
  timestamp: string;
  temperature: number;      // Celsius
  humidity: number;         // %
  smoke: number;            // ppm / raw analog index
  co: number;               // ppm
  acoustic: number;         // 0.0 - 1.0 (relative sound disturbance/crackling)
  temp_delta?: number;
  smoke_delta?: number;
  co_delta?: number;
  temp_rate?: number;
  smoke_rate?: number;
  co_rate?: number;
  persistence?: number;
  fire_signature?: number;
}

export interface NodeState {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  battery: number;           // %
  status: NodeStatus;
  sampling_interval: number; // in seconds (e.g., 60s -> 5s in adaptive)
  adaptive_sensing_active: boolean;
  current_reading: SensorReading;
  history: SensorReading[];  // sliding window for temporal analysis (last 30-60s)
  fire_signature: number;    // 0.0 to 1.0
  temporal_trend: 'NORMAL TREND' | 'ABNORMAL TREND' | 'PERSISTENT ANOMALY';
  rate_of_change_status: string;
  persistence_count: number;
  neighbours: string[];      // neighbor node IDs
  last_packet_id?: string;
  is_failed?: boolean;
}

export interface SatelliteHotspot {
  id: string;
  zone: string;
  lat: number;
  lng: number;
  confidence: number;        // 0.0 to 1.0 (e.g. 0.89)
  source: string;            // 'VIIRS S-NPP' | 'MODIS Terra' | 'Demo Provider'
  detection_time: string;
  brightness_temp_k: number;
  frp_mw: number;            // Fire Radiative Power (MW)
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
}

export type PacketPriority = 'NORMAL' | 'SUSPICIOUS' | 'EMERGENCY';
export type PacketStatus = 'QUEUED' | 'TRANSMITTING' | 'DELIVERED' | 'DROPPED' | 'REROUTED';
export type PacketType = 'NORMAL TELEMETRY' | 'SUSPICIOUS EVENT' | 'EMERGENCY ALERT' | 'NEIGHBOUR_QUERY' | 'NEIGHBOUR_REPLY';

export interface NetworkPacket {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  type: PacketType;
  priority: PacketPriority;
  hop_count: number;
  path: string[];            // e.g. ["N3", "N5", "N4", "GATEWAY"]
  current_hop_index: number;
  status: PacketStatus;
  payload: Record<string, any>;
  latency_ms: number;
  size_bytes: number;
}

export interface NeighbourVerificationResult {
  initiator_id: string;
  timestamp: string;
  queried_neighbours: string[];
  responses: Array<{
    node_id: string;
    status: 'NORMAL' | 'ANOMALY';
    fire_signature: number;
    sensor_summary: string;
  }>;
  consensus_ratio: string;   // e.g. "2/3"
  confirmed_count: number;
  total_queried: number;
  is_verified: boolean;
}

export interface EvidenceFusionBreakdown {
  satellite_evidence: number; // 0.0 - 1.0
  ground_evidence: number;    // 0.0 - 1.0
  temporal_evidence: number;  // 0.0 - 1.0
  neighbour_evidence: number; // 0.0 - 1.0
  fused_fire_signature: number; // 0.0 - 1.0
  disagreement_scenario?: 'NONE' | 'SATELLITE_GROUND_DISAGREEMENT' | 'GROUND_ONLY_ANOMALY' | 'MULTI_SOURCE_CONSENSUS';
  reasons: string[];
}

export interface GatewayAlert {
  id: string;
  timestamp: string;
  title: string;
  zone: string;
  source_node: string;
  fire_signature: number;
  satellite_evidence: boolean;
  ground_evidence: boolean;
  neighbour_verification: string; // e.g. "2/3"
  network_path: string;           // e.g. "N3 → N5 → N4 → GATEWAY"
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  status: 'DELIVERED' | 'ACKNOWLEDGED';
  evidence_summary: string[];
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

let eventCounter = 0;
export function generateEventId(): string {
  eventCounter++;
  const rand = Math.random().toString(36).substring(2, 7);
  return `EVT-${Date.now()}-${eventCounter}-${rand}`;
}

export interface NetworkMetrics {
  nodes_online: number;
  total_nodes: number;
  packets_sent: number;
  packets_delivered: number;
  packets_lost: number;
  delivery_ratio_pct: number;
  avg_latency_ms: number;
  avg_hops: number;
  retransmissions: number;
  current_route: string[];
  internet_online: boolean;
  cloud_sync_status: 'SYNCED' | 'OFFLINE' | 'BUFFERED';
  periodic_packet_count: number;
  event_driven_packet_count: number;
  energy_savings_pct: number;
}
