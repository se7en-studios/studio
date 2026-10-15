import { NextResponse } from "next/server";
import { authorizeCron } from "@/lib/admin/cron";
import { listDue } from "@/lib/admin/content";
import { countNewLeads } from "@/lib/admin/db";
import { morningDigest } from "@/lib/admin/digest";
import { listEntries } from "@/lib/admin/finance";
import { usdOf } from "@/lib/admin/finance-shared";
import { ensureCharges, listPlans } from "@/lib/admin/maintenance";
import { manualDomains } from "@/lib/admin/maintenance-shared";
import { siteAlerts } from "@/lib/admin/site-health-shared";
import { latestChecks } from "@/lib/admin/site-health";
import { notificationsConfigured, notify } from "@/lib/admin/notify";
import { bucket, dayKey } from "@/lib/admin/task-shared";
import { listTasks } from "@/lib/admin/tasks";
import { daysUntil, nextRenewal } from "@/lib/admin/tool-shared";
import { listTools } from "@/lib/admin/tools";

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
  const today = dayKey();
  // Los cobros de mantenimiento del mes se generan acá también (además de al
  // abrir Mantenimiento): así aparecen aunque nadie entre al panel.
  await orEmpty("cobros de mantenimiento", ensureCharges(today), 0);
  if (!notificationsConfigured())
    return NextResponse.json({ sent: false, reason: "Falta NTFY_TOPIC." });

  const [posts, tasks, newLeads, tools, entries, checks, plans] = await Promise.all([
    orEmpty("posts", listDue(today), []),
    orEmpty("tareas", listTasks(), []),
    orEmpty("pedidos", countNewLeads(), 0),
    orEmpty("herramientas", listTools(), []),
    orEmpty("finanzas", listEntries(), []),
    orEmpty("salud de los sitios", latestChecks(), new Map()),
    orEmpty("planes de mantenimiento", listPlans(), []),
  ]);
  const open = tasks.filter((t) => !t.done_at);
  // Los pendientes de #70 (ingresos «pendiente») cuya fecha prevista ya pasó: lo mismo que «late» en receivables().
  const late = entries.filter((e) => e.kind === "ingreso" && e.status === "pendiente" && e.occurred_on < today);

  const notice = morningDigest({
    posts: posts.map((p) => ({ title: p.title, date: p.post_date })),
    today,
    overdueTasks: open.filter((t) => bucket(t, today) === "vencidas").length,
    dueTodayTasks: open.filter((t) => bucket(t, today) === "hoy").length,
    newLeads: newLeads ?? 0,
    lateCharges: { count: late.length, usd: late.reduce((s, e) => s + usdOf(e), 0) },
    // El día 1 de cada mes se recuerda bajar la copia de seguridad.
    backupDue: today.endsWith("-01"),
    // Sólo las que renuevan en 3 días o menos.
    renewals: tools
      .map((t) => ({ name: t.name, days: daysUntil(nextRenewal(t.renews_on, t.cycle, today), today) }))
      .filter((r) => r.days <= 3),
    // Sólo contadas: el texto va a ntfy y no lleva nombres de clientes.
    siteAlerts: siteAlerts(checks.values(), today, manualDomains(plans)),
  });
  if (!notice)
    return NextResponse.json({ sent: false, reason: "Nada para avisar." });

  const res = await notify(notice);
  return NextResponse.json(
    res.ok ? { sent: true } : { sent: false, reason: res.error },
    { status: res.ok ? 200 : 502 },
  );
}
