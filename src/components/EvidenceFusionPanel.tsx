import React from 'react';
import { EvidenceFusionBreakdown } from '../types';
import { ShieldCheck, AlertCircle, Satellite, Cpu, Clock, Network, CheckCircle2, AlertTriangle } from 'lucide-react';

interface EvidenceFusionPanelProps {
  evidence: EvidenceFusionBreakdown;
  onSelectScenario: (scenario: 'A' | 'B' | 'C') => void;
}

export const EvidenceFusionPanel: React.FC<EvidenceFusionPanelProps> = ({
  evidence,
  onSelectScenario
}) => {
  const renderBar = (label: string, value: number, icon: React.ReactNode, colorClass: string) => {
    const pct = Math.round(value * 100);
    return (
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            {icon}
            {label}
          </span>
          <span className="font-bold font-mono text-slate-200">{pct}%</span>
        </div>
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className={`h-full rounded-full ${colorClass} transition-all duration-500`}
            style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-4 shadow-xl flex flex-col justify-between font-mono">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-teal-950 text-teal-400 border border-teal-700/40">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                MULTI-SOURCE EVIDENCE FUSION
              </h3>
              <p className="text-[10px] text-slate-400">Earth-to-Edge Cross-Corroboration Engine</p>
            </div>
          </div>

          <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-700">
            FUSED CONFIDENCE: {(evidence.fused_fire_signature * 100).toFixed(0)}%
          </span>
        </div>

        {/* Disagreement Scenario Banner (if active) */}
        {evidence.disagreement_scenario && evidence.disagreement_scenario !== 'NONE' && (
          <div className={`p-2.5 rounded-lg border mb-3 text-xs ${
            evidence.disagreement_scenario === 'SATELLITE_GROUND_DISAGREEMENT'
              ? 'bg-amber-950/70 border-amber-500/50 text-amber-200'
              : evidence.disagreement_scenario === 'GROUND_ONLY_ANOMALY'
              ? 'bg-orange-950/70 border-orange-500/50 text-orange-200'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertTriangle className="w-4 h-4" />
              {evidence.disagreement_scenario === 'SATELLITE_GROUND_DISAGREEMENT' && 'SATELLITE-GROUND DISAGREEMENT (SCENARIO A)'}
              {evidence.disagreement_scenario === 'GROUND_ONLY_ANOMALY' && 'GROUND-ONLY ANOMALY (SCENARIO B)'}
              {evidence.disagreement_scenario === 'MULTI_SOURCE_CONSENSUS' && 'MULTI-SOURCE CONSENSUS CONFIRMED (SCENARIO C)'}
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              {evidence.reasons[0] || 'Cross-source divergence analysis active.'}
            </p>
          </div>
        )}

        {/* Confidence Breakdown Bars */}
        <div className="bg-slate-950/80 rounded-lg p-3 border border-slate-800/80 mb-3">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
            CONFIDENCE WEIGHT CONTRIBUTION
          </div>
          {renderBar('Satellite Thermal Evidence', evidence.satellite_evidence, <Satellite className="w-3.5 h-3.5 text-rose-400" />, 'bg-rose-500')}
          {renderBar('Ground Sensor Evidence', evidence.ground_evidence, <Cpu className="w-3.5 h-3.5 text-amber-400" />, 'bg-amber-500')}
          {renderBar('Temporal Persistence', evidence.temporal_evidence, <Clock className="w-3.5 h-3.5 text-cyan-400" />, 'bg-cyan-500')}
          {renderBar('Neighbour Verification', evidence.neighbour_evidence, <Network className="w-3.5 h-3.5 text-emerald-400" />, 'bg-emerald-500')}
        </div>

        {/* Why TRINETRA Confirmed This Event */}
        <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/80">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            DECISION EXPLANATION & AUDIT TRAIL
          </h4>
          <ul className="space-y-1 text-xs text-slate-300">
            {evidence.reasons && evidence.reasons.length > 0 ? (
              evidence.reasons.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] leading-snug">
                  <span className="text-emerald-400 font-bold">›</span>
                  <span>{r}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-500 text-[11px]">Nominal environmental baseline across all sensors.</li>
            )}
          </ul>
        </div>
      </div>

      {/* Scenario Trigger Buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-800">
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">
          TEST SATELLITE-GROUND SCENARIOS:
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[10px]">
          <button
            onClick={() => onSelectScenario('A')}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-amber-300 text-center font-bold transition-colors cursor-pointer"
            title="Satellite High Risk, Ground Normal -> Disagreement"
          >
            Scenario A: Sat-Only
          </button>
          <button
            onClick={() => onSelectScenario('B')}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-cyan-300 text-center font-bold transition-colors cursor-pointer"
            title="Ground High Signature, Satellite None -> Canopy Anomaly"
          >
            Scenario B: Ground-Only
          </button>
          <button
            onClick={() => onSelectScenario('C')}
            className="p-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700/80 text-rose-300 text-center font-bold transition-colors cursor-pointer"
            title="Satellite + Ground + Neighbours all confirm -> Fire Confirmed"
          >
            Scenario C: Consensus
          </button>
        </div>
      </div>
    </div>
  );
};
