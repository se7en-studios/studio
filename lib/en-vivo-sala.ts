// Lo que el motor de «En vivo» necesita de cada sala de proyecto, con la
// tipografía de su marca. Sólo para el navegador (el mapa del panel y el de la
// landing): las tipografías de next/font no se pueden cargar en una ruta de API.
import type { RoomInfo } from "@/lib/oficinas/engine";
import type { OfiProject } from "@/lib/admin/oficinas-shared";
import { brandFamilies, type BrandFont } from "@/lib/brand-fonts";
import { domainOf } from "@/lib/en-vivo";

/** Las capturas de /public pasan por el optimizador: en la tele ocupan menos de 200 px. */
const coverSrc = (src: string | null) => (src?.startsWith("/") ? `/_next/image?url=${encodeURIComponent(src)}&w=384&q=75` : src);

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
