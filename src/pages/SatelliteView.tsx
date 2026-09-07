import React, { useState, useEffect } from 'react';
import { Satellite, ShieldAlert, Wind, Thermometer, Droplets, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { SatelliteHotspot } from '../types';
import { api } from '../services/api';

interface SatelliteViewProps {
  hotspots: SatelliteHotspot[];
  zoneRisks: Record<string, 'LOW' | 'MODERATE' | 'HIGH'>;
  onToggleHotspot: () => void;
  onSelectScenario: (scenario: 'A' | 'B' | 'C') => void;
}

export const SatelliteView: React.FC<SatelliteViewProps> = ({
  hotspots,
  zoneRisks,
  onToggleHotspot,
  onSelectScenario
}) => {
  const [envContext, setEnvContext] = useState<any>({
    wind_speed_kmh: 18.5,
    wind_direction: 'NE (45°)',
    ambient_temp_c: 29.4,
    relative_humidity: 28,
    fuel_moisture_index: 0.18,
    drought_code: 'EXTREME DRY FUEL (FWI 24.2)'
  });

  useEffect(() => {
    api.getSatelliteData().then((res) => {
      if (res.environment) setEnvContext(res.environment);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-600/40 text-rose-400">
            <Satellite className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">
              SATELLITE THERMAL RECONNAISSANCE LAYER
            </h2>
            <p className="text-xs text-slate-400">
              NASA FIRMS & VIIRS/MODIS Polar Orbiting Environmental Observation Interface
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleHotspot}
            className="px-3 py-1.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            Toggle Thermal Hotspot
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Zone Risk Matrix */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-lg md:col-span-2">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            TERRAIN RISK ZONES & ORBITAL OBSERVATION
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {Object.entries(zoneRisks).map(([zone, risk]) => (
              <div
                key={zone}
                className={`p-3 rounded-lg border transition-all ${
                  risk === 'HIGH'
                    ? 'bg-rose-950/60 border-rose-500/70 text-rose-300'
                    : risk === 'MODERATE'
                    ? 'bg-amber-950/60 border-amber-500/70 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs">{zone}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                    risk === 'HIGH' ? 'bg-rose-900/80 border-rose-500 text-rose-200 animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}>
                    {risk} RISK
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {zone === 'Zone C'
                    ? 'Deep Canyon Slope — Dense Pine & Dry Chaparral fuel bed.'
                    : 'Forest Ridge — Nominal fuel moisture condition.'}
                </p>
              </div>
            ))}
          </div>

          {/* Active Hotspot Table */}
          <div className="border-t border-slate-800 pt-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              ACTIVE SATELLITE HOTSPOT DETECTIONS
            </h4>
            {hotspots.length === 0 ? (
              <div className="p-4 bg-slate-950 rounded text-center text-slate-500 text-xs">
                No active thermal anomalies detected across recent satellite orbital passes.
              </div>
            ) : (
              <div className="space-y-2">
                {hotspots.map((h) => (
                  <div key={h.id} className="p-3 bg-slate-950 rounded-lg border border-red-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-red-400">{h.id}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 text-red-300 border border-red-600/40 font-bold">
                          {h.risk_level} RISK
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Coords: {h.lat}, {h.lng} • Sensor: {h.source} • Detected: {h.detection_time}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div className="text-slate-200 font-bold">FRP: {h.frp_mw} MW</div>
                      <div className="text-[10px] text-slate-400">Bright Temp: {h.brightness_temp_k} K ({(h.confidence * 100).toFixed(0)}% Conf)</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Environmental Context & NASA FIRMS config */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-lg space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-400" />
              ENVIRONMENTAL CONTEXT
            </h3>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Wind Velocity:</span>
                <span className="text-slate-200 font-bold">{envContext.wind_speed_kmh} km/h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Direction:</span>
                <span className="text-cyan-400 font-bold">{envContext.wind_direction}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ambient Temp:</span>
                <span className="text-slate-200 font-bold">{envContext.ambient_temp_c} °C</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Relative Humidity:</span>
                <span className="text-slate-200 font-bold">{envContext.relative_humidity} %</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fuel Moisture Index:</span>
                <span className="text-amber-400 font-bold">{envContext.fuel_moisture_index} (Critical)</span>
              </div>
              <div className="pt-1 border-t border-slate-800 text-[10px] text-rose-300">
                {envContext.drought_code}
              </div>
            </div>
          </div>

          {/* NASA FIRMS Integration Status */}
          <div className="border-t border-slate-800 pt-3">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-2">
              <Satellite className="w-4 h-4 text-emerald-400" />
              NASA FIRMS API CONNECTOR
            </h3>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle className="w-3.5 h-3.5" /> Deterministic Offline Simulator Active
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Supports <code className="text-cyan-300">FIRMS_MAP_KEY</code> environment variable. When unavailable or offline, TRINETRA executes calibrated satellite hotspot generation without failure.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
