"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import {
  insertEntry,
  removeEntry,
  settleEntry as settleEntryRow,
  updateEntry,
} from "@/lib/admin/finance";
import {
  categoryLabel,
  cleanEntry,
  type Entry,
  type EntryInput,
} from "@/lib/admin/finance-shared";
import { logEvent } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";
import { cleanTool, type Tool, type ToolInput } from "@/lib/admin/tool-shared";
import { insertTool, removeTool, updateTool } from "@/lib/admin/tools";

const UUID = /^[0-9a-f-]{36}$/i;

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Algo falló. Probá de nuevo.";

/** El texto del registro no lleva montos: lo ven los dos socios, pero el registro es del equipo. */
export async function createEntry(
  input: EntryInput,
): Promise<{ entry?: Entry; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  const cleaned = cleanEntry(input);
  if (!cleaned.ok) return { error: cleaned.error };
  try {
    const entry = await insertEntry(cleaned.value, me.who);
    const what = entry.description || categoryLabel(entry.kind, entry.category);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `cargó ${entry.kind === "costo" ? "un costo" : "un ingreso"}: ${what}`,
        project_slug: entry.project_slug,
      }),
    );
    return { entry };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Corrige un movimiento cargado a mano (monto, socio, fecha…). */
export async function editEntry(
  id: string,
  input: EntryInput,
): Promise<{ entry?: Entry; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Movimiento inválido." };
  const cleaned = cleanEntry(input);
  if (!cleaned.ok) return { error: cleaned.error };
  try {
    const entry = await updateEntry(id, cleaned.value);
    if (!entry) return { error: "Ese movimiento ya no existe." };
    const what = entry.description || categoryLabel(entry.kind, entry.category);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `editó ${entry.kind === "costo" ? "un costo" : "un ingreso"}: ${what}`,
        project_slug: entry.project_slug,
      }),
    );
    return { entry };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteEntry(id: string): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Movimiento inválido." };
  try {
    const gone = await removeEntry(id);
    if (!gone) return { error: "Ese movimiento ya no existe." };
    const what = gone.description || categoryLabel(gone.kind, gone.category);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `borró ${gone.kind === "costo" ? "un costo" : "un ingreso"}: ${what}`,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** Un pago pendiente que se cobró (o se pagó): pasa a contar en los totales con la fecha de hoy. */
export async function settleEntry(
  id: string,
): Promise<{ entry?: Entry; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Movimiento inválido." };
  try {
    const entry = await settleEntryRow(id, dayKey());
    if (!entry) return { error: "Ese pago ya no está pendiente." };
    const what = entry.description || categoryLabel(entry.kind, entry.category);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `marcó como ${entry.kind === "costo" ? "pagado" : "cobrado"}: ${what}`,
        project_slug: entry.project_slug,
      }),
    );
    return { entry };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function saveTool(
  id: string | null,
  input: ToolInput,
): Promise<{ tool?: Tool; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (id !== null && !UUID.test(id)) return { error: "Herramienta inválida." };
  const cleaned = cleanTool(input);
  if (!cleaned.ok) return { error: cleaned.error };
  try {
    const tool = id
      ? await updateTool(id, cleaned.value)
      : await insertTool(cleaned.value);
    if (!tool) return { error: "Esa herramienta ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `${id ? "actualizó" : "agregó"} la herramienta ${tool.name}`,
      }),
    );
    return { tool };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteTool(id: string): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Herramienta inválida." };
  try {
    const name = await removeTool(id);
    if (!name) return { error: "Esa herramienta ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `quitó la herramienta ${name}`,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}
