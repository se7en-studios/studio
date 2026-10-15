"use server";

// Cronómetro y tramos de horas (lib/admin/time.ts). Cada socio sólo toca los suyos.
import { getSession } from "@/lib/admin/auth";
import { PanelNotReady, getProject } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";
import {
  insertManual,
  removeOwn,
  runningOf,
  startTimer,
  stopTimer,
  updateOwn,
} from "@/lib/admin/time";
import {
  cleanManual,
  cleanTarget,
  type ManualInput,
  type TimeEntry,
} from "@/lib/admin/time-shared";

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const message = (e: unknown) =>
  e instanceof PanelNotReady || e instanceof Error
    ? e.message
    : "Algo falló. Probá de nuevo.";
const UUID = /^[0-9a-f-]{36}$/i;

async function target(slug: unknown, requestId: unknown) {
  const t = cleanTarget(slug, requestId);
  if (!t) throw new Error("Proyecto inválido.");
  if (!(await getProject(t.slug))) throw new Error("Ese proyecto no existe.");
  return t;
}

/** El cronómetro que tengo corriendo y el nombre de su proyecto (para el indicador del menú). */
export async function myRunning(): Promise<{ running?: TimeEntry | null; name?: string; error?: string }> {
  try {
    const me = await guard();
    const running = await runningOf(me.who);
    const project = running ? await getProject(running.project_slug).catch(() => null) : null;
    return { running, name: project?.name ?? running?.project_slug };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Prende el cronómetro; si tenía otro, lo frena. */
export async function startAction(
  slug: string,
  requestId: string | null,
): Promise<{
  running?: TimeEntry;
  stopped?: TimeEntry | null;
  error?: string;
}> {
  try {
    const me = await guard();
    const t = await target(slug, requestId);
    return await startTimer(me.who, t.slug, t.requestId);
  } catch (e) {
    return { error: message(e) };
  }
}

export async function stopAction(): Promise<{
  stopped?: TimeEntry | null;
  error?: string;
}> {
  try {
    const me = await guard();
    return { stopped: await stopTimer(me.who) };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Carga un tramo a mano: fecha, minutos y nota. */
export async function addManualAction(
  slug: string,
  requestId: string | null,
  input: ManualInput,
): Promise<{ entry?: TimeEntry; error?: string }> {
  try {
    const me = await guard();
    const t = await target(slug, requestId);
    const v = cleanManual(input, dayKey());
    if (!v.ok) return { error: v.error };
    return { entry: await insertManual(me.who, t.slug, t.requestId, v.value) };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function editAction(
  id: string,
  input: ManualInput,
): Promise<{ entry?: TimeEntry; error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Tramo inválido." };
    const v = cleanManual(input, dayKey());
    if (!v.ok) return { error: v.error };
    const entry = await updateOwn(me.who, id, v.value);
    return entry
      ? { entry }
      : { error: "Ese tramo ya no existe, no es tuyo o está corriendo." };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteAction(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Tramo inválido." };
    return (await removeOwn(me.who, id))
      ? {}
      : { error: "Ese tramo ya no existe o no es tuyo." };
  } catch (e) {
    return { error: message(e) };
  }
}
