import numpy as np
from .hippo import make_hippo_legs, discretize_bilinear

class S4RecurrentCell:
    """
    Streaming Continuous-Time State-Space Layer (S4 in recurrent mode).
    Provides O(1) step complexity and O(N) space complexity.
    """
    def __init__(self, state_dim: int = 64, delta: float = 0.01):
        self.state_dim = state_dim
        self.delta = delta
        
        # Initialize continuous HiPPO operator and discretize
        A, B = make_hippo_legs(state_dim)
        self.A_bar, self.B_bar = discretize_bilinear(A, B, delta)
        
        # Linear projection C (latent readout) and direct feedthrough D
        np.random.seed(42)
        self.C = np.random.randn(1, state_dim) * (1.0 / np.sqrt(state_dim))
        self.D = np.zeros((1, 1))
        
        # Hidden state memory vector h_t
        self.h = np.zeros((state_dim, 1), dtype=np.float64)

    def step(self, u: float) -> float:
        """
        Processes a single scalar sample u_t in real time:
        h_t = A_bar * h_{t-1} + B_bar * u_t
        y_t = C * h_t + D * u_t
        """
        u_arr = np.array([[u]], dtype=np.float64)
        self.h = self.A_bar @ self.h + self.B_bar @ u_arr
        y = float(self.C @ self.h + self.D @ u_arr)
        return y

    def reset(self):
        self.h.fill(0.0)
