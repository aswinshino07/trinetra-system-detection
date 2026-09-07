import React from 'react';
import {
  Flame,
  Radio,
  Satellite,
  Wifi,
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  Cpu
} from 'lucide-react';
import { soundFx } from '../utils/audio';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isDemoRunning: boolean;
  isPaused: boolean;
  onStartDemo: () => void;
  onPauseDemo: () => void;
  onResumeDemo: () => void;
  onResetDemo: () => void;
  onTriggerFire: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  internetOnline: boolean;
  onOpenHardware: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDemoRunning,
  isPaused,
  onStartDemo,
  onPauseDemo,
  onResumeDemo,
  onResetDemo,
  onTriggerFire,
  soundEnabled,
  setSoundEnabled,
  internetOnline,
  onOpenHardware
}) => {
  const tabs = [
    { id: 'live', label: 'LIVE MONITOR' },
    { id: 'satellite', label: 'SATELLITE' },
    { id: 'fire_inhale', label: 'FIRE INHALE' },
    { id: 'network', label: 'NETWORK' },
    { id: 'events', label: 'EVENTS & REPLAY' },
    { id: 'analytics', label: 'ANALYTICS' }
  ];

  return (
    <header className="bg-slate-950 border-b border-emerald-950/60 sticky top-0 z-40 shadow-xl shadow-black/40">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-600 via-teal-700 to-amber-600 flex items-center justify-center p-2 shadow-lg shadow-emerald-900/30 border border-emerald-400/30">
            <Flame className="w-6 h-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-wider text-emerald-400 font-mono">
                TRINETRA
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-600/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                SYSTEM ONLINE
              </span>
              <button
                onClick={onOpenHardware}
                className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/60 text-cyan-400 border border-cyan-700/40 hover:bg-cyan-900/60 flex items-center gap-1 transition-colors"
                title="Open ESP32 Hardware Integration Specs"
              >
                <Cpu className="w-3 h-3" />
                ESP32 / HaLow Ready
              </button>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Satellite-Guided Fire Inhale Technology for Early Wildfire Signature Detection & Cooperative Warning
            </p>
          </div>
        </div>

        {/* Real-time Status Pills & Sound */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono text-slate-400 bg-slate-900/90 px-3 py-1.5 rounded-md border border-slate-800">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Satellite className="w-3.5 h-3.5" />
              VIIRS/FIRMS: <span className="font-semibold text-white">SYNCED</span>
            </span>
            <span className="w-px h-3 bg-slate-700" />
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Wifi className="w-3.5 h-3.5" />
              HaLow Mesh: <span className="font-semibold text-white">ACTIVE</span>
            </span>
            <span className="w-px h-3 bg-slate-700" />
            <span className={`flex items-center gap-1.5 ${internetOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              <Radio className="w-3.5 h-3.5" />
              Cloud: <span className="font-semibold">{internetOnline ? 'ONLINE' : 'OFFLINE (LOCAL)'}</span>
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              soundFx.soundEnabled = next;
            }}
            className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={soundEnabled ? 'Mute audio cues' : 'Unmute audio cues'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Primary Action Controls */}
          <div className="flex items-center gap-2">
            {!isDemoRunning ? (
              <button
                id="btn-start-demo"
                onClick={onStartDemo}
                className="px-3.5 py-1.5 rounded-md font-mono text-xs font-bold tracking-wide bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-950 flex items-center gap-1.5 border border-emerald-400/40 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                START DEMO
              </button>
            ) : isPaused ? (
              <button
                id="btn-resume-demo"
                onClick={onResumeDemo}
                className="px-3 py-1.5 rounded-md font-mono text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                RESUME
              </button>
            ) : (
              <button
                id="btn-pause-demo"
                onClick={onPauseDemo}
                className="px-3 py-1.5 rounded-md font-mono text-xs font-bold bg-amber-700/80 hover:bg-amber-600 text-amber-100 flex items-center gap-1.5 border border-amber-500/40 transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                PAUSE
              </button>
            )}

            <button
              id="btn-trigger-fire"
              onClick={onTriggerFire}
              className="px-3 py-1.5 rounded-md font-mono text-xs font-bold bg-rose-900/70 hover:bg-rose-800 text-rose-200 border border-rose-600/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Manually inject high fire intensity in Zone C"
            >
              <Zap className="w-3.5 h-3.5" />
              TRIGGER FIRE
            </button>

            <button
              id="btn-reset-demo"
              onClick={onResetDemo}
              className="p-2 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer"
              title="Reset simulation to nominal baseline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-4 flex items-center gap-1 overflow-x-auto border-t border-slate-900 text-xs font-mono scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 font-medium tracking-wider transition-colors whitespace-nowrap border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === tab.id
                ? 'border-emerald-400 text-emerald-400 bg-emerald-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            {tab.id === 'live' && <Activity className="w-3.5 h-3.5" />}
            {tab.id === 'fire_inhale' && <Flame className="w-3.5 h-3.5" />}
            {tab.id === 'satellite' && <Satellite className="w-3.5 h-3.5" />}
            {tab.id === 'network' && <Wifi className="w-3.5 h-3.5" />}
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
};
