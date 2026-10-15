// Descarga una copia de todo lo que el panel guarda en Supabase. Solo con sesión, y deja
// anotado en el Registro quién la bajó. La respuesta no se guarda en ninguna caché.
// GET: el JSON tal cual. POST (formulario de /admin/seguridad) con `frase`: cifrada con
// esa frase (ver lib/admin/backup-shared.ts); sin frase, igual que GET.
// Se restaura con scripts/restore-backup.mjs.
import { after, NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/admin/auth";
import { backupAll } from "@/lib/admin/backup";
import { MIN_PASSPHRASE, encryptBackup } from "@/lib/admin/backup-shared";
import { logEvent, PanelNotReady } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";

export const dynamic = "force-dynamic";

async function download(me: Session, passphrase: string) {
  try {
    const backup = await backupAll();
    const encrypted = passphrase
      ? encryptBackup(JSON.stringify(backup), passphrase, backup.exported_at)
      : null;
    after(() =>
      logEvent({
        actor: me.who,
        kind: "seguridad",
        text: encrypted
          ? "descargó una copia de seguridad cifrada"
          : "descargó una copia de seguridad",
      }),
    );
    const name = `se7en-respaldo-${dayKey()}${encrypted ? ".cifrado" : ""}.json`;
    return new NextResponse(
      encrypted ? JSON.stringify(encrypted) : JSON.stringify(backup, null, 2),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (e) {
    const notReady = e instanceof PanelNotReady;
    console.error("[respaldo]", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: notReady ? e.message : "No se pudo generar la copia." },
      { status: notReady ? 503 : 500 },
    );
  }
}

export async function GET() {
  const me = await getSession();
  if (!me)
    return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });
  return download(me, "");
}

export async function POST(request: Request) {
  const me = await getSession();
  if (!me)
    return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });
  const form = await request.formData().catch(() => null);
  const passphrase = String(form?.get("frase") ?? "");
  if (passphrase && passphrase.length < MIN_PASSPHRASE)
    return NextResponse.json(
      { error: `La frase tiene que tener ${MIN_PASSPHRASE} caracteres o más.` },
      { status: 400 },
    );
  return download(me, passphrase);
}
