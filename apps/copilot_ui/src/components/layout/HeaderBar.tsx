import React from 'react';
import { useVitalsStore } from '../../store/useVitalsStore';

export const HeaderBar: React.FC = () => {
    const metrics = useVitalsStore((state) => state.metrics);
    const diagnostics = useVitalsStore((state) => state.diagnostics);
    const isConnected = useVitalsStore((state) => state.isConnected);
    const audioMuted = useVitalsStore((state) => (state as any).audioMuted);
    const toggleAudioMute = useVitalsStore((state) => (state as any).toggleAudioMute);

    const isCritical = metrics?.severity === 'CRITICAL_DRIFT';
    const isSuspected = metrics?.severity === 'DRIFT_SUSPECTED';

    // Defensive numeric formatters
    const macVal = metrics?.mac != null ? Number(metrics.mac) : 1.05;
    const sevoPercent = (macVal * 1.9).toFixed(1);
    const rttMs = diagnostics?.rttMs != null ? Number(diagnostics.rttMs).toFixed(1) : '1.0';
    const jitterMs = diagnostics?.jitterMs != null ? Number(diagnostics.jitterMs).toFixed(1) : '0.8';
    const driftProb =
        metrics?.driftProbability != null
            ? (Number(metrics.driftProbability) * 100).toFixed(1)
            : '4.0';

    return (
        <header className="flex items-center justify-between px-3 py-1.5 bg-[#0B0F17] border-b border-[#161F2E] text-xs font-mono shadow-md">
            {/* Brand & Active Agents */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold tracking-wider">
                    <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    HEMERA::SURGICAL
                </div>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">THEATRE 04</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">#HM-8921</span>
                <span className="text-slate-500">•</span>
                <span className="text-cyan-300 font-semibold">
                    SEVOFLURANE {sevoPercent}%
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-purple-300 font-semibold">
                    MAC {macVal.toFixed(2)}
                </span>
            </div>

            {/* Latency & Diagnostics */}
            <div className="flex items-center gap-4 text-[10px]">
                <div className="flex items-center gap-2 text-slate-400">
                    <span>{diagnostics?.fps ?? 60} FPS</span>
                    <span>•</span>
                    <span className="text-emerald-400">RTT: {rttMs}ms</span>
                    <span>•</span>
                    <span className="text-slate-400">JITTER: {jitterMs}ms</span>
                </div>

                {toggleAudioMute && (
                    <button
                        onClick={toggleAudioMute}
                        className={`px-1.5 py-0.5 rounded border text-[10px] transition-colors ${audioMuted
                                ? 'bg-amber-950/80 border-amber-600 text-amber-300'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        {audioMuted ? 'MUTED' : 'AUDIO'}
                    </button>
                )}

                {/* Dynamic S4 Latent Drift Probability Tag */}
                <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded border font-bold transition-all ${isCritical
                            ? 'bg-red-950 border-red-500 text-red-300 animate-pulse'
                            : isSuspected
                                ? 'bg-amber-950 border-amber-500 text-amber-300'
                                : 'bg-emerald-950/70 border-emerald-600 text-emerald-300'
                        }`}
                >
                    <span>S4 DRIFT PROBABILITY:</span>
                    <span>{driftProb}%</span>
                </div>

                {/* Connection Indicator */}
                <div className="flex items-center gap-1">
                    <span
                        className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-500'
                            }`}
                    />
                    <span className={isConnected ? 'text-emerald-400 font-semibold' : 'text-red-400'}>
                        {isConnected ? 'LIVE 100Hz' : 'CONNECTING'}
                    </span>
                </div>
            </div>
        </header>
    );
};