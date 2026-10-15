// Las visitas que están mirando la landing ahora, para «En vivo». Cada una
// manda una señal cada 30 s (POST /admin/api/visita) y aparece en el mapa
// como un muñeco. Una por IP: abrir diez pestañas no llena el estudio. Si la
// visita es Franco o Federico (con la sesión del panel), aparece como él.
// Sólo servidor: usa la service role key. Si falta supabase/visitas.sql, no
// hay visitas y el mapa sigue andando.
import { createHmac } from "node:crypto";
import { db } from "@/lib/admin/db";
import type { Who } from "@/lib/admin/oficinas-shared";

/** Cuánto dura una señal: dos señales perdidas y la visita se va. */
const WINDOW_MS = 75_000;
/** Las filas viejas se borran: no se guarda quién pasó, sólo quién está. */
const KEEP_MS = 10 * 60_000;
/** Más muñecos que esto no entran en el estudio. */
export const MAX_VISITORS = 12;

const missingTable = (e: { code?: string }) => e.code === "PGRST205" || e.code === "42P01";

/**
 * La clave de una visita: un HMAC de la IP con el día, así no se guarda la IP
 * y la misma persona no se puede seguir de un día al otro.
 */
function keyOf(ip: string, now: number) {
  const day = new Date(now).toISOString().slice(0, 10);
  return createHmac("sha256", process.env.SUPABASE_SERVICE_ROLE_KEY ?? "se7en").update(`${day}|${ip}`).digest("hex");
}
/** Lo que ve la landing de cada visita: los primeros 10 caracteres, para la ropa del muñeco. */
const shortId = (key: string) => key.slice(0, 10);

/** `who`: si es uno de los dos socios. */
export type Visitor = { id: string; who: Who | null };
export type VisitorsNow = { you: string | null; visitors: Visitor[]; total: number };

/** Registra la señal de `ip` (o la saca, si se va) y devuelve quiénes están. `who`: el socio, si tiene la sesión del panel. */
export async function visitorHeartbeat(ip: string, leaving = false, who: Who | null = null, now = Date.now()): Promise<VisitorsNow> {
  const c = db();
  if (!c) return { you: null, visitors: [], total: 0 };
  const key = keyOf(ip, now);
  const write = leaving
    ? c.from("site_visitors").delete().eq("key", key)
    : c.from("site_visitors").upsert({ key, last_seen: new Date(now).toISOString(), who });
  const { error } = await write;
  if (error) {
    if (!missingTable(error)) console.error("[visitas]", error.message);
    return { you: null, visitors: [], total: 0 };
  }
  await c.from("site_visitors").delete().lt("last_seen", new Date(now - KEEP_MS).toISOString());
  const { data, error: e2 } = await c
    .from("site_visitors")
    .select("key, who")
    .gte("last_seen", new Date(now - WINDOW_MS).toISOString())
    .order("key")
    .limit(200);
  if (e2) {
    console.error("[visitas]", e2.message);
    return { you: null, visitors: [], total: 0 };
  }
  // Cada socio una sola vez, aunque esté en la compu y en el celular (gana el que pregunta)
  const all = data as { key: string; who: Who | null }[];
  const seen = new Set<Who>();
  const mine = all.find((r) => r.key === key);
  if (mine?.who) seen.add(mine.who);
  const rows = all.filter((r) => r === mine || !r.who || (!seen.has(r.who) && !!seen.add(r.who)));
  // Si hay más de los que entran, vos siempre estás
  const shown = rows.slice(0, MAX_VISITORS);
  if (!leaving && mine && !shown.includes(mine)) shown[shown.length - 1] = mine;
  return { you: leaving ? null : shortId(key), visitors: shown.map((r) => ({ id: shortId(r.key), who: r.who })), total: rows.length };
}
