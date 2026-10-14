// Señal de «estoy en el panel» (la manda el shell cada minuto). De acá sale
// quién aparece trabajando en «En vivo» de la landing. `slug`: el proyecto que
// tiene abierto (Proyectos o una sala del mapa), o null.
import { heartbeat } from "@/lib/admin/presencia";
import { withSession } from "../guard";

export function POST(req: Request) {
  return withSession(async (me) => {
    const body = (await req.json().catch(() => null)) as { slug?: unknown } | null;
    await heartbeat(me.who, typeof body?.slug === "string" ? body.slug : null);
    return { ok: true };
  });
}
