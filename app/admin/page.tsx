import type { Metadata } from "next";
import Link from "next/link";
import { CheckSquare, History, Inbox, MessagesSquare, Plus, Repeat, TrendingUp, Trophy, Wallet } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { db, listLeads, listMeetings, type Lead, type LeadOwner } from "@/lib/admin/db";
import { listActivity } from "@/lib/admin/activity";
import { listDue, type DuePost } from "@/lib/admin/content";
import { listCobros, listEntries } from "@/lib/admin/finance";
import type { Entry } from "@/lib/admin/finance-shared";
import type { Activity } from "@/lib/admin/activity-shared";
import { ago } from "@/lib/admin/brief";
import { channelSummaries } from "@/lib/admin/messages";
import { GENERAL, parseChannel, type ChannelSummary } from "@/lib/admin/message-shared";
import { monthKey, pipelineValue, wonInMonth } from "@/lib/admin/metrics";
import { listPlans, listRequests } from "@/lib/admin/maintenance";
import { mrr, type MaintRequest, type Plan } from "@/lib/admin/maintenance-shared";
import { currentSiteAlerts } from "@/lib/admin/site-health";
import type { SiteAlert } from "@/lib/admin/site-health-shared";
import type { Meeting } from "@/lib/admin/sales-shared";
import { isLateDelivery, isOpenRequest } from "@/lib/admin/today-shared";
import { TZ, dayIn } from "@/lib/admin/tz";
import { PanelNotReady, caseProjects, listEvents, listProjects, type PanelEvent, type PanelProject } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { ACTIVE_STATUSES, defaultState, type ProjectState } from "@/lib/admin/project-shared";
import { listStates } from "@/lib/admin/projects";
import { receivables, withLegacy } from "@/lib/admin/payment-shared";
import { bucket, dayKey, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import { fetchRates, referenceRate } from "@/lib/admin/fx";
import { daysUntil, nextRenewal, toolEntries, type Tool } from "@/lib/admin/tool-shared";
import { listTools } from "@/lib/admin/tools";
import { fmt } from "@/lib/admin/finance-shared";
import { Attention } from "./attention";
import { EventList } from "./feed";
import { Card, CardLink, Empty, Face, Kpi, PageHeader, btnPrimary, btnSecondary, cn, kpiRow, usdShort } from "./kit";
import { MyTasks } from "./tareas/my-tasks";
import { FinanceCard } from "./finance-card";
import { ProjectsCard, type HomeProject } from "./projects-card";
import { getSalaMasApagada, type SalaMasApagada } from "@/lib/admin/oficinas";
import { EnVivoCard } from "./oficinas/home-card";
import { AdminGate, SetupNotice } from "./ui";

export const metadata: Metadata = { title: "Inicio" };

/**
 * Lo que falte (tablas sin crear, base sin conectar) no tira abajo Inicio. Si
 * una lectura falla por otra cosa, `failed` lleva su nombre: «Para atender» lo
 * dice en vez de mostrar «todo al día» con datos que no pudo leer.
 */
async function safe<T>(p: Promise<T>, fallback: T, label: string): Promise<{ value: T; missing: string | null; failed: string | null }> {
  try {
    return { value: await p, missing: null, failed: null };
  } catch (e) {
    if (e instanceof PanelNotReady) return { value: fallback, missing: e.message, failed: null };
    console.error(`[panel] Inicio (${label}):`, e instanceof Error ? e.message : e);
    return { value: fallback, missing: null, failed: label };
  }
}

/**
 * Todo lo que muestra Inicio, leído en paralelo. Fuera del componente: acá
 * vive lo que depende de la hora (Date.now, saludos), que es por pedido.
 */
async function loadHome(who: LeadOwner) {
  const hasDb = db() !== null;
  const today = dayKey();
  const [leadsR, actsR, projectsR, statesR, eventsR, tasksR, linksR, chatsR, contentR, financeR, toolsR, rates, salaR, plansR, requestsR, sitesR, meetingsR] = await Promise.all([
    safe<Lead[]>(hasDb ? listLeads() : Promise.resolve([]), [], "pedidos"),
    safe<Activity[] | null>(listActivity(), null, "contactos"),
    safe<PanelProject[]>(listProjects(), caseProjects(), "proyectos"),
    safe<Map<string, ProjectState>>(listStates(), new Map(), "estado de los proyectos"),
    safe<PanelEvent[]>(listEvents({ limit: 10 }), [], "actividad"),
    safe<Task[] | null>(listTasks(), null, "tareas"),
    safe<TaskLinks>(taskLinks(), { leads: [], projects: [] }, "tareas"),
    safe<ChannelSummary[]>(channelSummaries(who), [], "mensajes"),
    safe<DuePost[]>(listDue(today), [], "contenido"),
    // Movimientos de Finanzas más los cobros viejos (en USD: la cotización no importa para este resumen).
    safe<Entry[] | null>(Promise.all([listEntries(), listCobros(0)]).then(([a, b]) => withLegacy(a, b)), null, "cobros"),
    safe<Tool[]>(listTools(), [], "herramientas"),
    // Para pasar a dólares las herramientas en pesos y los abonos; sin cotización, Inicio los deja afuera.
    fetchRates(),
    // «En vivo»: la sala más apagada, con las mismas reglas que el mapa.
    safe<SalaMasApagada | null>(getSalaMasApagada(who), null, "En vivo"),
    // Mantenimiento: abonos (ingreso fijo) y pedidos abiertos. Sin maintenance.sql quedan vacíos.
    safe<Plan[] | null>(listPlans(), null, "abonos"),
    safe<MaintRequest[]>(listRequests(), [], "pedidos de mantenimiento"),
    safe<SiteAlert[]>(currentSiteAlerts(today), [], "salud de los sitios"),
    safe<Meeting[]>(listMeetings(), [], "reuniones"),
  ]);
  const failed = [...new Set([leadsR, actsR, statesR, tasksR, financeR, toolsR, plansR, requestsR, sitesR, meetingsR, contentR].map((r) => r.failed).filter((f): f is string => !!f))];

  const leads = leadsR.value;
  const now = Date.now();
  const thisMonth = monthKey(new Date(now).toISOString());
  const wonMonth = wonInMonth(leads, thisMonth);
  const pipeline = pipelineValue(leads);
  const fresh = leads.filter((l) => l.status === "nuevo").length;
  const tasks = tasksR.value;
  const overdue = tasks?.filter((t) => t.assignee === who && bucket(t, today) === "vencidas").length ?? 0;

  const states = statesR.value;
  const projects = projectsR.value.map((p) => ({ p, s: states.get(p.slug) ?? defaultState(p.slug, p.isCase) }));
  const active = projects
    .filter(({ s }) => ACTIVE_STATUSES.includes(s.status))
    .sort((a, b) => (a.s.due ?? "9999").localeCompare(b.s.due ?? "9999"));
  // Los sitios que se mantienen: no están «en curso», pero son el trabajo de todos los días.
  const maintenance = projects.filter(({ s }) => s.status === "mantenimiento");
  // Lo que falta cobrar, con la misma cuenta que Finanzas y la ficha. null si falta finance.sql.
  const owing = financeR.value
    ? receivables(
        projects.map(({ p, s }) => ({ slug: p.slug, name: p.name, budget: s.budget, status: s.status })),
        financeR.value,
        today,
      )
    : null;
  // Cada proyecto con sus tareas abiertas y lo que falta cobrarle; en mantenimiento, primero lo que pide atención.
  const owedBy = new Map(owing?.projects.map((m) => [m.slug, m.owed]));
  const projectRows = (list: typeof projects): HomeProject[] =>
    list.map(({ p, s }) => ({ p, s, tasks: tasks?.filter((t) => !t.done_at && t.project_slug === p.slug).length ?? 0, owed: owedBy.get(p.slug) ?? 0 }));
  const byNeed = (a: HomeProject, b: HomeProject) => b.owed - a.owed || b.tasks - a.tasks || a.p.name.localeCompare(b.p.name, "es");
  // Para «Atención»: cuotas vencidas y saldos de lo ya entregado.
  const unpaid = owing?.projects
    .filter((x) => x.late > 0 || (x.done && x.uncovered > 0))
    .map((x) => ({ slug: x.slug, name: x.name, left: x.late + (x.done ? x.uncovered : 0), late: x.late > 0 }));
  // Herramientas que renuevan en la semana, la más cercana primero.
  const renewals = toolsR.value
    .map((t) => ({ id: t.id, name: t.name, days: daysUntil(nextRenewal(t.renews_on, t.cycle, today), today), price: `${fmt(t.amount, t.currency)} / ${t.cycle === "anual" ? "año" : "mes"}` }))
    .filter((r) => r.days <= 7)
    .sort((a, b) => a.days - b.days);
  const names = Object.fromEntries(projectsR.value.map((p) => [p.slug, p.name]));
  // Ingreso mensual fijo: la suma de los abonos activos, en USD. null si falta maintenance.sql.
  const fx = referenceRate(rates);
  const plans = plansR.value;
  const fixedIncome = plans && fx ? { usd: mrr(plans, fx), sites: plans.filter((x) => x.active).length } : null;
  const sites = sitesR.value.map((a) => ({ ...a, name: names[a.slug] ?? a.slug }));
  const requests = requestsR.value
    .filter((r) => isOpenRequest(r) && (r.priority === "urgente" || r.priority === "alta"))
    .map((r) => ({ id: r.id, title: r.title, project: names[r.project_slug] ?? r.project_slug, urgent: r.priority === "urgente", created_at: r.created_at }));
  const meetings = meetingsR.value.filter((m) => dayIn(m.at) === today);
  const lateDeliveries = projects.filter(({ s }) => isLateDelivery(s, today)).map(({ p, s }) => ({ slug: p.slug, name: p.name, due: s.due as string }));
  const leadNames = Object.fromEntries(leads.map((l) => [l.id, l.name]));
  const chats = [...chatsR.value].sort((a, b) => (b.last?.created_at ?? "").localeCompare(a.last?.created_at ?? "")).slice(0, 5);
  const unread = chatsR.value.reduce((n, c) => n + c.unread, 0);
  const setup = projectsR.missing ?? statesR.missing ?? chatsR.missing;

  const date = new Date().toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
  const hour = Number(new Date().toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit" }));
  const hello = hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches";

  return { failed, fixedIncome, sites, requests, meetings, lateDeliveries, sala: salaR.value, renewals, owing, unpaid, hasDb, fresh, active: projectRows(active), maintenance: projectRows(maintenance).sort(byNeed), projects, pipeline, wonMonth, tasks, overdue, today, names, leadNames, chats, unread, setup, date, hello, leads, now, actsR, eventsR, linksR, content: contentR.value, finance: financeR.value && [...financeR.value, ...toolEntries(toolsR.value, fx)] };
}

// Lo primero que se ve al entrar: qué está pendiente, cómo vienen los
// proyectos, qué se habló y qué cambió. Todo se lee en paralelo.
export default async function AdminHome() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const d = await loadHome(me.who);
  const { hasDb, fresh, active, maintenance, projects, pipeline, wonMonth, tasks, overdue, today, names, leadNames, chats, unread, setup, date, hello, leads, now } = d;
  const { actsR, eventsR, linksR, owing, unpaid, content, finance, renewals, failed, fixedIncome, sites, requests, meetings, lateDeliveries } = d;

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
          maintenance.length ? `${maintenance.length} ${maintenance.length === 1 ? "sitio" : "sitios"} en mantenimiento` : null,
          overdue ? `${overdue} ${overdue === 1 ? "tarea tuya vencida" : "tareas tuyas vencidas"}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        .
      </PageHeader>

      {setup && <SetupNotice reason={setup} />}

      <div className={cn(kpiRow, "md:grid-cols-3", owing ? "xl:grid-cols-6" : "xl:grid-cols-5")}>
        <Kpi label="Sin responder" value={hasDb ? fresh : "—"} tone={fresh ? "accent" : undefined} href="/admin/pedidos" hint="Pedidos nuevos" icon={<Inbox size={14} />} />
        <Kpi label="Valor en juego" value={usdShort(pipeline)} href="/admin/metricas" hint="Contactados + propuesta" icon={<TrendingUp size={14} />} />
        <Kpi label="Ganado este mes" value={usdShort(wonMonth)} tone={wonMonth ? "green" : undefined} href="/admin/metricas" icon={<Trophy size={14} />} />
        {owing && (
          <Kpi
            label="Por cobrar"
            value={usdShort(owing.total)}
            tone={unpaid?.length ? "amber" : undefined}
            href="/admin/finanzas?tab=pendientes"
            icon={<Wallet size={14} />}
            hint={
              owing.projects.length
                ? `${owing.projects.length} ${owing.projects.length === 1 ? "proyecto" : "proyectos"} con saldo`
                : owing.total
                  ? "Pendientes sin proyecto"
                  : "Todo cobrado"
            }
          />
        )}
        {/* El ingreso que se repite: de ahí vive hoy el estudio (los proyectos en curso están en su tarjeta). */}
        <Kpi
          label="Ingreso fijo"
          value={fixedIncome ? usdShort(fixedIncome.usd) : "—"}
          href="/admin/mantenimiento"
          hint={
            fixedIncome?.sites
              ? `${fixedIncome.sites} ${fixedIncome.sites === 1 ? "abono" : "abonos"} por mes · ${active.length} en curso`
              : `Cargá los abonos en Mantenimiento`
          }
          icon={<Repeat size={14} />}
        />
        <Kpi
          label="Tus tareas vencidas"
          value={tasks ? overdue : "—"}
          tone={overdue ? "red" : undefined}
          href="/admin/tareas"
          icon={<CheckSquare size={14} />}
          hint={tasks ? openLabel(tasks.filter((t) => t.assignee === me.who && !t.done_at).length) : undefined}
        />
      </div>

      {/* En el celular las columnas se disuelven (contents) y manda `order`: primero lo
          que hay que hacer (Para atender, Mis tareas), al final lo que se mira. */}
      <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-start">
        <div className="contents xl:block xl:min-w-0 xl:space-y-4">
          {hasDb && (
            <div className="order-1 min-w-0 xl:order-none">
              <Attention
                leads={leads}
                activities={actsR.value}
                now={now}
                overdueTasks={overdue}
                unpaid={unpaid ?? []}
                content={content}
                renewals={renewals}
                sites={sites}
                requests={requests}
                meetings={meetings}
                lateDeliveries={lateDeliveries}
                failed={failed}
              />
            </div>
          )}

          <div className="order-3 min-w-0 xl:order-none">
            <ProjectsCard active={active} maintenance={maintenance} today={today} />
          </div>

          <div className="order-7 min-w-0 xl:order-none">
            <Card title="Actividad del equipo" icon={<History size={14} />} action={<CardLink href="/admin/cambios">Registro completo →</CardLink>}>
              <EventList events={eventsR.value} names={names} compact />
            </Card>
          </div>
        </div>

        <div className="contents xl:block xl:min-w-0 xl:space-y-4">
          {d.sala && (
            <div className="order-6 min-w-0 xl:order-none">
              <EnVivoCard sala={d.sala} />
            </div>
          )}

          {tasks && (
            <div className="order-2 min-w-0 xl:order-none">
              <MyTasks tasks={tasks} links={linksR.value} me={me.who} />
            </div>
          )}

          {finance && (
            <div className="order-5 min-w-0 xl:order-none">
              <FinanceCard entries={finance} today={today} />
            </div>
          )}

          <div className="order-4 min-w-0 xl:order-none">
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
                <Link href="/admin/mensajes" className="text-accent underline underline-offset-2">
                  Escribile al equipo
                </Link>{" "}
                o abrí la conversación de un proyecto.
              </Empty>
            )}
          </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const openLabel = (n: number) => `${n} ${n === 1 ? "abierta" : "abiertas"}`;
