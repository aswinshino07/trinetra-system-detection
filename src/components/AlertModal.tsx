import React, { useState } from 'react';
import { GatewayAlert } from '../types';
import { AlertTriangle, Flame, ShieldAlert, CheckCircle2, X, Bell, Minimize2, Maximize2 } from 'lucide-react';

interface AlertModalProps {
  alert: GatewayAlert | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({ alert, isOpen, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen || !alert) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 animate-bounce">
        <button
          onClick={() => setIsMinimized(false)}
          className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono font-bold text-xs shadow-2xl shadow-red-950 border border-red-400 flex items-center gap-2 cursor-pointer"
        >
          <Flame className="w-4 h-4 text-white fill-current animate-pulse" />
          <span>WILDFIRE ALERT: {alert.zone} ({(alert.fire_signature * 100).toFixed(0)}%)</span>
          <Maximize2 className="w-3.5 h-3.5 ml-1 text-red-200" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md animate-fade-in font-mono">
      {/* Flashing Red Screen Perimeter Border */}
      <div className="fixed inset-0 pointer-events-none border-8 border-red-600/80 animate-pulse" />

      <div className="bg-slate-950 border-2 border-red-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-red-900/60 relative overflow-hidden text-slate-100">
        {/* Glowing Top Stripe */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse" />

        {/* Top Control buttons */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Minimize to watch mesh map"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header Alert Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-900/60 border border-red-500/60 flex items-center justify-center shadow-lg shadow-red-950 animate-bounce">
            <Flame className="w-7 h-7 text-red-400 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-600 text-white uppercase tracking-wider animate-pulse">
                CRITICAL EMERGENCY
              </span>
              <span className="text-xs text-red-300 font-bold">GATEWAY CONFIRMED</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-wide mt-0.5">
              {alert.title}
            </h2>
          </div>
        </div>

        {/* Highlight Grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase">Fire Signature</span>
            <div className="text-2xl font-black text-red-400">
              {(alert.fire_signature * 100).toFixed(0)}%
            </div>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-[10px] uppercase">Neighbour Consensus</span>
            <div className="text-2xl font-black text-emerald-400">
              {alert.neighbour_verification}
            </div>
          </div>
        </div>

        {/* Incident Metadata */}
        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs space-y-1.5 mb-4">
          <div className="flex justify-between">
            <span className="text-slate-400">Originating Node:</span>
            <span className="text-cyan-400 font-bold">{alert.source_node} (Zone {alert.zone})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Satellite Corroboration:</span>
            <span className={alert.satellite_evidence ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
              {alert.satellite_evidence ? 'YES (VIIRS S-NPP Hotspot)' : 'NO / ABSENT'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Ground Sensors:</span>
            <span className="text-emerald-400 font-bold">CONFIRMED MULTI-MODAL ANOMALY</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Mesh Ingress Path:</span>
            <span className="text-slate-200 font-bold">{alert.network_path}</span>
          </div>
        </div>

        {/* Evidence Checklist */}
        <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-3 mb-5">
          <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block mb-1.5">
            CORROBORATING SENSOR EVIDENCE
          </span>
          <ul className="text-xs text-red-100 space-y-1">
            {alert.evidence_summary.map((line, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-red-400 font-bold">✓</span>
                <span className="text-[11px]">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Acknowledge Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-lg font-mono font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          ACKNOWLEDGE WILDFIRE WARNING & RESUME MONITORING
        </button>
      </div>
    </div>
  );
};
