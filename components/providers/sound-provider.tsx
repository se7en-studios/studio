"use client";

import React, { createContext, useContext, useSyncExternalStore, useState, useCallback } from "react";

interface SoundContextType {
  soundEnabled: boolean;
  toggleSound: () => void;
  playClick: () => void;
  playPop: () => void;
  playSuccess: () => void;
  playSwitch: () => void;
}

const SoundContext = createContext<SoundContextType>({
  soundEnabled: false,
  toggleSound: () => {},
  playClick: () => {},
  playPop: () => {},
  playSuccess: () => {},
  playSwitch: () => {},
});

const KEY = "se7en-sound-fx";

/* La preferencia vive en localStorage, que es estado de afuera de React.
   useSyncExternalStore la lee sin el setState dentro de un efecto que hacía
   renderizar dos veces en cada carga, y devuelve false en el servidor para que
   servidor e hidratación coincidan por construcción — el mismo patrón que
   lib/use-media-query.ts.
   El registro de oyentes es propio porque el evento `storage` del navegador
   sólo avisa a las OTRAS pestañas, nunca a la que acaba de escribir. */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readPreference() {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    // Ventana privada o almacenamiento bloqueado: queda sin sonido, no rota.
    return false;
  }
}

function writePreference(next: boolean) {
  try {
    localStorage.setItem(KEY, String(next));
  } catch {}
  for (const onStoreChange of listeners) onStoreChange();
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const soundEnabled = useSyncExternalStore(subscribe, readPreference, () => false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    if (!audioCtx) {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      setAudioCtx(ctx);
      return ctx;
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return audioCtx;
  }, [audioCtx]);

  const toggleSound = useCallback(() => {
    // Guardar y agendar el pitido van fuera de un actualizador de estado: React
    // puede llamar esa función más de una vez por render, y entonces escribiría
    // dos veces y sonaría doble.
    const next = !readPreference();
    writePreference(next);
    if (!next) return;
    // Pequeño feedback al activar.
    setTimeout(() => {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    }, 50);
  }, [getAudioContext]);

  const playClick = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Ignorar errores de audio
    }
  }, [soundEnabled, getAudioContext]);

  const playPop = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {}
  }, [soundEnabled, getAudioContext]);

  const playSwitch = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.04);
      gain.gain.setValueAtTime(0.025, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, [soundEnabled, getAudioContext]);

  const playSuccess = useCallback(() => {
    if (!soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.1);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.25);
    } catch {}
  }, [soundEnabled, getAudioContext]);

  return (
    <SoundContext.Provider
      value={{ soundEnabled, toggleSound, playClick, playPop, playSuccess, playSwitch }}
    >
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundFx() {
  return useContext(SoundContext);
}
