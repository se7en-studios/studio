import { NextResponse } from "next/server";
import { clientIp } from "@/lib/rate-limit";
import { visitorId } from "@/lib/visitas";
import { parseOfficeEvent, recordOfficeEvent } from "@/lib/en-vivo-medicion";

// Lo que pasa en la oficina de la landing (ver lib/en-vivo-medicion.ts):
// entrar, salir, cruzarse con un socio, un gesto, un clic a WhatsApp o a
// Contacto. La visita sale de la IP del día, como en /admin/api/visita. Acepta
// el cuerpo como texto: al salir se manda con sendBeacon.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  let body: unknown = null;
  try {
    body = raw.length < 400 ? JSON.parse(raw) : null;
  } catch {
    body = null;
  }
  const ev = parseOfficeEvent(body);
  if (!ev) return NextResponse.json({ ok: false }, { status: 400, headers: { "Cache-Control": "no-store" } });
  const ok = await recordOfficeEvent(visitorId(clientIp(request.headers)), ev).catch(() => false);
  return NextResponse.json({ ok }, { headers: { "Cache-Control": "no-store" } });
}
