// Propuestas (tabla panel_proposals, supabase/proposals.sql). Usa la service
// role key: NUNCA importar este archivo desde un componente de cliente.
import { createHash, randomBytes } from "node:crypto";
import { SITE } from "@/data/site";
import { proposalToken } from "./auth";
import { OWNERS, patchLead, type Lead, type LeadOwner } from "./db";
import { currentFx, insertEntry } from "./finance";
import { cleanEntry } from "./finance-shared";
import { projectForLead } from "./lead-project";
import { notificationsConfigured, notify } from "./notify";
import { client, logEvent, PanelNotReady } from "./panel";
import { dayKey } from "./task-shared";
import { PROPOSAL_LABEL, money, type Acceptance, type PlanPart, type Proposal, type ProposalContent } from "./proposal-shared";

const COLUMNS =
  "id, lead_id, version, created_at, created_by, status, title, intro, items, optionals, base_amount, currency, days, valid_until, payment, sent_at, viewed_at, decided_at, revoked_at, selected, total, acceptance, reject_reason";

/** Una propuesta como la ve el panel: con su link (null si es borrador o no se puede rearmar). */
export type PanelProposal = Proposal & { link: string | null };

function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01")
    throw new PanelNotReady("Falta correr supabase/proposals.sql en Supabase.");
  throw new Error(e.message);
}

const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");
/** Sólo lo que puede ser un token: corta antes de ir a la base. */
export const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

/** numeric llega como string desde PostgREST. */
function normalize(r: Proposal): Proposal {
  return {
    ...r,
    base_amount: Number(r.base_amount),
    total: r.total == null ? null : Number(r.total),
  };
}

export async function listProposals(leadId: string): Promise<PanelProposal[]> {
  const { data, error } = await client()
    .from("panel_proposals")
    .select(`${COLUMNS}, nonce, token_hash`)
    .eq("lead_id", leadId)
    .order("version", { ascending: false });
  if (error) fail(error);
  return (data as (Proposal & { nonce: string; token_hash: string })[]).map(
    ({ nonce, token_hash, ...r }) => {
      const token = r.status === "borrador" ? null : proposalToken(nonce);
      // Si cambió el secreto, el link viejo sigue andando pero ya no se puede rearmar.
      return {
        ...normalize(r),
        link:
          token && sha256(token) === token_hash
            ? `${SITE.url}/propuesta/${token}`
            : null,
      };
    },
  );
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const { data, error } = await client()
    .from("panel_proposals")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  return data ? normalize(data as Proposal) : null;
}

export async function insertProposal(
  leadId: string,
  content: ProposalContent,
  by: string,
): Promise<Proposal> {
  const nonce = randomBytes(24).toString("base64url");
  const token = proposalToken(nonce);
  if (!token)
    throw new Error(
      "Falta configurar la contraseña del panel: sin ella no se pueden firmar los links.",
    );
  const last = await client()
    .from("panel_proposals")
    .select("version")
    .eq("lead_id", leadId)
    .order("version", { ascending: false })
    .limit(1);
  if (last.error) fail(last.error);
  const version = ((last.data as { version: number }[])[0]?.version ?? 0) + 1;
  const { data, error } = await client()
    .from("panel_proposals")
    .insert({
      ...content,
      lead_id: leadId,
      version,
      created_by: by,
      nonce,
      token_hash: sha256(token),
    })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return normalize(data as Proposal);
}

