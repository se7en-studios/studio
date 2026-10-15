// Horas livianas (supabase/time.sql): tipos, validación y cuentas de los tramos
// de trabajo. Puro y sin dependencias de servidor: lo usan las páginas, las
// acciones, los componentes de cliente y scripts/check-numbers.mjs.
import type { LeadOwner } from "./db";
import { isRealDay } from "./finance-shared";

export type TimeEntry = {
  id: string;
  who: LeadOwner;
  project_slug: string;
  maintenance_request_id: string | null;
  /** ISO */
  started_at: string;
  /** ISO; null = el cronómetro está corriendo. */
  ended_at: string | null;
  /** null mientras corre. */
  minutes: number | null;
  note: string;
};

/** Un tramo no pasa de un día: si quedó el cronómetro prendido, se corta ahí y se corrige a mano. */
export const MAX_MINUTES = 1440;
const SLUG = /^[a-z0-9-]{1,64}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const TZ = "America/Argentina/Buenos_Aires";

/** Minutos entre dos instantes, redondeados y con el tope de un día. */
export function minutesBetween(from: string, to: string | number): number {
  const ms = (typeof to === "number" ? to : Date.parse(to)) - Date.parse(from);
  return Math.max(0, Math.min(MAX_MINUTES, Math.round(ms / 60_000)));
}

/** Los minutos de un tramo; si corre, hasta `now`. */
export const entryMinutes = (
  e: Pick<TimeEntry, "started_at" | "minutes">,
  now = Date.now(),
) => e.minutes ?? minutesBetween(e.started_at, now);

/** YYYY-MM-DD del tramo, en hora de Argentina. */
export const entryDay = (e: Pick<TimeEntry, "started_at">) =>
  new Date(e.started_at).toLocaleDateString("en-CA", { timeZone: TZ });

/** Un tramo cargado a mano empieza al mediodía de ese día (Argentina no tiene horario de verano). */
export const manualStart = (day: string) =>
  new Date(`${day}T12:00:00-03:00`).toISOString();

export type ManualInput = { day?: unknown; minutes?: unknown; note?: unknown };

/** Lo que llega del formulario de un tramo a mano (alta o edición). */
export function cleanManual(
  input: ManualInput,
  today: string,
):
  | { ok: true; value: { day: string; minutes: number; note: string } }
  | { ok: false; error: string } {
  const day = String(input.day ?? "");
  if (!isRealDay(day)) return { ok: false, error: "La fecha no es válida." };
  if (day > today)
    return { ok: false, error: "No se cargan horas del futuro." };
  const minutes = Math.round(Number(input.minutes));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > MAX_MINUTES)
    return { ok: false, error: "Los minutos van de 1 a 1440." };
  return {
    ok: true,
    value: {
      day,
      minutes,
      note: String(input.note ?? "")
        .trim()
        .slice(0, 500),
    },
  };
}

/** El destino del cronómetro: un proyecto y, si es de uno, un pedido de mantenimiento. */
export function cleanTarget(
  slug: unknown,
  requestId: unknown,
): { slug: string; requestId: string | null } | null {
  if (!SLUG.test(String(slug ?? ""))) return null;
  if (requestId == null || requestId === "")
    return { slug: String(slug), requestId: null };
  return UUID.test(String(requestId))
    ? { slug: String(slug), requestId: String(requestId) }
    : null;
}

/** Pedido de mantenimiento → minutos de sus tramos. */
export function minutesByRequest(
  entries: TimeEntry[],
  now = Date.now(),
): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of entries)
    if (e.maintenance_request_id)
      out.set(
        e.maintenance_request_id,
        (out.get(e.maintenance_request_id) ?? 0) + entryMinutes(e, now),
      );
  return out;
}

/**
 * El tiempo de un pedido: los minutos cargados a mano antes del cronómetro
 * (panel_maintenance_requests.minutes) más sus tramos.
 */
export const requestMinutes = (
  r: { id: string; minutes: number },
  byRequest: Map<string, number>,
) => r.minutes + (byRequest.get(r.id) ?? 0);

/** Minutos de los tramos de un proyecto en un mes (YYYY-MM). */
export const projectMinutesInMonth = (
  entries: TimeEntry[],
  slug: string,
  ym: string,
  now = Date.now(),
) =>
  entries
    .filter((e) => e.project_slug === slug && entryDay(e).slice(0, 7) === ym)
    .reduce((s, e) => s + entryMinutes(e, now), 0);

/** «0:07:42» para el cronómetro que corre. */
export function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
}

/** Evento de ventana que avisan los cronómetros al prender o frenar uno: los demás se actualizan sin recargar. */
export const TIMER_EVENT = "se7en:timer";
export type TimerEventDetail = {
  running: TimeEntry | null;
  stopped: TimeEntry | null;
};
