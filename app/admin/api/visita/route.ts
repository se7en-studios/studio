import { NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { clientIp } from "@/lib/rate-limit";
import { visitorHeartbeat, type VisitorsNow } from "@/lib/visitas";

// La señal de cada visita de la landing (cada 30 s mientras la pestaña está a
// la vista) y la lista de las que están, para dibujarlas en el mapa de «En
// vivo». `{ "bye": true }` la saca al cerrar la pestaña. Es pública: vive bajo
// /admin sólo porque ahí llega la cookie del panel, y así Franco y Federico
// aparecen como ellos mismos en vez de como una visita más.
export const dynamic = "force-dynamic";

const EMPTY: VisitorsNow = { you: null, visitors: [], total: 0 };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { bye?: unknown } | null;
  const me = await getSession().catch(() => null);
  const now = await visitorHeartbeat(clientIp(request.headers), body?.bye === true, me?.who ?? null).catch(() => EMPTY);
  return NextResponse.json(now, { headers: { "Cache-Control": "no-store" } });
}
