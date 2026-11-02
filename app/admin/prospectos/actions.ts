"use server";

// Sin revalidatePath: la lista es optimista y se vuelve a leer sola (ver prospectos-client.tsx).
import { requireSession } from "@/lib/admin/auth";
import {
  NOTE_MAX,
  isProspectStatus,
  type ProspectState,
} from "@/lib/admin/prospect-shared";
import { findLead } from "@/lib/admin/prospect-leads";
import {
  promoteToPedido,
  setProspectNote,
  setProspectStatus,
  touchProspect,
} from "@/lib/admin/prospects";

/** El prospecto, de data/prospects.ts o cargado desde el panel; si no existe, un error que se muestra tal cual. */
async function mustFind(id: string) {
  const lead = await findLead(id);
  if (!lead) throw new Error("Prospecto inválido.");
  return lead;
}

export async function updateProspectStatus(
  id: string,
  status: string,
): Promise<ProspectState> {
  const me = await requireSession();
  await mustFind(id);
  if (!isProspectStatus(status)) throw new Error("Etapa inválida.");
  return setProspectStatus(id, status, me.who);
}

export async function updateProspectNote(
  id: string,
  note: string,
): Promise<ProspectState> {
  const me = await requireSession();
  await mustFind(id);
  return setProspectNote(id, note.trim().slice(0, NOTE_MAX), me.who);
}

export async function contactProspect(id: string): Promise<ProspectState> {
  const me = await requireSession();
  await mustFind(id);
  return touchProspect(id, me.who);
}

/** Crea el pedido a partir del prospecto (una sola vez) y lo deja enlazado. */
export async function promoteProspect(id: string): Promise<ProspectState> {
  const me = await requireSession();
  return promoteToPedido(await mustFind(id), me.who);
}
