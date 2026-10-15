import { NextResponse } from "next/server";
import { saveCapture, sitesToCapture } from "@/lib/admin/capturas";
import { authorizeGithubJob } from "@/lib/admin/cron";
import { PanelNotReady } from "@/lib/admin/panel";
import { cleanCheck, insertCheck } from "@/lib/admin/site-health";

// Capturas de los sitios para la tele de «En vivo». La tarea de GitHub
// (.github/workflows/capturas.yml) pide la lista (GET), saca cada captura con
// Chrome y la sube acá (POST). Con un JSON en vez de un JPG guarda el chequeo
// de salud del sitio (si respondió, cuánto tardó, SSL y dominio). No está en vercel.json: Vercel no puede abrir un Chrome.
//
// La tarea se identifica con el token OIDC que GitHub le firma (sin secretos
// que copiar): sólo vale el de capturas.yml en master de este repo. A mano, desde
// una compu, sirve el mismo CRON_SECRET que los crons de Vercel.
export const dynamic = "force-dynamic";

const authorize = (request: Request) =>
  authorizeGithubJob(request, { audience: "se7en-capturas", workflow: ".github/workflows/capturas.yml" });

const SLUG = /^[a-z0-9-]{1,64}$/;
/** Una página entera a 640 de ancho pesa menos de 1 MB; Vercel corta en 4,5 MB. */
const MAX_BYTES = 4 * 1024 * 1024;

export async function GET(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  return NextResponse.json({ sites: await sitesToCapture() });
}

export async function POST(request: Request) {
  const denied = await authorize(request);
  if (denied) return denied;
  const q = new URL(request.url).searchParams;
  const slug = q.get("slug") ?? "";
  const width = Number(q.get("w")), height = Number(q.get("h"));
  if (!SLUG.test(slug)) return NextResponse.json({ error: "Proyecto inválido." }, { status: 400 });
  if (request.headers.get("content-type") === "application/json") return saveCheck(request, slug);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4000 || height > 20000)
    return NextResponse.json({ error: "Medidas inválidas." }, { status: 400 });
  if (request.headers.get("content-type") !== "image/jpeg")
    return NextResponse.json({ error: "Tiene que ser un JPG." }, { status: 415 });
  const jpeg = new Uint8Array(await request.arrayBuffer());
  if (!jpeg.length || jpeg.length > MAX_BYTES) return NextResponse.json({ error: "Archivo vacío o muy grande." }, { status: 413 });
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return NextResponse.json({ error: "Tiene que ser un JPG." }, { status: 415 });
  // Sólo proyectos que existen: así no se llena el bucket con slugs inventados.
  if (!(await sitesToCapture()).some((s) => s.slug === slug))
    return NextResponse.json({ error: "No hay un proyecto con sitio con ese nombre." }, { status: 404 });
  try {
    const saved = await saveCapture(slug, jpeg, width, height);
    return NextResponse.json({ ok: true, ...saved });
  } catch (e) {
    if (e instanceof PanelNotReady) return NextResponse.json({ error: e.message }, { status: 503 });
    console.error("[cron capturas]", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo guardar la captura." }, { status: 500 });
  }
}

/** Chequeo de salud de un sitio: sólo de proyectos con sitio, con la URL que el panel conoce. */
async function saveCheck(request: Request, slug: string) {
  const site = (await sitesToCapture()).find((s) => s.slug === slug);
  if (!site) return NextResponse.json({ error: "No hay un proyecto con sitio con ese nombre." }, { status: 404 });
  const check = cleanCheck(await request.json().catch(() => null), slug, site.url);
  if (!check) return NextResponse.json({ error: "Chequeo inválido." }, { status: 400 });
  try {
    await insertCheck(check);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PanelNotReady) return NextResponse.json({ error: e.message }, { status: 503 });
    console.error("[cron capturas] chequeo:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "No se pudo guardar el chequeo." }, { status: 500 });
  }
}
