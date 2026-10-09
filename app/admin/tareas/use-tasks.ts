"use client";

import { useState, useTransition } from "react";
import type { Task, TaskInput } from "@/lib/admin/task-shared";
import { createTask, deleteTask, setTaskDone, updateTask } from "./actions";
import type { Flash } from "../overlay";

/**
 * Estado de una lista de tareas con cambios optimistas: se ven ya, se guardan
 * en segundo plano y, si el servidor falla, se deshacen y se avisa.
 */
export function useTasks(initial: Task[], flash: Flash) {
  const [tasks, setTasks] = useState(initial);
  const [, startTransition] = useTransition();

  function run(
    optimistic: (ts: Task[]) => Task[],
    save: () => Promise<Task | void>,
    replaceId?: string,
  ) {
    let before: Task[] = [];
    setTasks((ts) => {
      before = ts;
      return optimistic(ts);
    });
    startTransition(async () => {
      try {
        const saved = await save();
        if (saved)
          setTasks((ts) =>
            ts.map((t) => (t.id === (replaceId ?? saved.id) ? saved : t)),
          );
      } catch (e) {
        setTasks(before);
        flash(e instanceof Error ? e.message : "No se pudo guardar", "error");
      }
    });
  }

  // Una tarea recién creada todavía no tiene id real: esperar a que se guarde.
  const pending = (id: string) => id.startsWith("tmp-") && (flash("Guardando la tarea, probá en un segundo"), true);

  return {
    tasks,
    add(input: TaskInput, me: Task["created_by"]) {
      const now = new Date().toISOString();
      const temp: Task = {
        ...input,
        id: `tmp-${now}`,
        created_at: now,
        updated_at: now,
        done_at: null,
        created_by: me,
      };
      run(
        (ts) => [temp, ...ts],
        () => createTask(input),
        temp.id,
      );
    },
    patch(id: string, patch: Partial<TaskInput>) {
      if (pending(id)) return;
      run(
        (ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        () => updateTask(id, patch),
      );
    },
    toggle(id: string, done: boolean) {
      if (pending(id)) return;
      const done_at = done ? new Date().toISOString() : null;
      run(
        (ts) => ts.map((t) => (t.id === id ? { ...t, done_at } : t)),
        () => setTaskDone(id, done),
      );
    },
    remove(id: string) {
      if (pending(id)) return;
      run(
        (ts) => ts.filter((t) => t.id !== id),
        async () => {
          await deleteTask(id);
          flash("Tarea borrada", "ok");
        },
      );
    },
  };
}

export type TasksApi = ReturnType<typeof useTasks>;
