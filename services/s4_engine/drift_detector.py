import math
from typing import Dict, Any, List
try:
    from .s4_recurrent import S4RecurrentCell
except (ImportError, ValueError):
    from s4_recurrent import S4RecurrentCell

class S4EmergenceDetector:
    def __init__(self, state_dim: int = 64):
        self.s4_map = S4RecurrentCell(state_dim=state_dim, delta=0.1)
        self.s4_hr = S4RecurrentCell(state_dim=state_dim, delta=0.1)
        self.s4_co2 = S4RecurrentCell(state_dim=state_dim, delta=0.1)
        self.baseline_map = 90.0
        self.baseline_hr = 72.0
        self.current_drift_score = 0.04

    def update(self, hr: float, map_val: float, etco2: float, current_bis: float) -> Dict[str, Any]:
        u_hr = (hr - self.baseline_hr) / 25.0
        u_map = (map_val - self.baseline_map) / 25.0
        u_co2 = (etco2 - 38.0) / 10.0

        latent_hr = self.s4_hr.step(u_hr)
        latent_map = self.s4_map.step(u_map)
        latent_co2 = self.s4_co2.step(u_co2)

        # Autonomic signature index
        autonomic_index = 0.50 * latent_hr + 0.40 * latent_map + 0.10 * latent_co2

        # Calibrated Sigmoid: Steady state ~ 0.04 (4%), Emergence ~ 0.89 (89%)
        raw_prob = 1.0 / (1.0 + math.exp(-6.5 * (autonomic_index - 0.48)))
        self.current_drift_score += (raw_prob - self.current_drift_score) * 0.20
        drift_prob = max(0.01, min(0.99, float(self.current_drift_score)))

        if drift_prob > 0.60:
            severity = "CRITICAL_DRIFT"
        elif drift_prob > 0.25:
            severity = "DRIFT_SUSPECTED"
        else:
            severity = "NORMAL"

        drift_rate = (drift_prob - 0.18) * 36.0 if drift_prob > 0.22 else -1.2
        trajectory: List[float] = []
        for i in range(11):
            t_min = i * 0.5
            projected = current_bis + (drift_rate * (t_min / 5.0))
            trajectory.append(round(max(15.0, min(98.0, float(projected))), 2))

        return {
            "driftProbability": round(drift_prob, 3),
            "severity": severity,
            "projectedTrajectory": trajectory,
        }
