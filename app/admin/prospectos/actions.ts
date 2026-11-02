"use server";

// Sin revalidatePath: la lista es optimista y se vuelve a leer sola (ver prospectos-client.tsx).
import { requireSession } from "@/lib/admin/auth";
import { prospectLeads } from "@/data/prospects";
import {
  NOTE_MAX,
  isProspectStatus,
  type ProspectState,
} from "@/lib/admin/prospect-shared";
import { setProspectNote, setProspectStatus, touchProspect } from "@/lib/admin/prospects";

function checkId(id: string) {
  if (!prospectLeads.some((l) => l.id === id))
    throw new Error("Prospecto inválido.");
}

export async function updateProspectStatus(
  id: string,
  status: string,
): Promise<ProspectState> {
  const me = await requireSession();
  checkId(id);
  if (!isProspectStatus(status)) throw new Error("Etapa inválida.");
  return setProspectStatus(id, status, me.who);
}

export async function updateProspectNote(
  id: string,
  note: string,
): Promise<ProspectState> {
  const me = await requireSession();
  checkId(id);
  return setProspectNote(id, note.trim().slice(0, NOTE_MAX), me.who);
}

export async function contactProspect(id: string): Promise<ProspectState> {
  const me = await requireSession();
  checkId(id);
  return touchProspect(id, me.who);
}
