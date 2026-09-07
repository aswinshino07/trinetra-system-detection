import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, FastForward, Rewind, Clock, AlertTriangle, Flame, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { SystemEvent } from '../types';
import { api } from '../services/api';

interface EventsReplayViewProps {
  events: SystemEvent[];
}

export const EventsReplayView: React.FC<EventsReplayViewProps> = ({ events }) => {
  const [replayFrames, setReplayFrames] = useState<any[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const playTimerRef = useRef<any>(null);

  useEffect(() => {
    api.getReplayHistory().then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        setReplayFrames(data);
        setCurrentFrameIdx(0);
      } else {
        // Fallback synthetic benchmark timeline frames as requested in prompt:
        // 00:00 Normal -> 00:15 Satellite anomaly -> 00:30 Adaptive sensing -> 00:45 Sensor anomaly -> 01:00 Fire Inhale -> 01:15 Neighbour verification -> 01:30 Fire confirmed -> 01:45 Alert delivered
        const synthetic = [
          { time: '00:00', title: 'Forest Baseline Nominal', phase: 1, fire_sig: 0.05, n3_temp: 24.2, n3_smoke: 14.5, sat: false, neighbours: '0/0', alert: false },
          { time: '00:15', title: 'Satellite VIIRS Anomaly Detected (FRP 48.6 MW)', phase: 2, fire_sig: 0.22, n3_temp: 24.8, n3_smoke: 16.0, sat: true, neighbours: '0/0', alert: false },
          { time: '00:30', title: 'Adaptive Sensing Activated (Sampling 60s → 5s)', phase: 4, fire_sig: 0.35, n3_temp: 27.4, n3_smoke: 22.0, sat: true, neighbours: '0/0', alert: false },
          { time: '00:45', title: 'Multi-Modal Ground Divergence (Temp +12°C, Smoke 110ppm)', phase: 6, fire_sig: 0.52, n3_temp: 36.5, n3_smoke: 110.0, sat: true, neighbours: '0/0', alert: false },
          { time: '01:00', title: 'Fire Inhale Edge AI: State SAFE → SUSPICIOUS', phase: 11, fire_sig: 0.64, n3_temp: 41.2, n3_smoke: 165.0, sat: true, neighbours: '0/0', alert: false },
          { time: '01:15', title: 'Neighbour Verification Requested (Consensus: 2/3 Confirmed)', phase: 13, fire_sig: 0.78, n3_temp: 48.0, n3_smoke: 220.0, sat: true, neighbours: '2/3', alert: false },
          { time: '01:30', title: 'Multi-Source Evidence Fusion: HIGH CONFIDENCE (0.91)', phase: 15, fire_sig: 0.91, n3_temp: 54.2, n3_smoke: 285.0, sat: true, neighbours: '2/3', alert: false },
          { time: '01:45', title: 'Emergency Packet Delivered → Gateway Red Alert Triggered', phase: 19, fire_sig: 0.94, n3_temp: 58.0, n3_smoke: 310.0, sat: true, neighbours: '2/3', alert: true }
        ];
        setReplayFrames(synthetic);
        setCurrentFrameIdx(0);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentFrameIdx((prev) => {
          if (prev >= replayFrames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / playbackSpeed);
    } else {
      clearInterval(playTimerRef.current);
    }
    return () => clearInterval(playTimerRef.current);
  }, [isPlaying, replayFrames.length, playbackSpeed]);

  const currentFrame = replayFrames[currentFrameIdx] || {
    time: '00:00',
    title: 'Baseline Nominal',
    fire_sig: 0.05,
    n3_temp: 24.2,
    n3_smoke: 14.5,
    sat: false,
    neighbours: '0/0',
    alert: false
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Replay Player Header & Scrubber */}
      <div className="bg-slate-900/95 p-4 rounded-xl border border-slate-800 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-400">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                HISTORICAL WILDFIRE INCIDENT REPLAY
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic step-by-step incident timeline playback for post-event analysis
              </p>
            </div>
          </div>

          {/* Transport Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentFrameIdx((prev) => Math.max(0, prev - 1))}
              className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Previous frame"
            >
              <Rewind className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              {isPlaying ? 'PAUSE REPLAY' : 'PLAY INCIDENT'}
            </button>

            <button
              onClick={() => setCurrentFrameIdx((prev) => Math.min(replayFrames.length - 1, prev + 1))}
              className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Next frame"
            >
              <FastForward className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIdx(0);
              }}
              className="p-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Reset scrubber to 00:00"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Speed toggle */}
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-slate-950 border border-slate-700 rounded p-1 text-xs text-slate-300"
            >
              <option value={1}>1x Speed</option>
              <option value={2}>2x Speed</option>
              <option value={4}>4x Speed</option>
            </select>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1.5">
            <span className="font-bold text-purple-400">Timestamp: {currentFrame.time || `Frame #${currentFrameIdx + 1}`}</span>
            <span>{currentFrameIdx + 1} of {replayFrames.length} Incident Milestones</span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, replayFrames.length - 1)}
            value={currentFrameIdx}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentFrameIdx(Number(e.target.value));
            }}
            className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
          />
        </div>

        {/* Milestone Snapshot Card */}
        <div className="bg-slate-950 p-4 rounded-xl border border-purple-900/40 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-400 font-bold uppercase tracking-wider text-[11px]">
              {currentFrame.title || currentFrame.step_title}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              currentFrame.alert || (currentFrame.fire_sig >= 0.75)
                ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                : 'bg-slate-900 text-slate-400 border-slate-700'
            }`}>
              {currentFrame.alert ? '🚨 RED ALERT ACTIVE' : 'MONITORING'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Fire Inhale Signature</span>
              <span className="text-xl font-bold text-white">
                {((currentFrame.fire_sig || 0.05) * 100).toFixed(0)}%
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">N3 Epicentre Temp</span>
              <span className="text-xl font-bold text-rose-400">
                {currentFrame.n3_temp || 24.2}°C
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Satellite Anomaly</span>
              <span className="text-xl font-bold text-cyan-400">
                {currentFrame.sat ? 'YES (VIIRS)' : 'NOMINAL'}
              </span>
            </div>

            <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Neighbour Consensus</span>
              <span className="text-xl font-bold text-emerald-400">
                {currentFrame.neighbours || '0/0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Chronological Log */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          FULL AUDIT EVENT JOURNAL
        </h3>

        <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 text-xs">
          {events.map((evt, idx) => (
            <div key={`${evt.id || 'evt'}-${idx}`} className="p-2.5 bg-slate-950 rounded border border-slate-800/80 flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-cyan-400 mr-2">[{evt.source}]</span>
                <span className="text-slate-200">{evt.description}</span>
              </div>
              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
