import React, { useState } from 'react';
import { NodeState } from '../types';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity, Flame, Wind, Droplets, Volume2, Shield } from 'lucide-react';

interface SensorChartsProps {
  selectedNode: NodeState;
}

export const SensorCharts: React.FC<SensorChartsProps> = ({ selectedNode }) => {
  const [metricTab, setMetricTab] = useState<'thermal' | 'gas' | 'fire_sig' | 'all'>('all');

  const history = selectedNode.history || [];

  // Format chart data with readable timestamps
  const chartData = history.map((r, i) => {
    const timeLabel = r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }) : `T-${history.length - i}`;
    return {
      time: timeLabel,
      temp: r.temperature,
      hum: r.humidity,
      smoke: r.smoke,
      co: r.co,
      acoustic: Number((r.acoustic * 100).toFixed(0)),
      fire_signature: Number(((r.fire_signature || 0) * 100).toFixed(0))
    };
  });

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-xl font-mono flex flex-col h-full">
      {/* Chart Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            REAL-TIME MULTI-MODAL SENSOR DYNAMICS — {selectedNode.id} ({selectedNode.name})
          </span>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 text-[10px]">
          <button
            onClick={() => setMetricTab('all')}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              metricTab === 'all'
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Multi-Modal
          </button>
          <button
            onClick={() => setMetricTab('thermal')}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              metricTab === 'thermal'
                ? 'bg-rose-950 text-rose-400 border border-rose-600/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Thermal (°C)
          </button>
          <button
            onClick={() => setMetricTab('gas')}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              metricTab === 'gas'
                ? 'bg-amber-950 text-amber-400 border border-amber-600/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Smoke / CO
          </button>
          <button
            onClick={() => setMetricTab('fire_sig')}
            className={`px-2 py-1 rounded transition-colors cursor-pointer ${
              metricTab === 'fire_sig'
                ? 'bg-cyan-950 text-cyan-400 border border-cyan-600/40 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200'
            }`}
          >
            Fire Signature (%)
          </button>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-52 sm:h-60 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#090d16',
                borderColor: '#334155',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }} />

            {(metricTab === 'all' || metricTab === 'thermal') && (
              <Line
                type="monotone"
                dataKey="temp"
                name="Temperature (°C)"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {(metricTab === 'all' || metricTab === 'thermal') && (
              <Line
                type="monotone"
                dataKey="hum"
                name="Humidity (%)"
                stroke="#06b6d4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {(metricTab === 'all' || metricTab === 'gas') && (
              <Line
                type="monotone"
                dataKey="smoke"
                name="Smoke (ppm)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {(metricTab === 'all' || metricTab === 'gas') && (
              <Line
                type="monotone"
                dataKey="co"
                name="CO (ppm)"
                stroke="#d97706"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            )}

            {(metricTab === 'all' || metricTab === 'fire_sig') && (
              <Line
                type="monotone"
                dataKey="fire_signature"
                name="Fire Signature Score (%)"
                stroke="#a855f7"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
