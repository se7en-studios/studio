import { NextResponse } from "next/server";
import { backupAll } from "@/lib/admin/backup";
import { MIN_PASSPHRASE, encryptBackup } from "@/lib/admin/backup-shared";
import { authorizeGithubJob } from "@/lib/admin/cron";
import { PanelNotReady } from "@/lib/admin/panel";

// Copia de seguridad mensual. La pide la tarea de GitHub (.github/workflows/respaldo.yml)
// el día 1 de cada mes y la guarda como artefacto de esa ejecución. Como el repo es
// público, SIEMPRE sale cifrada con la frase BACKUP_PASSPHRASE (variable de Vercel, no
// del repo): sin ella no se entrega nada. Se identifica igual que la de capturas (OIDC
// de GitHub, sin secretos); a mano, con CRON_SECRET.
export const dynamic = "force-dynamic";
// La copia junta varias tablas de a 1000 filas: más margen que el de una página.
export const maxDuration = 60;

export async function POST(request: Request) {
  const denied = await authorizeGithubJob(request, {
    audience: "se7en-respaldo",
    workflow: ".github/workflows/respaldo.yml",
  });
  if (denied) return denied;
  const passphrase = process.env.BACKUP_PASSPHRASE ?? "";
  if (passphrase.length < MIN_PASSPHRASE)
    return NextResponse.json(
      {
        error: `Falta BACKUP_PASSPHRASE en Vercel (una frase de ${MIN_PASSPHRASE} caracteres o más).`,
      },
      { status: 503 },
    );
  try {
    const backup = await backupAll();
    return NextResponse.json(
      encryptBackup(JSON.stringify(backup), passphrase, backup.exported_at),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    if (e instanceof PanelNotReady)
      return NextResponse.json({ error: e.message }, { status: 503 });
    console.error("[cron respaldo]", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: "No se pudo generar la copia." },
      { status: 500 },
    );
  }
}
