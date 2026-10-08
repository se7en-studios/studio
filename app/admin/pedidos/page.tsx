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
export const metadata: Metadata = { title: "Pedidos · Panel" };

export default async function PedidosPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const ready = db() !== null;
  let leads: Lead[] = [];
  let error: string | null = null;
  if (ready) {
    try {
      leads = await listLeads();
    } catch (e) {
      error = e instanceof Error ? e.message : "Error leyendo los pedidos";
    }
  }
  // Seguimientos: si falta la tabla de tareas, el tablero anda igual sin ellos.
  let tasks: { list: Task[]; links: TaskLinks } | null = null;
  if (ready && !error) {
    try {
      const [list, links] = await Promise.all([listTasks(), taskLinks()]);
      tasks = { list, links };
    } catch (e) {
      if (!(e instanceof PanelNotReady)) throw e;
    }
  }
  // Historial de contactos: igual, opcional hasta correr crm.sql.
  let activities: Activity[] | null = null;
  if (ready && !error) {
    try {
      activities = await listActivity();
    } catch (e) {
      if (!(e instanceof PanelNotReady)) throw e;
    }
  }
  return <Dashboard activities={activities} leads={leads} dbReady={ready} error={error} tasks={tasks} me={me.who} />;
}
