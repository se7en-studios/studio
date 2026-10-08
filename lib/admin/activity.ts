// Historial de contactos (tabla panel_lead_activity). Usa la service role key:
// NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { client, fail } from "./panel";
import type { Activity, ActivityKind } from "./activity-shared";

const COLUMNS = "id, created_at, lead_id, kind, text, at, actor";

export async function listActivity(): Promise<Activity[]> {
  const { data, error } = await client()
    .from("panel_lead_activity")
    .select(COLUMNS)
    .order("at", { ascending: false })
    .limit(3000);
  if (error) fail(error);
  return data as Activity[];
}

export async function insertActivity(a: { lead_id: string; kind: ActivityKind; text: string; at: string; actor: LeadOwner }) {
  const { data, error } = await client().from("panel_lead_activity").insert(a).select(COLUMNS).single();
  if (error) fail(error);
  return data as Activity;
}

/** Devuelve lo que se borró, para contarlo en el registro. */
export async function removeActivity(id: string): Promise<Activity> {
  const { data, error } = await client().from("panel_lead_activity").delete().eq("id", id).select(COLUMNS).single();
  if (error) fail(error);
  return data as Activity;
}
