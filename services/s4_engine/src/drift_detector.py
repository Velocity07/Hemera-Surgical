import numpy as np
from typing import Dict, Any, List
from .s4_recurrent import S4RecurrentCell

class S4EmergenceDetector:
    """
    Multi-Channel S4 State-Space Anesthesia Drift Ingestion Engine.
    Processes physiological streams and outputs real-time emergence vectors.
    """
    def __init__(self, state_dim: int = 64):
        # Dedicated S4 cells for physiological trends
        self.s4_map = S4RecurrentCell(state_dim=state_dim, delta=0.1)     # MAP trend
        self.s4_hr = S4RecurrentCell(state_dim=state_dim, delta=0.1)      # HR dynamics
        self.s4_co2 = S4RecurrentCell(state_dim=state_dim, delta=0.1)     # Respiratory dynamics
        
        # Baseline reference parameters
        self.baseline_map = 90.0
        self.baseline_hr = 72.0
        self.current_drift_score = 0.04

    def update(self, hr: float, map_val: float, etco2: float, current_bis: float) -> Dict[str, Any]:
        """
        Ingests 1Hz aggregated metrics, executes S4 recurrent updates,
        and computes forward trajectory envelopes.
        """
        # Feature normalization
        u_hr = (hr - self.baseline_hr) / 30.0
        u_map = (map_val - self.baseline_map) / 30.0
        u_co2 = (etco2 - 38.0) / 10.0

        # Recurrent state updates O(1)
        latent_hr = self.s4_hr.step(u_hr)
        latent_map = self.s4_map.step(u_map)
        latent_co2 = self.s4_co2.step(u_co2)

        # Multi-variable latent drift metric (autonomic activation signature)
        # Rising MAP + rising HR + hyperventilation = classic intraoperative emergence
        autonomic_index = 0.5 * latent_hr + 0.4 * latent_map + 0.1 * latent_co2
        
        # Sigmoid activation to bounded probability [0.0, 1.0]
        raw_prob = 1.0 / (1.0 + np.exp(-3.5 * (autonomic_index - 0.2)))
        
        # Smooth temporal EMA
        self.current_drift_score += (raw_prob - self.current_drift_score) * 0.15
        drift_prob = float(np.clip(self.current_drift_score, 0.01, 0.99))

        # Classify IEC severity
        if drift_prob > 0.65:
            severity = "CRITICAL_DRIFT"
        elif drift_prob > 0.30:
            severity = "DRIFT_SUSPECTED"
        else:
            severity = "NORMAL"

        # Generate 5-Minute Forward Lookahead Trajectory (10 steps = 0.5m increments)
        drift_rate = (drift_prob - 0.20) * 32.0 if drift_prob > 0.25 else -1.5
        trajectory: List[float] = []
        for i in range(11):
            t_min = i * 0.5
            projected = current_bis + (drift_rate * (t_min / 5.0))
            trajectory.append(float(np.clip(projected, 15.0, 98.0)))

        return {
            "driftProbability": round(drift_prob, 3),
            "severity": severity,
            "projectedTrajectory": trajectory,
        }
