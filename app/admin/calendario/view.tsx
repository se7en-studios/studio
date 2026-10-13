"use client";

// Calendario del panel: posts de Instagram, tareas y entregas de proyectos.
// Las tareas usan el mismo estado optimista que Tareas (useTasks); el tilde de
// publicado, el mismo que Contenido.
import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  EVENT_TYPES,
  NO_PROJECT,
  addMonths,
  dayTitle,
  groupByDay,
  isTaskLike,
  monthLabel,
  monthOf,
  type CalEvent,
  type CalPost,
  type Delivery,
  type EventType,
} from "@/lib/admin/calendar-shared";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import type { Task, TaskLinks } from "@/lib/admin/task-shared";
import { markPublished } from "../contenido/actions";
import {
  Card,
  Chip,
  Empty,
  Kpi,
  Segmented,
  btnSecondary,
  cn,
  input,
  kpiRow,
} from "../kit";
import { useToast } from "../overlay";
import { QuickAdd, TaskDrawer } from "../tareas/task-ui";
import { useTasks } from "../tareas/use-tasks";
import { DayEvents, type DayActions } from "./day-panel";
import { MonthGrid, TASK_MIME } from "./grid";

type Who = "todos" | LeadOwner;
type Mode = "mes" | "agenda";
type Project = { slug: string; name: string; accent: string };

type Props = {
  me: LeadOwner;
  today: string;
  month: string;
  tasks: Task[];
  links: TaskLinks;
  posts: CalPost[];
  deliveries: Delivery[];
  projects: Project[];
};

function buildEvents(
  tasks: Task[],
  posts: CalPost[],
  deliveries: Delivery[],
  leadNames: Map<string, string>,
): CalEvent[] {
  return [
    ...posts.map((p): CalEvent => ({
      key: `p-${p.id}`,
      id: p.id,
      type: "post",
      date: p.post_date,
      title: p.title,
      project: p.project,
      owner: null,
      done: Boolean(p.done_at),
      kind: p.kind,
    })),
    ...tasks.flatMap((t): CalEvent[] =>
      t.due
        ? [
            {
              key: `t-${t.id}`,
              id: t.id,
              type: t.lead_id ? "seguimiento" : "task",
              date: t.due,
              title: t.title,
              project: t.project_slug,
              owner: t.assignee,
              done: Boolean(t.done_at),
              priority: t.priority,
              lead: t.lead_id ? { id: t.lead_id, name: leadNames.get(t.lead_id) ?? "Pedido" } : null,
            },
          ]
        : [],
    ),
    ...deliveries.map((d): CalEvent => ({
      key: `e-${d.slug}`,
      id: d.slug,
      type: "entrega",
      date: d.due,
      title: `Entrega: ${d.name}`,
      project: d.slug,
      owner: d.owner,
      done: d.done,
      accent: d.accent,
    })),
  ];
}

