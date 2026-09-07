import React from 'react';
import { SystemEvent } from '../types';
import { Clock, ShieldAlert, CheckCircle2, AlertTriangle, Info, Flame, Wifi } from 'lucide-react';

interface EventTimelineProps {
  events: SystemEvent[];
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events }) => {
  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <Flame className="w-3.5 h-3.5 text-rose-400" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return 'bg-rose-950/80 text-rose-300 border-rose-600/50';
      case 'warning':
        return 'bg-amber-950/80 text-amber-300 border-amber-600/50';
      case 'success':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="bg-slate-900/90 rounded-xl border border-slate-800 p-3 shadow-xl font-mono flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            REAL-TIME EVENT TIMELINE & AUDIT LOG
          </span>
        </div>
        <span className="text-[10px] text-slate-500">{events.length} events recorded</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-72 scrollbar-thin">
        {events.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-xs">Awaiting simulation events...</div>
        ) : (
          events.map((evt, idx) => {
            const timeStr = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString([], { hour12: false })
              : '00:00:00';

            return (
              <div
                key={`${evt.id || 'evt'}-${idx}`}
                className="bg-slate-950/90 p-2 rounded border border-slate-800/80 flex items-start gap-2 text-xs transition-colors hover:border-slate-700"
              >
                <div className="mt-0.5">{getSeverityIcon(evt.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-slate-400">{timeStr}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase ${getSeverityBadge(evt.severity)}`}>
                      {evt.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-200 leading-snug break-words">
                    <span className="text-cyan-400 font-semibold mr-1">[{evt.source}]</span>
                    {evt.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
