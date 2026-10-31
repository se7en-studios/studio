"use client";

/**
 * Gestor de efectos sonoros táctiles mediante Web Audio API sintetizada nativamente.
 * Cero peso de descarga (0 KB en archivos de audio), sin latencia ni dependencias externas.
 */
class SoundFxEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = false;
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("se7en_sound_enabled");
        this.isEnabled = saved === "true";
      } catch {
        this.isEnabled = false;
      }
    }
  }

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  public get enabled(): boolean {
    return this.isEnabled;
  }

  public toggle(): boolean {
    this.isEnabled = !this.isEnabled;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(
          "se7en_sound_enabled",
          this.isEnabled ? "true" : "false"
        );
      } catch {}
    }
    if (this.isEnabled) {
      this.initContext();
      this.playTone(600, 0.04, "sine", 0.08);
    }
    this.notify();
    return this.isEnabled;
  }

  public setEnabled(val: boolean) {
    if (this.isEnabled === val) return;
    this.isEnabled = val;
    if (this.isEnabled) {
      this.initContext();
    }
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = "sine",
    volume = 0.05
  ) {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);

      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  /** Clic mecánico suave para botones y navegación */
  public click() {
    this.playTone(880, 0.035, "sine", 0.06);
  }

  /** Pop sutil para cambio de pestañas o selección */
  public pop() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.04);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.04);
    } catch {}
  }

  /** Tono de confirmación o éxito */
  public success() {
    if (!this.isEnabled) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chord = [523.25, 659.25, 783.99]; // C5, E5, G5
      chord.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.04;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.04, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.12);
      });
    } catch {}
  }

  /** Tono de tick para sliders y scroll interactivo */
  public tick() {
    this.playTone(1200, 0.015, "square", 0.02);
  }
}

export const soundFx = new SoundFxEngine();

