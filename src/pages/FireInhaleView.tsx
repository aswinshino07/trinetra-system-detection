import React, { useState } from 'react';
import { Cpu, Flame, Layers, Network, Clock, ShieldCheck, ArrowRight, Activity, Terminal } from 'lucide-react';
import { NodeState } from '../types';

interface FireInhaleViewProps {
  nodes: NodeState[];
  selectedNode: NodeState;
}

export const FireInhaleView: React.FC<FireInhaleViewProps> = ({ nodes, selectedNode }) => {
  const [sliderTemp, setSliderTemp] = useState(38);
  const [sliderSmoke, setSliderSmoke] = useState(120);
  const [sliderCO, setSliderCO] = useState(8.5);
  const [sliderPersistence, setSliderPersistence] = useState(4);
  const [sliderNeighbours, setSliderNeighbours] = useState(2);

  // Compute live mathematical score directly for playground
  const tempDelta = Math.max(0, sliderTemp - 24);
  const smokeDelta = Math.max(0, sliderSmoke - 15);
  const thermalScore = Math.min(0.4, (tempDelta / 25) * 0.4);
  const gasScore = Math.min(0.4, (smokeDelta / 200) * 0.4);
  const persistenceScore = Math.min(0.2, (sliderPersistence / 5) * 0.2);
  const neighbourScore = Math.min(0.25, (sliderNeighbours / 3) * 0.25);
  const totalScore = Number(Math.min(0.98, thermalScore + gasScore + persistenceScore + neighbourScore).toFixed(2));

  return (
    <div className="space-y-4 font-mono">
      {/* Framework Definition Banner */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-950/80 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-400">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              FIRE INHALE — PROPOSED LIGHTWEIGHT EDGE-AI FRAMEWORK
            </h2>
            <p className="text-xs text-slate-400">
              TRINETRA's proposed Edge-AI framework for multi-modal temporal wildfire signature analysis
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800">
          <strong className="text-emerald-400">Architectural Principle:</strong> Unlike conventional single-threshold smoke detectors that trigger false alarms on dust, vehicle exhaust, or campfire drifts, <em>Fire Inhale</em> executes sliding-window temporal feature extraction and an ensemble decision forest directly on edge sensor nodes (e.g. ESP32). It cross-examines multi-modal thermal rates of change, particulate persistence, carbon monoxide slope, and acoustic crackle before dispatching high-confidence emergency alerts.
        </p>
      </div>

      {/* 8-Stage Pipeline Breakdown */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          EDGE-AI INFERENCE PIPELINE (EXECUTION LATENCY: ~1.2ms)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-400 text-[10px] font-bold block mb-1">STAGE 1</span>
            <h4 className="font-bold text-slate-200 mb-1">Raw Sensor Ingestion</h4>
            <p className="text-[11px] text-slate-400">
              Multi-modal acquisition: Temperature & RH (BME280), Particulate (MQ-2), CO (MQ-7), Acoustic crackle (MEMS mic).
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-400 text-[10px] font-bold block mb-1">STAGE 2</span>
            <h4 className="font-bold text-slate-200 mb-1">Sliding Time Window</h4>
            <p className="text-[11px] text-slate-400">
              FIFO buffer tracking the last 30 seconds of readings (sampling dynamic: 60s in nominal, 5s under adaptive sensing).
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-400 text-[10px] font-bold block mb-1">STAGE 3</span>
            <h4 className="font-bold text-slate-200 mb-1">Feature Extraction</h4>
            <p className="text-[11px] text-slate-400">
              Computes 15 temporal signals: ΔT, ΔSmoke, ΔCO, dT/dt, dSmoke/dt, moving averages, and persistence count.
            </p>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-cyan-400 text-[10px] font-bold block mb-1">STAGE 4</span>
            <h4 className="font-bold text-slate-200 mb-1">Random Forest Ensemble</h4>
            <p className="text-[11px] text-slate-400">
              15-tree orthogonal decision forest evaluating multi-signal non-linear boundaries with integer/fixed-point logic.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Feature Vector & Model Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Playground Controls */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            INTERACTIVE SENSOR VECTOR TESTER
          </h3>
          <p className="text-[11px] text-slate-400 mb-4">
            Test how combinations of multi-modal features drive the Fire Inhale Edge-AI confidence score:
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Temperature: {sliderTemp}°C (Baseline 24°C)</span>
                <span className="text-rose-400 font-bold">+{tempDelta}°C Delta</span>
              </div>
              <input
                type="range"
                min="20"
                max="65"
                value={sliderTemp}
                onChange={(e) => setSliderTemp(Number(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Smoke / Particulate: {sliderSmoke} ppm</span>
                <span className="text-amber-400 font-bold">+{smokeDelta} ppm Delta</span>
              </div>
              <input
                type="range"
                min="10"
                max="350"
                value={sliderSmoke}
                onChange={(e) => setSliderSmoke(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Temporal Persistence: {sliderPersistence} intervals</span>
                <span className="text-cyan-400 font-bold">{sliderPersistence >= 3 ? 'Persistent Anomaly' : 'Transient'}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                value={sliderPersistence}
                onChange={(e) => setSliderPersistence(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-300">Confirming Neighbour Nodes: {sliderNeighbours} / 3</span>
                <span className="text-emerald-400 font-bold">{(sliderNeighbours / 3 * 100).toFixed(0)}% Consensus</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                value={sliderNeighbours}
                onChange={(e) => setSliderNeighbours(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Live Classification Result */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              FIRE INHALE DECISION OUTCOME
            </h3>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center mb-4">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">
                COMPUTED FIRE SIGNATURE
              </span>
              <div className="text-4xl font-black text-white mb-2 tracking-tight">
                {totalScore.toFixed(2)}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border inline-block ${
                totalScore >= 0.75
                  ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                  : totalScore >= 0.42
                  ? 'bg-amber-950 text-amber-300 border-amber-500'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500'
              }`}>
                {totalScore >= 0.75 ? 'HIGH CONFIDENCE WILDFIRE' : totalScore >= 0.42 ? 'SUSPICIOUS EVENT' : 'SAFE / AMBIENT'}
              </span>
            </div>

            <div className="text-xs space-y-1.5 text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="flex justify-between">
                <span>Thermal Feature Contribution:</span>
                <span className="font-bold text-rose-400">+{(thermalScore * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Gas / Particulate Contribution:</span>
                <span className="font-bold text-amber-400">+{(gasScore * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Temporal Persistence Weight:</span>
                <span className="font-bold text-cyan-400">+{(persistenceScore * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Cooperative Neighbour Verification:</span>
                <span className="font-bold text-emerald-400">+{(neighbourScore * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
