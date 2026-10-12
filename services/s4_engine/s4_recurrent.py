import numpy as np
try:
    from .hippo import make_hippo_legs, discretize_bilinear
except (ImportError, ValueError):
    from hippo import make_hippo_legs, discretize_bilinear

class S4RecurrentCell:
    def __init__(self, state_dim: int = 64, delta: float = 0.01):
        self.state_dim = state_dim
        self.delta = delta
        A, B = make_hippo_legs(state_dim)
        self.A_bar, self.B_bar = discretize_bilinear(A, B, delta)
        
        # Calibrated low-order polynomial projection (positive-definite for drift)
        indices = np.arange(state_dim)
        c_weights = np.exp(-indices / 4.0)
        c_weights = c_weights / np.sum(c_weights)
        self.C = c_weights.reshape(1, -1)
        self.D = np.zeros((1, 1))
        self.h = np.zeros((state_dim, 1), dtype=np.float64)

    def step(self, u: float) -> float:
        u_arr = np.array([[u]], dtype=np.float64)
        self.h = self.A_bar @ self.h + self.B_bar @ u_arr
        out_mat = self.C @ self.h + self.D @ u_arr
        return float(out_mat.item())

    def reset(self):
        self.h.fill(0.0)
