// Sonidos de «En vivo», sintetizados con WebAudio (nada de archivos): pasos,
// el «bloop» de la puerta al entrar a una sala, el ding de las novedades y los
// tubos que titilan cuando una sala apagada vuelve a prenderse. Arranca
// apagado; el contexto de audio se crea recién con el clic que lo prende.

export type Cue = "step" | "enter" | "news" | "flicker";

export type Sound = { play: (c: Cue) => void; setOn: (on: boolean) => void; destroy: () => void };

export function createSound(): Sound {
  let ac: AudioContext | null = null;
  let out: GainNode | null = null;
  let on = false;
  let foot = 0;
  let noise: AudioBuffer | null = null;

  function ready() {
    if (!on) return null;
    if (!ac) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      out = ac.createGain();
      out.gain.value = 0.5;
      out.connect(ac.destination);
      noise = ac.createBuffer(1, Math.round(ac.sampleRate * 0.2), ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume().catch(() => {});
    return ac;
  }

  /** Un tono con ataque corto y caída exponencial. */
  function tone(a: AudioContext, t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine") {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out as GainNode);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  /** Un golpe de ruido filtrado (pasos, chasquidos del tubo). */
  function tap(a: AudioContext, t: number, freq: number, dur: number, vol: number) {
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noise;
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = 1.4;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out as GainNode);
    s.start(t);
    s.stop(t + dur + 0.01);
  }

  return {
    play(c) {
      const a = ready();
      if (!a) return;
      const t = a.currentTime + 0.01;
      if (c === "step") {
        // Pasos alternados, uno un poco más grave que el otro
        foot ^= 1;
        tap(a, t, foot ? 520 : 440, 0.07, 0.22);
      } else if (c === "enter") {
        tone(a, t, 420, 640, 0.16, 0.12);
      } else if (c === "news") {
        tone(a, t, 880, 880, 0.35, 0.09);
        tone(a, t + 0.12, 1320, 1320, 0.5, 0.08);
      } else {
        // Los chasquidos de los tubos (los mismos tiempos que el titileo del mapa) y el zumbido que queda
        for (const k of [0.1, 0.16, 0.24, 0.3, 0.42, 0.5]) tap(a, t + k * 0.9, 2400, 0.03, 0.18);
        const o = a.createOscillator(), g = a.createGain();
        o.type = "sawtooth";
        o.frequency.value = 100;
        g.gain.setValueAtTime(0.0001, t + 0.45);
        g.gain.exponentialRampToValueAtTime(0.012, t + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g).connect(out as GainNode);
        o.start(t + 0.45);
        o.stop(t + 1.7);
      }
    },
    setOn(v) {
      on = v;
      if (v) ready();
      else ac?.suspend().catch(() => {});
    },
    destroy() {
      on = false;
      ac?.close().catch(() => {});
      ac = null;
    },
  };
}
