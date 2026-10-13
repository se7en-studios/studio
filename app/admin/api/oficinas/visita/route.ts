// Entrar a una sala de «En vivo» la registra como visitada. Va por acá y no
// por una server action: se dispara mientras caminás y las acciones se
// despachan de a una, así que trabaría lo demás del panel. No crea eventos ni
// avisos: entrar a una sala no es noticia.
import { recordVisit } from "@/lib/admin/oficinas";
import { withSession } from "../../guard";

export function POST(req: Request) {
  return withSession(async (me) => {
    const body = (await req.json().catch(() => null)) as { slug?: unknown } | null;
    const slug = typeof body?.slug === "string" ? body.slug : "";
    return { visitedAt: await recordVisit(me.who, slug) };
  });
}
