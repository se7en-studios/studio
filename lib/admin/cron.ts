// Protege las rutas de /api/cron: Vercel manda `Authorization: Bearer <CRON_SECRET>`
// al ejecutarlas. Sin CRON_SECRET cargado no se ejecuta nada. Solo servidor.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/** null si la llamada está autorizada; si no, la respuesta que hay que devolver. */
export function authorizeCron(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret)
    return NextResponse.json(
      { error: "Falta cargar CRON_SECRET en Vercel." },
      { status: 503 },
    );
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  const ok =
    given.length === expected.length && timingSafeEqual(given, expected);
  return ok
    ? null
    : NextResponse.json({ error: "No autorizado." }, { status: 401 });
}
