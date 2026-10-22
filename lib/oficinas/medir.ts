"use client";

// La medición de la oficina de la landing (ver lib/en-vivo-medicion.ts): qué
// pasa adentro, sin datos de nadie (la visita sale de la IP del día en el
// servidor). Nunca frena nada: si no se puede anotar, se pierde y listo.
import type { OfficeKind } from "@/lib/en-vivo-medicion";

const URL = "/api/en-vivo/medir";

/** `beacon`: al irse de la página (pagehide), que salga aunque la pestaña se cierre. */
export function office(kind: OfficeKind, detail: string | null = null, value: number | null = null, beacon = false) {
  const body = JSON.stringify({ kind, detail, value });
  try {
    if (beacon && navigator.sendBeacon?.(URL, body)) return;
    void fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    // nada
  }
}
