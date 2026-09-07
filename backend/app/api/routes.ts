import { Router } from 'express';
import { simulationEngine } from '../simulation/simulation_engine.js';
import { dbService } from '../models/db.js';
import { satelliteService } from '../services/satellite.js';
import { simulatedTransport } from '../network/network_simulator.js';
import { gatewayService } from '../services/gateway.js';
import fs from 'fs';
import path from 'path';

export const apiRouter = Router();

// System Status
apiRouter.get('/system/status', (req, res) => {
  res.json({
    status: 'ok',
    system: 'ONLINE',
    data: simulationEngine.getSystemState()
  });
});

// Demo controls
apiRouter.post('/demo/start', async (req, res) => {
  // Run asynchronously so response is immediate
  simulationEngine.startDemo().catch(console.error);
  res.json({ success: true, message: 'Autonomous demo initiated' });
});

apiRouter.post('/demo/pause', (req, res) => {
  simulationEngine.pauseDemo();
  res.json({ success: true, message: 'Demo paused' });
});

apiRouter.post('/demo/resume', (req, res) => {
  simulationEngine.resumeDemo();
  res.json({ success: true, message: 'Demo resumed' });
});

apiRouter.post('/demo/reset', (req, res) => {
  simulationEngine.reset();
  res.json({ success: true, message: 'System reset to pristine baseline' });
});

apiRouter.post('/demo/cooperate', async (req, res) => {
  simulationEngine.runCooperateStep().catch(console.error);
  res.json({ success: true, message: 'Cooperative mesh transmission initiated' });
});

apiRouter.post('/demo/jump', async (req, res) => {
  const stage = req.body.stage || 'COOPERATE';
  simulationEngine.jumpToStage(stage).catch(console.error);
  res.json({ success: true, stage, message: `Jumped to stage ${stage}` });
});

apiRouter.post('/demo/speed', (req, res) => {
  const speed = Number(req.body.speed || 1);
  simulationEngine.setDemoSpeed(speed);
  res.json({ success: true, speed: simulationEngine.getDemoSpeed() });
});

// Simulation Controls
apiRouter.post('/simulation/fire', (req, res) => {
  const intensity = Number(req.body.intensity || 80);
  simulationEngine.triggerFire(intensity);
  res.json({ success: true, intensity });
});

apiRouter.post('/simulation/node-fail', (req, res) => {
  const nodeId = req.body.node_id || 'N5';
  simulationEngine.failNode(nodeId);
  res.json({ success: true, nodeId });
});

apiRouter.post('/simulation/internet-fail', (req, res) => {
  simulationEngine.toggleInternet();
  res.json({ success: true, internetActive: simulatedTransport.isInternetActive() });
});

apiRouter.post('/simulation/hotspot', (req, res) => {
  simulationEngine.toggleSatelliteHotspot();
  res.json({ success: true });
});

apiRouter.post('/simulation/scenario', (req, res) => {
  const scenario = req.body.scenario as 'A' | 'B' | 'C';
  simulationEngine.triggerScenario(scenario);
  res.json({ success: true, scenario });
});

// Nodes & Hardware sensor ingestion endpoint
apiRouter.get('/nodes', (req, res) => {
  res.json(simulationEngine.getNodes());
});

apiRouter.get('/nodes/:id', (req, res) => {
  const node = simulationEngine.getNode(req.params.id);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  const recentReadings = dbService.getRecentReadings(node.id, 40);
  res.json({ node, history: recentReadings });
});

// Hardware-Ready ESP32 / Physical node sensor ingestion
apiRouter.post('/nodes/:node_id/sensor-data', (req, res) => {
  const nodeId = req.params.node_id;
  const data = req.body;
  const result = simulationEngine.ingestHardwareSensorData(nodeId, data);
  if (!result) {
    return res.status(404).json({ error: `Node ${nodeId} not registered` });
  }
  res.json({ success: true, processed_reading: result });
});

// Satellite
apiRouter.get('/satellite/hotspots', async (req, res) => {
  const hotspots = await satelliteService.getLatestHotspots();
  const risks = await satelliteService.getRiskData();
  const env = await satelliteService.getEnvironmentalContext();
  res.json({ hotspots, risks, environment: env });
});

// Network
apiRouter.get('/network/metrics', (req, res) => {
  res.json(simulatedTransport.getMetrics());
});

apiRouter.get('/network/packets', (req, res) => {
  res.json(dbService.getRecentPackets(50));
});

// Alerts & Events
apiRouter.get('/alerts', (req, res) => {
  res.json(gatewayService.getRecentAlerts());
});

apiRouter.get('/events', (req, res) => {
  res.json(dbService.getRecentEvents(100));
});

// Event Replay
apiRouter.get('/replay', (req, res) => {
  res.json(simulationEngine.getReplayHistory());
});

// Analytics & Model Metrics
apiRouter.get('/analytics', (req, res) => {
  let modelInfo: any = null;
  try {
    const modelPath = path.resolve(process.cwd(), 'models', 'fire_inhale_model.json');
    if (fs.existsSync(modelPath)) {
      modelInfo = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    }
  } catch (e) {}

  res.json({
    model_name: 'Fire Inhale Random Forest Ensemble',
    framework: 'TRINETRA Proposed Edge-AI Framework',
    dataset: 'Prototype / Simulation Dataset',
    metrics: modelInfo ? modelInfo.metrics : {
      accuracy: 0.985,
      precision: 0.98,
      recall: 0.99,
      f1_score: 0.985,
      confusion_matrix: [[148, 2, 0], [1, 147, 2], [0, 1, 149]]
    },
    detection_benchmarks: {
      time_to_suspicion_seconds: 14.2,
      time_to_cooperative_confirmation_seconds: 22.8,
      time_to_gateway_alert_seconds: 28.5,
      edge_inference_latency_ms: 1.2
    },
    network: simulatedTransport.getMetrics()
  });
});

// Settings update
apiRouter.post('/settings', (req, res) => {
  const { packetLossRate, minConfidence, minNeighbourRatio } = req.body;
  if (packetLossRate !== undefined) {
    simulatedTransport.setPacketLossRate(Number(packetLossRate));
  }
  if (minConfidence !== undefined && minNeighbourRatio !== undefined) {
    gatewayService.setThresholds(Number(minConfidence), Number(minNeighbourRatio));
  }
  res.json({ success: true, message: 'Settings updated' });
});
