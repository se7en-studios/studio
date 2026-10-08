import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { db, listLeads, type Lead } from "@/lib/admin/db";
import { PanelNotReady } from "@/lib/admin/panel";
import type { Task, TaskLinks } from "@/lib/admin/task-shared";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import { listActivity } from "@/lib/admin/activity";
import type { Activity } from "@/lib/admin/activity-shared";
import { Dashboard } from "../dashboard";
import { AdminGate } from "../ui";

// Los pedidos que llegan por los formularios del sitio, en un tablero para
// responderlos y darles seguimiento.
export const metadata: Metadata = { title: "Pedidos" };

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido?: string; frios?: string; nuevo?: string }>;
}) {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const ready = db() !== null;
  // Todo en paralelo. Tareas e historial son opcionales (tasks.sql, crm.sql):
  // si faltan sus tablas, el tablero anda igual sin ellos.
  const optional = async <T,>(p: () => Promise<T>): Promise<T | null> => {
    try {
      return await p();
    } catch (e) {
      if (e instanceof PanelNotReady) return null;
      throw e;
    }
  };
  const [leadsR, tasks, activities, { pedido, frios, nuevo }] = await Promise.all([
    ready
      ? listLeads().then(
          (leads) => ({ leads, error: null as string | null }),
          (e) => ({ leads: [] as Lead[], error: e instanceof Error ? e.message : "Error leyendo los pedidos" }),
        )
      : { leads: [] as Lead[], error: null },
    ready ? optional(async () => {
      const [list, links] = await Promise.all([listTasks(), taskLinks()]);
      return { list, links } as { list: Task[]; links: TaskLinks };
    }) : null,
    ready ? optional<Activity[]>(listActivity) : null,
    searchParams,
  ]);
  return (
    <Dashboard
      initialOpen={pedido ?? null}
      initialCold={frios === "1"}
      initialNew={nuevo === "1"}
      activities={activities}
      leads={leadsR.leads}
      dbReady={ready}
      error={leadsR.error}
      tasks={leadsR.error ? null : tasks}
      me={me.who}
    />
  );
}
