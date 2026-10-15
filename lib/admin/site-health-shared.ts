// Salud de los sitios: el último chequeo de cada uno y las alertas que salen de
// ahí. Puro y sin dependencias de servidor: lo usan Mantenimiento, la ficha del
// cliente, Inicio (vía el integrador), el resumen de las 9 y las pruebas.

export type SiteCheck = {
  project_slug: string;
  checked_at: string;
  url: string;
  ok: boolean;
  status_code: number | null;
  ms: number | null;
  /** YYYY-MM-DD */
  ssl_expires_on: string | null;
  /** YYYY-MM-DD */
  domain_expires_on: string | null;
  error: string;
  /**
   * La parte de la página que cambió desde la captura anterior (0 a 1; ver
   * scripts/visual-diff.mjs). null si no había con qué comparar.
   */
  visual_change?: number | null;
  /** La página quedó casi toda de un color: no cargó o quedó en blanco. */
  blank?: boolean;
};

/** Más que esto hasta terminar de cargar (Chrome en GitHub Actions) es lento. */
export const SLOW_MS = 5000;
export const SSL_DAYS = 21;
export const DOMAIN_DAYS = 30;
/**
 * Desde esta parte del contenido cambiada de un día para el otro, «se ve
 * distinto». Dos capturas normales difieren 0-7 %; otro sitio, 49 % o más
 * (ver scripts/visual-diff.mjs).
 */
export const VISUAL_CHANGE = 0.3;

export type SiteAlertKind = "caido" | "lento" | "ssl" | "dominio" | "visual";
export type SiteAlert = {
  slug: string;
  kind: SiteAlertKind;
  /** Días que faltan (SSL y dominio; negativo = vencido). */ days?: number;
  /** «visual»: cuánto de la página cambió, en %; 100 si quedó en blanco. */ pct?: number;
};

export const ALERT_LABEL: Record<SiteAlertKind, string> = {
  caido: "Caído",
  lento: "Lento",
  ssl: "SSL por vencer",
  dominio: "Dominio por vencer",
  visual: "Se ve distinto",
};

/** «Se ve distinto · cambió el 62 % desde ayer», «Se ve distinto · quedó en blanco». */
export const visualDetail = (pct: number | undefined) =>
  pct === undefined ? "" : pct >= 100 ? "quedó en blanco" : `cambió el ${pct} % desde ayer`;

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/**
 * Alertas del último chequeo de cada sitio: caído, lento, SSL a menos de 21
 * días y dominio a menos de 30. `manualDomains` (slug → YYYY-MM-DD) es el
 * vencimiento cargado a mano en el plan, para los dominios sin RDAP.
 */
export function siteAlerts(
  latest: Iterable<SiteCheck>,
  today: string,
  manualDomains: Map<string, string> = new Map(),
): SiteAlert[] {
  const out: SiteAlert[] = [];
  const seen = new Set<string>();
  for (const c of latest) {
    seen.add(c.project_slug);
    if (!c.ok) out.push({ slug: c.project_slug, kind: "caido" });
    else if (c.ms !== null && c.ms > SLOW_MS)
      out.push({ slug: c.project_slug, kind: "lento" });
    // Responde, pero se ve roto: en blanco, o muy distinto a la captura de ayer.
    if (c.ok && c.blank) out.push({ slug: c.project_slug, kind: "visual", pct: 100 });
    else if (c.ok && (c.visual_change ?? 0) >= VISUAL_CHANGE)
      out.push({ slug: c.project_slug, kind: "visual", pct: Math.round((c.visual_change ?? 0) * 100) });
    if (c.ssl_expires_on) {
      const days = daysBetween(today, c.ssl_expires_on);
      if (days < SSL_DAYS)
        out.push({ slug: c.project_slug, kind: "ssl", days });
    }
    const domain =
      c.domain_expires_on ?? manualDomains.get(c.project_slug) ?? null;
    if (domain) {
      const days = daysBetween(today, domain);
      if (days < DOMAIN_DAYS)
        out.push({ slug: c.project_slug, kind: "dominio", days });
    }
  }
  // Un sitio sin chequeo todavía igual avisa si el dominio cargado a mano vence.
  for (const [slug, domain] of manualDomains) {
    if (seen.has(slug)) continue;
    const days = daysBetween(today, domain);
    if (days < DOMAIN_DAYS) out.push({ slug, kind: "dominio", days });
  }
  return out;
}

/** El chequeo más nuevo de cada sitio, de una lista ordenada o no. */
export function latestBySlug(checks: SiteCheck[]): Map<string, SiteCheck> {
  const out = new Map<string, SiteCheck>();
  for (const c of checks) {
    const cur = out.get(c.project_slug);
    if (!cur || c.checked_at > cur.checked_at) out.set(c.project_slug, c);
  }
  return out;
}

/** «OK · 1,2 s», «Caído (503)», para la tabla. */
export function healthLabel(c: SiteCheck | undefined): string {
  if (!c) return "Sin chequeo";
  if (!c.ok) return c.status_code ? `Caído (${c.status_code})` : "Caído";
  return c.ms !== null
    ? `OK · ${(c.ms / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })} s`
    : "OK";
}
