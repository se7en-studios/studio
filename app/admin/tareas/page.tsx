import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { PanelNotReady } from "@/lib/admin/panel";
import type { Task, TaskLinks } from "@/lib/admin/task-shared";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import { AdminGate, PageHeader } from "../ui";
import { TasksBoard } from "./board";
import { TasksSetup } from "./setup";

export const metadata: Metadata = { title: "Tareas" };

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ tarea?: string; nueva?: string }> }) {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const { tarea, nueva } = await searchParams;
  let tasks: Task[] = [];
  let links: TaskLinks = { leads: [], projects: [] };
  let setup: string | null = null;
  try {
    [tasks, links] = await Promise.all([listTasks(), taskLinks()]);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Tareas">
        Quién hace qué y para cuándo. Se pueden vincular a un pedido o a un
        proyecto.
      </PageHeader>
      {setup ? (
        <TasksSetup reason={setup} />
      ) : (
        <TasksBoard tasks={tasks} links={links} me={me.who} initialOpen={tarea ?? null} autoFocus={nueva === "1"} />
      )}
    </div>
  );
}
