"use client";

import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
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
import { QuickAdd, TaskDrawer, TaskRow, Toast, useFlash } from "./task-ui";
import { useTasks } from "./use-tasks";

// Tareas del equipo agrupadas por urgencia: vencidas, hoy, la semana, más
// adelante y sin fecha. Arriba se filtra por persona; las hechas se esconden.

type Who = "mias" | LeadOwner | "sin" | "todas";

export function TasksBoard({
  tasks: initial,
  links,
  me,
}: {
  tasks: Task[];
  links: TaskLinks;
  me: LeadOwner;
}) {
  const { toast, flash } = useFlash();
  const api = useTasks(initial, flash);
  const [who, setWho] = useState<Who>("mias");
  const [query, setQuery] = useState("");
  const [showDone, setShowDone] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
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
        <Stat
          label="Vencidas"
          value={stats.overdue}
          tone={stats.overdue ? "red" : undefined}
        />
        <Stat
          label="Para hoy"
          value={stats.today}
          tone={stats.today ? "accent" : undefined}
        />
        <Stat label="Abiertas" value={stats.open} />
        <Stat label="Hechas en 7 días" value={stats.doneWeek} />
      </div>

      <QuickAdd
        me={me}
        links={links}
        onAdd={(input) => api.add(input, me)}
        defaultAssignee={
          who === "sin" ? null : who === "mias" || who === "todas" ? me : who
        }
        key={who}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex max-w-full overflow-x-auto rounded-full border border-border bg-surface p-1 text-sm [scrollbar-width:none]">
          {chips.map((c) => (
            <button
              key={c.id}
              onClick={() => setWho(c.id)}
              aria-pressed={who === c.id}
              className={`focus-ring flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 whitespace-nowrap transition-colors ${
                who === c.id
                  ? "bg-white/10 text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {c.label}
              <span className="font-mono text-[10px] text-muted">
                {openCount(c.id)}
              </span>
            </button>
          ))}
        </div>
        <label className="relative flex min-w-[200px] flex-1 items-center">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar tareas…"
            className="focus-ring w-full rounded-full border border-border bg-surface py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-muted/70 focus:border-accent"
          />
        </label>
        <button
          onClick={() => setShowDone((v) => !v)}
          aria-pressed={showDone}
          className={`focus-ring rounded-full border px-3.5 py-2 text-sm transition-colors ${
            showDone
              ? "border-accent bg-accent/15 text-foreground"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          {showDone ? "Ocultar hechas" : "Ver hechas"}
        </button>
      </div>

      {nothingOpen && !showDone ? (
        <p className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-14 text-center text-sm text-muted">
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
                  className={`mb-2 flex items-baseline gap-2 px-1 font-mono text-[11px] tracking-widest uppercase ${
                    b.id === "vencidas"
                      ? "text-red-400"
                      : b.id === "hoy"
                        ? "text-accent"
                        : "text-muted"
                  }`}
                >
                  {b.label} <span className="text-muted">{items.length}</span>
                </h2>
                <ul className="rounded-2xl border border-border bg-surface/50">
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

      <AnimatePresence>
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
      </AnimatePresence>
      <AnimatePresence>{toast && <Toast msg={toast} />}</AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "red" | "accent";
}) {
  const color =
    tone === "red"
      ? "text-red-400"
      : tone === "accent"
        ? "text-accent"
        : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">
        {label}
      </p>
      <p className={`mt-2 text-2xl tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
