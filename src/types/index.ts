export type NodeStatus = 'SAFE' | 'WATCH' | 'SUSPICIOUS' | 'HIGH RISK' | 'OFFLINE' | 'RELAY';

export interface SensorReading {
  node_id: string;
  timestamp: string;
  temperature: number;
  humidity: number;
  smoke: number;
  co: number;
  acoustic: number;
  fire_signature?: number;
}

export interface NodeState {
  id: string;
  name: string;
  zone: string;
  lat: number;
  lng: number;
  battery: number;
  status: NodeStatus;
  sampling_interval: number;
  adaptive_sensing_active: boolean;
  current_reading: SensorReading;
  history: SensorReading[];
  fire_signature: number;
  temporal_trend: 'NORMAL TREND' | 'ABNORMAL TREND' | 'PERSISTENT ANOMALY';
  rate_of_change_status: string;
  persistence_count: number;
  neighbours: string[];
  last_packet_id?: string;
  is_failed?: boolean;
}

export interface SatelliteHotspot {
  id: string;
  zone: string;
  lat: number;
  lng: number;
  confidence: number;
  source: string;
  detection_time: string;
  brightness_temp_k: number;
  frp_mw: number;
  risk_level: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface NetworkPacket {
  id: string;
  timestamp: string;
  source: string;
  destination: string;
  type: 'NORMAL TELEMETRY' | 'SUSPICIOUS EVENT' | 'EMERGENCY ALERT' | 'NEIGHBOUR_QUERY' | 'NEIGHBOUR_REPLY';
  priority: 'NORMAL' | 'SUSPICIOUS' | 'EMERGENCY';
  hop_count: number;
  path: string[];
  current_hop_index: number;
  status: 'QUEUED' | 'TRANSMITTING' | 'DELIVERED' | 'DROPPED' | 'REROUTED';
  payload: Record<string, any>;
  latency_ms: number;
  size_bytes: number;
}

export interface EvidenceFusionBreakdown {
  satellite_evidence: number;
  ground_evidence: number;
  temporal_evidence: number;
  neighbour_evidence: number;
  fused_fire_signature: number;
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
  neighbour_verification: string;
  network_path: string;
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

export interface DemoPhaseInfo {
  phase: number;
  title: string;
  description: string;
}