export function CalendarView({
  me,
  today,
  month,
  tasks,
  links,
  posts: initialPosts,
  deliveries,
  projects,
}: Props) {
  const flash = useToast();
  const api = useTasks(tasks, flash);
  const [posts, setPosts] = useState(initialPosts);
  const [, start] = useTransition();
  const [ym, setYm] = useState(month);
  const [selected, setSelected] = useState(today);
  const [types, setTypes] = useState<EventType[]>(EVENT_TYPES.map((t) => t.id));
  const [project, setProject] = useState("todos");
  const [who, setWho] = useState<Who>("todos");
  const [mode, setMode] = useState<Mode>("mes");
  const [openId, setOpenId] = useState<string | null>(null);

  const names = useMemo(
    () => new Map(projects.map((p) => [p.slug, p.name])),
    [projects],
  );
  const leadNames = useMemo(
    () => new Map(links.leads.map((l) => [l.id, l.name])),
    [links.leads],
  );
  const events = useMemo(
    () => buildEvents(api.tasks, posts, deliveries, leadNames),
    [api.tasks, posts, deliveries, leadNames],
  );
  const matches = (e: Pick<CalEvent, "project" | "owner" | "type">) =>
    (project === "todos" || (e.project ?? NO_PROJECT) === project) &&
    (who === "todos" || e.type === "post" || e.owner === who);
  const visible = events.filter((e) => types.includes(e.type) && matches(e));
  const byDay = groupByDay(visible);
  const unscheduled = api.tasks.filter(
    (t) =>
      !t.due &&
      !t.done_at &&
      matches({ project: t.project_slug, owner: t.assignee, type: "task" }),
  );
  const open = api.tasks.find((t) => t.id === openId) ?? null;

  const inMonth = visible.filter((e) => monthOf(e.date) === ym);
  const monthPosts = inMonth.filter((e) => e.type === "post");
  const overdue = visible.filter(
    (e) => isTaskLike(e) && !e.done && e.date < today,
  ).length;

  function togglePost(id: string, done: boolean) {
    const prev = posts.find((p) => p.id === id)?.done_at ?? null;
    const set = (at: string | null) =>
      setPosts((ps) =>
        ps.map((p) => (p.id === id ? { ...p, done_at: at } : p)),
      );
    set(done ? new Date().toISOString() : null);
    start(async () => {
      const res = await markPublished(id, done);
      if (res.error) {
        set(prev);
        flash(res.error, "error");
      }
    });
  }

  function moveTask(id: string, day: string) {
    const task = api.tasks.find((t) => t.id === id);
    if (!task || task.due === day) return;
    api.patch(id, { due: day });
    setSelected(day);
    flash(`Tarea movida al ${dayTitle(day)}`, "ok");
  }

  const actions: DayActions = {
    projectName: (slug) => (slug ? (names.get(slug) ?? null) : null),
    onToggleTask: (id, done) => api.toggle(id, done),
    onOpenTask: setOpenId,
    onTogglePost: togglePost,
  };
  const toggleType = (t: EventType) =>
    setTypes((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));
  const goTo = (next: string) => {
    setYm(next);
    setSelected(next === month ? today : `${next}-01`);
  };

  return (
    <div className="space-y-4">
      <div className={cn(kpiRow, "md:grid-cols-4")}>
        <Kpi
          label="Posts del mes"
          value={`${monthPosts.filter((e) => e.done).length}/${monthPosts.length}`}
          hint="Publicados / total"
        />
        <Kpi
          label="Tareas del mes"
          value={inMonth.filter((e) => isTaskLike(e) && !e.done).length}
          hint="Abiertas con fecha"
        />
        <Kpi
          label="Entregas del mes"
          value={inMonth.filter((e) => e.type === "entrega").length}
        />
        <Kpi
          label="Tareas vencidas"
          value={overdue}
          tone={overdue ? "red" : undefined}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goTo(addMonths(ym, -1))}
            aria-label="Mes anterior"
            className={cn(btnSecondary, "px-2")}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => goTo(addMonths(ym, 1))}
            aria-label="Mes siguiente"
            className={cn(btnSecondary, "px-2")}
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => goTo(month)}
            className={btnSecondary}
          >
            Hoy
          </button>
        </div>
        <h2 className="mr-auto ml-2 text-[18px] font-semibold first-letter:uppercase">
          {monthLabel(ym)}
        </h2>
        <Segmented
          value={mode}
          onChange={setMode}
          label="Vista"
          options={[
            { id: "mes", label: "Mes" },
            { id: "agenda", label: "Agenda" },
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {EVENT_TYPES.map((t) => (
          <Chip
            key={t.id}
            on={types.includes(t.id)}
            onClick={() => toggleType(t.id)}
          >
            {t.label}
          </Chip>
        ))}
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          aria-label="Filtrar por proyecto"
          className={cn(input, "max-w-[260px]")}
        >
          <option value="todos">Todos los proyectos</option>
          <option value={NO_PROJECT}>Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <Segmented
          value={who}
          onChange={setWho}
          label="Persona"
          options={[
            { id: "todos", label: "Todos" },
            ...PEOPLE_IDS.map((o) => ({ id: o, label: PEOPLE[o].name })),
          ]}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className={cn(mode === "agenda" ? "hidden" : "hidden md:block")}>
            <MonthGrid
              ym={ym}
              today={today}
              selected={selected}
              byDay={byDay}
              onSelect={setSelected}
              onDropTask={moveTask}
            />
          </div>
          <div className={cn(mode === "agenda" ? "block" : "md:hidden")}>
            <Agenda
              ym={ym}
              byDay={byDay}
              today={today}
              actions={actions}
              onSelect={setSelected}
            />
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <Card title={dayTitle(selected)}>
            <div className="space-y-4 p-4">
              {(byDay.get(selected) ?? []).length ? (
                <DayEvents
                  events={byDay.get(selected) ?? []}
                  actions={actions}
                />
              ) : (
                <p className="text-[13px] text-muted">
                  Nada este día con los filtros actuales.
                </p>
              )}
              <QuickAdd
                key={selected}
                me={me}
                links={links}
                defaultDue={selected}
                onAdd={(draft) => api.add(draft, me)}
                placeholder="Nueva tarea para este día…"
              />
            </div>
          </Card>

          <Card
            title="Tareas sin fecha"
            count={unscheduled.length || undefined}
          >
            {unscheduled.length ? (
              <ul className="space-y-1 p-3">
                {unscheduled.slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <UnscheduledRow task={t} onOpen={() => setOpenId(t.id)} />
                  </li>
                ))}
                <li className="px-1 pt-1 text-[11px] text-muted">
                  Arrastralas a un día del calendario para ponerles fecha.
                </li>
              </ul>
            ) : (
              <Empty title="Todas tienen fecha" />
            )}
          </Card>
        </div>
      </div>

      {open && (
        <TaskDrawer
          key={open.id}
          task={open}
          links={links}
          onClose={() => setOpenId(null)}
          onPatch={(p) => api.patch(open.id, p)}
          onToggle={(d) => api.toggle(open.id, d)}
          onDelete={() => {
            api.remove(open.id);
            setOpenId(null);
          }}
        />
      )}
    </div>
  );
}

