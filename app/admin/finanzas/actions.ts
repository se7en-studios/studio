"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { insertEntry, removeEntry } from "@/lib/admin/finance";
import {
  categoryLabel,
  cleanEntry,
  type Entry,
  type EntryInput,
} from "@/lib/admin/finance-shared";
import { logEvent } from "@/lib/admin/panel";

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
