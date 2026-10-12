import sys
from pathlib import Path

s4_path = str(Path(__file__).resolve().parent.parent.parent / "s4_engine")
if s4_path not in sys.path:
    sys.path.insert(0, s4_path)

import time
import math
from typing import Dict, Any, List
from drift_detector import S4EmergenceDetector

class ClinicalCaseStreamer:
    """
    Continuous Physiological Engine with Real-Time Phase Accumulation.
    Physically modulates heart rate, pressure waveforms, and capnography in real time.
    """
    def __init__(self, sampling_rate_hz: int = 100):
        self.fs = sampling_rate_hz
        self.dt = 1.0 / sampling_rate_hz
        self.t = 0.0
        self.sequence_id = 0
        self.scenario = "STABLE"

        # Continuous phase accumulators
        self.cardiac_phase = 0.0
        self.resp_phase = 0.0

        # Dynamic smoothed vital states
        self._current_hr = 72.0
        self._current_sys = 118.0
        self._current_dia = 76.0
        self._current_bis = 45.0
        self._current_spo2 = 99.0
        self._current_etco2 = 38.0
        self._current_resp_rate = 12.0
        self._current_mac = 1.05

        self.s4_detector = S4EmergenceDetector(state_dim=64)

    def set_scenario(self, scenario: str):
        if scenario in ["STABLE", "DRIFT", "HYPOTENSION"]:
            self.scenario = scenario

    def generate_batch(self, count: int = 10) -> Dict[str, Any]:
        # Target hemodynamic goals based on clinical plane
        if self.scenario == "DRIFT":
            target_hr = 104.0
            target_sys = 148.0
            target_dia = 94.0
            target_bis = 68.0
            target_spo2 = 98.0
            target_etco2 = 44.0
            target_rr = 18.0
            target_mac = 0.78
        elif self.scenario == "HYPOTENSION":
            target_hr = 52.0
            target_sys = 82.0
            target_dia = 48.0
            target_bis = 38.0
            target_spo2 = 96.0
            target_etco2 = 32.0
            target_rr = 10.0
            target_mac = 1.35
        else:  # STABLE
            target_hr = 72.0
            target_sys = 118.0
            target_dia = 76.0
            target_bis = 45.0
            target_spo2 = 99.0
            target_etco2 = 38.0
            target_rr = 12.0
            target_mac = 1.05

        # Smooth physiological damping
        self._current_hr += (target_hr - self._current_hr) * 0.08
        self._current_sys += (target_sys - self._current_sys) * 0.08
        self._current_dia += (target_dia - self._current_dia) * 0.08
        self._current_bis += (target_bis - self._current_bis) * 0.04
        self._current_spo2 += (target_spo2 - self._current_spo2) * 0.08
        self._current_etco2 += (target_etco2 - self._current_etco2) * 0.08
        self._current_resp_rate += (target_rr - self._current_resp_rate) * 0.08
        self._current_mac += (target_mac - self._current_mac) * 0.08

        cardiac_freq = self._current_hr / 60.0
        resp_freq = self._current_resp_rate / 60.0

        ecg_batch: List[float] = []
        spo2_batch: List[float] = []
        abp_batch: List[float] = []
        co2_batch: List[float] = []

        for _ in range(count):
            self.t += self.dt
            # Phase accumulation ensures waveforms physically speed up or slow down
            self.cardiac_phase = (self.cardiac_phase + cardiac_freq * self.dt) % 1.0
            self.resp_phase = (self.resp_phase + resp_freq * self.dt) % 1.0

            phi = self.cardiac_phase
            r_phi = self.resp_phase

            # 1. Real ECG Lead II morphology
            ecg = 0.0
            if 0.12 <= phi < 0.20:
                ecg += 0.14 * math.sin((phi - 0.12) * math.pi / 0.08)
            elif 0.28 <= phi < 0.30:
                ecg -= 0.18
            elif 0.30 <= phi < 0.34:
                ecg += 1.05
            elif 0.34 <= phi < 0.38:
                ecg -= 0.32
            elif 0.52 <= phi < 0.68:
                ecg += 0.26 * math.sin((phi - 0.52) * math.pi / 0.16)
            ecg_batch.append(round(ecg, 4))

            # 2. Arterial Blood Pressure with Dicrotic Notch & Catheter Dynamics
            if phi < 0.22:
                abp = math.sin((phi / 0.22) * (math.pi / 2.0)) * 1.15
            else:
                decay = (phi - 0.22) / 0.78
                base_decay = math.exp(-decay * 2.2)
                notch = 0.24 * math.exp(-((decay - 0.28) ** 2) / 0.010)
                abp = base_decay * 0.9 + notch

            # Scale ABP curve directly to current Systolic/Diastolic pressures
            abp_scaled = (abp * (self._current_sys / 120.0) * 1.3 - 0.65) * 0.75
            abp_batch.append(round(abp_scaled, 4))

            # 3. Plethysmogram (Finger Sensor, lagged behind ABP)
            pleth_phi = (phi + 0.16) % 1.0
            if pleth_phi < 0.32:
                pleth = math.sin((pleth_phi / 0.32) * math.pi * 0.5)
            else:
                decay = (pleth_phi - 0.32) / 0.68
                pleth = math.cos(decay * math.pi * 0.5) * 0.85
                if 0.16 <= decay < 0.36:
                    pleth += 0.16 * math.sin((decay - 0.16) * math.pi / 0.20)
            spo2_batch.append(round((pleth * 1.4 - 0.7) * 0.6, 4))

            # 4. Sidestream Capnography (Alveolar Phase III)
            co2 = -0.7
            if 0.20 <= r_phi < 0.68:
                plateau = (r_phi - 0.20) / 0.48
                co2 = 0.18 + (plateau * 0.12)
            elif 0.68 <= r_phi < 0.76:
                co2 = 0.18 - ((r_phi - 0.68) / 0.08) * 0.88
            co2_batch.append(round(co2, 4))

        self.sequence_id += 1
        calc_map = int((2 * self._current_dia + self._current_sys) / 3)

        s4_out = self.s4_detector.update(
            hr=self._current_hr,
            map_val=float(calc_map),
            etco2=self._current_etco2,
            current_bis=self._current_bis
        )

        return {
            "sequenceId": self.sequence_id,
            "timestamp": int(time.time() * 1000),
            "ecgSamples": ecg_batch,
            "spo2Samples": spo2_batch,
            "abpSamples": abp_batch,
            "co2Samples": co2_batch,
            "metrics": {
                "heartRate": int(round(self._current_hr)),
                "pulseOx": int(round(self._current_spo2)),
                "systolicBP": int(round(self._current_sys)),
                "diastolicBP": int(round(self._current_dia)),
                "meanArterialPressure": calc_map,
                "etco2": int(round(self._current_etco2)),
                "respRate": int(round(self._current_resp_rate)),
                "bispectralIndex": int(round(self._current_bis)),
                "driftProbability": s4_out["driftProbability"],
                "mac": round(self._current_mac, 2),
                "severity": s4_out["severity"],
                "projectedTrajectory": s4_out["projectedTrajectory"],
                "timestamp": int(time.time() * 1000),
            }
        }
