import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import {
  monthOf,
  projectOfTitle,
  type CalPost,
  type Delivery,
} from "@/lib/admin/calendar-shared";
import { listPostsLite } from "@/lib/admin/content";
import {
  PanelNotReady,
  caseProjects,
  listProjects,
  type PanelProject,
} from "@/lib/admin/panel";
import type { ProjectState } from "@/lib/admin/project-shared";
import { defaultState } from "@/lib/admin/project-shared";
import { listStates } from "@/lib/admin/projects";
import { dayKey, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import { AdminGate, PageHeader, SetupNotice } from "../ui";
import { CalendarView } from "./view";

export const metadata: Metadata = { title: "Calendario" };

const FINISHED = ["entregado", "mantenimiento"];

/** Lo que falte (tablas sin crear) no tira abajo el calendario: se avisa y se sigue con el resto. */
async function safe<T>(
  p: Promise<T>,
  fallback: T,
  missing: string[],
): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof PanelNotReady) missing.push(e.message);
    else
      console.error("[panel] Calendario:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export default async function CalendarioPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const missing: string[] = [];
  const [tasks, links, projects, states, posts] = await Promise.all([
    safe<Task[]>(listTasks(), [], missing),
    safe<TaskLinks>(taskLinks(), { leads: [], projects: [] }, missing),
    safe<PanelProject[]>(listProjects(), caseProjects(), missing),
    safe<Map<string, ProjectState>>(listStates(), new Map(), missing),
    safe(listPostsLite(), [], missing),
  ]);

  const deliveries: Delivery[] = projects.flatMap((p) => {
    const s = states.get(p.slug) ?? defaultState(p.slug, p.isCase);
    return s.due
      ? [
          {
            slug: p.slug,
            name: p.name,
            accent: p.accent,
            due: s.due,
            owner: s.owner,
            done: FINISHED.includes(s.status),
          },
        ]
      : [];
  });
  const calPosts: CalPost[] = posts.map((p) => ({
    ...p,
    project: projectOfTitle(p.title, projects),
  }));
  const today = dayKey();

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario">
        Posts de Instagram, tareas y entregas de proyectos en un mismo lugar.
        Filtrá por proyecto o persona, creá tareas en cualquier día y
        arrastralas para cambiarles la fecha.
      </PageHeader>
      {missing[0] && <SetupNotice reason={missing[0]} />}
      <CalendarView
        me={me.who}
        today={today}
        month={monthOf(today)}
        tasks={tasks}
        links={links}
        posts={calPosts}
        deliveries={deliveries}
        projects={projects.map((p) => ({
          slug: p.slug,
          name: p.name,
          accent: p.accent,
        }))}
      />
    </div>
  );
}
