// Lo que pasa en la oficina de «En vivo» de la landing, para saber si sirve
// (supabase/en-vivo.sql): cuántos entran, cuánto se quedan, si se cruzan con
// Franco o Federico, cuántos gestos se mandan, cuántos les avisan y cuántos
// terminan escribiendo. Cada cosa va con el id corto de la visita del día (el
// mismo de /admin/api/visita), nunca la IP. Sin la tabla no se guarda nada y la
// landing sigue igual. Sólo servidor: usa la service role key.
import { db } from "@/lib/admin/db";
import { summarizeOffice, type OfficeRow, type OfficeStats } from "@/lib/admin/oficinas-shared";

export const OFFICE_KINDS = ["abrir", "salir", "socio", "gesto", "aviso", "whatsapp", "contacto"] as const;
export type OfficeKind = (typeof OFFICE_KINDS)[number];
export type OfficeEvent = { kind: OfficeKind; detail: string | null; value: number | null };

const missingTable = (e: { code?: string }) => e.code === "PGRST205" || e.code === "42P01";

/** Lo que manda la landing: el tipo, un detalle corto (qué gesto, desde dónde) y un número (los segundos al salir). */
export function parseOfficeEvent(v: unknown): OfficeEvent | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (!OFFICE_KINDS.includes(o.kind as OfficeKind)) return null;
  const detail = o.detail === null || o.detail === undefined ? null : typeof o.detail === "string" && /^[a-z:]{1,24}$/.test(o.detail) ? o.detail : undefined;
  const value = o.value === null || o.value === undefined ? null : Number.isInteger(o.value) && (o.value as number) >= 0 && (o.value as number) <= 86400 ? (o.value as number) : undefined;
  if (detail === undefined || value === undefined) return null;
  return { kind: o.kind as OfficeKind, detail, value };
}

/**
 * Cuántas cosas puede anotar una visita cada 10 minutos: más, es ruido (o
 * alguien inflando los números). ponytail: el freno vive en la memoria de cada
 * instancia; alcanza para que no se llene la tabla.
 */
const CAP = 40, WINDOW_MS = 10 * 60_000;
const recent = new Map<string, number[]>();

/** Anota lo que pasó. false si no se guardó (sin base, sin la tabla, o pasó el freno). */
export async function recordOfficeEvent(visitor: string, ev: OfficeEvent, now = Date.now()): Promise<boolean> {
  const c = db();
  if (!c || !/^[a-f0-9]{10}$/.test(visitor)) return false;
  const times = (recent.get(visitor) ?? []).filter((t) => now - t < WINDOW_MS);
  if (times.length >= CAP) return false;
  times.push(now);
  if (recent.size > 5000) recent.clear();
  recent.set(visitor, times);
  const { error } = await c.from("en_vivo_events").insert({ visitor, kind: ev.kind, detail: ev.detail, value: ev.value });
  if (error) {
    if (!missingTable(error)) console.error("[en vivo]", error.message);
    return false;
  }
  return true;
}

/** Los últimos `days` días. null si falta supabase/en-vivo.sql (o sin base). */
export async function officeStats(days = 30, now = Date.now()): Promise<OfficeStats | null> {
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("en_vivo_events")
    .select("visitor, kind, detail, value, at")
    .gte("at", new Date(now - days * 86_400_000).toISOString())
    .order("at", { ascending: false })
    .limit(20_000);
  if (error) {
    if (!missingTable(error)) console.error("[en vivo]", error.message);
    return null;
  }
  return summarizeOffice(data as OfficeRow[], days);
}
