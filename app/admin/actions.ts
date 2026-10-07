"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, endSession, getSession, startSession } from "@/lib/admin/auth";
import { OWNERS, STATUSES, patchLead, removeLead, type LeadOwner, type LeadStatus } from "@/lib/admin/db";
import { logEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";

export type LoginState = { error?: string };

const STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  propuesta: "Propuesta",
  ganado: "Ganado",
  perdido: "Perdido",
};

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const pass = String(form.get("password") ?? "");
  const who = String(form.get("who") ?? "") as LeadOwner;
  // Pausa fija: frena probar contraseñas a mano en ráfaga.
  await new Promise((r) => setTimeout(r, 400));
  if (!OWNERS.includes(who)) return { error: "Elegí quién sos." };
  if (!checkPassword(pass)) return { error: "Contraseña incorrecta." };
  await startSession(who);
  revalidatePath("/admin", "layout");
  return {};
}

export async function logout() {
  await endSession();
  revalidatePath("/admin", "layout");
}

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

export async function setStatus(id: string, status: LeadStatus) {
  const me = await guard();
  if (!STATUSES.includes(status)) throw new Error("Estado inválido");
  const name = await patchLead(id, { status });
  await logEvent({ actor: me.who, kind: "pedido", text: `movió el pedido de ${name} a ${STATUS_LABEL[status]}` });
  revalidatePath("/admin", "layout");
}

export async function setOwner(id: string, owner: LeadOwner | null) {
  const me = await guard();
  if (owner !== null && !OWNERS.includes(owner)) throw new Error("Responsable inválido");
  const name = await patchLead(id, { owner });
  await logEvent({
    actor: me.who,
    kind: "pedido",
    text: owner ? `le asignó el pedido de ${name} a ${PEOPLE[owner].name}` : `dejó sin asignar el pedido de ${name}`,
  });
  revalidatePath("/admin", "layout");
}

export async function setNotes(id: string, notes: string) {
  await guard();
  await patchLead(id, { notes: notes.slice(0, 5000) });
  revalidatePath("/admin", "layout");
}

export async function deleteLead(id: string) {
  const me = await guard();
  const name = await removeLead(id);
  await logEvent({ actor: me.who, kind: "pedido", text: `borró el pedido de ${name}` });
  revalidatePath("/admin", "layout");
}
