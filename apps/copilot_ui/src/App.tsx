import React, { useState, useEffect } from 'react';
import { HeaderBar } from './components/layout/HeaderBar';
import { WaveformGL } from './components/vitals/WaveformGL';
import { MetricCard } from './components/vitals/MetricCard';
import { DriftTrajectory } from './components/vitals/DriftTrajectory';
import { AlarmBanner } from './components/alarms/AlarmBanner';
import { useVitalsStore } from './store/useVitalsStore';
import { useWebRTC } from './hooks/useWebRTC';
import { audioEngine } from './utils/audioEngine';

// Pure React ErrorBoundary prevents blank white screens
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Workstation Render Exception:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-[#0B0F17] text-red-400 font-mono h-screen w-screen overflow-auto">
          <h1 className="text-xl font-bold text-red-500 mb-2">⚠️ Hemera Surgical Component Error</h1>
          <p className="text-xs text-slate-400 mb-4">A component threw an exception during render:</p>
          <pre className="bg-[#05070A] p-4 rounded border border-red-900/60 text-xs text-red-300 overflow-x-auto whitespace-pre-wrap">
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-700 rounded text-xs"
          >
            Reload Interface
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainDashboard: React.FC = () => {
  const rtc = useWebRTC();
  const sendScenario = rtc?.sendScenario || (() => { });

  const metrics = useVitalsStore((state) => state.metrics);
  const isConnected = useVitalsStore((state) => state.isConnected);

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [activeCase, setActiveCase] = useState<'STABLE' | 'DRIFT' | 'HYPOTENSION'>('STABLE');
  const [activeMarker, setActiveMarker] = useState<string | null>(null);

  const enableAudio = () => {
    try {
      const ok = audioEngine?.unlock?.();
      if (ok) setAudioUnlocked(true);
    } catch { }
  };

  useEffect(() => {
    if (!audioUnlocked) return;
    const hr = metrics?.heartRate ?? 72;
    if (hr <= 0) return;

    const intervalMs = Math.max(300, (60 / hr) * 1000);
    const pulseTimer = setInterval(() => {
      try {
        audioEngine?.playHeartbeat?.(metrics?.pulseOx ?? 99);
      } catch { }
    }, intervalMs);

    return () => clearInterval(pulseTimer);
  }, [audioUnlocked, metrics?.heartRate, metrics?.pulseOx]);

  useEffect(() => {
    if (!audioUnlocked) return;
    const isCritical = (metrics as any)?.severity === 'CRITICAL_DRIFT';
    if (isCritical) {
      audioEngine?.startEmergencyAlarm?.();
    } else {
      audioEngine?.stopAlarm?.();
    }
  }, [audioUnlocked, (metrics as any)?.severity]);

  const handleSelectCase = (scenario: 'STABLE' | 'DRIFT' | 'HYPOTENSION') => {
    enableAudio();
    setActiveCase(scenario);
    sendScenario(scenario);
  };

  const handleMarker = (marker: string) => {
    enableAudio();
    setActiveMarker(`${marker} @ ${new Date().toLocaleTimeString()}`);
    setTimeout(() => setActiveMarker(null), 4000);
  };

  const macDisplay =
    metrics?.mac != null ? Number(metrics.mac).toFixed(2) : '1.05';

  return (
    <div
      onClick={enableAudio}
      className="flex flex-col h-screen w-screen bg-[#030712] text-slate-100 font-sans select-none overflow-hidden"
    >
      <HeaderBar />
      <AlarmBanner />

      {!audioUnlocked && (
        <div
          onClick={enableAudio}
          className="bg-cyan-950/90 border-b border-cyan-500/50 px-4 py-1.5 flex items-center justify-between text-xs font-mono text-cyan-300 cursor-pointer hover:bg-cyan-900/90 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>CLINICAL AUDIO STANDBY: Click anywhere on screen to activate pulse tones.</span>
          </div>
          <button className="px-2.5 py-0.5 rounded bg-cyan-500 text-slate-950 font-bold text-[10px] uppercase">
            Enable Sound
          </button>
        </div>
      )}

      <main className="flex-1 grid grid-cols-12 gap-2 p-2 min-h-0 overflow-hidden">
        {/* Left Column: 4 Real-Time WebGL Channels + S4 Lookahead */}
        <section className="col-span-8 flex flex-col gap-1.5 h-full min-h-0">
          <div className="flex-1 min-h-0 rounded border border-[#161F2E] overflow-hidden bg-[#05070A]">
            <WaveformGL
              channelKey="ecg"
              label="ECG LEAD II"
              color={[0.13, 0.95, 0.55]}
              units="mV • 25 mm/s [1.0 mV/cm]"
            />
          </div>
          <div className="flex-1 min-h-0 rounded border border-[#161F2E] overflow-hidden bg-[#05070A]">
            <WaveformGL
              channelKey="spo2"
              label="PLETH / SPO2"
              color={[0.0, 0.85, 1.0]}
              units="% • Auto-Cal [x1.0]"
            />
          </div>
          <div className="flex-1 min-h-0 rounded border border-[#161F2E] overflow-hidden bg-[#05070A]">
            <WaveformGL
              channelKey="abp"
              label="ART PRESSURE (ABP)"
              color={[1.0, 0.72, 0.05]}
              units="mmHg • Radial [0-200]"
            />
          </div>
          <div className="flex-1 min-h-0 rounded border border-[#161F2E] overflow-hidden bg-[#05070A]">
            <WaveformGL
              channelKey="co2"
              label="CAPNOGRAPHY (ETCO2)"
              color={[0.95, 0.9, 0.1]}
              units="mmHg • Sidestream [0-50]"
            />
          </div>

          <DriftTrajectory />
        </section>

        {/* Right Column: Numeric Vitals & Controller */}
        <aside className="col-span-4 flex flex-col justify-between h-full min-h-0 gap-2">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              label="HEART RATE"
              value={metrics?.heartRate ?? 72}
              unit="BPM"
              source="ECG II"
              minNorm={60}
              maxNorm={90}
              color="#10B981"
            />
            <MetricCard
              label="PULSE OX"
              value={metrics?.pulseOx ?? 99}
              unit="% SpO2"
              source="PLETH"
              minNorm={95}
              maxNorm={100}
              color="#06B6D4"
            />
            <MetricCard
              label="ARTERIAL BP"
              value={`${metrics?.systolicBP ?? 118}/${metrics?.diastolicBP ?? 76}`}
              subValue={`(${metrics?.meanArterialPressure ?? 90})`}
              unit="mmHg"
              source="ART LINE"
              minNorm={65}
              maxNorm={105}
              color="#F59E0B"
            />
            <MetricCard
              label="END-TIDAL CO2"
              value={metrics?.etco2 ?? 38}
              subValue={`RR ${metrics?.respRate ?? 12}`}
              unit="mmHg"
              source="CAPNO"
              minNorm={35}
              maxNorm={45}
              color="#EAB308"
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col justify-center">
            <MetricCard
              label="BISPECTRAL INDEX (BIS)"
              value={metrics?.bispectralIndex ?? 45}
              subValue={`MAC ${macDisplay}`}
              unit="DEPTH"
              source="SSM S4"
              minNorm={40}
              maxNorm={60}
              color={(metrics as any)?.severity === 'CRITICAL_DRIFT' ? '#EF4444' : '#A855F7'}
            />
          </div>

          {/* Clinical Workstation Controller */}
          <div className="flex flex-col gap-2 p-2.5 bg-[#0B0F17] border border-[#161F2E] rounded shadow-lg font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-[10px] uppercase font-bold text-slate-300">
                Intraoperative Workstation Feed
              </span>
              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                {isConnected ? 'LIVE S4 RECURRENCE' : 'RECONNECTING...'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleSelectCase('STABLE')}
                className={`px-2 py-1.5 text-[9px] rounded border transition-all text-left truncate ${activeCase === 'STABLE'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
              >
                Case 1042: Stable
              </button>
              <button
                onClick={() => handleSelectCase('DRIFT')}
                className={`px-2 py-1.5 text-[9px] rounded border transition-all text-left truncate ${activeCase === 'DRIFT'
                    ? 'bg-red-950/80 border-red-500 text-red-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
              >
                Emergence Drift
              </button>
              <button
                onClick={() => handleSelectCase('HYPOTENSION')}
                className={`px-2 py-1.5 text-[9px] rounded border transition-all text-left truncate ${activeCase === 'HYPOTENSION'
                    ? 'bg-amber-950/80 border-amber-500 text-amber-300 font-bold shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
              >
                Hypotension
              </button>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-[9px] text-slate-400">Clinical Markers:</span>
              <div className="flex gap-1">
                {['Incision', 'Bolus', 'Deepen'].map((marker) => (
                  <button
                    key={marker}
                    onClick={() => handleMarker(marker)}
                    className="px-2 py-0.5 text-[8px] bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded active:bg-cyan-900 transition-colors"
                  >
                    +{marker}
                  </button>
                ))}
              </div>
            </div>

            {activeMarker && (
              <div className="text-[8px] text-cyan-400 text-right animate-pulse">
                {activeMarker}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DashboardErrorBoundary>
      <MainDashboard />
    </DashboardErrorBoundary>
  );
};

export default App;