// Prospectos cargados desde el panel (tabla prospect_leads). Igual que panel.ts usa la
// service role key: NUNCA importar este archivo desde un componente de cliente.
import { prospectLeads, type ProspectLead } from "@/data/prospects";
import type { LeadOwner } from "./db";
import { client, failMissing } from "./panel";
import type { ProspectInput } from "./prospect-lead-shared";

const fail = failMissing(
  "Falta correr supabase/prospectos-v3.sql en Supabase.",
);
const COLUMNS =
  "id, name, city, province, category, address, phone, current_site, website_status, pain_point, recommended_solution, estimated_budget_usd";

type Row = ProspectInput & { id: string };

/** De la fila de la base al mismo formato que los prospectos de data/prospects.ts. */
const toLead = (r: Row): ProspectLead => ({
  id: r.id,
  name: r.name,
  city: r.city,
  province: r.province,
  category: r.category,
  address: r.address,
  phone: r.phone,
  whatsapp: r.phone.replace(/\D/g, ""),
  currentSite: r.current_site || undefined,
  websiteStatus: r.website_status,
  painPoint: r.pain_point,
  recommendedSolution: r.recommended_solution,
  estimatedBudgetUsd: r.estimated_budget_usd,
  pitch: "",
  custom: true,
});

export async function listCustomLeads(): Promise<ProspectLead[]> {
  const { data, error } = await client()
    .from("prospect_leads")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) fail(error);
  return (data as Row[]).map(toLead);
}

export async function insertCustomLead(
  input: ProspectInput,
  by: LeadOwner,
): Promise<ProspectLead> {
  const { data, error } = await client()
    .from("prospect_leads")
    .insert({ ...input, created_by: by })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return toLead(data as Row);
}

export async function patchCustomLead(
  id: string,
  input: ProspectInput,
): Promise<ProspectLead> {
  const { data, error } = await client()
    .from("prospect_leads")
    .update(input)
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return toLead(data as Row);
}

/** Borra el prospecto y lo que se anotó sobre él. El pedido que se haya creado no se toca. */
export async function removeCustomLead(id: string): Promise<void> {
  const db = client();
  const state = await db.from("prospect_state").delete().eq("lead_id", id);
  if (state.error) fail(state.error);
  const { error } = await db.from("prospect_leads").delete().eq("id", id);
  if (error) fail(error);
}

/** Un prospecto de data/prospects.ts o uno cargado desde el panel; null si no existe. */
export async function findLead(id: string): Promise<ProspectLead | null> {
  const fixed = prospectLeads.find((l) => l.id === id);
  if (fixed) return fixed;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await client()
    .from("prospect_leads")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  return data ? toLead(data as Row) : null;
}
