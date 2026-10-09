import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, FolderKanban, History, MessagesSquare, Plus } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { db, listLeads, type Lead, type LeadOwner } from "@/lib/admin/db";
import { listActivity } from "@/lib/admin/activity";
import type { Activity } from "@/lib/admin/activity-shared";
import { ago } from "@/lib/admin/brief";
import { channelSummaries } from "@/lib/admin/messages";
import { GENERAL, parseChannel, type ChannelSummary } from "@/lib/admin/message-shared";
import { dealValue, monthKey } from "@/lib/admin/metrics";
import { PanelNotReady, caseProjects, listEvents, listProjects, type PanelEvent, type PanelProject } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { ACTIVE_STATUSES, defaultState, type ProjectState } from "@/lib/admin/project-shared";
import { listStates } from "@/lib/admin/projects";
import { paidBySlug } from "@/lib/admin/payments";
import { balance } from "@/lib/admin/payment-shared";
import { bucket, dayKey, dueLabel, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import { Attention } from "./attention";
import { EventList } from "./feed";
import { Card, CardLink, Empty, Face, Kpi, PageHeader, Progress, StatusPill, btnPrimary, btnSecondary, cn, kpiRow, usdShort } from "./kit";
import { MyTasks } from "./tareas/my-tasks";
import { AdminGate, SetupNotice } from "./ui";

export const metadata: Metadata = { title: "Inicio" };

/** Lo que falte (tablas sin crear, base sin conectar) no tira abajo Inicio. */
async function safe<T>(p: Promise<T>, fallback: T): Promise<{ value: T; missing: string | null }> {
  try {
    return { value: await p, missing: null };
  } catch (e) {
    if (e instanceof PanelNotReady) return { value: fallback, missing: e.message };
    console.error("[panel] Inicio:", e instanceof Error ? e.message : e);
    return { value: fallback, missing: null };
  }
}

const TZ = "America/Argentina/Buenos_Aires";

/**
 * Todo lo que muestra Inicio, leído en paralelo. Fuera del componente: acá
 * vive lo que depende de la hora (Date.now, saludos), que es por pedido.
 */
async function loadHome(who: LeadOwner) {
  const hasDb = db() !== null;
  const [leadsR, actsR, projectsR, statesR, eventsR, tasksR, linksR, chatsR, paidR] = await Promise.all([
    safe<Lead[]>(hasDb ? listLeads() : Promise.resolve([]), []),
    safe<Activity[] | null>(listActivity(), null),
    safe<PanelProject[]>(listProjects(), caseProjects()),
    safe<Map<string, ProjectState>>(listStates(), new Map()),
    safe<PanelEvent[]>(listEvents({ limit: 10 }), []),
    safe<Task[] | null>(listTasks(), null),
    safe<TaskLinks>(taskLinks(), { leads: [], projects: [] }),
    safe<ChannelSummary[]>(channelSummaries(who), []),
    safe<Map<string, number> | null>(paidBySlug(), null),
  ]);

  const leads = leadsR.value;
  const now = Date.now();
  const thisMonth = monthKey(new Date(now).toISOString());
  const wonMonth = leads
    .filter((l) => l.status === "ganado" && monthKey(l.updated_at ?? l.created_at) === thisMonth)
    .reduce((s, l) => s + dealValue(l), 0);
  const pipeline = leads.filter((l) => l.status === "contactado" || l.status === "propuesta").reduce((s, l) => s + dealValue(l), 0);
  const fresh = leads.filter((l) => l.status === "nuevo").length;
  const today = dayKey();
  const tasks = tasksR.value;
  const overdue = tasks?.filter((t) => t.assignee === who && bucket(t, today) === "vencidas").length ?? 0;

  const states = statesR.value;
  const projects = projectsR.value.map((p) => ({ p, s: states.get(p.slug) ?? defaultState(p.slug, p.isCase) }));
  const active = projects
    .filter(({ s }) => ACTIVE_STATUSES.includes(s.status))
    .sort((a, b) => (a.s.due ?? "9999").localeCompare(b.s.due ?? "9999"));
  // Saldo de cada proyecto con monto acordado. null si falta payments.sql.
  const paid = paidR.value;
  const unpaid = paid
    ? projects
        .filter(({ s }) => s.status !== "pausado")
        .map(({ p, s }) => ({ slug: p.slug, name: p.name, done: s.status === "entregado" || s.status === "mantenimiento", left: balance(s.budget, paid.get(p.slug) ?? 0) ?? 0 }))
        .filter((x) => x.left > 0)
        .sort((a, b) => b.left - a.left)
    : null;
  const names = Object.fromEntries(projectsR.value.map((p) => [p.slug, p.name]));
  const leadNames = Object.fromEntries(leads.map((l) => [l.id, l.name]));
  const chats = [...chatsR.value].sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "")).slice(0, 5);
  const unread = chatsR.value.reduce((n, c) => n + c.unread, 0);
  const setup = projectsR.missing ?? statesR.missing ?? chatsR.missing;

  const date = new Date().toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  const hour = Number(new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit" }));
  const hello = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return { unpaid, hasDb, fresh, active, projects, pipeline, wonMonth, tasks, overdue, today, names, leadNames, chats, unread, setup, date, hello, leads, now, actsR, eventsR, linksR };
}

