import sys
from pathlib import Path

# Add s4_engine directly to sys.path
s4_path = str(Path(__file__).resolve().parent.parent.parent / "s4_engine")
if s4_path not in sys.path:
    sys.path.insert(0, s4_path)

import math
import time
from typing import Dict, Any, List
from drift_detector import S4EmergenceDetector

class PatientEmulator:
    def __init__(self, sampling_rate_hz: int = 100):
        self.fs = sampling_rate_hz
        self.dt = 1.0 / sampling_rate_hz
        self.t = 0.0
        self.sequence_id = 0

        self.scenario = "STABLE"
        self._target_hr = 72.0
        self._current_hr = 72.0
        self._current_bis = 45.0

        self.cardiac_phase = 0.0
        self.respiratory_phase = 0.0

        self.s4_detector = S4EmergenceDetector(state_dim=64)

    def set_scenario(self, scenario: str):
        if scenario in ["STABLE", "DRIFT", "HYPOTENSION"]:
            self.scenario = scenario

    def generate_batch(self, count: int = 10) -> Dict[str, Any]:
        ecg_batch: List[float] = []
        spo2_batch: List[float] = []
        abp_batch: List[float] = []
        co2_batch: List[float] = []

        if self.scenario == "DRIFT":
            target_hr = 104.0
            target_spo2 = 98.0
            target_sys = 148.0
            target_dia = 94.0
            target_bis = 70.0
            mac_val = 0.78
            etco2_val = 44.0
            resp_rate = 18.0
        elif self.scenario == "HYPOTENSION":
            target_hr = 52.0
            target_spo2 = 96.0
            target_sys = 82.0
            target_dia = 48.0
            target_bis = 38.0
            mac_val = 1.35
            etco2_val = 32.0
            resp_rate = 10.0
        else:
            target_hr = 72.0
            target_spo2 = 99.0
            target_sys = 118.0
            target_dia = 76.0
            target_bis = 45.0
            mac_val = 1.05
            etco2_val = 38.0
            resp_rate = 12.0

        self._current_hr += (target_hr - self._current_hr) * 0.05
        self._current_bis += (target_bis - self._current_bis) * 0.03
        cardiac_freq = self._current_hr / 60.0
        resp_freq = resp_rate / 60.0

        for _ in range(count):
            self.t += self.dt
            self.cardiac_phase = (self.cardiac_phase + cardiac_freq * self.dt) % 1.0
            self.respiratory_phase = (self.respiratory_phase + resp_freq * self.dt) % 1.0

            phi = self.cardiac_phase
            r_phi = self.respiratory_phase

            # 1. ECG Lead II
            ecg = 0.0
            if 0.12 <= phi < 0.22:
                ecg += math.sin((phi - 0.12) * math.pi / 0.10) * 0.12
            elif 0.28 <= phi < 0.31:
                ecg -= 0.15
            elif 0.31 <= phi < 0.35:
                ecg += 0.88
            elif 0.35 <= phi < 0.39:
                ecg -= 0.28
            elif 0.50 <= phi < 0.68:
                ecg += math.sin((phi - 0.50) * math.pi / 0.18) * 0.24
            ecg += math.sin(self.t * 0.2) * 0.02
            ecg_batch.append(round(ecg, 4))

            # 2. Pleth / SpO2
            pleth_phi = (phi + 0.18) % 1.0
            if pleth_phi < 0.35:
                spo2_norm = math.sin((pleth_phi / 0.35) * math.pi * 0.5)
            else:
                decay = (pleth_phi - 0.35) / 0.65
                spo2_norm = math.cos(decay * math.pi * 0.5) * 0.85
                if 0.18 <= decay < 0.38:
                    spo2_norm += math.sin((decay - 0.18) * math.pi / 0.20) * 0.18
            spo2_sample = (spo2_norm * 1.5 - 0.75) * 0.55
            spo2_batch.append(round(spo2_sample, 4))

            # 3. ABP
            abp_scale = 0.95 if self.scenario == "DRIFT" else (0.45 if self.scenario == "HYPOTENSION" else 0.75)
            abp_sample = (math.pow(max(0.0, spo2_norm), 1.8) * 1.6 - 0.5) * abp_scale
            abp_batch.append(round(abp_sample, 4))

            # 4. Capnography
            co2_sample = -0.7
            if 0.25 <= r_phi < 0.70:
                plateau = (r_phi - 0.25) / 0.45
                co2_sample = 0.2 + min(0.5, plateau * 0.1)
            elif 0.70 <= r_phi < 0.78:
                co2_sample = 0.2 - ((r_phi - 0.70) / 0.08) * 0.9
            co2_batch.append(round(co2_sample, 4))

        self.sequence_id += 1
        map_val = int((2 * target_dia + target_sys) / 3)

        s4_output = self.s4_detector.update(
            hr=self._current_hr,
            map_val=map_val,
            etco2=etco2_val,
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
                "pulseOx": int(target_spo2),
                "systolicBP": int(target_sys),
                "diastolicBP": int(target_dia),
                "meanArterialPressure": map_val,
                "etco2": int(etco2_val),
                "respRate": int(resp_rate),
                "bispectralIndex": int(round(self._current_bis)),
                "driftProbability": s4_output["driftProbability"],
                "mac": round(mac_val, 2),
                "severity": s4_output["severity"],
                "projectedTrajectory": s4_output["projectedTrajectory"],
                "timestamp": int(time.time() * 1000),
            }
        }
