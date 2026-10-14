// «En vivo» por fuera del panel: lo que el mapa necesita de cada sala, armado
// igual para el panel (/admin/oficinas) y para la landing. Sin servidor ni
// datos internos: la landing usa sólo los casos de data/projects.ts.
import type { RoomInfo } from "@/app/admin/oficinas/engine";
import { getProjectBySlug, projects as cases } from "@/data/projects";
import type { OfiBrand, OfiProject } from "@/lib/admin/oficinas-shared";
import { brandFamilies, type BrandFont } from "@/lib/brand-fonts";

/**
 * Logos de los casos, en public/admin/oficinas/marcas (de dónde sale cada uno,
 * en el README de esa carpeta). El sello de Poné La Pava ya trae el nombre: es
 * logo e ícono a la vez. Los que faltan van con el nombre en su letra.
 */
const M = "/admin/oficinas/marcas/";
const MARCAS: Record<string, { logo?: string; mark?: string }> = {
  "apex-ai": { logo: `${M}apex-ai-logo.png`, mark: `${M}apex-ai-mark.png` },
  muzzaga: { logo: `${M}muzzaga-logo.png`, mark: `${M}muzzaga-mark.png` },
  pravilo: { logo: `${M}pravilo-logo.png`, mark: `${M}pravilo-mark.png` },
  sentinel: { logo: `${M}sentinel-logo.png`, mark: `${M}sentinel-mark.png` },
  "pone-la-pava": { logo: `${M}pone-la-pava-mark.png`, mark: `${M}pone-la-pava-mark.png` },
  takefyy: { mark: `${M}takefyy-mark.png` },
  "iphone-vita": { mark: `${M}iphone-vita-mark.png` },
};

/** La marca de un caso de la web (null si el slug no es un caso). */
export function caseBrand(slug: string): OfiBrand | null {
  const b = getProjectBySlug(slug)?.brand;
  const k = MARCAS[slug];
  return b ? { font: b.font, weight: b.weight ?? 400, uppercase: b.uppercase ?? false, highlight: b.highlight ?? "", logo: k?.logo ?? null, mark: k?.mark ?? null } : null;
}

export type PublicCapture = { url: string; width: number; height: number };

/**
 * Los casos de la web como salas para el público: todos con el sitio en
 * producción (mantenimiento) y sin nada interno (ni tareas, ni eventos, ni visitas).
 * Mismo orden que el panel, así el mapa es el mismo.
 */
export function publicProjects(captures: Record<string, PublicCapture> = {}): OfiProject[] {
  return cases
    .map((p): OfiProject => {
      const c = captures[p.slug];
      return {
        slug: p.slug,
        name: p.name,
        category: p.category,
        tagline: p.brand?.tagline ?? p.shortDescription,
        client: "",
        accent: p.brand?.accent ?? "#ff4d2e",
        cover: p.image,
        url: p.url,
        video: p.video?.mp4 ?? null,
        capture: c ? { ...c, capturedAt: "" } : null,
        brand: caseBrand(p.slug),
        status: "mantenimiento",
        owner: null,
        due: null,
        progress: 100,
        notes: "",
        isCase: true,
        openTasks: [],
        events: [],
        lastVisit: { federico: null, franco: null },
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

/** Las capturas de /public pasan por el optimizador: en la tele ocupan menos de 200 px. */
const coverSrc = (src: string | null) => (src?.startsWith("/") ? `/_next/image?url=${encodeURIComponent(src)}&w=384&q=75` : src);

/** «takefyy.com», para la barra del navegador de la tele. */
export function domainOf(url: string | null) {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, "") : null;
  } catch {
    return null;
  }
}

/** Lo que el motor necesita de una sala de proyecto. */
export function roomInfoOf(p: OfiProject): RoomInfo {
  const family = p.brand ? brandFamilies[p.brand.font as BrandFont] : undefined;
  return {
    name: p.name,
    accent: p.accent,
    status: p.status,
    cover: coverSrc(p.cover),
    video: p.video,
    page: p.capture?.url ?? null,
    domain: domainOf(p.url),
    brand: p.brand && family ? { ...p.brand, family, tagline: p.tagline } : null,
  };
}
