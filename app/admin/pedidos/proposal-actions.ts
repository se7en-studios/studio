"use server";

// Propuestas desde la ficha del pedido: armar (borrador), enviar, anular y
// borrar borradores. Lo que hace el cliente con el link está en
// app/(site)/propuesta/[token]/actions.ts.
import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { PanelNotReady, logEvent } from "@/lib/admin/panel";
import {
  cleanContent,
  money,
  type ProposalContent,
} from "@/lib/admin/proposal-shared";
import {
  insertProposal,
  listProposals,
  markSent,
  removeDraft,
  revoke,
  updateDraft,
  type PanelProposal,
} from "@/lib/admin/proposals";

const UUID = /^[0-9a-f-]{36}$/i;

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

function checkId(id: string) {
  if (!UUID.test(id)) throw new Error("Propuesta inválida.");
}

const message = (e: unknown) =>
  e instanceof Error ? e.message : "Algo falló. Probá de nuevo.";

/** Las propuestas del pedido; `setup` dice qué SQL falta correr. */
export async function loadProposals(
  leadId: string,
): Promise<{ proposals?: PanelProposal[]; setup?: string; error?: string }> {
  try {
    await guard();
    checkId(leadId);
    return { proposals: await listProposals(leadId) };
  } catch (e) {
    if (e instanceof PanelNotReady) return { setup: e.message };
    return { error: message(e) };
  }
}

/** Crea un borrador (id null) o edita uno. */
export async function saveProposal(
  leadId: string,
  id: string | null,
  input: ProposalContent,
): Promise<{ id?: string; error?: string }> {
  try {
    const me = await guard();
    checkId(leadId);
    const clean = cleanContent(input);
    if (!clean.ok) return { error: clean.error };
    if (id) {
      checkId(id);
      const saved = await updateDraft(id, clean.value);
      if (!saved || saved.lead_id !== leadId)
        return { error: "Esa propuesta ya no es un borrador." };
      return { id };
    }
    const saved = await insertProposal(leadId, clean.value, me.who);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "pedido",
        text: `armó la propuesta v${saved.version} por ${money(saved.base_amount, saved.currency)}`,
        lead_id: leadId,
      }),
    );
    return { id: saved.id };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function sendProposal(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    checkId(id);
    const r = await markSent(id);
    if (!r) return { error: "Esa propuesta ya se envió." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "pedido",
        text: `envió la propuesta v${r.sent.version}${r.replaced ? " (la anterior queda anulada)" : ""}`,
        lead_id: r.sent.lead_id,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** El link deja de servir. */
export async function revokeProposal(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    checkId(id);
    const p = await revoke(id);
    if (!p) return { error: "Esa propuesta ya no está abierta." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "pedido",
        text: `anuló la propuesta v${p.version}`,
        lead_id: p.lead_id,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteDraft(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    checkId(id);
    const p = await removeDraft(id);
    if (!p) return { error: "Sólo se borran borradores." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "pedido",
        text: `borró el borrador de la propuesta v${p.version}`,
        lead_id: p.lead_id,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}
