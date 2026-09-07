import React, { useMemo } from 'react';
import { NodeState, NetworkPacket, SatelliteHotspot } from '../types';
import { Radio, AlertTriangle, ShieldCheck, WifiOff, RefreshCw } from 'lucide-react';

interface ForestMapProps {
  nodes: NodeState[];
  selectedNodeId: string;
  onSelectNode: (nodeId: string) => void;
  activePackets: NetworkPacket[];
  hotspots: SatelliteHotspot[];
  zoneRisks: Record<string, 'LOW' | 'MODERATE' | 'HIGH'>;
  onFailNode: (nodeId: string) => void;
}

export const ForestMap: React.FC<ForestMapProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  activePackets,
  hotspots,
  zoneRisks,
  onFailNode
}) => {
  // SVG Canvas Coordinate Mapping
  // Lat: 37.7700 to 37.7920 -> Y: 460 to 40
  // Lng: -122.4280 to -122.3980 -> X: 40 to 660
  const width = 700;
  const height = 500;

  const projectCoord = (lat: number, lng: number) => {
    const minLat = 37.772;
    const maxLat = 37.791;
    const minLng = -122.428;
    const maxLng = -122.400;

    const x = ((lng - minLng) / (maxLng - minLng)) * (width - 120) + 60;
    const y = ((maxLat - lat) / (maxLat - minLat)) * (height - 100) + 50;
    return { x, y };
  };

  const gatewayCoord = projectCoord(37.7850, -122.4020);

  // Mesh topology edges
  const edges = useMemo(() => {
    const lines: Array<{ fromId: string; toId: string; x1: number; y1: number; x2: number; y2: number }> = [];
    const added = new Set<string>();

    for (const node of nodes) {
      const p1 = projectCoord(node.lat, node.lng);
      for (const nbrId of node.neighbours) {
        const key = [node.id, nbrId].sort().join('-');
        if (added.has(key)) continue;
        added.add(key);

        if (nbrId === 'GATEWAY') {
          lines.push({ fromId: node.id, toId: 'GATEWAY', x1: p1.x, y1: p1.y, x2: gatewayCoord.x, y2: gatewayCoord.y });
        } else {
          const target = nodes.find((n) => n.id === nbrId);
          if (target) {
            const p2 = projectCoord(target.lat, target.lng);
            lines.push({ fromId: node.id, toId: target.id, x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
          }
        }
      }
    }
    return lines;
  }, [nodes]);

  const getNodeColor = (node: NodeState) => {
    if (node.is_failed || node.status === 'OFFLINE') return '#64748b'; // gray
    if (node.status === 'HIGH RISK') return '#ef4444'; // red
    if (node.status === 'SUSPICIOUS') return '#f97316'; // orange
    if (node.status === 'WATCH') return '#eab308'; // yellow
    if (node.id === 'N4' || node.id === 'N6') return '#3b82f6'; // relay blue
    return '#10b981'; // green safe
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-2xl relative flex flex-col h-full overflow-hidden">
      {/* Map Header Bar */}
      <div className="flex items-center justify-between mb-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-bold text-slate-200 uppercase tracking-wider">
            FOREST TOPOGRAPHY & WI-FI HALOW MESH
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">8 NODES + BASE GATEWAY</span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Safe
          </span>
          <span className="flex items-center gap-1 text-yellow-400">
            <span className="w-2 h-2 rounded-full bg-yellow-500" /> Watch
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Suspicious
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /> Fire
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-500" /> Offline
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative flex-1 w-full bg-slate-950 rounded-lg border border-slate-800/80 overflow-hidden flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Topography contour pattern */}
            <radialGradient id="topoRadial" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#064e3b" stopOpacity="0.35" />
              <stop offset="40%" stopColor="#042f2e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0.9" />
            </radialGradient>

            {/* Zone C thermal risk hazard gradient */}
            <radialGradient id="zoneCRiskGradient" cx="40%" cy="60%" r="50%">
              <stop offset="0%" stopColor="#dc2626" stopOpacity={zoneRisks['Zone C'] === 'HIGH' ? '0.38' : '0.08'} />
              <stop offset="60%" stopColor="#ea580c" stopOpacity={zoneRisks['Zone C'] === 'HIGH' ? '0.2' : '0.04'} />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>

            {/* Animated packet glow */}
            <filter id="packetGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Forest Boundary & Terrain Background */}
          <rect width={width} height={height} fill="#020617" />
          <rect width={width} height={height} fill="url(#topoRadial)" />

          {/* Contour Lines */}
          <path
            d="M 50 120 Q 220 80 400 130 T 650 110"
            fill="none"
            stroke="#065f46"
            strokeWidth="0.8"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
          />
          <path
            d="M 40 240 Q 250 190 440 260 T 660 210"
            fill="none"
            stroke="#065f46"
            strokeWidth="0.8"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
          />
          <path
            d="M 60 380 Q 280 320 480 390 T 640 370"
            fill="none"
            stroke="#065f46"
            strokeWidth="0.8"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
          />

          {/* Zone Boundaries & Shading */}
          {/* Zone C (Deep Valley / Canyon) */}
          <ellipse
            cx={projectCoord(37.7835, -122.4230).x}
            cy={projectCoord(37.7835, -122.4230).y + 20}
            rx="140"
            ry="110"
            fill="url(#zoneCRiskGradient)"
          />
          <path
            d="M 120 200 L 340 200 L 340 420 L 120 420 Z"
            fill="none"
            stroke={zoneRisks['Zone C'] === 'HIGH' ? '#f87171' : '#334155'}
            strokeWidth={zoneRisks['Zone C'] === 'HIGH' ? '1.5' : '1'}
            strokeDasharray={zoneRisks['Zone C'] === 'HIGH' ? '6 4' : '3 3'}
            strokeOpacity={zoneRisks['Zone C'] === 'HIGH' ? '0.8' : '0.4'}
          />
          <text
            x="130"
            y="220"
            fill={zoneRisks['Zone C'] === 'HIGH' ? '#f87171' : '#64748b'}
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            ZONE C {zoneRisks['Zone C'] === 'HIGH' ? '[HIGH RISK]' : '[NOMINAL]'}
          </text>

          {/* Zone A */}
          <text x="130" y="80" fill="#475569" fontSize="10" fontFamily="monospace">
            ZONE A (North-West Ridge)
          </text>

          {/* Zone B */}
          <text x="440" y="80" fill="#475569" fontSize="10" fontFamily="monospace">
            ZONE B (North-East Perimeter)
          </text>

          {/* Zone D */}
          <text x="400" y="440" fill="#475569" fontSize="10" fontFamily="monospace">
            ZONE D (South-East Outpost)
          </text>

          {/* Satellite Hotspot Marker (if active in Zone C) */}
          {hotspots.map((hs) => {
            const pos = projectCoord(hs.lat, hs.lng);
            return (
              <g key={hs.id}>
                <circle cx={pos.x} cy={pos.y} r="28" fill="#ef4444" fillOpacity="0.25" className="animate-ping" />
                <circle cx={pos.x} cy={pos.y} r="16" fill="#dc2626" fillOpacity="0.4" />
                <circle cx={pos.x} cy={pos.y} r="6" fill="#f87171" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={pos.x + 12}
                  y={pos.y - 8}
                  fill="#fca5a5"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  SATELLITE HOTSPOT (FRP {hs.frp_mw}MW)
                </text>
              </g>
            );
          })}

          {/* Wi-Fi HaLow Mesh Links */}
          {edges.map((e, idx) => {
            const isSelectedLink =
              (e.fromId === selectedNodeId && e.toId !== 'GATEWAY') ||
              (e.toId === selectedNodeId && e.fromId !== 'GATEWAY');
            return (
              <line
                key={idx}
                x1={e.x1}
                y1={e.y1}
                x2={e.x2}
                y2={e.y2}
                stroke={isSelectedLink ? '#38bdf8' : '#1e293b'}
                strokeWidth={isSelectedLink ? '2' : '1.2'}
                strokeDasharray="4 4"
                strokeOpacity={isSelectedLink ? 0.9 : 0.6}
              />
            );
          })}

          {/* Animated Packets Moving Across Hops */}
          {activePackets.map((pkt, pktIdx) => {
            if (!pkt || !pkt.path || !Array.isArray(pkt.path) || pkt.path.length < 2) return null;
            const hopIdx = Math.max(0, Math.min(pkt.current_hop_index || 0, pkt.path.length - 2));
            const fromId = pkt.path[hopIdx];
            const toId = pkt.path[hopIdx + 1];

            const fromNode = nodes.find((n) => n && n.id === fromId);
            const toNode = nodes.find((n) => n && n.id === toId);

            const p1 = fromNode ? projectCoord(fromNode.lat, fromNode.lng) : fromId === 'GATEWAY' ? gatewayCoord : null;
            const p2 = toNode ? projectCoord(toNode.lat, toNode.lng) : toId === 'GATEWAY' ? gatewayCoord : null;

            if (!p1 || !p2) return null;

            const isEmergency = pkt.priority === 'EMERGENCY';

            return (
              <g key={`${pkt.id || 'pkt'}-${pktIdx}`} filter="url(#packetGlow)">
                {/* Visual Line of transit */}
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isEmergency ? '#ef4444' : '#38bdf8'}
                  strokeWidth="2.5"
                  strokeOpacity="0.8"
                />
                {/* Moving Packet Dot */}
                <circle
                  cx={(p1.x + p2.x) / 2}
                  cy={(p1.y + p2.y) / 2}
                  r={isEmergency ? 7 : 4}
                  fill={isEmergency ? '#ff0033' : '#38bdf8'}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  className={isEmergency ? 'animate-bounce' : ''}
                />
                <text
                  x={(p1.x + p2.x) / 2 + 10}
                  y={(p1.y + p2.y) / 2 - 6}
                  fill={isEmergency ? '#fca5a5' : '#7dd3fc'}
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {pkt.id} [{isEmergency ? 'EMERGENCY' : 'DATA'}]
                </text>
              </g>
            );
          })}

          {/* Sensor Nodes (N1..N8) */}
          {nodes.map((node) => {
            const pos = projectCoord(node.lat, node.lng);
            const color = getNodeColor(node);
            const isSelected = node.id === selectedNodeId;

            return (
              <g
                key={node.id}
                onClick={() => onSelectNode(node.id)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Pulsing halo if suspicious or fire */}
                {(node.status === 'HIGH RISK' || node.status === 'SUSPICIOUS') && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="22"
                    fill={color}
                    fillOpacity="0.25"
                    className="animate-ping"
                  />
                )}

                {/* Outer selection ring */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="19"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                  />
                )}

                {/* Node Body Circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="13"
                  fill="#090d16"
                  stroke={color}
                  strokeWidth="2.5"
                />

                {/* Center dot */}
                <circle cx={pos.x} cy={pos.y} r="4" fill={color} />

                {/* Node Label */}
                <text
                  x={pos.x}
                  y={pos.y + 24}
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="11"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {node.id}
                </text>

                {/* Mini Sampling Rate & Fire Sig Tag */}
                <text
                  x={pos.x}
                  y={pos.y - 17}
                  textAnchor="middle"
                  fill={node.status === 'HIGH RISK' ? '#f87171' : node.adaptive_sensing_active ? '#38bdf8' : '#94a3b8'}
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {node.adaptive_sensing_active ? '5s' : '60s'} | {node.current_reading.temperature}°C
                </text>
              </g>
            );
          })}

          {/* Central Command Base Gateway */}
          <g transform={`translate(${gatewayCoord.x}, ${gatewayCoord.y})`}>
            <rect
              x="-18"
              y="-18"
              width="36"
              height="36"
              rx="6"
              fill="#0f172a"
              stroke="#06b6d4"
              strokeWidth="2.5"
            />
            <circle cx="0" cy="0" r="6" fill="#06b6d4" className="animate-pulse" />
            <text
              x="0"
              y="28"
              textAnchor="middle"
              fill="#38bdf8"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              GATEWAY
            </text>
          </g>
        </svg>

        {/* Quick Node Control Pill on selected node */}
        {selectedNodeId && (
          <div className="absolute bottom-2 left-2 bg-slate-900/90 border border-slate-700/80 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-3 text-xs font-mono shadow-lg">
            <span className="text-slate-300 font-bold">Selected: {selectedNodeId}</span>
            <button
              onClick={() => onFailNode(selectedNodeId)}
              className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-700/50 text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              title="Simulate node damage / battery cut to test self-healing mesh rerouting"
            >
              <WifiOff className="w-3 h-3" />
              Fail / Heal Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
