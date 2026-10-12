import numpy as np

def make_hippo_legs(n: int = 64) -> tuple[np.ndarray, np.ndarray]:
    q = np.arange(n)
    col, row = np.meshgrid(q, q)
    diff = row - col
    A = np.where(diff > 0, -np.sqrt(2 * row + 1) * np.sqrt(2 * col + 1), 0.0)
    np.fill_diagonal(A, -(q + 1))
    B = np.sqrt(2 * q + 1).reshape(-1, 1)
    return A, B

def discretize_bilinear(A: np.ndarray, B: np.ndarray, delta: float = 0.01) -> tuple[np.ndarray, np.ndarray]:
    n = A.shape[0]
    I = np.eye(n)
    inv = np.linalg.inv(I - (delta / 2.0) * A)
    A_bar = inv @ (I + (delta / 2.0) * A)
    B_bar = inv @ (delta * B)
    return A_bar, B_bar
