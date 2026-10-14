import { NextResponse } from "next/server";
import { projects as cases } from "@/data/projects";
import { latestCaptures } from "@/lib/admin/capturas";
import { onlineNow, type OnlineNow } from "@/lib/admin/presencia";

// «En vivo» de la landing: quién del estudio está conectado (y en qué sala, si
// es un caso de la web) y la captura más nueva de cada caso. Público y sin
// nada del panel: ni tareas, ni eventos, ni proyectos que no estén en la web.
export const dynamic = "force-dynamic";

export type EnVivoPublic = {
  online: OnlineNow[];
  captures: Record<string, { url: string; width: number; height: number }>;
};

export async function GET() {
  const pub = new Set(cases.map((p) => p.slug));
  const [online, all] = await Promise.all([onlineNow().catch(() => []), latestCaptures().catch(() => new Map())]);
  const captures: EnVivoPublic["captures"] = {};
  for (const [slug, c] of all) if (pub.has(slug)) captures[slug] = { url: c.url, width: c.width, height: c.height };
  // La CDN lo guarda 20 s: con cualquier cantidad de visitas, la base recibe una consulta cada 20 s.
  return NextResponse.json({ online, captures } satisfies EnVivoPublic, {
    headers: { "Cache-Control": "public, s-maxage=20, stale-while-revalidate=40" },
  });
}
