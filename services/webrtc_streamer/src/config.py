from pydantic import BaseModel


class StreamerSettings(BaseModel):
    SIGNALING_HOST: str = "0.0.0.0"
    SIGNALING_PORT: int = 8765
    STUN_SERVER: str = "stun:stun.l.google.com:19302"
    SAMPLING_RATE_HZ: int = 100
    BATCH_INTERVAL_MS: int = 100
    SAMPLES_PER_BATCH: int = 10
    DEFAULT_SCENARIO: str = "STABLE"


settings = StreamerSettings()
