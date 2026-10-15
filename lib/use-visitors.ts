"use client";

// La señal de esta visita para «En vivo» de la landing: cada 30 s mientras la
// pestaña está a la vista, y un aviso al irse. Devuelve quiénes están mirando
// (ver lib/visitas.ts); null mientras no llega la primera respuesta.
import { useEffect, useState } from "react";
import type { VisitorsNow } from "@/lib/visitas";

const BEAT_MS = 30_000;
const ENDPOINT = "/admin/api/visita";

export function useVisitors(): VisitorsNow | null {
  const [now, setNow] = useState<VisitorsNow | null>(null);
  useEffect(() => {
    let gone = false;
    let timer = 0;
    const beat = () => {
      window.clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
        .then((r) => (r.ok ? (r.json() as Promise<VisitorsNow>) : null))
        .then((d) => {
          if (!gone && d) setNow(d);
        })
        .catch(() => {});
      timer = window.setTimeout(beat, BEAT_MS);
    };
    // Al irse (cerrar, cambiar de pestaña) su muñeco sale enseguida; al volver, entra de nuevo
    const bye = () => navigator.sendBeacon?.(ENDPOINT, JSON.stringify({ bye: true }));
    const onVisibility = () => (document.visibilityState === "visible" ? beat() : (window.clearTimeout(timer), bye()));
    beat();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", bye);
    return () => {
      gone = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", bye);
    };
  }, []);
  return now;
}
