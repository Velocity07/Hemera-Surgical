class ClinicalAudioEngine {
    private ctx: AudioContext | null = null;
    private alarmInterval: ReturnType<typeof setInterval> | null = null;
    public isMuted: boolean = false;
    public isUnlocked: boolean = false;

    public unlock(): boolean {
        try {
            if (!this.ctx && typeof window !== 'undefined') {
                const AudioCtx =
                    window.AudioContext ||
                    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
                if (AudioCtx) {
                    this.ctx = new AudioCtx();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume().catch(() => { });
            }
            this.isUnlocked = true;
            return true;
        } catch {
            return false;
        }
    }

    public setMuted(muted: boolean) {
        this.isMuted = muted;
        if (muted) {
            this.stopAlarm();
        }
    }

    // Auditory pulse tone pitch tracking SpO2 (100% = 880Hz, 90% = 440Hz)
    public playHeartbeat(spo2: number = 99) {
        if (this.isMuted || !this.isUnlocked || !this.ctx || this.ctx.state !== 'running') return;

        try {
            const clampedSpo2 = Math.max(80, Math.min(100, spo2));
            const freq = 440 * Math.pow(2, (clampedSpo2 - 90) / 10);

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.07);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + 0.08);
        } catch { }
    }

    // IEC 60601-1-8 High-Priority 5-Tone Emergency Burst
    public startEmergencyAlarm() {
        if (this.isMuted || !this.isUnlocked || this.alarmInterval !== null) return;
        if (!this.ctx || this.ctx.state !== 'running') return;

        const notes = [523.25, 659.25, 783.99, 698.46, 880.0];
        const playBurst = () => {
            if (!this.ctx || this.ctx.state !== 'running' || this.isMuted) return;

            try {
                notes.forEach((freq, idx) => {
                    const startTime = this.ctx!.currentTime + idx * 0.12;
                    const osc = this.ctx!.createOscillator();
                    const gain = this.ctx!.createGain();

                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, startTime);

                    gain.gain.setValueAtTime(0.0001, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.18, startTime + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.10);

                    osc.connect(gain);
                    gain.connect(this.ctx!.destination);

                    osc.start(startTime);
                    osc.stop(startTime + 0.11);
                });
            } catch { }
        };

        playBurst();
        this.alarmInterval = setInterval(playBurst, 2500);
    }

    public stopAlarm() {
        if (this.alarmInterval !== null) {
            clearInterval(this.alarmInterval);
            this.alarmInterval = null;
        }
    }
}

export const audioEngine = new ClinicalAudioEngine();
export default audioEngine;