// Quién está conectado al panel (para «En vivo» en la landing). El panel manda
// una señal cada minuto mientras está abierto; se considera conectado a quien
// mandó una en los últimos 3 minutos. Usa la service role key: NUNCA importar
// este archivo desde un componente de cliente.
import { projects as cases } from "@/data/projects";
import { db, missingTable } from "./db";
import type { Who } from "./oficinas-shared";

const SLUG = /^[a-z0-9-]{1,64}$/;
const WINDOW_MS = 3 * 60_000;

/** Lo que ve el público: quién está y, si es un caso de la web, en qué sala. */
export type OnlineNow = { who: Who; room: string | null };

/** Registra que `who` está en el panel; `slug`, el proyecto que tiene abierto. Si falta la tabla, no hace nada. */
export async function heartbeat(who: Who, slug: string | null) {
  const c = db();
  if (!c) return;
  const { error } = await c
    .from("panel_presence")
    .upsert({ who, last_seen: new Date().toISOString(), project_slug: slug && SLUG.test(slug) ? slug : null });
  if (error && !missingTable(error)) throw new Error(error.message);
}

/**
 * Quién está conectado ahora. Para el público, el proyecto sólo se dice si es
 * un caso de la web: los proyectos del panel no se muestran afuera.
 */
export async function onlineNow(now = Date.now()): Promise<OnlineNow[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c.from("panel_presence").select("who, last_seen, project_slug");
  if (error) {
    if (!missingTable(error)) console.error("[presencia]", error.message);
    return [];
  }
  const pub = new Set(cases.map((p) => p.slug));
  return (data as { who: Who; last_seen: string; project_slug: string | null }[])
    .filter((r) => now - Date.parse(r.last_seen) < WINDOW_MS)
    .map((r) => ({ who: r.who, room: r.project_slug && pub.has(r.project_slug) ? r.project_slug : null }))
    .sort((a, b) => a.who.localeCompare(b.who));
}
