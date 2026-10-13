import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin/cron";
import { listDue } from "@/lib/admin/content";
import { eveningReminder } from "@/lib/admin/digest";
import { notificationsConfigured, notify } from "@/lib/admin/notify";
import { PanelNotReady } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";

// Recordatorio de las 19 h (vercel.json: 21:30 UTC, las 18:30 en Argentina): solo si
// hoy hay un post que todavía no se marcó como publicado.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  if (!notificationsConfigured())
    return NextResponse.json({ sent: false, reason: "Falta NTFY_TOPIC." });

  const today = dayKey();
  let posts;
  try {
    posts = await listDue(today);
  } catch (e) {
    // Falta la base o la tabla de contenido: no hay nada que recordar, y no es un error para marcar todos los días.
    if (e instanceof PanelNotReady)
      return NextResponse.json({ sent: false, reason: e.message });
    console.error(
      "[cron recordatorio] posts:",
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { sent: false, reason: "No se pudieron leer los posts." },
      { status: 500 },
    );
  }

  const notice = eveningReminder(
    posts.map((p) => ({ title: p.title, date: p.post_date })),
    today,
  );
  if (!notice)
    return NextResponse.json({
      sent: false,
      reason: "No falta publicar nada.",
    });

  const res = await notify(notice, 4);
  return NextResponse.json(
    res.ok ? { sent: true } : { sent: false, reason: res.error },
    { status: res.ok ? 200 : 502 },
  );
}
