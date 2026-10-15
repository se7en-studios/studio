"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import {
  currentFx,
  insertEntry,
  removeEntry,
  setTaxCategory,
  settleEntry as settleEntryRow,
  updateEntry,
} from "@/lib/admin/finance";
import {
  categoryLabel,
  cleanEntry,
  isRealDay,
  type Entry,
  type EntryInput,
} from "@/lib/admin/finance-shared";
import { PanelNotReady, logEvent } from "@/lib/admin/panel";
import { TAX_CATEGORIES } from "@/lib/admin/plata-shared";
import { cleanPayment, type Payment, type PaymentInput } from "@/lib/admin/payment-shared";
import { removePayment, updatePayment } from "@/lib/admin/payments";
import { dayKey } from "@/lib/admin/task-shared";
import { cleanTool, type Tool, type ToolInput } from "@/lib/admin/tool-shared";
import { insertTool, removeTool, updateTool } from "@/lib/admin/tools";

const UUID = /^[0-9a-f-]{36}$/i;

/** Lo que falta configurar se dice tal cual; el resto se registra y al usuario le llega un texto genérico. */
function message(e: unknown) {
  if (e instanceof PanelNotReady) return e.message;
  console.error("[panel] Finanzas:", e instanceof Error ? e.message : e);
  return "Algo falló. Probá de nuevo.";
}

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
        kind: "finanzas",
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
        kind: "finanzas",
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
        kind: "finanzas",
        text: `borró ${gone.kind === "costo" ? "un costo" : "un ingreso"}: ${what}`,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * Un pago pendiente que se cobró (o se pagó): pasa a contar en los totales con
 * la fecha real (hoy si no se dice otra) y la cotización de hoy; la fecha
 * prevista queda guardada para medir cuánto se tarda en cobrar.
 */
export async function settleEntry(
  id: string,
  paidOn?: string,
): Promise<{ entry?: Entry; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Movimiento inválido." };
  const today = dayKey();
  const day = paidOn ?? today;
  if (!isRealDay(day) || day > today) return { error: "La fecha del cobro no es válida." };
  try {
    // La cotización de hoy sólo si es de hoy y real (no la del último movimiento).
    const rate = day === today ? await currentFx() : null;
    const entry = await settleEntryRow(id, day, rate && rate.source !== "estimada" ? rate : { fx: 0, source: null });
    if (!entry) return { error: "Ese pago ya no está pendiente." };
    const what = entry.description || categoryLabel(entry.kind, entry.category);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "finanzas",
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
      ? await updateTool(id, cleaned.value, (await currentFx()).fx)
      : await insertTool(cleaned.value);
    if (!tool) return { error: "Esa herramienta ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "finanzas",
        text: `${id ? "actualizó" : "agregó"} la herramienta ${tool.name}`,
      }),
    );
    return { tool };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Da de baja una herramienta: los meses que se pagó siguen en los costos (ended_on: la fecha de baja; null si se borró). */
export async function deleteTool(id: string): Promise<{ ended_on?: string | null; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Herramienta inválida." };
  try {
    const gone = await removeTool(id);
    if (!gone) return { error: "Esa herramienta ya no existe." };
    const { name } = gone;
    after(() =>
      logEvent({
        actor: me.who,
        kind: "finanzas",
        text: `quitó la herramienta ${name}`,
      }),
    );
    return { ended_on: gone.ended_on };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Corrige un cobro de proyecto (monto, fecha, nota, proyecto o quién lo cobró) desde Finanzas. */
export async function editPayment(
  id: string,
  input: PaymentInput,
): Promise<{ payment?: Payment; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Cobro inválido." };
  const cleaned = cleanPayment(input);
  if (!cleaned.ok) return { error: cleaned.error };
  try {
    const payment = await updatePayment(id, cleaned.value);
    if (!payment) return { error: "Ese cobro ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "finanzas",
        text: "editó un cobro",
        project_slug: payment.project_slug,
      }),
    );
    return { payment };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteCobro(id: string): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!UUID.test(id)) return { error: "Cobro inválido." };
  try {
    const gone = await removePayment(id);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "finanzas",
        text: "borró un cobro",
        project_slug: gone.project_slug,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** La categoría de monotributo de un socio, para el medidor de Finanzas. */
export async function saveTaxCategory(owner: string, category: string): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  const who = (["franco", "federico"] as const).find((o) => o === owner);
  const cat = TAX_CATEGORIES.find((c) => c === category);
  if (!who || !cat) return { error: "Categoría inválida." };
  try {
    await setTaxCategory(who, cat);
    after(() => logEvent({ actor: me.who, kind: "finanzas", text: `cambió la categoría de monotributo de ${who} a ${cat}` }));
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}
