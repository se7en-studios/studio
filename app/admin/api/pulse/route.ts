// Contadores de la barra lateral: mensajes sin leer, pedidos sin responder,
// tareas vencidas, posts del día, entregas vencidas, mantenimiento (pedidos
// abiertos + sitios caídos) y cobros vencidos. Lo consulta el shell cada tanto,
// con la pestaña visible. Qué cuenta como pendiente sale de today-shared.ts,
// igual que en Inicio y en el resumen de las 9.
import { countNewLeads, db } from "@/lib/admin/db";
import { listDue } from "@/lib/admin/content";
import { unreadTotal } from "@/lib/admin/messages";
import { listStates } from "@/lib/admin/projects";
import { currentSiteAlerts } from "@/lib/admin/site-health";
import { dayKey } from "@/lib/admin/task-shared";
import { countOverdue } from "@/lib/admin/tasks";
import { isLateDelivery, isSiteDown } from "@/lib/admin/today-shared";
import { withSession } from "../guard";

export type Pulse = {
  unread: number | null;
  newLeads: number | null;
  overdue: number | null;
  content: number | null;
  /** Proyectos en curso con la entrega vencida. */
  lateProjects: number | null;
  /** Pedidos de mantenimiento abiertos + sitios caídos. */
  maintenance: number | null;
  /** Cobros vencidos. */
  lateCharges: number | null;
};

const orNull = <T>(p: PromiseLike<T>) => Promise.resolve(p).catch(() => null);
const counted = ({
  count,
  error,
}: {
  count: number | null;
  error: unknown;
}) => {
  if (error) throw error;
  return count ?? 0;
};

export function GET() {
  return withSession<Pulse>(async (me) => {
    const today = dayKey();
    const c = db();
    const head = { count: "exact", head: true } as const;
    const [
      unread,
      newLeads,
      overdue,
      content,
      lateProjects,
      requests,
      down,
      lateCharges,
    ] = await Promise.all([
      orNull(unreadTotal(me.who)),
      countNewLeads(),
      orNull(countOverdue(me.who, today)),
      orNull(listDue(today).then((p) => p.length)),
      orNull(
        listStates().then(
          (m) => [...m.values()].filter((s) => isLateDelivery(s, today)).length,
        ),
      ),
      c
        ? orNull(
            c
              .from("panel_maintenance_requests")
              .select("id", head)
              .neq("status", "hecho")
              .then(counted),
          )
        : null,
      orNull(currentSiteAlerts(today).then((a) => a.filter(isSiteDown).length)),
      // Un pendiente vence en su fecha (due_on = occurred_on): el mismo criterio que isLateCharge.
      c
        ? orNull(
            c
              .from("panel_finance")
              .select("id", head)
              .eq("kind", "ingreso")
              .eq("status", "pendiente")
              .lt("occurred_on", today)
              .then(counted),
          )
        : null,
    ]);
    const maintenance =
      requests === null && down === null ? null : (requests ?? 0) + (down ?? 0);
    return {
      unread,
      newLeads,
      overdue,
      content,
      lateProjects,
      maintenance,
      lateCharges,
    };
  });
}
