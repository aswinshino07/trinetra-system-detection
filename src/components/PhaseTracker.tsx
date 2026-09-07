import React from 'react';
import { DemoPhaseInfo } from '../types';
import {
  Satellite,
  Target,
  Gauge,
  Cpu,
  Network,
  Radio,
  Flame,
  CheckCircle2,
  AlertOctagon,
  FastForward,
  PlayCircle
} from 'lucide-react';

interface PhaseTrackerProps {
  currentPhase: DemoPhaseInfo;
  isDemoRunning: boolean;
  onJumpStage?: (stageKey: string) => void;
  onTriggerCooperate?: () => void;
  currentSpeed?: number;
  onSetSpeed?: (speed: number) => void;
}

export const PhaseTracker: React.FC<PhaseTrackerProps> = ({
  currentPhase,
  isDemoRunning,
  onJumpStage,
  onTriggerCooperate,
  currentSpeed = 1,
  onSetSpeed
}) => {
  const macroStages = [
    { id: 1, name: 'SEE', desc: 'Satellite Anomaly', icon: Satellite, phaseThreshold: 2 },
    { id: 2, name: 'FOCUS', desc: 'High Risk Zone', icon: Target, phaseThreshold: 3 },
    { id: 3, name: 'SENSE', desc: 'Adaptive Sampling', icon: Gauge, phaseThreshold: 4 },
    { id: 4, name: 'INHALE', desc: 'Edge AI Analysis', icon: Cpu, phaseThreshold: 11 },
    { id: 5, name: 'VERIFY', desc: 'Neighbour Consensus', icon: Network, phaseThreshold: 13 },
    { id: 6, name: 'COOPERATE', desc: 'HaLow Multi-Hop', icon: Radio, phaseThreshold: 17 },
    { id: 7, name: 'WARN', desc: 'Gateway Red Alert', icon: AlertOctagon, phaseThreshold: 19 }
  ];

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-xl font-mono mb-4">
      {/* Top stage progression with clickable jumps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-2.5">
        {macroStages.map((stage) => {
          const Icon = stage.icon;
          const isActive = currentPhase.phase >= stage.phaseThreshold;
          const isCurrent =
            currentPhase.phase >= stage.phaseThreshold &&
            macroStages.find((s) => s.phaseThreshold > stage.phaseThreshold && currentPhase.phase >= s.phaseThreshold) === undefined;
          const isCooperate = stage.name === 'COOPERATE';

          return (
            <button
              key={stage.id}
              onClick={() => onJumpStage && onJumpStage(stage.name)}
              className={`p-2 rounded-lg border text-left transition-all flex items-center gap-2 cursor-pointer relative group ${
                isCurrent
                  ? 'bg-emerald-950/90 border-emerald-500 shadow-lg shadow-emerald-950/60 text-emerald-300 ring-1 ring-emerald-500/50'
                  : isActive
                  ? 'bg-slate-950 border-emerald-800/40 text-emerald-400 hover:border-emerald-500/60 hover:bg-slate-900/80'
                  : isCooperate
                  ? 'bg-cyan-950/40 border-cyan-700/50 text-cyan-300 hover:bg-cyan-950/70 hover:border-cyan-500'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
              }`}
              title={`Jump directly to ${stage.name}: ${stage.desc}`}
            >
              <div
                className={`p-1.5 rounded transition-transform group-hover:scale-110 ${
                  isCurrent
                    ? 'bg-emerald-500 text-slate-950 animate-pulse'
                    : isCooperate
                    ? 'bg-cyan-900/80 text-cyan-200'
                    : 'bg-slate-900 text-slate-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black tracking-wider ${isCooperate ? 'text-cyan-400 font-bold' : ''}`}>
                    {stage.name}
                  </span>
                  {isActive ? (
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  ) : (
                    <span className="text-[8px] opacity-0 group-hover:opacity-100 text-slate-400 font-normal">
                      Jump →
                    </span>
                  )}
                </div>
                <div className="text-[9px] text-slate-400 truncate">{stage.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed Current Phase Subtitle & Quick Controls */}
      <div className="bg-slate-950/90 rounded-lg px-3.5 py-2 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className={`w-2 h-2 rounded-full shrink-0 ${isDemoRunning ? 'bg-emerald-400 animate-ping' : 'bg-slate-600'}`} />
          <span className="font-bold text-slate-200 uppercase tracking-wide shrink-0">
            {currentPhase.title}
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 text-[11px] truncate hidden md:inline">
            {currentPhase.description}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Direct Trigger Cooperate Step Button */}
          {onTriggerCooperate && (
            <button
              onClick={onTriggerCooperate}
              className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-900/80 to-teal-800/80 hover:from-cyan-800 hover:to-teal-700 text-cyan-200 text-[10px] font-bold border border-cyan-500/40 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Test the COOPERATE multi-hop transmission immediately"
            >
              <Radio className="w-3 h-3 text-cyan-400" />
              <span>TEST COOPERATE (MESH)</span>
            </button>
          )}

          {/* Speed Selector */}
          {onSetSpeed && (
            <div className="flex items-center bg-slate-900 rounded border border-slate-800 p-0.5 text-[10px]">
              <FastForward className="w-3 h-3 text-slate-400 mx-1" />
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onSetSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                    currentSpeed === spd
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          )}

          <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-700/30 whitespace-nowrap">
            PHASE {currentPhase.phase} OF 21
          </span>
        </div>
      </div>
    </div>
  );
};
