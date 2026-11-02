// Seguimiento de los prospectos: quién está sin respuesta y a cuántos les escribió hoy cada
// uno. Puro y sin dependencias de la app: lo usan la pantalla y scripts/check-prospect-state.mjs.
import type { LeadOwner } from "./db";
import type { ProspectState } from "./prospect-shared";
import { dayIn } from "./tz";

/** Un «contactado» que pasó tanto tiempo sin respuesta es para retomar. */
export const COLD_DAYS = 3;
const DAY_MS = 86_400_000;

/** La última vez que se le escribió; si falta el dato, el primer contacto. */
export const lastContactAt = (s?: ProspectState) => s?.last_contact_at ?? s?.contacted_at ?? null;

/** Días sin respuesta de un «contactado»; null si no corresponde o todavía no pasó el plazo. */
export function coldDays(s: ProspectState | undefined, now: number): number | null {
  if (!s || s.status !== "contactado") return null;
  const at = lastContactAt(s);
  if (!at) return null;
  const days = Math.floor((now - new Date(at).getTime()) / DAY_MS);
  return days >= COLD_DAYS ? days : null;
}

/** A cuántos prospectos le escribió hoy cada uno (el último contacto, en hora de Argentina). */
export function contactedToday(states: ProspectState[], now: number): Record<LeadOwner, number> {
  const out: Record<LeadOwner, number> = { franco: 0, federico: 0 };
  const today = dayIn(now);
  for (const s of states) {
    const at = lastContactAt(s);
    const who = s.last_contact_by ?? s.contacted_by;
    if (at && who && dayIn(at) === today) out[who] += 1;
  }
  return out;
}
