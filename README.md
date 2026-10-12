
<p align="center">
  <img src="docs/assets/banner.png" alt="Hemera Surgical" width="100%" />
</p>

<h1 align="center">Hemera Surgical</h1>

<p align="center">
  <strong>Sub-10ms Operating Room Telemetry & S4 State-Space Anesthesia Drift Copilot</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python_3.11-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
  <img src="https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/WebGL_2.0-990000?style=for-the-badge&logo=webgl&logoColor=white" alt="WebGL" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Latency-%3C10ms_RTT-10B981?style=for-the-badge" alt="Latency" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>


---
> **Project Status:** Early-stage clinical prototype actively under engineering development. Public telemetry feeds and hardware benchmarks are updated continuously.
> 
Standard operating room monitors are closed hardware appliances with static interfaces and zero predictive awareness. Hemera is an open intraoperative telemetry workstation designed for real-time surgical care: it streams multi-channel physiological signals at 100 Hz, draws hardware-accelerated waveforms at 60 FPS without garbage-collection stutters, and runs an S4 state-space model to forecast emergence drift minutes before physical symptoms spike. 

---

## Intraoperative Interface

### 1. Emergence Drift Detection (Critical Alert)
Capturing sympathetic emergence during surgery. As heart rate accelerates to 103 BPM and arterial blood pressure spikes to 147/94 mmHg, the continuous S4 recurrence engine calculates latent autonomic deviation, projecting a 5-minute Bispectral Index (BIS) trajectory lookahead.

<p align="center">
  <img src="docs/assets/workstation_emergence.png" alt="Hemera Surgical Emergence Drift" width="100%" />
</p>

### 2. Deep Anesthetic Saturation & Hemodynamic Stability
Baseline sinus rhythm during deep anesthetic saturation (Sevoflurane 2.6%, MAC 1.35). Waveforms dynamically dilate to mirror sinus bradycardia (52 BPM) and lowered systemic vascular resistance while keeping S4 drift scores below 2%.

<p align="center">
  <img src="docs/assets/workstation_hypotension.png" alt="Hemera Surgical Hypotension" width="100%" />
</p>

---

## System Architecture

```text
Bedside Sensors / Hardware Driver (100 Hz)
                    │
                    ▼
Python Telemetry Service (ws://localhost:8765)
   ├── Phase Accumulator (ECG II, Pleth, Art Line, Capnography)
   └── S4 Recurrence Engine (Constant-time HiPPO-LegS cell)
                    │
                    ▼ (<10ms WebSocket Stream)
React + WebGL 2.0 Workstation (Port 5173)
   ├── Zero-GC Circular Ring Buffers (Float32Array)
   ├── WebGL Shader Pipeline (60 FPS phosphor sweep)
   └── Web Audio API (IEC 60601-1-8 alarms + SpO2-tracked pulse tones)

```

---

## Technical Highlights

### Constant-Time S4 State-Space Recurrence ($O(1)$)

Traditional Transformer architectures require caching long context histories, causing memory blowups and latency spikes over long surgeries. Hemera utilizes an S4 recurrent cell discretized via bilinear Tustin transform:

$$h_k = \bar{A}h_{k-1} + \bar{B}u_k, \quad y_k = C h_k + D u_k$$

State updates execute in fixed microseconds per incoming vital packet, providing multi-minute context retention with strictly constant $O(1)$ memory and time complexity.

### Zero-Allocation WebGL 2.0 Waveform Engine

Real-time medical graphing typically triggers V8 garbage-collection pauses that drop frames. Hemera avoids heap thrashing entirely:

* **Pre-allocated typed arrays:** `Float32Array(2048)` circular ring buffers initialized on mount.
* **Bitwise pointer wrapping:** Head indexing computed with bitwise AND operations (`index & 2047`) to prevent branching overhead.
* **Direct GPU transfers:** Waveform data uploaded directly via `gl.bufferSubData` without intermediate object creation.

### Auditory Plethysmography & IEC 60601-1-8 Audio

Clinical audio feedback synthesized directly in the browser:

* **Dynamic pulse tone tracking:** Continuous pitch scaling matching blood oxygen saturation:

$$f(SpO_2) = 440 \times 2^{\frac{SpO_2 - 90}{10}}\text{ Hz}$$


* **Tier-1 emergency alarms:** Harmonic 5-tone sequences (C5–E5–G5–F5–A5) with exponential envelope decay during critical emergence events.

---

## Quickstart

### Prerequisites

* Node.js 18+
* Python 3.10+

### 1. Clone & Configure

```bash
git clone https://github.com/Velocity07/Hemera-Surgical.git
cd Hemera-Surgical
cp .env.example .env

```

### 2. Start the Telemetry Service

```bash
cd services/webrtc_streamer
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
python -m src.signaling

```

*Telemetry service starts on `ws://0.0.0.0:8765`.*

### 3. Start the Workstation Interface

In a separate terminal:

```bash
cd apps/copilot_ui
npm install
npm run dev

```

Open **http://localhost:5173**. Click anywhere on the interface to unlock clinical audio.

---

## Repository Structure

```text
Hemera-Surgical/
├── apps/
│   └── copilot_ui/             # React 18, Vite, TypeScript, TailwindCSS
│       ├── src/
│       │   ├── components/     # WebGL 2.0 canvases & vitals monitors
│       │   ├── hooks/          # Low-latency WebSocket ingest hooks
│       │   ├── store/          # Zustand store for zero-overhead telemetry
│       │   └── utils/          # Web Audio synthesizer (IEC 60601-1-8)
├── services/
│   ├── s4_engine/              # HiPPO-LegS S4 recurrence & drift inference
│   └── webrtc_streamer/        # 100 Hz multi-parameter physiological streamer
│       └── src/signaling.py    # Telemetry WebSocket server
├── docs/assets/                # UI captures and banner art
└── docker-compose.yml          # Containerized deployment spec

```

---

## License

Distributed under the MIT License. See [LICENSE](https://www.google.com/search?q=LICENSE) for details.


