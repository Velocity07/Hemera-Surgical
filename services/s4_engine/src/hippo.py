import numpy as np

def make_hippo_legs(n: int = 64) -> tuple[np.ndarray, np.ndarray]:
    """
    Constructs continuous-time HiPPO-LegS transition matrices (A, B).
    Projects continuous history onto an orthogonal basis of Legendre polynomials.
    """
    q = np.arange(n)
    col, row = np.meshgrid(q, q)
    
    # A_nk = -(2n+1)^(1/2) * (2k+1)^(1/2) for n > k, -(n+1) for n == k, 0 for n < k
    diff = row - col
    A = np.where(diff > 0, -np.sqrt(2 * row + 1) * np.sqrt(2 * col + 1), 0.0)
    np.fill_diagonal(A, -(q + 1))
    
    # B_n = (2n + 1)^(1/2)
    B = np.sqrt(2 * q + 1).reshape(-1, 1)
    return A, B

def discretize_bilinear(A: np.ndarray, B: np.ndarray, delta: float = 0.01) -> tuple[np.ndarray, np.ndarray]:
    """
    Discretizes continuous matrices (A, B) using the Bilinear / Tustin transform:
    A_bar = (I - delta/2 * A)^(-1) * (I + delta/2 * A)
    B_bar = (I - delta/2 * A)^(-1) * (delta * B)
    """
    n = A.shape[0]
    I = np.eye(n)
    inv = np.linalg.inv(I - (delta / 2.0) * A)
    
    A_bar = inv @ (I + (delta / 2.0) * A)
    B_bar = inv @ (delta * B)
    return A_bar, B_bar
