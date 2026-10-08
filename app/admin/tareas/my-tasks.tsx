"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import type { LeadOwner } from "@/lib/admin/db";
import {
  bucket,
  compareTasks,
  type Task,
  type TaskLinks,
} from "@/lib/admin/task-shared";
import { TaskDrawer, TaskRow, Toast, useFlash } from "./task-ui";
import { useTasks } from "./use-tasks";

const MAX = 6;

/** Para Inicio: lo mío vencido, de hoy y de la semana, con check rápido. */
export function MyTasks({
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
  const [openId, setOpenId] = useState<string | null>(null);
  // Recién tildadas siguen a la vista hasta recargar: si no, el check desaparece en el acto.
  const [keep, setKeep] = useState<string[]>([]);

  const mine = api.tasks
    .filter((t) => t.assignee === me)
    .filter(
      (t) =>
        keep.includes(t.id) || ["vencidas", "hoy", "semana"].includes(bucket(t)),
    )
    .sort((a, b) =>
      compareTasks({ ...a, done_at: null }, { ...b, done_at: null }),
    );
  const overdue = mine.filter((t) => bucket(t) === "vencidas").length;
  const open = api.tasks.find((t) => t.id === openId) ?? null;

  return (
    <section className="rounded-2xl border border-border bg-surface/50">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm text-foreground">
          Tus tareas{" "}
          {overdue > 0 && (
            <span className="ml-1 font-mono text-[11px] text-red-400">
              {overdue} vencidas
            </span>
          )}
        </h2>
        <Link
          href="/admin/tareas"
          className="focus-ring font-mono text-[11px] tracking-widest text-muted uppercase hover:text-foreground"
        >
          Ver todas →
        </Link>
      </header>
      {mine.length ? (
        <ul>
          {mine.slice(0, MAX).map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              links={links}
              onToggle={(d) => {
                setKeep((k) => [...k, t.id]);
                api.toggle(t.id, d);
              }}
              onOpen={() => setOpenId(t.id)}
            />
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-sm text-muted">Nada para esta semana.</p>
      )}
      {mine.length > MAX && (
        <Link
          href="/admin/tareas"
          className="focus-ring block border-t border-border px-4 py-2.5 text-xs text-muted hover:text-foreground"
        >
          y {mine.length - MAX} más…
        </Link>
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
    </section>
  );
}
