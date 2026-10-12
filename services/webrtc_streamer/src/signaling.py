import json
import asyncio
import logging
import websockets
from .config import settings
from .clinical_streamer import ClinicalCaseStreamer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] (%(name)s) %(message)s"
)
logger = logging.getLogger("webrtc_streamer.signaling")

clinical_engine = ClinicalCaseStreamer(sampling_rate_hz=settings.SAMPLING_RATE_HZ)

async def stream_telemetry_loop(websocket, client_ip: str):
    interval = settings.BATCH_INTERVAL_MS / 1000.0
    logger.info(f"Initiated authentic clinical 100Hz telemetry stream to {client_ip}")
    try:
        while True:
            packet = clinical_engine.generate_batch(settings.SAMPLES_PER_BATCH)
            await websocket.send(json.dumps(packet))
            await asyncio.sleep(interval)
    except (websockets.exceptions.ConnectionClosed, asyncio.CancelledError):
        logger.info(f"Stream closed for {client_ip}")
    except Exception as e:
        logger.exception(f"Fatal error inside telemetry stream loop: {e}")

async def signaling_handler(websocket):
    client_ip = websocket.remote_address[0] if websocket.remote_address else "127.0.0.1"
    logger.info(f"Client connected from {client_ip}")

    stream_task = asyncio.create_task(stream_telemetry_loop(websocket, client_ip))

    try:
        async for raw_message in websocket:
            msg = json.loads(raw_message)
            msg_type = msg.get("type")
            scenario = msg.get("scenario") or msg.get("caseId")

            if scenario:
                logger.info(f"Setting scenario state to: {scenario}")
                clinical_engine.set_scenario(scenario)

    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client {client_ip} disconnected.")
    except Exception as e:
        logger.error(f"Signaling error with {client_ip}: {e}")
    finally:
        if stream_task:
            stream_task.cancel()

async def main():
    host = settings.SIGNALING_HOST
    port = settings.SIGNALING_PORT
    logger.info(f"Starting Hemera Clinical Telemetry Service on ws://{host}:{port}")
    async with websockets.serve(signaling_handler, host, port):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
