export const api = {
  async getSystemStatus() {
    const res = await fetch('/api/system/status');
    return res.json();
  },

  async startDemo() {
    const res = await fetch('/api/demo/start', { method: 'POST' });
    return res.json();
  },

  async pauseDemo() {
    const res = await fetch('/api/demo/pause', { method: 'POST' });
    return res.json();
  },

  async resumeDemo() {
    const res = await fetch('/api/demo/resume', { method: 'POST' });
    return res.json();
  },

  async resetDemo() {
    const res = await fetch('/api/demo/reset', { method: 'POST' });
    return res.json();
  },

  async triggerCooperateStep() {
    const res = await fetch('/api/demo/cooperate', { method: 'POST' });
    return res.json();
  },

  async jumpToStage(stage: string | number) {
    const res = await fetch('/api/demo/jump', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage })
    });
    return res.json();
  },

  async setDemoSpeed(speed: number) {
    const res = await fetch('/api/demo/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed })
    });
    return res.json();
  },

  async triggerFire(intensity = 85) {
    const res = await fetch('/api/simulation/fire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intensity })
    });
    return res.json();
  },

  async triggerManualFire(zone = 'Zone C', intensity = 85) {
    const res = await fetch('/api/simulation/fire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone, intensity })
    });
    return res.json();
  },

  async failNode(nodeId: string) {
    const res = await fetch('/api/simulation/node-fail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId })
    });
    return res.json();
  },

  async toggleInternet() {
    const res = await fetch('/api/simulation/internet-fail', { method: 'POST' });
    return res.json();
  },

  async toggleHotspot(zone = 'Zone C') {
    const res = await fetch('/api/simulation/hotspot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zone })
    });
    return res.json();
  },

  async triggerScenario(scenario: 'A' | 'B' | 'C') {
    const res = await fetch('/api/simulation/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario })
    });
    return res.json();
  },

  async testDisagreementScenario(scenario: 'A' | 'B' | 'C') {
    return this.triggerScenario(scenario);
  },

  async postHardwareSensorData(nodeId: string, data: any) {
    const res = await fetch(`/api/nodes/${nodeId}/sensor-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async getSatelliteData() {
    const res = await fetch('/api/satellite/hotspots');
    return res.json();
  },

  async getEvents() {
    const res = await fetch('/api/events');
    return res.json();
  },

  async getAlerts() {
    const res = await fetch('/api/alerts');
    return res.json();
  },

  async getReplayHistory() {
    const res = await fetch('/api/replay');
    return res.json();
  },

  async getAnalytics() {
    const res = await fetch('/api/analytics');
    return res.json();
  },

  async updateSettings(settings: any) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  }
};
