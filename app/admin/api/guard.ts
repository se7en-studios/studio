// Para los route handlers del panel: sesión o 401. Viven bajo /admin porque la
// cookie del panel tiene path=/admin.
import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/admin/auth";
import { PanelNotReady } from "@/lib/admin/panel";

export async function withSession<T>(run: (me: Session) => Promise<T>) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: "Sesión vencida" }, { status: 401 });
  try {
    return NextResponse.json(await run(me), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    const ready = !(e instanceof PanelNotReady);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error", notReady: !ready },
      { status: ready ? 500 : 503 },
    );
  }
}
