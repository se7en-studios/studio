// Estado compartido de los prospectos (tabla prospect_state). Igual que
// panel.ts usa la service role key: NUNCA importar este archivo desde un
// componente de cliente.
import type { LeadOwner } from "./db";
import { PanelNotReady, client, failMissing } from "./panel";
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
        ...((status === "contactado" || status === "en_charla") && prev?.status !== status ? { last_contact_at: now, last_contact_by: by } : {}),
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
export async function touchProspect(leadId: string, by: LeadOwner): Promise<ProspectState> {
  const db = client();
  const { data: prev, error: readErr } = await db.from("prospect_state").select("status, contacted_by").eq("lead_id", leadId).maybeSingle();
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
