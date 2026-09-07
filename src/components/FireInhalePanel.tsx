import React from 'react';
import { NodeState } from '../types';
import { Flame, Wind, Droplets, Volume2, Clock, ShieldAlert, Cpu, Activity, TrendingUp } from 'lucide-react';

interface FireInhalePanelProps {
  selectedNode: NodeState;
}

export const FireInhalePanel: React.FC<FireInhalePanelProps> = ({ selectedNode }) => {
  const reading = selectedNode.current_reading;
  const sig = selectedNode.fire_signature || 0.05;

  // Determine state badge and color
  let stateLabel = 'SAFE';
  let stateBadgeColor = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
  let progressColor = 'from-emerald-500 to-teal-500';

  if (sig >= 0.75) {
    stateLabel = 'HIGH CONFIDENCE';
    stateBadgeColor = 'bg-rose-950/90 text-rose-400 border-rose-500/50 animate-pulse';
    progressColor = 'from-orange-500 via-rose-500 to-red-600';
  } else if (sig >= 0.42) {
    stateLabel = 'SUSPICIOUS';
    stateBadgeColor = 'bg-amber-950/90 text-amber-400 border-amber-500/50';
    progressColor = 'from-amber-500 to-orange-500';
  }

  // Calculate sliding window deltas from history
  const history = selectedNode.history || [];
  const baseline = history.length > 0 ? history[0] : reading;
  const tempDelta = Number((reading.temperature - baseline.temperature).toFixed(1));
  const smokeDelta = Number((reading.smoke - baseline.smoke).toFixed(1));
  const coDelta = Number((reading.co - baseline.co).toFixed(2));

  return (
    <div className="bg-slate-900/95 rounded-xl border border-emerald-950/80 p-4 shadow-2xl flex flex-col justify-between h-full font-mono">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-600/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 tracking-wider flex items-center gap-1.5">
                FIRE INHALE — EDGE AI
              </h2>
              <p className="text-[10px] text-slate-400">
                Multi-Modal Temporal Signature Engine ({selectedNode.id} • {selectedNode.name})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">Window: 30s</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-cyan-400 border border-cyan-800/40">
              {selectedNode.adaptive_sensing_active ? 'ADAPTIVE: 5s' : 'SAMPLING: 60s'}
            </span>
          </div>
        </div>

        {/* Fire Signature Meter */}
        <div className="bg-slate-950/90 rounded-lg p-3.5 border border-slate-800/90 mb-3 shadow-inner">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              FIRE SIGNATURE SCORE
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${stateBadgeColor}`}>
              {stateLabel}
            </span>
          </div>

          <div className="flex items-baseline justify-between mb-2">
            <span className="text-3xl font-black text-white tracking-tight">
              {sig.toFixed(2)}
            </span>
            <span className="text-xs text-slate-400">
              Threshold: {sig >= 0.75 ? 'ALERT LEVEL' : sig >= 0.42 ? 'VERIFY LEVEL' : 'NOMINAL'}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden p-0.5 border border-slate-800">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${progressColor} transition-all duration-500 ease-out`}
              style={{ width: `${Math.max(4, Math.min(100, sig * 100))}%` }}
            />
          </div>
        </div>

        {/* Real-time Multi-Modal Sensor Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3 text-xs">
          {/* Temperature */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-rose-400" /> Temp
              </span>
              <span className={tempDelta > 1 ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                {tempDelta > 0 ? `+${tempDelta}°C` : `${tempDelta}°C`}
              </span>
            </div>
            <div className="text-lg font-bold text-white">
              {reading.temperature.toFixed(1)} <span className="text-xs text-slate-400 font-normal">°C</span>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-cyan-400" /> Humidity
              </span>
              <span className="text-slate-500">RH%</span>
            </div>
            <div className="text-lg font-bold text-white">
              {reading.humidity.toFixed(1)} <span className="text-xs text-slate-400 font-normal">%</span>
            </div>
          </div>

          {/* Smoke / Particulate */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-amber-400" /> Smoke
              </span>
              <span className={smokeDelta > 10 ? 'text-amber-400 font-bold' : 'text-slate-500'}>
                {smokeDelta > 0 ? `+${smokeDelta}` : `${smokeDelta}`}
              </span>
            </div>
            <div className="text-lg font-bold text-white">
              {reading.smoke.toFixed(1)} <span className="text-xs text-slate-400 font-normal">ppm</span>
            </div>
          </div>

          {/* CO Gas */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-red-400" /> CO Gas
              </span>
              <span className={coDelta > 1 ? 'text-red-400 font-bold' : 'text-slate-500'}>
                {coDelta > 0 ? `+${coDelta}` : `${coDelta}`}
              </span>
            </div>
            <div className="text-lg font-bold text-white">
              {reading.co.toFixed(2)} <span className="text-xs text-slate-400 font-normal">ppm</span>
            </div>
          </div>

          {/* Acoustic crackle */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Volume2 className="w-3 h-3 text-indigo-400" /> Acoustic
              </span>
              <span className="text-slate-500">MEMS</span>
            </div>
            <div className="text-lg font-bold text-white">
              {(reading.acoustic * 100).toFixed(0)} <span className="text-xs text-slate-400 font-normal">%</span>
            </div>
          </div>

          {/* Persistence */}
          <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80">
            <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-400" /> Persistence
              </span>
              <span className="text-slate-500">Cycles</span>
            </div>
            <div className="text-lg font-bold text-white">
              {selectedNode.persistence_count || 0} <span className="text-xs text-slate-400 font-normal">intervals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Temporal Analysis & Rate of Change Diagnosis */}
      <div className="border-t border-slate-800/80 pt-3">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400 flex items-center gap-1 font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> TEMPORAL TREND
          </span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            selectedNode.temporal_trend === 'PERSISTENT ANOMALY'
              ? 'bg-rose-950 text-rose-300 border border-rose-600/40'
              : selectedNode.temporal_trend === 'ABNORMAL TREND'
              ? 'bg-amber-950 text-amber-300 border border-amber-600/40'
              : 'bg-emerald-950 text-emerald-300 border border-emerald-600/40'
          }`}>
            {selectedNode.temporal_trend}
          </span>
        </div>

        <div className="p-2 bg-slate-950 rounded text-xs text-slate-300 border border-slate-800">
          <p className="text-[11px] font-medium text-slate-300">
            {selectedNode.rate_of_change_status || 'Baseline nominal environmental equilibrium.'}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
            <span>Battery: <strong className="text-emerald-400">{selectedNode.battery}%</strong></span>
            <span>Mesh Neighbours: <strong className="text-cyan-400">{selectedNode.neighbours.join(', ')}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
