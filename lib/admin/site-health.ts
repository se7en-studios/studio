// Chequeos diarios de los sitios (tabla panel_site_checks). Los manda la tarea
// de capturas por /api/cron/capturas. Usa la service role key: NUNCA importar
// este archivo desde un componente de cliente.
import { db } from "./db";
import { PanelNotReady, client } from "./panel";
import { listPlans } from "./maintenance";
import { manualDomains } from "./maintenance-shared";
import { latestBySlug, siteAlerts, type SiteAlert, type SiteCheck } from "./site-health-shared";

const COLUMNS =
  "project_slug, checked_at, url, ok, status_code, ms, ssl_expires_on, domain_expires_on, error";
const NOT_READY = "Falta correr supabase/site-health.sql en Supabase.";
const missingTable = (e: { code?: string }) =>
  e.code === "PGRST205" || e.code === "42P01";

export type CheckInput = Omit<SiteCheck, "checked_at">;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const day = (v: unknown) => (typeof v === "string" && DAY.test(v) ? v : null);
const int = (v: unknown, max: number) =>
  Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max
    ? (v as number)
    : null;

/** Lo que manda la tarea de GitHub: se normaliza o null si no sirve. */
export function cleanCheck(
  body: unknown,
  slug: string,
  url: string,
): CheckInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.ok !== "boolean") return null;
  return {
    project_slug: slug,
    url: url.slice(0, 300),
    ok: b.ok,
    status_code: int(b.status_code, 999),
    ms: int(b.ms, 600_000),
    ssl_expires_on: day(b.ssl_expires_on),
    domain_expires_on: day(b.domain_expires_on),
    error: typeof b.error === "string" ? b.error.slice(0, 300) : "",
  };
}

export async function insertCheck(c: CheckInput) {
  const { error } = await client().from("panel_site_checks").insert(c);
  if (error)
    throw missingTable(error)
      ? new PanelNotReady(NOT_READY)
      : new Error(error.message);
}

/** El último chequeo de cada sitio. Vacío si todavía no hay o falta site-health.sql. */
export async function latestChecks(): Promise<Map<string, SiteCheck>> {
  if (!db()) return new Map();
  // ponytail: los últimos 3 días alcanzan para tener el último de cada sitio (corre todos los días).
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  let res = await client()
    .from("panel_site_checks")
    .select(COLUMNS)
    .gte("checked_at", since)
    .order("checked_at", { ascending: false })
    .limit(500);
  // Si la tarea dejó de correr, igual mostrar lo último que hubo.
  if (!res.error && !res.data.length)
    res = await client()
      .from("panel_site_checks")
      .select(COLUMNS)
      .order("checked_at", { ascending: false })
      .limit(200);
  if (res.error) {
    if (!missingTable(res.error))
      console.error("[salud] leer:", res.error.message);
    return new Map();
  }
  return latestBySlug(res.data as SiteCheck[]);
}

/**
 * Las alertas de hoy (caído, lento, SSL, dominio), listas para Inicio. Vacío si
 * faltan las tablas. Llevan el slug: para mostrarlas en el panel se cruza con
 * los nombres; para un aviso afuera, sólo contarlas.
 */
export async function currentSiteAlerts(today: string): Promise<SiteAlert[]> {
  const [checks, plans] = await Promise.all([latestChecks(), listPlans().catch(() => [])]);
  return siteAlerts(checks.values(), today, manualDomains(plans));
}
