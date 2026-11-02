// Estado compartido de los prospectos (tabla prospect_state). Igual que
// panel.ts usa la service role key: NUNCA importar este archivo desde un
// componente de cliente.
import { after } from "next/server";
import type { ProspectLead } from "@/data/prospects";
import { createLeadRow, type LeadOwner } from "./db";
import { PanelNotReady, client, failMissing, logEvent } from "./panel";
import type { ProspectState, ProspectStatus } from "./prospect-shared";

const fail = failMissing("Falta correr supabase/prospectos.sql en Supabase.");

export async function listProspectState(): Promise<
  Record<string, ProspectState>
> {
  const { data, error } = await client()
    .from("prospect_state")
    .select("*")
    .limit(2000);
  if (error) fail(error);
  return Object.fromEntries(
    (data as ProspectState[]).map((r) => [r.lead_id, r]),
  );
}

/** Cambia la etapa. La primera vez que sale de «nuevo» queda anotado quién lo contactó. */
export async function setProspectStatus(
  leadId: string,
  status: ProspectStatus,
  by: LeadOwner,
): Promise<ProspectState> {
  const db = client();
  const { data: prev, error: readErr } = await db
    .from("prospect_state")
    .select("status, contacted_by")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (readErr) fail(readErr);
  const now = new Date().toISOString();
  const firstContact = status !== "nuevo" && !prev?.contacted_by;
  const { data, error } = await db
    .from("prospect_state")
    .upsert(
      {
        lead_id: leadId,
        status,
        ...(firstContact ? { contacted_by: by, contacted_at: now } : {}),
        // Pasar a «contactado» o «en charla» cuenta como haberle escrito.
        ...((status === "contactado" || status === "en_charla") &&
        prev?.status !== status
          ? { last_contact_at: now, last_contact_by: by }
          : {}),
        updated_by: by,
        updated_at: now,
      },
      { onConflict: "lead_id" },
    )
    .select("*")
    .single();
  if (error) fail(error);
  return data as ProspectState;
}

/** Le escribió (abrió WhatsApp): pasa a «contactado» si era nuevo y queda anotado cuándo y quién. */
export async function touchProspect(
  leadId: string,
  by: LeadOwner,
): Promise<ProspectState> {
  const db = client();
  const { data: prev, error: readErr } = await db
    .from("prospect_state")
    .select("status, contacted_by")
    .eq("lead_id", leadId)
    .maybeSingle();
  if (readErr) fail(readErr);
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("prospect_state")
    .upsert(
      {
        lead_id: leadId,
        status: !prev || prev.status === "nuevo" ? "contactado" : prev.status,
        ...(prev?.contacted_by ? {} : { contacted_by: by, contacted_at: now }),
        last_contact_at: now,
        last_contact_by: by,
        updated_by: by,
        updated_at: now,
      },
      { onConflict: "lead_id" },
    )
    .select("*")
    .single();
  if (error) fail(error);
  return data as ProspectState;
}

export async function setProspectNote(
  leadId: string,
  note: string,
  by: LeadOwner,
): Promise<ProspectState> {
  const now = new Date().toISOString();
  const { data, error } = await client()
    .from("prospect_state")
    .upsert(
      {
        lead_id: leadId,
        note,
        note_by: note ? by : null,
        note_at: note ? now : null,
        updated_by: by,
        updated_at: now,
      },
      { onConflict: "lead_id" },
    )
    .select("*")
    .single();
  if (error) fail(error);
  return data as ProspectState;
}

export { PanelNotReady };

/**
 * Pasa el prospecto a Pedidos: crea el pedido con lo que se sabe y lo deja enlazado, para que no
 * se cree dos veces ni se pierda el contacto en dos lugares. Si ya tenía pedido, devuelve ese.
 */
export async function promoteToPedido(
  lead: ProspectLead,
  by: LeadOwner,
): Promise<ProspectState> {
  const db = client();
  const { data: prev, error: readErr } = await db
    .from("prospect_state")
    .select("*")
    .eq("lead_id", lead.id)
    .maybeSingle();
  if (readErr) fail(readErr);
  if (prev?.pedido_id) return prev as ProspectState;

  const row = await createLeadRow({
    source: "prospecto",
    channel: "whatsapp",
    name: lead.name,
    project_type: lead.category,
    budget: lead.estimatedBudgetUsd
      ? `~USD ${lead.estimatedBudgetUsd.toLocaleString("es-AR")}`
      : "",
    idea: [
      lead.painPoint,
      lead.recommendedSolution && `Propuesta: ${lead.recommendedSolution}`,
      lead.currentSite && `Web actual: ${lead.currentSite}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    owner: by,
    phone: lead.phone,
  });
  const { data, error } = await db
    .from("prospect_state")
    .upsert(
      {
        lead_id: lead.id,
        status: prev?.status ?? "en_charla",
        pedido_id: row.id,
        updated_by: by,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" },
    )
    .select("*")
    .single();
  if (error) fail(error);
  after(() =>
    logEvent({
      actor: by,
      kind: "pedido",
      text: `pasó a Pedidos el prospecto ${lead.name}`,
      lead_id: row.id,
    }),
  );
  return data as ProspectState;
}
