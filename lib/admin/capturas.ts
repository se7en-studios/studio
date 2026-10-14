// Capturas automáticas de los sitios de cada proyecto (la tele de «En vivo»).
// Las saca la tarea de GitHub (.github/workflows/capturas.yml) y las sube por
// /api/cron/capturas. Usa la service role key: NUNCA importar este archivo
// desde un componente de cliente.
import { db } from "./db";
import { PanelNotReady, caseProjects, client, listProjects } from "./panel";

export const CAPTURE_BUCKET = "capturas";

export type SiteCapture = { url: string; width: number; height: number; capturedAt: string };

const missingTable = (e: { code?: string }) => e.code === "PGRST205" || e.code === "42P01";
const NOT_READY = "Falta correr supabase/capturas.sql en Supabase.";

/** Los sitios a capturar: los casos de la web y los proyectos del panel que tienen URL. */
export async function sitesToCapture(): Promise<{ slug: string; url: string }[]> {
  const projects = db() ? await listProjects() : caseProjects();
  return projects.flatMap((p) => (p.url && /^https?:\/\//.test(p.url) ? [{ slug: p.slug, url: p.url }] : []));
}

/** Guarda la captura nueva de un proyecto y borra la anterior. */
export async function saveCapture(slug: string, jpeg: Uint8Array, width: number, height: number) {
  const c = client();
  const bucket = c.storage.from(CAPTURE_BUCKET);
  const path = `${slug}/${Date.now()}.jpg`;
  const up = await bucket.upload(path, jpeg, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (up.error) throw /bucket not found/i.test(up.error.message) ? new PanelNotReady(NOT_READY) : new Error(up.error.message);
  const url = bucket.getPublicUrl(path).data.publicUrl;
  const prev = await c.from("panel_site_captures").select("path").eq("project_slug", slug).maybeSingle();
  const row = await c
    .from("panel_site_captures")
    .upsert({ project_slug: slug, path, url, width, height, captured_at: new Date().toISOString() });
  if (prev.error || row.error) {
    await bucket.remove([path]);
    const e = (prev.error ?? row.error) as { code?: string; message: string };
    throw missingTable(e) ? new PanelNotReady(NOT_READY) : new Error(e.message);
  }
  const old = (prev.data as { path: string } | null)?.path;
  if (old && old !== path) {
    const gone = await bucket.remove([old]);
    if (gone.error) console.error("[capturas] borrar la anterior:", gone.error.message);
  }
  return { path, url };
}

/** La última captura de cada proyecto. Vacío si todavía no hay o falta capturas.sql: la tele usa la captura fija. */
export async function latestCaptures(): Promise<Map<string, SiteCapture>> {
  const out = new Map<string, SiteCapture>();
  if (!db()) return out;
  const { data, error } = await client().from("panel_site_captures").select("project_slug, url, width, height, captured_at");
  if (error) {
    if (!missingTable(error)) console.error("[capturas] leer:", error.message);
    return out;
  }
  for (const r of data as { project_slug: string; url: string; width: number; height: number; captured_at: string }[])
    out.set(r.project_slug, { url: r.url, width: r.width, height: r.height, capturedAt: r.captured_at });
  return out;
}
