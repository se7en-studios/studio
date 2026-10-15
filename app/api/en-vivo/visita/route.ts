import { NextResponse } from "next/server";
import { clientIp } from "@/lib/rate-limit";
import { visitorHeartbeat, type VisitorsNow } from "@/lib/visitas";

// La señal de cada visita de la landing (cada 30 s mientras la pestaña está a
// la vista) y la lista de las que están, para dibujarlas en el mapa de «En
// vivo». `{ "bye": true }` la saca al cerrar la pestaña.
export const dynamic = "force-dynamic";

export type { VisitorsNow };

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { bye?: unknown } | null;
  const now = await visitorHeartbeat(clientIp(request.headers), body?.bye === true).catch(() => ({ you: null, visitors: [], total: 0 }) satisfies VisitorsNow);
  return NextResponse.json(now, { headers: { "Cache-Control": "no-store" } });
}
