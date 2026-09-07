import React from 'react';
import { Wifi, Radio, Zap, ShieldAlert, Cpu, AlertTriangle, ArrowRight, CheckCircle2, WifiOff } from 'lucide-react';
import { NetworkMetrics, NodeState } from '../types';

interface NetworkViewProps {
  metrics: NetworkMetrics | null;
  nodes: NodeState[];
  onFailNode: (nodeId: string) => void;
  onToggleInternet: () => void;
}

export const NetworkView: React.FC<NetworkViewProps> = ({
  metrics,
  nodes,
  onFailNode,
  onToggleInternet
}) => {
  const m = metrics || {
    nodes_online: 8,
    total_nodes: 8,
    packets_sent: 42,
    packets_delivered: 42,
    packets_lost: 0,
    delivery_ratio_pct: 100,
    avg_latency_ms: 48,
    avg_hops: 2.1,
    retransmissions: 1,
    current_route: ['N3', 'N5', 'N4', 'GATEWAY'],
    internet_online: true,
    cloud_sync_status: 'SYNCED',
    periodic_packet_count: 32,
    event_driven_packet_count: 10,
    energy_savings_pct: 74.2
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Network Header */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <Wifi className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              WI-FI HALOW MULTI-HOP SUB-GHZ MESH NETWORK
            </h2>
            <p className="text-xs text-slate-400">
              IEEE 802.11ah Sub-1GHz Long-Range Mesh Protocol Simulation
            </p>
          </div>
        </div>

        {/* Global Network Failover Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleInternet}
            className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              m.internet_online
                ? 'bg-amber-950/80 border-amber-600/50 text-amber-300 hover:bg-amber-900'
                : 'bg-emerald-950/80 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            {m.internet_online ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {m.internet_online ? 'Simulate Internet Outage' : 'Restore Internet Cloud Sync'}
          </button>
        </div>
      </div>

      {/* Internet vs Local Network Isolation Banner */}
      <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
        m.internet_online
          ? 'bg-slate-900/80 border-slate-800 text-slate-300'
          : 'bg-amber-950/70 border-amber-500/60 text-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${m.internet_online ? 'bg-emerald-400' : 'bg-red-500'}`} />
            <span>INTERNET UPLINK: <strong>{m.internet_online ? 'ONLINE' : 'OFFLINE (SEVERED)'}</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>LOCAL WI-FI HALOW MESH: <strong>ONLINE & AUTONOMOUS</strong></span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <span>LOCAL GATEWAY ALERT: <strong>ACTIVE</strong></span>
          </div>
        </div>
        <span className="text-[10px] text-slate-400">
          Status: {m.internet_online ? 'Cloud Synchronized' : 'Edge-Only Resilient Mode'}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Nodes Online</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {m.nodes_online} / {m.total_nodes}
          </div>
          <span className="text-[10px] text-slate-500">Sub-GHz RF Nodes</span>
        </div>

        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Packet Delivery Ratio</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">
            {m.delivery_ratio_pct}%
          </div>
          <span className="text-[10px] text-slate-500">Loss: {m.packets_lost} packets</span>
        </div>

        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Average Latency</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {m.avg_latency_ms} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <span className="text-[10px] text-slate-500">Per mesh ingress</span>
        </div>

        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <span className="text-slate-400 text-[10px] uppercase font-bold">Average Hops</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">
            {m.avg_hops} <span className="text-xs font-normal text-slate-400">hops</span>
          </div>
          <span className="text-[10px] text-slate-500">Retransmissions: {m.retransmissions}</span>
        </div>
      </div>

      {/* Energy & Efficiency Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Periodic vs Event-Driven */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl text-xs">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            COMMUNICATION EFFICIENCY (EVENT-DRIVEN VS PERIODIC)
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            TRINETRA suppresses continuous RF emissions by running Fire Inhale locally on the edge. Telemetry is dispatched periodically at low duty-cycles, jumping to event-driven priority packets only upon suspicion.
          </p>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Continuous Periodic Duty Cycle:</span>
                <span className="text-slate-400 font-bold">100% Radio Duty</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div className="bg-slate-600 h-full w-full" />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-emerald-300 font-bold">TRINETRA Event-Driven Duty Cycle:</span>
                <span className="text-emerald-400 font-bold">~{100 - m.energy_savings_pct}% Radio Duty</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full"
                  style={{ width: `${100 - m.energy_savings_pct}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-bold">Estimated Battery Life Gain:</span>
              <span className="text-emerald-400 font-bold text-sm">+{m.energy_savings_pct}% Extended Lifespan</span>
            </div>
            <div className="text-[10px] text-slate-500 italic">
              * Note: Labelled strictly as Simulation Metric for prototype evaluation.
            </div>
          </div>
        </div>

        {/* Live Route & Dynamic Self-Healing Table */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl text-xs">
          <h3 className="font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            DYNAMIC SELF-HEALING MESH ROUTE (N3 → GATEWAY)
          </h3>
          <p className="text-[11px] text-slate-400 mb-3">
            Click any node below to simulate hardware failure and verify instant mesh rerouting:
          </p>

          {/* Current Path visualization */}
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 mb-4 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-bold">Active Path:</span>
            {m.current_route && m.current_route.length > 0 ? (
              m.current_route.map((node, i) => (
                <React.Fragment key={`${node}-${i}`}>
                  <span className={`px-2 py-1 rounded font-bold ${node === 'GATEWAY' ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/40' : 'bg-slate-900 text-slate-200 border border-slate-700'}`}>
                    {node}
                  </span>
                  {i < m.current_route.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-500" />}
                </React.Fragment>
              ))
            ) : (
              <span className="text-rose-400 font-bold">No Route Available (Network Partitioned)</span>
            )}
          </div>

          {/* Nodes Fail/Recover Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {nodes.map((node) => (
              <button
                key={node.id}
                onClick={() => onFailNode(node.id)}
                className={`p-2 rounded border text-xs font-bold transition-all cursor-pointer ${
                  node.is_failed
                    ? 'bg-rose-950/80 border-rose-600 text-rose-300 line-through'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
                title={node.is_failed ? 'Click to bring node back online' : 'Click to simulate node failure'}
              >
                {node.id} {node.is_failed ? '[OFF]' : '[ON]'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
