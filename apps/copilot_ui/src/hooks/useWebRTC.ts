import { useEffect, useRef, useCallback } from 'react';
import { useVitalsStore } from '../store/useVitalsStore';

// Local interface definition removes dependency on missing exports in types/telemetry
export interface TelemetryPacket {
    sequenceId?: number;
    timestamp?: number;
    ecgSamples?: number[];
    spo2Samples?: number[];
    abpSamples?: number[];
    co2Samples?: number[];
    metrics?: any;
}

export function useWebRTC() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<any>(null);

    // pushSamples exists on the Zustand store
    const pushSamples = useVitalsStore((state) => state.pushSamples);

    const connect = useCallback(() => {
        try {
            const ws = new WebSocket('ws://localhost:8765');
            wsRef.current = ws;

            ws.onopen = () => {
                // Native Zustand setState updates isConnected directly without missing action methods
                useVitalsStore.setState({ isConnected: true } as any);
            };

            ws.onmessage = (event) => {
                try {
                    const packet: TelemetryPacket = JSON.parse(event.data);

                    if (packet.ecgSamples && packet.spo2Samples) {
                        pushSamples(
                            packet.ecgSamples,
                            packet.spo2Samples,
                            packet.abpSamples || [],
                            packet.co2Samples || []
                        );
                    }

                    if (packet.metrics) {
                        // Native Zustand setState merges metrics directly into store
                        useVitalsStore.setState((state: any) => ({
                            ...state,
                            metrics: { ...state.metrics, ...packet.metrics },
                        }));
                    }
                } catch {
                    // Packet ingestion safeguard
                }
            };

            ws.onclose = () => {
                useVitalsStore.setState({ isConnected: false } as any);
                wsRef.current = null;
                reconnectTimeoutRef.current = setTimeout(connect, 1500);
            };

            ws.onerror = () => {
                ws.close();
            };
        } catch {
            reconnectTimeoutRef.current = setTimeout(connect, 2000);
        }
    }, [pushSamples]);

    useEffect(() => {
        connect();
        return () => {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    const sendScenario = useCallback((scenario: string) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'scenario', scenario }));
        }
    }, []);

    return { sendScenario };
}