import React, { useState } from 'react';
import { useTrinetraStream } from './hooks/useTrinetraStream';
import { api } from './services/api';
import { Header } from './components/Header';
import { PhaseTracker } from './components/PhaseTracker';
import { ForestMap } from './components/ForestMap';
import { FireInhalePanel } from './components/FireInhalePanel';
import { EvidenceFusionPanel } from './components/EvidenceFusionPanel';
import { SensorCharts } from './components/SensorCharts';
import { EventTimeline } from './components/EventTimeline';
import { AlertModal } from './components/AlertModal';
import { HardwareIntegrationModal } from './components/HardwareIntegrationModal';
import { SatelliteView } from './pages/SatelliteView';
import { FireInhaleView } from './pages/FireInhaleView';
import { NetworkView } from './pages/NetworkView';
import { EventsReplayView } from './pages/EventsReplayView';
import { AnalyticsView } from './pages/AnalyticsView';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('live');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [internetOnline, setInternetOnline] = useState<boolean>(true);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);

  const {
    nodes,
    selectedNodeId,
    setSelectedNodeId,
    selectedNode,
    activePackets,
    activeAlert,
    showAlertModal,
    setShowAlertModal,
    events,
    evidenceFusion,
    networkMetrics,
    hotspots,
    zoneRisks,
    currentPhase,
    isDemoRunning,
    isPaused
  } = useTrinetraStream();

  const [demoSpeed, setDemoSpeed] = useState(1);

  // Control Handlers
  const handleStartDemo = async () => {
    try {
      await api.startDemo();
    } catch (e) {
      console.error('Failed to start demo:', e);
    }
  };

  const handleJumpStage = async (stageKey: string) => {
    try {
      await api.jumpToStage(stageKey);
    } catch (e) {
      console.error('Failed to jump stage:', e);
    }
  };

  const handleTriggerCooperate = async () => {
    try {
      await api.triggerCooperateStep();
    } catch (e) {
      console.error('Failed to trigger cooperate step:', e);
    }
  };

  const handleSetSpeed = async (speed: number) => {
    try {
      setDemoSpeed(speed);
      await api.setDemoSpeed(speed);
    } catch (e) {
      console.error('Failed to set demo speed:', e);
    }
  };

  const handlePauseDemo = async () => {
    try {
      await api.pauseDemo();
    } catch (e) {
      console.error('Failed to pause demo:', e);
    }
  };

  const handleResumeDemo = async () => {
    try {
      await api.resumeDemo();
    } catch (e) {
      console.error('Failed to resume demo:', e);
    }
  };

  const handleResetDemo = async () => {
    try {
      await api.resetDemo();
    } catch (e) {
      console.error('Failed to reset demo:', e);
    }
  };

  const handleTriggerFire = async () => {
    try {
      await api.triggerManualFire('Zone C');
    } catch (e) {
      console.error('Failed to trigger manual fire:', e);
    }
  };

  const handleFailNode = async (nodeId: string) => {
    try {
      await api.failNode(nodeId);
    } catch (e) {
      console.error('Failed to fail node:', e);
    }
  };

  const handleToggleInternet = async () => {
    try {
      const res = await api.toggleInternet();
      setInternetOnline(res.internet_online);
    } catch (e) {
      console.error('Failed to toggle internet:', e);
    }
  };

  const handleToggleHotspot = async () => {
    try {
      await api.toggleHotspot('Zone C');
    } catch (e) {
      console.error('Failed to toggle hotspot:', e);
    }
  };

  const handleSelectScenario = async (scenario: 'A' | 'B' | 'C') => {
    try {
      await api.testDisagreementScenario(scenario);
    } catch (e) {
      console.error('Failed to set disagreement scenario:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-black">
      {/* Critical Red Screen Alert Modal */}
      <AlertModal
        alert={activeAlert}
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
      />

      {/* ESP32 Hardware Integration Specs Modal */}
      <HardwareIntegrationModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />

      {/* Main Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDemoRunning={isDemoRunning}
        isPaused={isPaused}
        onStartDemo={handleStartDemo}
        onPauseDemo={handlePauseDemo}
        onResumeDemo={handleResumeDemo}
        onResetDemo={handleResetDemo}
        onTriggerFire={handleTriggerFire}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        internetOnline={internetOnline}
        onOpenHardware={() => setIsHardwareModalOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 md:p-6 flex flex-col">
        {/* Real-time 21-Phase Pipeline Status Banner */}
        <PhaseTracker
          currentPhase={currentPhase}
          isDemoRunning={isDemoRunning}
          onJumpStage={handleJumpStage}
          onTriggerCooperate={handleTriggerCooperate}
          currentSpeed={demoSpeed}
          onSetSpeed={handleSetSpeed}
        />

        {/* Tab 1: LIVE MONITOR (Primary Command Center) */}
        {activeTab === 'live' && (
          <div className="space-y-4 flex-1">
            {/* Split Screen 2-Column Command Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Forest & Wi-Fi HaLow Mesh Map + Sensor Charts */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <div className="h-[420px] sm:h-[480px]">
                  <ForestMap
                    nodes={nodes}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={setSelectedNodeId}
                    activePackets={activePackets}
                    hotspots={hotspots}
                    zoneRisks={zoneRisks}
                    onFailNode={handleFailNode}
                  />
                </div>

                {selectedNode && (
                  <div className="h-64 sm:h-72">
                    <SensorCharts selectedNode={selectedNode} />
                  </div>
                )}
              </div>

              {/* Right Column: Fire Inhale Edge-AI + Multi-Source Evidence Fusion + Event Log */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {selectedNode && (
                  <div>
                    <FireInhalePanel selectedNode={selectedNode} />
                  </div>
                )}

                <div>
                  <EvidenceFusionPanel
                    evidence={evidenceFusion}
                    onSelectScenario={handleSelectScenario}
                  />
                </div>

                <div>
                  <EventTimeline events={events} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: SATELLITE RECON */}
        {activeTab === 'satellite' && (
          <SatelliteView
            hotspots={hotspots}
            zoneRisks={zoneRisks}
            onToggleHotspot={handleToggleHotspot}
            onSelectScenario={handleSelectScenario}
          />
        )}

        {/* Tab 3: FIRE INHALE FRAMEWORK */}
        {activeTab === 'fire_inhale' && (
          <FireInhaleView
            nodes={nodes}
            selectedNode={selectedNode || nodes[0]}
          />
        )}

        {/* Tab 4: WI-FI HALOW MESH NETWORK */}
        {activeTab === 'network' && (
          <NetworkView
            metrics={networkMetrics}
            nodes={nodes}
            onFailNode={handleFailNode}
            onToggleInternet={handleToggleInternet}
          />
        )}

        {/* Tab 5: EVENTS & INCIDENT REPLAY */}
        {activeTab === 'events' && <EventsReplayView events={events} />}

        {/* Tab 6: ANALYTICS & BENCHMARKS */}
        {activeTab === 'analytics' && <AnalyticsView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-2.5 text-center text-[11px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>
            TRINETRA • Satellite-Guided Fire Inhale Technology & Wi-Fi HaLow Mesh
          </span>
          <span className="text-slate-600">
            Simulated Edge-AI Inference & Multi-Modal Corroboration Engine
          </span>
        </div>
      </footer>
    </div>
  );
}