// Lo primero que se ve al entrar: qué está pendiente, cómo vienen los
// proyectos, qué se habló y qué cambió. Todo se lee en paralelo.
export default async function AdminHome() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const d = await loadHome(me.who);
  const { hasDb, fresh, active, projects, pipeline, wonMonth, tasks, overdue, today, names, leadNames, chats, unread, setup, date, hello, leads, now } = d;
  const { actsR, eventsR, linksR, unpaid } = d;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={date.charAt(0).toUpperCase() + date.slice(1)}
        title={`${hello}, ${PEOPLE[me.who].name}`}
        right={
          <>
            <Link href="/admin/mensajes" className={btnSecondary}>
              <MessagesSquare size={14} /> Mensajes
              {unread > 0 && <span className="rounded-full bg-accent px-1.5 font-mono text-[11px] text-background">{unread}</span>}
            </Link>
            <Link href="/admin/tareas?nueva=1" className={btnSecondary}>
              <Plus size={14} /> Tarea
            </Link>
            <Link href="/admin/pedidos?nuevo=1" className={btnPrimary}>
              <Plus size={14} /> Pedido
            </Link>
          </>
        }
      >
        {[
          fresh ? `${fresh} ${fresh === 1 ? "pedido espera" : "pedidos esperan"} respuesta` : "Ningún pedido sin responder",
          active.length ? `${active.length} ${active.length === 1 ? "proyecto en curso" : "proyectos en curso"}` : null,
          overdue ? `${overdue} ${overdue === 1 ? "tarea tuya vencida" : "tareas tuyas vencidas"}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        .
      </PageHeader>

      {setup && <SetupNotice reason={setup} />}

      <div className={cn(kpiRow, "md:grid-cols-3", unpaid ? "xl:grid-cols-6" : "xl:grid-cols-5")}>
        <Kpi label="Sin responder" value={hasDb ? fresh : "—"} tone={fresh ? "accent" : undefined} href="/admin/pedidos" hint="Pedidos nuevos" />
        <Kpi label="Valor en juego" value={usdShort(pipeline)} href="/admin/metricas" hint="Contactados + propuesta" />
        <Kpi label="Ganado este mes" value={usdShort(wonMonth)} tone={wonMonth ? "green" : undefined} href="/admin/metricas" />
        {unpaid && (
          <Kpi
            label="Por cobrar"
            value={usdShort(unpaid.reduce((n, x) => n + x.left, 0))}
            tone={unpaid.some((x) => x.done) ? "amber" : undefined}
            href="/admin/proyectos"
            hint={unpaid.length ? `${unpaid.length} ${unpaid.length === 1 ? "proyecto" : "proyectos"} con saldo` : "Todo cobrado"}
          />
        )}
        <Kpi label="Proyectos en curso" value={active.length} href="/admin/proyectos" hint={`${projects.length} en total`} />
        <Kpi
          label="Tus tareas vencidas"
          value={tasks ? overdue : "—"}
          tone={overdue ? "red" : undefined}
          href="/admin/tareas"
          hint={tasks ? openLabel(tasks.filter((t) => t.assignee === me.who && !t.done_at).length) : undefined}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          {hasDb && <Attention leads={leads} activities={actsR.value} now={now} overdueTasks={overdue} unpaid={unpaid?.filter((x) => x.done) ?? []} />}

          <Card
            title="Proyectos en curso"
            icon={<FolderKanban size={14} />}
            count={active.length}
            action={<CardLink href="/admin/proyectos">Ver todos →</CardLink>}
          >
            {active.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {active.slice(0, 6).map(({ p, s }) => (
                  <li key={p.slug}>
                    <Link
                      href={`/admin/proyectos/${p.slug}`}
                      className="focus-ring grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025] md:grid-cols-[auto_minmax(0,1fr)_120px_110px_auto]"
                    >
                      <Cover project={p} />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium">{p.name}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-muted">{s.client || p.category || "Sin cliente"}</span>
                      </span>
                      <span className="hidden md:block">
                        <span className="mb-1 flex justify-between text-[11px] text-muted">
                          Avance <span className="tabular-nums">{s.progress}%</span>
                        </span>
                        <Progress value={s.progress} accent={p.accent} />
                      </span>
                      <span className="hidden md:block">
                        <StatusPill status={s.status} />
                      </span>
                      <span className="flex items-center gap-2">
                        {s.due && (
                          <span className={cn("hidden text-[12px] sm:inline", s.due < today ? "text-red-400" : "text-muted")}>
                            <CalendarClock size={12} className="mr-1 inline -translate-y-px" />
                            {dueLabel(s.due, today)}
                          </span>
                        )}
                        <Face who={s.owner} size={22} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty icon={<FolderKanban size={18} />} title="Nada en curso">
                Pasá un proyecto a Descubrimiento, Diseño, Desarrollo o Revisión y aparece acá.
              </Empty>
            )}
          </Card>

          <Card title="Actividad del equipo" icon={<History size={14} />} action={<CardLink href="/admin/cambios">Registro completo →</CardLink>}>
            <EventList events={eventsR.value} names={names} compact />
          </Card>
        </div>

        <div className="min-w-0 space-y-4">
          {tasks && <MyTasks tasks={tasks} links={linksR.value} me={me.who} />}

          <Card
            title="Mensajes"
            icon={<MessagesSquare size={14} />}
            count={unread || undefined}
            action={<CardLink href="/admin/mensajes">Abrir →</CardLink>}
          >
            {chats.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {chats.map((c) => {
                  const p = parseChannel(c.channel);
                  const title =
                    p.kind === "general" ? "# General" : p.kind === "proyecto" ? names[p.slug] ?? p.slug : leadNames[p.id] ?? "Pedido";
                  return (
                    <li key={c.channel}>
                      <Link
                        href={c.channel === GENERAL ? "/admin/mensajes" : `/admin/mensajes?c=${encodeURIComponent(c.channel)}`}
                        className="focus-ring flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                      >
                        {c.last && <Face who={c.last.author} size={26} />}
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={cn("truncate text-[13px]", c.unread ? "font-semibold" : "font-medium")}>{title}</span>
                            {c.last && <span className="ml-auto shrink-0 text-[11px] text-muted">{ago(c.last.created_at)}</span>}
                          </span>
                          <span className="mt-0.5 line-clamp-2 text-[13px] text-muted">{c.last?.body}</span>
                        </span>
                        {c.unread > 0 && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty icon={<MessagesSquare size={18} />} title="Sin mensajes todavía">
                <Link href="/admin/mensajes" className="text-accent hover:underline">
                  Escribile al equipo
                </Link>{" "}
                o abrí la conversación de un proyecto.
              </Empty>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const openLabel = (n: number) => `${n} ${n === 1 ? "abierta" : "abiertas"}`;

function Cover({ project }: { project: PanelProject }) {
  const cls = "h-9 w-14 shrink-0 rounded-md border border-[var(--line)] object-cover object-top";
  if (!project.cover)
    return <span className={cls} style={{ background: `linear-gradient(135deg, ${project.accent}, #111)` }} />;
  return project.isCase ? (
    <Image src={project.cover} alt="" width={112} height={72} className={cls} />
  ) : (
    // URL firmada de Supabase: ver feed.tsx.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={project.cover} alt="" className={cls} />
  );
}
