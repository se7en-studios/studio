// Contadores de la barra lateral: mensajes sin leer, pedidos sin responder y
// tareas vencidas. Lo consulta el shell cada tanto, con la pestaña visible.
import { countNewLeads } from "@/lib/admin/db";
import { listDue } from "@/lib/admin/content";
import { unreadTotal } from "@/lib/admin/messages";
import { dayKey } from "@/lib/admin/task-shared";
import { countOverdue } from "@/lib/admin/tasks";
import { withSession } from "../guard";

export type Pulse = { unread: number | null; newLeads: number | null; overdue: number | null; content: number | null };

export function GET() {
  return withSession<Pulse>(async (me) => {
    const [unread, newLeads, overdue, content] = await Promise.all([
      unreadTotal(me.who).catch(() => null),
      countNewLeads(),
      countOverdue(me.who, dayKey()).catch(() => null),
      listDue(dayKey()).then((p) => p.length).catch(() => null),
    ]);
    return { unread, newLeads, overdue, content };
  });
}
