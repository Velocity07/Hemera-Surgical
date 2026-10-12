import { create } from 'zustand';
import { type VitalMetrics, type NetworkDiagnostics, DriftSeverity } from '../types/telemetry';

export const BUFFER_CAPACITY = 2048;
export const BUFFER_MASK = BUFFER_CAPACITY - 1;

export interface ChannelBuffers {
    ecg: Float32Array;
    spo2: Float32Array;
    abp: Float32Array;
    co2: Float32Array;
    writeIndex: number;
    totalSamplesWritten: number;
}

interface VitalsStoreState {
    channels: ChannelBuffers;
    metrics: VitalMetrics;
    diagnostics: NetworkDiagnostics;
    isConnected: boolean;
    activeAlarms: string[];
    audioMuted: boolean;

    // Actions
    pushSamples: (ecg: number[], spo2: number[], abp: number[], co2: number[]) => void;
    setMetrics: (metrics: VitalMetrics) => void;
    updateDiagnostics: (diag: Partial<NetworkDiagnostics>) => void;
    setConnectionStatus: (status: boolean) => void;
    toggleAudioMute: () => void;
    clearAlarms: () => void;
}

export const useVitalsStore = create<VitalsStoreState>((set, get) => ({
    channels: {
        ecg: new Float32Array(BUFFER_CAPACITY),
        spo2: new Float32Array(BUFFER_CAPACITY),
        abp: new Float32Array(BUFFER_CAPACITY),
        co2: new Float32Array(BUFFER_CAPACITY),
        writeIndex: 0,
        totalSamplesWritten: 0,
    },

    metrics: {
        heartRate: 72,
        pulseOx: 99,
        systolicBP: 118,
        diastolicBP: 76,
        meanArterialPressure: 90,
        etco2: 38,
        respRate: 12,
        bispectralIndex: 46,
        driftProbability: 0.04,
        mac: 1.05,
        severity: DriftSeverity.NORMAL,
        timestamp: Date.now(),
    },

    diagnostics: {
        fps: 60,
        rttMs: 8.4,
        packetsPerSec: 100,
        jitterMs: 0.6,
        backendConnected: false,
    },

    isConnected: false,
    activeAlarms: [],
    audioMuted: false,

    pushSamples: (ecg, spo2, abp, co2) => {
        const { channels } = get();
        const batchSize = ecg.length;
        let head = channels.writeIndex;

        for (let i = 0; i < batchSize; i++) {
            channels.ecg[head] = ecg[i];
            channels.spo2[head] = spo2[i];
            channels.abp[head] = abp[i];
            channels.co2[head] = co2[i];

            head = (head + 1) & BUFFER_MASK;
        }

        channels.writeIndex = head;
        channels.totalSamplesWritten += batchSize;
    },

    setMetrics: (incomingMetrics) => {
        set(() => {
            const alarms: string[] = [];
            if (incomingMetrics.severity === DriftSeverity.CRITICAL_DRIFT) {
                alarms.push('CRITICAL: Rapid Emergence / Hemodynamic Anomaly');
            } else if (incomingMetrics.severity === DriftSeverity.DRIFT_SUSPECTED) {
                alarms.push('WARNING: Anesthetic Depth Drift Deviation');
            }

            return {
                metrics: incomingMetrics,
                activeAlarms: alarms,
            };
        });
    },

    updateDiagnostics: (diag) => {
        set((state) => ({
            diagnostics: { ...state.diagnostics, ...diag },
        }));
    },

    setConnectionStatus: (status: boolean) => {
        set((state) => ({
            isConnected: status,
            diagnostics: { ...state.diagnostics, backendConnected: status },
        }));
    },

    toggleAudioMute: () => set((state) => ({ audioMuted: !state.audioMuted })),
    clearAlarms: () => set({ activeAlarms: [] }),
}));