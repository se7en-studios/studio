import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin/cron";
import { listDue } from "@/lib/admin/content";
import { countNewLeads } from "@/lib/admin/db";
import { morningDigest } from "@/lib/admin/digest";
import { notificationsConfigured, notify } from "@/lib/admin/notify";
import { bucket, dayKey } from "@/lib/admin/task-shared";
import { listTasks } from "@/lib/admin/tasks";

// Resumen de la mañana (vercel.json: 12:00 UTC, las 09:00 en Argentina). Lo que falte
// (tablas sin crear, base caída) no corta el aviso: se manda con lo que haya.
export const dynamic = "force-dynamic";

const orEmpty = async <T>(
  label: string,
  p: Promise<T>,
  empty: T,
): Promise<T> => {
  try {
    return await p;
  } catch (e) {
    console.error(
      `[cron resumen] ${label}:`,
      e instanceof Error ? e.message : e,
    );
    return empty;
  }
};

export async function GET(request: Request) {
  const denied = authorizeCron(request);
  if (denied) return denied;
  if (!notificationsConfigured())
    return NextResponse.json({ sent: false, reason: "Falta NTFY_TOPIC." });

  const today = dayKey();
  const [posts, tasks, newLeads] = await Promise.all([
    orEmpty("posts", listDue(today), []),
    orEmpty("tareas", listTasks(), []),
    orEmpty("pedidos", countNewLeads(), 0),
  ]);
  const open = tasks.filter((t) => !t.done_at);

  const notice = morningDigest({
    posts: posts.map((p) => ({ title: p.title, date: p.post_date })),
    today,
    overdueTasks: open.filter((t) => bucket(t, today) === "vencidas").length,
    dueTodayTasks: open.filter((t) => bucket(t, today) === "hoy").length,
    newLeads: newLeads ?? 0,
  });
  if (!notice)
    return NextResponse.json({ sent: false, reason: "Nada para avisar." });

  const res = await notify(notice);
  return NextResponse.json(
    res.ok ? { sent: true } : { sent: false, reason: res.error },
    { status: res.ok ? 200 : 502 },
  );
}
