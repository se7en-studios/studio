import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { PEOPLE } from "@/lib/admin/people";
import { clientIp } from "@/lib/rate-limit";
import { visitorId } from "@/lib/visitas";
import { issuePass, validTabKey } from "@/lib/en-vivo-pase";

// El pase de una pestaña para el canal en vivo de la oficina (ver
// lib/en-vivo-pase.ts). `{ key, as: "visita" }` desde la landing: la visita
// de esta IP (o el socio, si tiene la sesión del panel, como en
// /admin/api/visita). `{ key, as: "panel" }` desde el mapa del panel: sólo con
// sesión. Vive bajo /admin porque ahí llega la cookie del panel. No toca la base.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { key?: unknown; as?: unknown } | null;
  if (!validTabKey(body?.key)) return NextResponse.json({ error: "Llave inválida" }, { status: 400, headers: NO_STORE });
  const me = await getSession().catch(() => null);
  let who;
  if (body.as === "panel") {
    if (!me) return NextResponse.json({ error: "Sesión vencida" }, { status: 401, headers: NO_STORE });
    who = { id: me.who, look: me.who, name: PEOPLE[me.who].name };
  } else {
    const v = visitorId(clientIp(request.headers));
    who = { id: `v-${v}`, look: me?.who ?? (`v:${v}` as const), name: me ? PEOPLE[me.who].name : null };
  }
  const reply = issuePass(who, body.key);
  if (!reply) return NextResponse.json({ error: "Sin canal en vivo" }, { status: 503, headers: NO_STORE });
  return NextResponse.json(reply, { headers: NO_STORE });
}
