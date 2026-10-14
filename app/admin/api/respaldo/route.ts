// Descarga una copia de todo lo que el panel guarda en Supabase. Solo con sesión, y deja
// anotado en el Registro quién la bajó. La respuesta no se guarda en ninguna caché.
import { after, NextResponse } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { backupAll } from "@/lib/admin/backup";
import { logEvent, PanelNotReady } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await getSession();
  if (!me)
    return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });
  try {
    const backup = await backupAll();
    after(() =>
      logEvent({
        actor: me.who,
        kind: "seguridad",
        text: "descargó una copia de seguridad",
      }),
    );
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="se7en-respaldo-${dayKey()}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const notReady = e instanceof PanelNotReady;
    console.error("[respaldo]", e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: notReady ? e.message : "No se pudo generar la copia." },
      { status: notReady ? 503 : 500 },
    );
  }
}
