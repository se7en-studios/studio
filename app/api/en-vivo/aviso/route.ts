import { NextResponse } from "next/server";
import { notificationsConfigured, notify } from "@/lib/admin/notify";
import { PEOPLE } from "@/lib/admin/people";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { readPass, tabSigned } from "@/lib/en-vivo-pase";
import { recordOfficeEvent } from "@/lib/en-vivo-medicion";

// «Avisale que estás acá»: una visita de la oficina de la landing le avisa a
// Franco o a Federico (que no la están mirando) que está ahí. Les llega al
// celular por ntfy, a su tema personal si lo tienen (ver lib/admin/notify.ts).
// Sólo con el pase del canal en vivo y firmado por esa pestaña (ver
// lib/en-vivo-pase.ts): así no se puede disparar desde afuera de la oficina.
// Con freno: un aviso por visita y socio cada 5 minutos, y 12 por hora por IP.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const AGAIN_MS = 5 * 60_000;
/** ponytail: el freno corto vive en la memoria de cada instancia; el de la base (rate_limit_hits) es el que vale. */
const last = new Map<string, number>();

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { p?: unknown; s?: unknown; d?: unknown; z?: unknown } | null;
  const { p, s, d, z } = body ?? {};
  if (typeof p !== "string" || typeof s !== "string" || typeof d !== "string" || typeof z !== "string" || d.length > 120)
    return NextResponse.json({ sent: false }, { status: 400, headers: NO_STORE });
  const pass = readPass(p, s);
  // Sólo las visitas: los socios se hablan por el panel
  if (!pass || !pass.l.startsWith("v:") || !tabSigned(pass, `aviso|${d}`, z)) return NextResponse.json({ sent: false }, { status: 403, headers: NO_STORE });
  let ask: { to?: unknown; t?: unknown };
  try {
    ask = JSON.parse(d) as { to?: unknown; t?: unknown };
  } catch {
    return NextResponse.json({ sent: false }, { status: 400, headers: NO_STORE });
  }
  const to = ask.to === "federico" || ask.to === "franco" ? ask.to : null;
  const now = Date.now();
  // Un pedido viejo (repetido) no vale
  if (!to || typeof ask.t !== "number" || Math.abs(now - ask.t) > 5 * 60_000) return NextResponse.json({ sent: false }, { status: 400, headers: NO_STORE });
  const key = `${pass.i}|${to}`;
  if (now - (last.get(key) ?? 0) < AGAIN_MS) return NextResponse.json({ sent: false, again: true }, { headers: NO_STORE });
  if (!notificationsConfigured()) return NextResponse.json({ sent: false }, { headers: NO_STORE });
  const ip = clientIp(request.headers);
  if (!(await allowRequest("en-vivo-aviso", ip, 12, 60 * 60_000))) return NextResponse.json({ sent: false, again: true }, { headers: NO_STORE });
  last.set(key, now);
  if (last.size > 5000) last.clear();
  const res = await notify(
    {
      title: "Te buscan en la oficina de la web",
      message: `Una visita está en la oficina de «En vivo» y quiere hablar con ${PEOPLE[to].name}. Entrá a saludarla.`,
      path: "/admin/oficinas",
      tags: ["bell", "en-vivo"],
    },
    4,
    to,
  );
  if (!res.ok) console.error("[en vivo] aviso:", res.error);
  else await recordOfficeEvent(pass.i.slice(2), { kind: "aviso", detail: to, value: null }).catch(() => false);
  return NextResponse.json({ sent: res.ok }, { headers: NO_STORE });
}