/** Sólo un borrador se edita: lo enviado es lo que el cliente ve. */
export async function updateDraft(
  id: string,
  content: ProposalContent,
): Promise<Proposal | null> {
  const { data, error } = await client()
    .from("panel_proposals")
    .update({ ...content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "borrador")
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? normalize(data as Proposal) : null;
}

export async function removeDraft(id: string): Promise<Proposal | null> {
  const { data, error } = await client()
    .from("panel_proposals")
    .delete()
    .eq("id", id)
    .eq("status", "borrador")
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? normalize(data as Proposal) : null;
}

/**
 * Borrador → enviada. Una sola vigente por pedido: las otras enviadas o vistas
 * del mismo pedido quedan anuladas (su link deja de servir).
 */
export async function markSent(
  id: string,
): Promise<{ sent: Proposal; replaced: number } | null> {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("panel_proposals")
    .update({ status: "enviada", sent_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "borrador")
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const sent = normalize(data as Proposal);
  const old = await client()
    .from("panel_proposals")
    .update({ revoked_at: now, updated_at: now })
    .eq("lead_id", sent.lead_id)
    .neq("id", id)
    .in("status", ["enviada", "vista"])
    .is("revoked_at", null)
    .select("id");
  if (old.error) fail(old.error);
  return { sent, replaced: old.data?.length ?? 0 };
}

export async function revoke(id: string): Promise<Proposal | null> {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("panel_proposals")
    .update({ revoked_at: now, updated_at: now })
    .eq("id", id)
    .in("status", ["enviada", "vista"])
    .is("revoked_at", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? normalize(data as Proposal) : null;
}

// --- Link público ---------------------------------------------------------------

/** La propuesta de un link, buscada por el hash del token. Los borradores no existen para afuera. */
export async function findByToken(token: string): Promise<Proposal | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { data, error } = await client()
    .from("panel_proposals")
    .select(COLUMNS)
    .eq("token_hash", sha256(token))
    .neq("status", "borrador")
    .maybeSingle();
  if (error) fail(error);
  return data ? normalize(data as Proposal) : null;
}

/** Enviada → vista, la primera vez que el cliente la abre. true si fue esta vez. */
export async function markViewed(id: string): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("panel_proposals")
    .update({ status: "vista", viewed_at: now, updated_at: now })
    .eq("id", id)
    .eq("status", "enviada")
    .is("revoked_at", null)
    .select("id");
  if (error) fail(error);
  return (data?.length ?? 0) > 0;
}

/**
 * Cierra la propuesta si todavía está abierta (enviada o vista, sin anular y en
 * fecha). Es un solo update condicional: dos clicks no la aceptan dos veces.
 */
async function decide(id: string, patch: object): Promise<Proposal | null> {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("panel_proposals")
    .update({ ...patch, decided_at: now, updated_at: now })
    .eq("id", id)
    .in("status", ["enviada", "vista"])
    .is("revoked_at", null)
    .gte("valid_until", dayKey())
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? normalize(data as Proposal) : null;
}

export const markAccepted = (
  id: string,
  selected: string[],
  total: number,
  acceptance: Acceptance,
) => decide(id, { status: "aceptada", selected, total, acceptance });

export const markRejected = (id: string, reason: string) =>
  decide(id, { status: "rechazada", reject_reason: reason });

// --- Al aceptar -------------------------------------------------------------------

/** Quién figura en el Registro por lo que hizo el cliente: quien mandó la propuesta. */
const actorOf = (p: Proposal, lead: Lead | null): LeadOwner =>
  OWNERS.find((o) => o === p.created_by) ?? lead?.owner ?? "franco";

/**
 * Lo que dispara una aceptación: el pedido pasa a Ganado (con el monto en USD),
 * se crea o vincula el cliente y el proyecto, se carga el plan de cobros como
 * pendientes de Finanzas y queda la prueba en el Registro. La aceptación ya
 * está guardada: si un paso falla, se anota y sigue (se completa a mano).
 */
export async function onAccepted(p: Proposal, plan: PlanPart[]): Promise<void> {
  const problems: string[] = [];
  const total = p.total ?? 0;
  const rate = await currentFx().catch(() => ({ fx: 0, source: null }));
  let lead: Lead | null = null;
  try {
    lead = (await patchLead(p.lead_id, { status: "ganado" })).after;
  } catch (e) {
    console.error("[propuestas] pedido a ganado:", e);
    problems.push("pasar el pedido a Ganado");
  }
  const actor = actorOf(p, lead);
  const usdValue = p.currency === "USD" ? total : rate.fx ? Math.round((total / rate.fx) * 100) / 100 : null;
  if (lead && usdValue) await patchLead(p.lead_id, { value: usdValue }).catch((e) => console.error("[propuestas] monto del pedido:", e));

  let slug: string | null = null;
  if (lead) {
    try {
      slug = await projectForLead(p.lead_id, actor);
    } catch (e) {
      console.error("[propuestas] proyecto:", e);
      problems.push("crear el proyecto");
    }
  }

  if (slug && rate.fx) {
    try {
      for (const [i, part] of plan.entries()) {
        const row = cleanEntry({
          kind: "ingreso",
          currency: p.currency,
          amount: part.amount,
          fx: rate.fx,
          fx_source: rate.source,
          occurred_on: part.due,
          category: "proyecto",
          description: `${part.label} · propuesta v${p.version}`,
          project_slug: slug,
          recurring: false,
          until: null,
          owner: "ambos",
          status: "pendiente",
          series: `propuesta:${p.id}:${i}`,
        });
        if (!row.ok) throw new Error(row.error);
        await insertEntry(row.value, null);
      }
    } catch (e) {
      console.error("[propuestas] plan de cobros:", e);
      problems.push("cargar el plan de cobros");
    }
  } else if (plan.length) problems.push("cargar el plan de cobros");

  const a = p.acceptance;
  await logEvent({
    actor,
    kind: "pedido",
    text:
      `recibió la aceptación de la propuesta v${p.version}${lead ? ` de ${lead.name}` : ""} por ${money(total, p.currency)}` +
      (problems.length ? ` (falta ${problems.join(", ")}: hacerlo a mano)` : ""),
    lead_id: p.lead_id,
    project_slug: slug,
    // La prueba de la aceptación (firma electrónica, Ley 25.506).
    changes: a
      ? [
          { field: "status", label: "Propuesta", before: null, after: PROPOSAL_LABEL.aceptada },
          { field: "signer", label: "Aceptó", before: null, after: `${a.name} <${a.email}>` },
          { field: "at", label: "Fecha y hora", before: null, after: a.at },
          { field: "ip", label: "IP", before: null, after: a.ip },
          { field: "user_agent", label: "Navegador", before: null, after: a.user_agent },
          { field: "hash", label: "SHA-256 de lo aceptado", before: null, after: a.hash },
        ]
      : [],
  });
  if (notificationsConfigured()) {
    // Sin nombre ni monto: el aviso pasa por un servicio de afuera.
    const res = await notify(
      { title: "Propuesta aceptada", message: "Un cliente aceptó una propuesta.", path: `/admin/pedidos?pedido=${p.lead_id}` },
      4,
    );
    if (!res.ok) console.error("[avisos] propuesta aceptada:", res.error);
  }
}

/** El cliente la rechazó: queda en el Registro del pedido con el motivo. */
export async function onRejected(p: Proposal): Promise<void> {
  const c = client();
  const { data } = await c.from("leads").select("name, owner").eq("id", p.lead_id).maybeSingle();
  const lead = data as Pick<Lead, "name" | "owner"> | null;
  await logEvent({
    actor: actorOf(p, lead as Lead | null),
    kind: "pedido",
    text: `recibió el rechazo de la propuesta v${p.version}${lead ? ` de ${lead.name}` : ""}`,
    lead_id: p.lead_id,
    changes: [
      { field: "status", label: "Propuesta", before: null, after: PROPOSAL_LABEL.rechazada },
      ...(p.reject_reason ? [{ field: "reject_reason", label: "Motivo", before: null, after: p.reject_reason }] : []),
    ],
  });
}
