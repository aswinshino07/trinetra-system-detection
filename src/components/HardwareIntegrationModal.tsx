import React, { useState } from 'react';
import { Cpu, Send, Check, X, Terminal, Radio, Code } from 'lucide-react';
import { api } from '../services/api';

interface HardwareIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HardwareIntegrationModal: React.FC<HardwareIntegrationModalProps> = ({ isOpen, onClose }) => {
  const [nodeId, setNodeId] = useState('N3');
  const [temp, setTemp] = useState('46.2');
  const [humidity, setHumidity] = useState('32.0');
  const [smoke, setSmoke] = useState('285.0');
  const [co, setCo] = useState('12.4');
  const [acoustic, setAcoustic] = useState('0.73');
  const [responseLog, setResponseLog] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSendSensorData = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        node_id: nodeId,
        timestamp: new Date().toISOString(),
        temperature: parseFloat(temp),
        humidity: parseFloat(humidity),
        smoke: parseFloat(smoke),
        co: parseFloat(co),
        acoustic: parseFloat(acoustic)
      };

      const res = await api.postHardwareSensorData(nodeId, payload);
      setResponseLog(res);
    } catch (err: any) {
      setResponseLog({ error: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono animate-fade-in">
      <div className="bg-slate-950 border border-slate-700 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="p-2 rounded-xl bg-cyan-950/80 border border-cyan-500/50 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                HARDWARE-READY INTERFACE & ESP32 SPECIFICATION
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-600/40">
                ACTIVE REST ENDPOINT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct telemetry ingestion endpoint for physical ESP32 sensor nodes & Wi-Fi HaLow transceivers
            </p>
          </div>
        </div>

        {/* Hardware Architecture Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-xs">
            <h3 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5 text-cyan-400">
              <Radio className="w-4 h-4" /> PHYSICAL HARDWARE STACK
            </h3>
            <ul className="space-y-1.5 text-slate-300 text-[11px]">
              <li><strong className="text-white">Microcontroller:</strong> ESP32-S3 Dual-Core Xtensa LX7 (240MHz)</li>
              <li><strong className="text-white">Sub-GHz RF:</strong> Newracom NRC7292 Wi-Fi HaLow (850-950MHz, &gt;1km range)</li>
              <li><strong className="text-white">Thermal & RH:</strong> Bosch BME280 Digital Sensor (I2C 0x76)</li>
              <li><strong className="text-white">Particulate Smoke:</strong> MQ-2 Gas & Smoke Ionization (ADC GPIO34)</li>
              <li><strong className="text-white">Carbon Monoxide:</strong> MQ-7 Electrochemical Sensor (ADC GPIO35)</li>
              <li><strong className="text-white">Crackling Acoustic:</strong> INMP441 MEMS Microphone (I2S Digital)</li>
              <li><strong className="text-white">Power System:</strong> 18650 LiFePO4 + 6V Solar Harvesting</li>
            </ul>
          </div>

          {/* Test Injector Form */}
          <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-xs flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-200 mb-2 flex items-center gap-1.5 text-emerald-400">
                <Terminal className="w-4 h-4" /> LIVE SENSOR DATA INJECTOR
              </h3>
              <p className="text-[10px] text-slate-400 mb-3">
                Send a real sensor telemetry payload directly into the Fire Inhale Edge-AI pipeline.
              </p>

              <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Target Node</label>
                  <select
                    value={nodeId}
                    onChange={(e) => setNodeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 text-xs"
                  >
                    {['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'].map((id) => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Temp (°C)</label>
                  <input
                    type="number"
                    value={temp}
                    onChange={(e) => setTemp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Humidity (%)</label>
                  <input
                    type="number"
                    value={humidity}
                    onChange={(e) => setHumidity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Smoke (ppm)</label>
                  <input
                    type="number"
                    value={smoke}
                    onChange={(e) => setSmoke(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">CO (ppm)</label>
                  <input
                    type="number"
                    value={co}
                    onChange={(e) => setCo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Acoustic (0-1)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={acoustic}
                    onChange={(e) => setAcoustic(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1 text-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleSendSensorData}
              disabled={isSubmitting}
              className="w-full mt-2 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {isSubmitting ? 'Transmitting to Edge AI...' : 'POST /api/nodes/{id}/sensor-data'}
            </button>
          </div>
        </div>

        {/* Response / Curl snippet */}
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 text-xs">
          <div className="flex items-center justify-between text-slate-400 text-[10px] mb-1">
            <span className="flex items-center gap-1 font-bold text-cyan-400">
              <Code className="w-3.5 h-3.5" /> CURL / EMBEDDED C CODE EXAMPLE
            </span>
            <span>HTTP/1.1 200 OK</span>
          </div>

          <pre className="bg-slate-900/90 p-2.5 rounded text-[11px] text-slate-300 overflow-x-auto">
{`curl -X POST http://localhost:3000/api/nodes/${nodeId}/sensor-data \\
  -H "Content-Type: application/json" \\
  -d '{
    "node_id": "${nodeId}",
    "timestamp": "${new Date().toISOString()}",
    "temperature": ${temp},
    "humidity": ${humidity},
    "smoke": ${smoke},
    "co": ${co},
    "acoustic": ${acoustic}
  }'`}
          </pre>

          {responseLog && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-800">
              <span className="text-[10px] font-bold text-emerald-400 block mb-1">
                EDGE AI PIPELINE RESPONSE:
              </span>
              <pre className="bg-slate-900/90 p-2 rounded text-[10px] text-emerald-300 overflow-x-auto">
                {JSON.stringify(responseLog, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
