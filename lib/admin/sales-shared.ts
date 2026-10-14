// Reglas de ventas que no son números: por qué se perdió un pedido, cuáles
// conviene retomar, cómo reconocer a alguien que ya escribió antes y las
// reuniones agendadas. Puro, sin dependencias de servidor: lo usan las rutas
// públicas, el panel y scripts/check-sales.mjs.
import type { Lead } from "./db";

export const LOST_REASONS = [
  { id: "precio", label: "Precio" },
  { id: "plazo", label: "Plazo" },
  { id: "otro_proveedor", label: "Eligió a otro" },
  { id: "sin_respuesta", label: "Dejó de responder" },
  { id: "pospuesto", label: "Lo pospuso" },
  { id: "no_cliente", label: "No era cliente" },
  { id: "otro", label: "Otro" },
] as const;
export type LostReason = (typeof LOST_REASONS)[number]["id"];
export const LOST_NOTE_MAX = 500;

export const isLostReason = (v: unknown): v is LostReason =>
  LOST_REASONS.some((r) => r.id === v);
export const lostReasonLabel = (v: string | null | undefined) =>
  LOST_REASONS.find((r) => r.id === v)?.label ?? "";

/** Un perdido se puede retomar pasados estos días, salvo que no fuera cliente. */
export const RETAKE_AFTER_DAYS = 60;

/** Perdido hace más de RETAKE_AFTER_DAYS días y con un motivo que no sea «no era cliente». */
export function toRetake(
  l: Pick<Lead, "status" | "lost_at" | "lost_reason" | "updated_at">,
  now: number,
  days = RETAKE_AFTER_DAYS,
): boolean {
  if (l.status !== "perdido" || l.lost_reason === "no_cliente") return false;
  // Sin lost_at (falta crm-v3.sql) se usa el último cambio, lo mejor que hay.
  const since = Date.parse(l.lost_at ?? l.updated_at);
  return Number.isFinite(since) && now - since >= days * 86_400_000;
}

// --- Reconocer a quien ya escribió --------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const isEmail = (v: string) => v.length <= 200 && EMAIL_RE.test(v);

/**
 * Los últimos 10 dígitos: así «+54 9 299 412-3456», «0299 4123456» y
 * «2994123456» son el mismo número. null si hay muy pocos dígitos para comparar.
 */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? digits.slice(-10) : null;
}

/** Teléfono escrito por alguien en un formulario público: dígitos y signos comunes, 8 a 20 dígitos. */
export function cleanPublicPhone(v: unknown): string {
  const s = typeof v === "string" ? v.trim().slice(0, 40) : "";
  if (!/^[0-9+()\s.-]+$/.test(s)) return "";
  const digits = s.replace(/\D/g, "").length;
  return digits >= 8 && digits <= 20 ? s : "";
}

/**
 * Un email, un teléfono y lo que queda (el nombre) sacados de un texto libre
 * («Ana Pérez · +54 9 299 412-3456»).
 */
export function contactFrom(text: string): {
  email: string;
  phone: string;
  rest: string;
} {
  const rawEmail =
    text.match(/[^\s@<>()"',;]+@[^\s@<>()"',;]+\.[^\s@<>()"',;]+/)?.[0] ?? "";
  const rawPhone = text.match(/\+?\d[\d\s().-]{6,}\d/)?.[0] ?? "";
  const email = isEmail(rawEmail) ? rawEmail.toLowerCase() : "";
  const phone = cleanPublicPhone(rawPhone);
  let rest = text;
  if (email) rest = rest.replace(rawEmail, " ");
  if (phone) rest = rest.replace(rawPhone, " ");
  rest = rest
    .replace(/[<([]\s*[>)\]]/g, " ") // lo que quedó de «<ana@x.com>» o «(299…)»
    .replace(/\s+/g, " ")
    .replace(/^[\s·,;|/-]+|[\s·,;|/-]+$/g, "")
    .trim();
  return { email, phone, rest };
}

type Contactable = Pick<
  Lead,
  "id" | "email" | "phone" | "status" | "created_at"
>;

/**
 * El pedido al que corresponde un contacto: mismo email o mismo teléfono. Entre
 * varios, gana uno que no esté perdido y, a igualdad, el más reciente.
 */
export function findMatch<T extends Contactable>(
  leads: T[],
  contact: { email?: string; phone?: string },
): T | null {
  const email = contact.email?.trim().toLowerCase() || "";
  const key = phoneKey(contact.phone);
  if (!email && !key) return null;
  const same = leads.filter(
    (l) =>
      (email && l.email.trim().toLowerCase() === email) ||
      (key && phoneKey(l.phone) === key),
  );
  same.sort(
    (a, b) =>
      Number(a.status === "perdido") - Number(b.status === "perdido") ||
      b.created_at.localeCompare(a.created_at),
  );
  return same[0] ?? null;
}

// --- Reuniones -----------------------------------------------------------------

/** Hasta cuántos días adelante se acepta una reserva del sitio. */
export const MEETING_MAX_DAYS = 90;

/** Una fecha y hora de reunión que llega del sitio, ya validada (ISO), o null. */
export function parseMeeting(v: unknown, now: number): string | null {
  if (typeof v !== "string" || v.length > 40) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  // Una hora de gracia hacia atrás (relojes desfasados); nada más allá de MEETING_MAX_DAYS.
  if (t < now - 3_600_000 || t > now + MEETING_MAX_DAYS * 86_400_000)
    return null;
  return new Date(t).toISOString();
}

export type Meeting = {
  lead_id: string;
  name: string;
  at: string;
  status: Lead["status"];
};

/** Reuniones agendadas desde `now` (con una hora de gracia), de la más cercana a la más lejana. */
export function upcomingMeetings(
  leads: Pick<Lead, "id" | "name" | "status" | "meeting_at">[],
  now: number,
): Meeting[] {
  return leads
    .filter((l) => l.meeting_at && Date.parse(l.meeting_at) >= now - 3_600_000)
    .map((l) => ({
      lead_id: l.id,
      name: l.name,
      at: l.meeting_at as string,
      status: l.status,
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

const TZ = "America/Argentina/Buenos_Aires";
/** «mié 15 oct, 14:00» en hora de Argentina. */
export const meetingLabel = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
