"use server";

// Sin revalidatePath: las listas de tareas son optimistas (ver use-tasks.ts) y
// las páginas del panel se leen de nuevo al navegar. El registro va con after().
import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { OWNERS } from "@/lib/admin/db";
import { taskAssignedNotice } from "@/lib/admin/digest";
import { notifyPartner } from "@/lib/admin/notify";
import { logEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { taskDiff } from "@/lib/admin/task-changes";
import { cleanInput, dayKey, nextDue, type Task, type TaskInput } from "@/lib/admin/task-shared";
import { getTask, insertTask, patchTask, removeTask, taskLinks } from "@/lib/admin/tasks";

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const quote = (t: Pick<Task, "title">) => `«${t.title}»`;
const UUID = /^[0-9a-f-]{36}$/i;
function checkId(id: string) {
  if (!UUID.test(id)) throw new Error("Tarea inválida.");
}

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
      // Sólo si se usan: así el alta sigue andando sin daily-v1.sql.
      ...(clean.recur ? { recur: clean.recur } : {}),
      ...(clean.waiting ? { waiting: true } : {}),
    },
    me.who,
  );
  const forOther = task.assignee && task.assignee !== me.who;
  after(() =>
    logEvent({
      actor: me.who,
      kind: "tarea",
      text: forOther ? `le pasó a ${PEOPLE[task.assignee!].name} la tarea ${quote(task)}` : `anotó la tarea ${quote(task)}`,
      project_slug: task.project_slug,
      lead_id: task.lead_id,
    }),
  );
  if (forOther) after(() => notifyPartner(me.who, taskAssignedNotice(PEOPLE[me.who].name)));
  return task;
}

export async function updateTask(id: string, patch: Partial<TaskInput>): Promise<Task> {
  const me = await guard();
  checkId(id);
  const clean = cleanInput(patch, OWNERS);
  const before = await getTask(id);
  const task = await patchTask(id, clean);
  after(async () => {
    const links = "lead_id" in clean || "project_slug" in clean ? await taskLinks().catch(() => undefined) : undefined;
    const changes = taskDiff(before, clean, links);
    if (!changes.length) return;
    const handedOver = "assignee" in clean && task.assignee && task.assignee !== me.who && before.assignee !== task.assignee;
    await logEvent({
      actor: me.who,
      kind: "tarea",
      text: handedOver
        ? `le pasó a ${PEOPLE[task.assignee!].name} la tarea ${quote(task)}`
        : `editó la tarea ${quote(task)}`,
      project_slug: task.project_slug,
      lead_id: task.lead_id,
      changes,
    });
    if (handedOver) await notifyPartner(me.who, taskAssignedNotice(PEOPLE[me.who].name));
  });
  return task;
}

/** Con `next`: la tarea se repite y ya quedó creada la próxima vuelta. */
export async function setTaskDone(id: string, done: boolean): Promise<{ task: Task; next: Task | null }> {
  const me = await guard();
  checkId(id);
  const task = await patchTask(id, {
    done_at: done ? new Date().toISOString() : null,
    ...(done ? { waiting: false } : {}),
  }).catch(async (e) => {
    // Sin daily-v1.sql no hay «waiting»: se completa igual.
    if (done) return patchTask(id, { done_at: new Date().toISOString() });
    throw e;
  });
  // ponytail: reabrir y volver a completar crea otra vuelta; se borra a mano si molesta.
  const next =
    done && task.recur
      ? await insertTask(
          {
            title: task.title,
            notes: task.notes,
            assignee: task.assignee,
            due: nextDue(task.due, task.recur, dayKey()),
            priority: task.priority,
            lead_id: task.lead_id,
            project_slug: task.project_slug,
            recur: task.recur,
          },
          me.who,
        )
      : null;
  after(() =>
    logEvent({
      actor: me.who,
      kind: "tarea",
      text: done ? `completó la tarea ${quote(task)}` : `reabrió la tarea ${quote(task)}`,
      project_slug: task.project_slug,
      lead_id: task.lead_id,
    }),
  );
  return { task, next };
}

export async function deleteTask(id: string) {
  const me = await guard();
  checkId(id);
  const task = await removeTask(id);
  after(() =>
    logEvent({
      actor: me.who,
      kind: "tarea",
      text: `borró la tarea ${quote(task)}`,
      project_slug: task.project_slug,
      lead_id: task.lead_id,
    }),
  );
}
