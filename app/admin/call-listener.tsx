"use client";

// Recibe las llamadas en la computadora: mientras el panel está abierto escucha el tema de
// avisos (ntfy, por SSE) y, si alguien llama, muestra «te está llamando» con sonido y un
// botón para unirse a la sala de Meet. Vive en todo el panel, no solo en Llamadas.
import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { incomingCall, type Incoming } from "@/lib/admin/calls";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { Face, btnPrimary, btnSecondary } from "./kit";
import { Dialog } from "./overlay";

const RING_EVERY_MS = 1800;
const GIVE_UP_MS = 60_000;

/** Dos tonos cada tanto mientras suena. Sin sonido hasta que la persona toca la página una vez (regla del navegador). */
function useRing(active: boolean) {
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      ctx.current ??= new AudioContext();
      void ctx.current.resume();
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    const beep = () => {
      const c = ctx.current;
      if (!c || c.state !== "running") return;
      [440, 554].forEach((freq, i) => {
        const start = c.currentTime + i * 0.28;
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);
        osc.connect(gain).connect(c.destination);
        osc.start(start);
        osc.stop(start + 0.26);
      });
    };
    beep();
    const id = window.setInterval(beep, RING_EVERY_MS);
    return () => window.clearInterval(id);
  }, [active]);
}

export function CallListener({
  who,
  topic,
  server,
}: {
  who: LeadOwner;
  topic: string;
  server: string;
}) {
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  useRing(incoming !== null);

  useEffect(() => {
    const feed = new EventSource(`${server}/${encodeURIComponent(topic)}/sse`);
    feed.onmessage = (ev) => {
      let data: unknown;
      try {
        data = JSON.parse(ev.data);
      } catch {
        console.warn(
          "[llamadas] mensaje que no se pudo leer:",
          String(ev.data).slice(0, 80),
        );
        return;
      }
      const call = incomingCall(data, who);
      if (!call) return;
      setIncoming(call);
      // Con la pestaña en segundo plano, además un aviso del sistema (si se dio el permiso).
      if (
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        const n = new Notification(
          `${PEOPLE[call.from].name} te está llamando`,
          {
            body: "Tocá para unirte a la llamada de Meet.",
            tag: "llamada",
            requireInteraction: true,
          },
        );
        n.onclick = () => {
          window.focus();
          window.open(call.link, "_blank", "noopener");
          n.close();
        };
      }
    };
    return () => feed.close();
  }, [topic, server, who]);

  // Si nadie atiende, deja de sonar solo.
  useEffect(() => {
    if (!incoming) return;
    const id = window.setTimeout(() => setIncoming(null), GIVE_UP_MS);
    return () => window.clearTimeout(id);
  }, [incoming]);

  // El foco va a «Unirme»: con el teclado alcanza con Enter.
  const joinRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    if (incoming) joinRef.current?.focus();
  }, [incoming]);

  if (!incoming) return null;
  const from = PEOPLE[incoming.from].name;
  return (
    <Dialog
      onClose={() => setIncoming(null)}
      label={`${from} te está llamando`}
      width="max-w-sm"
    >
      <div className="flex flex-col items-center px-6 py-8 text-center">
        <span className="relative mb-5 rounded-full p-1 ring-2 ring-accent/40 shadow-[0_0_40px_-6px_var(--accent)]">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-accent/30"
          />
          <Face who={incoming.from} size={72} />
        </span>
        <h2 className="adm-title text-[18px]">
          {from} te está llamando
        </h2>
        <p className="mt-1 text-[13px] text-muted">Llamada de Google Meet</p>
        <div className="mt-6 flex gap-2">
          <a
            ref={joinRef}
            href={incoming.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIncoming(null)}
            className={`${btnPrimary} px-5 py-2.5 text-[14px]`}
          >
            <Phone size={15} /> Unirme
          </a>
          <button
            type="button"
            onClick={() => setIncoming(null)}
            className={`${btnSecondary} px-5 py-2.5 text-[14px]`}
          >
            <PhoneOff size={15} /> Ahora no
          </button>
        </div>
      </div>
    </Dialog>
  );
}
