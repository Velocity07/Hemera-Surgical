export const DriftSeverity = {
    NORMAL: 'NORMAL',
    DRIFT_SUSPECTED: 'DRIFT_SUSPECTED',
    CRITICAL_DRIFT: 'CRITICAL_DRIFT',
} as const;

export type DriftSeverity = (typeof DriftSeverity)[keyof typeof DriftSeverity];

export const ChannelType = {
    ECG: 'ECG',       // Lead II (mV)
    SPO2: 'SPO2',     // Photoplethysmogram (%)
    ABP: 'ABP',       // Invasive Arterial Blood Pressure (mmHg)
    CO2: 'CO2',       // End-Tidal Capnography (mmHg)
} as const;

export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export interface VitalMetrics {
    heartRate: number;              // Beats Per Minute (BPM)
    pulseOx: number;                // Blood Oxygen Saturation (% SpO2)
    systolicBP: number;             // Systolic Arterial Pressure (mmHg)
    diastolicBP: number;            // Diastolic Arterial Pressure (mmHg)
    meanArterialPressure: number;   // MAP (mmHg)
    etco2: number;                  // End-Tidal CO2 (mmHg)
    respRate: number;               // Respiratory Rate (breaths/min)
    bispectralIndex: number;        // BIS Depth of Anesthesia (0-100)
    driftProbability: number;       // S4 SSM Emergence Drift Confidence [0.00, 1.00]
    mac: number;                    // Minimum Alveolar Concentration
    severity: DriftSeverity;
    timestamp: number;
}

export interface NetworkDiagnostics {
    fps: number;
    rttMs: number;
    packetsPerSec: number;
    jitterMs: number;
    backendConnected: boolean;
}

export interface TelemetryPacket {
    sequenceId: number;
    timestamp: number;
    ecgSamples: number[];
    spo2Samples: number[];
    abpSamples: number[];
    co2Samples: number[];
    metrics: VitalMetrics;
}