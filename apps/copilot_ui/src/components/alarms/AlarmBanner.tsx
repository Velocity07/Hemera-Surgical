import React from 'react';
import { useVitalsStore } from '../../store/useVitalsStore';

export const AlarmBanner: React.FC = () => {
    const metrics = useVitalsStore((state) => state.metrics);
    const audioMuted = useVitalsStore((state) => (state as any).audioMuted);
    const toggleAudioMute = useVitalsStore((state) => (state as any).toggleAudioMute);

    const severity = metrics?.severity;
    const isCritical = severity === 'CRITICAL_DRIFT';
    const isWarning = severity === 'DRIFT_SUSPECTED';

    if (!isCritical && !isWarning) return null;

    return (
        <div
            className={`w-full px-4 py-2 flex items-center justify-between text-xs font-mono shadow-md border-b transition-colors ${isCritical
                    ? 'bg-red-950/90 border-red-600 text-red-200 animate-pulse'
                    : 'bg-amber-950/90 border-amber-600 text-amber-200'
                }`}
        >
            <div className="flex items-center gap-2 font-bold">
                <span>{isCritical ? 'CRITICAL TIER-1 SURGICAL ALERT' : 'CLINICAL ADVISORY'}</span>
                <span className="text-slate-400">|</span>
                <span className="font-normal text-[11px]">
                    {isCritical
                        ? 'CRITICAL: Rapid Emergence / Hemodynamic Anomaly Detected'
                        : 'WARNING: Anesthetic Depth Drift Deviation'}
                </span>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => { }}
                    className="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200"
                >
                    ACKNOWLEDGE
                </button>
                {toggleAudioMute && (
                    <button
                        onClick={toggleAudioMute}
                        className="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200"
                    >
                        {audioMuted ? 'UNMUTE' : 'MUTE'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default AlarmBanner;