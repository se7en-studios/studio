// Protege las rutas de /api/cron: Vercel manda `Authorization: Bearer <CRON_SECRET>`
// al ejecutarlas. Sin CRON_SECRET cargado no se ejecuta nada. Solo servidor.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyGithubOidc } from "./github-oidc";

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

/** El id no cambia si el repo se renombra o cambia de dueño. */
const REPO_ID = "1334580586"; // se7en-studios/studio

/**
 * Para las tareas de GitHub Actions (capturas, copia mensual): vale el token OIDC
 * que GitHub le firma a ese workflow en master de este repo, sin secretos que
 * copiar. A mano, desde una compu, sirve el mismo CRON_SECRET que los crons de Vercel.
 * null si está autorizada; si no, la respuesta que hay que devolver.
 */
export async function authorizeGithubJob(
  request: Request,
  job: { audience: string; workflow: string },
): Promise<NextResponse | null> {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (token.split(".").length === 3) {
    const want = { ...job, repositoryId: REPO_ID, ref: "refs/heads/master" };
    const claims = await verifyGithubOidc(token, want).catch((e) => {
      console.error(`[cron ${job.audience}] token de GitHub:`, e instanceof Error ? e.message : e);
      return null;
    });
    if (claims) return null;
  }
  return authorizeCron(request);
}
