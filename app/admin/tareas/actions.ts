"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/auth";
import { OWNERS } from "@/lib/admin/db";
import { logEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { cleanInput, type Task, type TaskInput } from "@/lib/admin/task-shared";
import { insertTask, patchTask, removeTask } from "@/lib/admin/tasks";

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const quote = (t: Task) => `«${t.title}»`;

export async function createTask(input: TaskInput): Promise<Task> {
  const me = await guard();
  const clean = cleanInput(input, OWNERS);
  const task = await insertTask(
    {
      title: clean.title ?? "",
      notes: clean.notes ?? "",
      assignee: clean.assignee ?? null,
      due: clean.due ?? null,
      priority: clean.priority ?? "media",
      lead_id: clean.lead_id ?? null,
      project_slug: clean.project_slug ?? null,
    },
    me.who,
  );
  const forOther = task.assignee && task.assignee !== me.who;
  await logEvent({
    actor: me.who,
    kind: "tarea",
    text: forOther
      ? `le pasó a ${PEOPLE[task.assignee!].name} la tarea ${quote(task)}`
      : `anotó la tarea ${quote(task)}`,
    project_slug: task.project_slug,
  });
  revalidatePath("/admin", "layout");
  return task;
}

export async function updateTask(
  id: string,
  patch: Partial<TaskInput>,
): Promise<Task> {
  const me = await guard();
  const clean = cleanInput(patch, OWNERS);
  const task = await patchTask(id, clean);
  if ("assignee" in clean && task.assignee && task.assignee !== me.who) {
    await logEvent({
      actor: me.who,
      kind: "tarea",
      text: `le pasó a ${PEOPLE[task.assignee].name} la tarea ${quote(task)}`,
      project_slug: task.project_slug,
    });
  }
  revalidatePath("/admin", "layout");
  return task;
}

export async function setTaskDone(id: string, done: boolean): Promise<Task> {
  const me = await guard();
  const task = await patchTask(id, {
    done_at: done ? new Date().toISOString() : null,
  });
  if (done) {
    await logEvent({
      actor: me.who,
      kind: "tarea",
      text: `completó la tarea ${quote(task)}`,
      project_slug: task.project_slug,
    });
  }
  revalidatePath("/admin", "layout");
  return task;
}

export async function deleteTask(id: string) {
  const me = await guard();
  const title = await removeTask(id);
  await logEvent({
    actor: me.who,
    kind: "tarea",
    text: `borró la tarea «${title}»`,
  });
  revalidatePath("/admin", "layout");
}
