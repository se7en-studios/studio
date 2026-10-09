"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Search } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import {
  BUCKETS,
  bucket,
  compareTasks,
  dayKey,
  type Bucket,
  type Task,
  type TaskLinks,
} from "@/lib/admin/task-shared";
import { Kpi, cn, searchInput } from "../kit";
import { useToast } from "../overlay";
import { QuickAdd, TaskDrawer, TaskRow } from "./task-ui";
import { useTasks } from "./use-tasks";

// Tareas del equipo agrupadas por urgencia: vencidas, hoy, la semana, más
// adelante y sin fecha. Arriba se filtra por persona; las hechas se esconden.

type Who = "mias" | LeadOwner | "sin" | "todas";

export function TasksBoard({
  tasks: initial,
  links,
  me,
  initialOpen = null,
  autoFocus = false,
}: {
  tasks: Task[];
  links: TaskLinks;
  me: LeadOwner;
  /** Desde un link (?tarea=<id>, la paleta de comandos): abre esa tarea. */
  initialOpen?: string | null;
  /** Desde un link (?nueva=1): el alta arranca enfocada. */
  autoFocus?: boolean;
}) {
  const flash = useToast();
  const api = useTasks(initial, flash);
  const startsDone = Boolean(initialOpen && initial.find((t) => t.id === initialOpen)?.done_at);
  const [who, setWho] = useState<Who>(initialOpen ? "todas" : "mias");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(startsDone);
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const today = dayKey();

  const matchesWho = (t: Task, w: Who) =>
    w === "todas"
      ? true
      : w === "sin"
        ? t.assignee === null
        : t.assignee === (w === "mias" ? me : w);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return api.tasks
      .filter((t) => matchesWho(t, who))
      .filter(
        (t) =>
          !q ||
          t.title.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q),
      )
      .sort(compareTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.tasks, who, query, me]);

  const groups = useMemo(() => {
    const by = new Map<Bucket, Task[]>();
    for (const t of visible) {
      const b = bucket(t, today);
      by.set(b, [...(by.get(b) ?? []), t]);
    }
    return by;
  }, [visible, today]);

  const weekAgo = dayKey(-7);
  const stats = {
    overdue: groups.get("vencidas")?.length ?? 0,
    today: groups.get("hoy")?.length ?? 0,
    open: visible.filter((t) => !t.done_at).length,
    doneWeek: visible.filter((t) => t.done_at && t.done_at >= weekAgo).length,
  };

  const openCount = (w: Who) =>
    api.tasks.filter((t) => !t.done_at && matchesWho(t, w)).length;
  const chips: { id: Who; label: string }[] = [
    { id: "mias", label: "Mías" },
    ...PEOPLE_IDS.filter((o) => o !== me).map((o) => ({
      id: o as Who,
      label: PEOPLE[o].name,
    })),
    { id: "sin", label: "Sin asignar" },
    { id: "todas", label: "Todas" },
  ];

  const open = api.tasks.find((t) => t.id === openId) ?? null;
  const shown = BUCKETS.filter((b) => b.id !== "hechas" || showDone);
  const nothingOpen = stats.open === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Vencidas" value={stats.overdue} tone={stats.overdue ? "red" : undefined} />
        <Kpi label="Para hoy" value={stats.today} tone={stats.today ? "accent" : undefined} />
        <Kpi label="Abiertas" value={stats.open} />
        <Kpi label="Hechas en 7 días" value={stats.doneWeek} tone={stats.doneWeek ? "green" : undefined} />
      </div>

      <QuickAdd
        me={me}
        links={links}
        onAdd={(input) => api.add(input, me)}
        defaultAssignee={
          who === "sin" ? null : who === "mias" || who === "todas" ? me : who
        }
        key={who}
        autoFocus={autoFocus}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex max-w-full overflow-x-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 text-[13px] [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setWho(c.id)}
              aria-pressed={who === c.id}
              className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 whitespace-nowrap transition-colors ${
                who === c.id
                  ? "bg-white/[0.08] text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {c.label}
              <span className="font-mono text-[11px] text-muted">
                {openCount(c.id)}
              </span>
            </button>
          ))}
        </div>
        <label className="relative flex min-w-[200px] flex-1 items-center">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tareas…"
            className={searchInput}
          />
        </label>
        <button
          onClick={() => setShowDone((v) => !v)}
          aria-pressed={showDone}
          className={cn(
            "focus-ring rounded-lg border px-3 py-2 text-[13px] transition-colors",
            showDone ? "border-accent/60 bg-accent/15 text-foreground" : "border-[var(--line)] text-muted hover:text-foreground",
          )}
        >
          {showDone ? "Ocultar hechas" : "Ver hechas"}
        </button>
      </div>

      {nothingOpen && !showDone ? (
        <p className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--line-strong)] px-4 py-14 text-center text-[13px] text-muted">
          <CheckCircle2 size={20} className="text-accent" />
          {query
            ? "Nada coincide con la búsqueda."
            : "Nada pendiente acá. Anotá la próxima arriba."}
        </p>
      ) : (
        <div className="space-y-5">
          {shown.map((b) => {
            const items = groups.get(b.id) ?? [];
            if (!items.length) return null;
            return (
              <section key={b.id}>
                <h2
                  className={`mb-2 flex items-baseline gap-2 px-1 text-[12px] font-medium ${
                    b.id === "vencidas"
                      ? "text-red-400"
                      : b.id === "hoy"
                        ? "text-accent"
                        : "text-muted"
                  }`}
                >
                  {b.label} <span className="text-muted">{items.length}</span>
                </h2>
                <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
                  {items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      links={links}
                      onToggle={(d) => api.toggle(t.id, d)}
                      onOpen={() => setOpenId(t.id)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

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
