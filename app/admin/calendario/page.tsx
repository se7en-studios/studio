import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import {
  monthOf,
  projectOfTitle,
  type CalEvent,
  type CalPost,
  type Delivery,
} from "@/lib/admin/calendar-shared";
import { listMeetings } from "@/lib/admin/db";
import { listEntries } from "@/lib/admin/finance";
import { fmt, type Entry } from "@/lib/admin/finance-shared";
import { listPlans } from "@/lib/admin/maintenance";
import { manualDomains, type Plan } from "@/lib/admin/maintenance-shared";
import type { Meeting } from "@/lib/admin/sales-shared";
import { latestChecks } from "@/lib/admin/site-health";
import type { SiteCheck } from "@/lib/admin/site-health-shared";
import { dayIn, timeLabel } from "@/lib/admin/tz";
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
import type { Tool } from "@/lib/admin/tool-shared";
import { listTools } from "@/lib/admin/tools";
import { AdminGate, PageHeader, SetupNotice } from "../ui";
import { CalendarView } from "./view";

export const metadata: Metadata = { title: "Calendario" };

const FINISHED = ["entregado", "mantenimiento"];
/** Reuniones pasadas que se siguen mostrando (las agendadas de antes quedan como historial). */
const MEETINGS_BACK_DAYS = 90;

/**
 * Lo del negocio que no se arrastra ni se tilda desde el calendario: reuniones con
 * pedidos, cobros esperados (ingresos pendientes) y vencimientos de dominio y SSL.
 */
type Business = { meetings: Meeting[]; entries: Entry[]; checks: Map<string, SiteCheck>; plans: Plan[]; now: number };

/** Lo del negocio, fuera del render (depende de la hora). Si falta alguna tabla, ese tipo no aparece y el resto sigue. */
async function loadBusiness(): Promise<Business> {
  const now = Date.now();
  const [meetings, entries, checks, plans] = await Promise.all([
    safe<Meeting[]>(listMeetings(now - MEETINGS_BACK_DAYS * 86_400_000), [], []),
    safe<Entry[]>(listEntries(), [], []),
    safe<Map<string, SiteCheck>>(latestChecks(), new Map(), []),
    safe<Plan[]>(listPlans(), [], []),
  ]);
  return { meetings, entries, checks, plans, now };
}

function businessEvents({ meetings, entries, checks, plans, now }: Business, names: Map<string, string>): CalEvent[] {
  const manual = manualDomains(plans);
  const expiries = [...new Set([...checks.keys(), ...manual.keys()])].flatMap((slug) => {
    const c = checks.get(slug);
    const name = names.get(slug) ?? slug;
    const domain = manual.get(slug) ?? c?.domain_expires_on ?? null;
    return [
      ...(domain ? [{ slug, date: domain, title: `Vence el dominio: ${name}`, what: "dominio" }] : []),
      ...(c?.ssl_expires_on ? [{ slug, date: c.ssl_expires_on, title: `Vence el SSL: ${name}`, what: "ssl" }] : []),
    ];
  });
  return [
    ...meetings.map((m): CalEvent => ({
      key: `m-${m.lead_id}-${m.at}`,
      id: m.lead_id,
      type: "reunion",
      date: dayIn(m.at),
      title: `Reunión: ${m.name}`,
      project: null,
      owner: null,
      done: Date.parse(m.at) < now,
      detail: timeLabel(m.at),
      href: `/admin/pedidos?pedido=${m.lead_id}`,
    })),
    ...entries
      .filter((e) => e.kind === "ingreso" && e.status === "pendiente")
      .map((e): CalEvent => ({
        key: `c-${e.id}`,
        id: e.id,
        type: "cobro",
        date: e.due_on ?? e.occurred_on,
        title: `Cobro: ${e.description || (e.project_slug ? names.get(e.project_slug) ?? e.project_slug : "sin proyecto")}`,
        project: e.project_slug,
        owner: null,
        done: false,
        detail: fmt(e.amount, e.currency),
        href: "/admin/finanzas?tab=pendientes",
      })),
    ...expiries.map((x): CalEvent => ({
      key: `v-${x.slug}-${x.what}`,
      id: x.slug,
      type: "vencimiento",
      date: x.date,
      title: x.title,
      project: x.slug,
      owner: null,
      done: false,
      href: "/admin/mantenimiento",
    })),
  ];
}

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
  const [tasks, links, projects, states, posts, tools] = await Promise.all([
    safe<Task[]>(listTasks(), [], missing),
    safe<TaskLinks>(taskLinks(), { leads: [], projects: [] }, missing),
    safe<PanelProject[]>(listProjects(), caseProjects(), missing),
    safe<Map<string, ProjectState>>(listStates(), new Map(), missing),
    safe(listPostsLite(), [], missing),
    // Sin la tabla de herramientas el calendario sigue sin renovaciones, sin avisar de más.
    safe<Tool[]>(listTools(), [], []),
  ]);
  const business = await loadBusiness();

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
  const extra = businessEvents(business, new Map(projects.map((p) => [p.slug, p.name])));

  return (
    <div className="space-y-6">
      <PageHeader title="Calendario">
        Posts de Instagram, tareas, entregas, reuniones, cobros esperados, renovaciones y vencimientos de dominios en un mismo lugar.
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
        tools={tools}
        extra={extra}
        projects={projects.map((p) => ({
          slug: p.slug,
          name: p.name,
          accent: p.accent,
        }))}
      />
    </div>
  );
}
