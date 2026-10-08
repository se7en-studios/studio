import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Palette, Upload } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { countNewLeads } from "@/lib/admin/db";
import {
  PanelNotReady,
  caseProjects,
  countFilesSince,
  listEvents,
  listProjects,
  type PanelEvent,
  type PanelProject,
} from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { ago } from "@/lib/admin/brief";
import { EventList } from "./feed";
import { MyTasks } from "./tareas/my-tasks";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import type { Task, TaskLinks } from "@/lib/admin/task-shared";
import { AdminGate, PageHeader, SetupNotice, Stat, dayLabel } from "./ui";

export const metadata: Metadata = { title: "Panel" };

// Lo primero que se ve al entrar: qué pasó, qué hay pendiente y atajos.
export default async function AdminHome() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  let projects: PanelProject[] = caseProjects();
  let events: PanelEvent[] = [];
  let filesWeek: number | null = null;
  let setup: string | null = null;
  const newLeads = await countNewLeads();
  try {
    [projects, events, filesWeek] = await Promise.all([
      listProjects(),
      listEvents({ limit: 50 }),
      countFilesSince(new Date(Date.now() - 7 * 86_400_000).toISOString()),
    ]);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }
  // Aparte: si falta la tabla de tareas, el resto de Inicio anda igual.
  let tasks: { list: Task[]; links: TaskLinks } | null = null;
  if (!setup) {
    try {
      const [list, links] = await Promise.all([listTasks(), taskLinks()]);
      tasks = { list, links };
    } catch (e) {
      if (!(e instanceof PanelNotReady)) throw e;
    }
  }

  const names = Object.fromEntries(projects.map((p) => [p.slug, p.name]));
  const today = events.filter((e) => dayLabel(e.created_at) === "Hoy").length;
  const active = projects.filter((p) => p.files > 0).slice(0, 4);
  const date = new Date().toLocaleDateString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <PageHeader title={`Buenas, ${PEOPLE[me.who].name}`}>
        {date.charAt(0).toUpperCase() + date.slice(1)}.{" "}
        {!setup && (today ? `${today} ${today === 1 ? "cambio" : "cambios"} hoy en el panel.` : "Hoy todavía no hubo cambios en el panel.")}
      </PageHeader>

      {setup && <SetupNotice reason={setup} />}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Pedidos sin responder" value={newLeads ?? "—"} accent={(newLeads ?? 0) > 0} href="/admin/pedidos" />
        <Stat label="Proyectos" value={projects.length} href="/admin/proyectos" />
        <Stat label="Archivos esta semana" value={filesWeek ?? "—"} />
        <Stat label="Cambios hoy" value={setup ? "—" : today} href="/admin/cambios" />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-border bg-surface/50">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm text-foreground">Últimos cambios</h2>
            <Link href="/admin/cambios" className="focus-ring font-mono text-[11px] tracking-widest text-muted uppercase hover:text-foreground">
              Ver todos →
            </Link>
          </header>
          <EventList events={events.slice(0, 8)} names={names} />
        </section>

        <div className="space-y-4">
          {tasks && <MyTasks tasks={tasks.list} links={tasks.links} me={me.who} />}
          <section className="rounded-2xl border border-border bg-surface/50">
            <header className="border-b border-border px-4 py-3">
              <h2 className="text-sm text-foreground">Proyectos con movimiento</h2>
            </header>
            {active.length ? (
              <ul>
                {active.map((p) => (
                  <li key={p.slug} className="border-b border-border last:border-0">
                    <Link href={`/admin/proyectos/${p.slug}`} className="focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.03]">
                      <Cover project={p} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">{p.name}</span>
                        <span className="font-mono text-[10px] tracking-widest text-muted uppercase">
                          {p.files} archivos{p.updatedAt && ` · ${ago(p.updatedAt)}`}
                        </span>
                      </span>
                      <ArrowRight size={14} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-sm text-muted">Cuando suban archivos a un proyecto, aparece acá.</p>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Shortcut href="/admin/proyectos" icon={<Upload size={16} />} label="Subir archivos" hint="Elegí el proyecto" />
            <Shortcut href="/admin/marca" icon={<Palette size={16} />} label="Marca" hint="Logos, colores, fuentes" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Cover({ project }: { project: PanelProject }) {
  const cls = "h-10 w-16 shrink-0 rounded-md border border-border object-cover object-top";
  if (!project.cover) return <span className={cls} style={{ background: project.accent }} />;
  return project.isCase ? (
    <Image src={project.cover} alt="" width={128} height={80} className={cls} />
  ) : (
    // URL firmada de Supabase: ver feed.tsx.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={project.cover} alt="" className={cls} />
  );
}

function Shortcut({ href, icon, label, hint }: { href: string; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <Link href={href} className="focus-ring rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-foreground/20">
      <span className="text-accent">{icon}</span>
      <span className="mt-3 block text-sm text-foreground">{label}</span>
      <span className="block text-xs text-muted">{hint}</span>
    </Link>
  );
}