function UnscheduledRow({ task, onOpen }: { task: Task; onOpen: () => void }) {
  const draggable = !task.id.startsWith("tmp-");
  return (
    <button
      type="button"
      onClick={onOpen}
      draggable={draggable}
      onDragStart={(ev) => ev.dataTransfer.setData(TASK_MIME, task.id)}
      className="focus-ring w-full cursor-grab truncate rounded-md border border-[var(--line)] bg-white/[0.03] px-2.5 py-1.5 text-left text-[13px] hover:bg-white/[0.06]"
    >
      {task.title}
    </button>
  );
}

/** Lista del mes, un bloque por día con algo: es la vista del celular. */
function Agenda({
  ym,
  byDay,
  today,
  actions,
  onSelect,
}: {
  ym: string;
  byDay: Map<string, CalEvent[]>;
  today: string;
  actions: DayActions;
  onSelect: (d: string) => void;
}) {
  const days = [...byDay.keys()].filter((d) => monthOf(d) === ym).sort();
  if (!days.length)
    return <Empty title="Nada este mes con los filtros actuales" />;
  return (
    <ul className="space-y-4">
      {days.map((d) => (
        <li
          key={d}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3"
        >
          <button
            type="button"
            onClick={() => onSelect(d)}
            className={cn(
              "focus-ring mb-2 text-[13px] font-semibold first-letter:uppercase",
              d === today && "text-accent",
            )}
          >
            {dayTitle(d)}
            {d === today && " · hoy"}
          </button>
          <DayEvents events={byDay.get(d) ?? []} actions={actions} />
        </li>
      ))}
    </ul>
  );
}
