import { useEffect, useState, useRef, useCallback } from 'react';
import {
  NodeState,
  SatelliteHotspot,
  NetworkPacket,
  EvidenceFusionBreakdown,
  GatewayAlert,
  SystemEvent,
  NetworkMetrics,
  DemoPhaseInfo
} from '../types';
import { api } from '../services/api';
import { soundFx } from '../utils/audio';

export function useTrinetraStream() {
  const [nodes, setNodes] = useState<NodeState[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('N3');
  const [activePackets, setActivePackets] = useState<NetworkPacket[]>([]);
  const [activeAlert, setActiveAlert] = useState<GatewayAlert | null>(null);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [evidenceFusion, setEvidenceFusion] = useState<EvidenceFusionBreakdown>({
    satellite_evidence: 0.05,
    ground_evidence: 0.08,
    temporal_evidence: 0.05,
    neighbour_evidence: 0.02,
    fused_fire_signature: 0.05,
    reasons: ['Baseline environmental equilibrium across all forest zones.']
  });
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics | null>(null);
  const [hotspots, setHotspots] = useState<SatelliteHotspot[]>([]);
  const [zoneRisks, setZoneRisks] = useState<Record<string, 'LOW' | 'MODERATE' | 'HIGH'>>({
    'Zone A': 'LOW',
    'Zone B': 'LOW',
    'Zone C': 'LOW',
    'Zone D': 'LOW'
  });
  const [currentPhase, setCurrentPhase] = useState<DemoPhaseInfo>({
    phase: 1,
    title: 'Phase 1: Forest Normal',
    description: 'System online. Ambient monitoring across all forest zones.'
  });
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);

  const fetchInitialState = useCallback(async () => {
    try {
      const [statusRes, satRes, evtRes, alertRes] = await Promise.all([
        api.getSystemStatus(),
        api.getSatelliteData(),
        api.getEvents(),
        api.getAlerts()
      ]);

      if (statusRes.data) {
        setNodes(statusRes.data.nodes || []);
        if (statusRes.data.evidence_fusion) setEvidenceFusion(statusRes.data.evidence_fusion);
        if (statusRes.data.active_alert) setActiveAlert(statusRes.data.active_alert);
        if (statusRes.data.network_metrics) setNetworkMetrics(statusRes.data.network_metrics);
        setIsDemoRunning(statusRes.data.is_demo_running);
        setIsPaused(statusRes.data.is_paused);
      }

      if (satRes.hotspots) setHotspots(satRes.hotspots);
      if (satRes.risks) setZoneRisks(satRes.risks);
      if (evtRes && Array.isArray(evtRes)) {
        const seen = new Set<string>();
        const uniqueEvents: SystemEvent[] = [];
        for (const ev of evtRes) {
          if (ev && ev.id && !seen.has(ev.id)) {
            seen.add(ev.id);
            uniqueEvents.push(ev);
          }
        }
        setEvents(uniqueEvents);
      }
      if (alertRes && alertRes.length > 0) setActiveAlert(alertRes[0]);
    } catch (err) {
      console.error('Failed to fetch initial state:', err);
    }
  }, []);

  useEffect(() => {
    fetchInitialState();

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let reconnectTimer: any = null;

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type, data } = msg;

          switch (type) {
            case 'system_status':
              if (data.nodes) setNodes(data.nodes);
              if (data.evidence_fusion) setEvidenceFusion(data.evidence_fusion);
              if (data.network_metrics) setNetworkMetrics(data.network_metrics);
              setIsDemoRunning(data.is_demo_running);
              setIsPaused(data.is_paused);
              break;

            case 'demo_phase':
              setCurrentPhase(data);
              break;

            case 'node_update':
              setNodes((prev) =>
                prev.map((n) => (n.id === data.id ? { ...n, ...data } : n))
              );
              break;

            case 'sensor_update':
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === data.node_id
                    ? {
                        ...n,
                        current_reading: data.reading,
                        fire_signature: data.reading.fire_signature || n.fire_signature
                      }
                    : n
                )
              );
              break;

            case 'risk_update':
              setZoneRisks((prev) => ({ ...prev, [data.zone]: data.risk }));
              if (data.risk === 'HIGH') {
                soundFx.playRadarPing();
              }
              break;

            case 'evidence_fusion':
              setEvidenceFusion(data);
              break;

            case 'packet_created':
            case 'packet_forwarded': {
              const p: NetworkPacket = data?.packet || (data?.id ? data : null);
              if (!p || !p.id) break;
              soundFx.playPacketHop();
              setActivePackets((prev) => {
                const filtered = prev.filter((item) => item && item.id !== p.id);
                return [p, ...filtered].slice(0, 8);
              });
              break;
            }

            case 'packet_delivered': {
              const p: NetworkPacket = data?.packet || (data?.id ? data : null);
              if (!p || !p.id) break;
              setActivePackets((prev) =>
                prev.map((item) => (item && item.id === p.id ? { ...item, status: 'DELIVERED' } : item))
              );
              // Clean up delivered packets after 4s
              setTimeout(() => {
                setActivePackets((prev) => prev.filter((item) => item && item.id !== p.id));
              }, 4000);
              break;
            }

            case 'packet_dropped': {
              const p: NetworkPacket = data?.packet || (data?.id ? data : null);
              if (!p || !p.id) break;
              setActivePackets((prev) =>
                prev.map((item) => (item && item.id === p.id ? { ...item, status: 'DROPPED' } : item))
              );
              setTimeout(() => {
                setActivePackets((prev) => prev.filter((item) => item && item.id !== p.id));
              }, 4000);
              break;
            }

            case 'alert_triggered':
              setActiveAlert(data.alert);
              setShowAlertModal(true);
              soundFx.playAlertSiren();
              break;

            case 'event_logged':
              setEvents((prev) => {
                if (!data || !data.id) return prev;
                if (prev.some((item) => item.id === data.id)) return prev;
                return [data, ...prev].slice(0, 100);
              });
              break;

            case 'system_reset':
              fetchInitialState();
              setActivePackets([]);
              setShowAlertModal(false);
              break;
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchInitialState]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  return {
    nodes,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    activePackets,
    activeAlert,
    setActiveAlert,
    showAlertModal,
    setShowAlertModal,
    events,
    evidenceFusion,
    networkMetrics,
    hotspots,
    zoneRisks,
    currentPhase,
    isDemoRunning,
    isPaused,
    isConnected,
    refresh: fetchInitialState
  };
}
