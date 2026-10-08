// Acceso a los pedidos (tabla `leads`) desde el servidor. Usa la service role
// key: NUNCA importar este archivo desde un componente de cliente.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const STATUSES = ["nuevo", "contactado", "propuesta", "ganado", "perdido"] as const;
export type LeadStatus = (typeof STATUSES)[number];
export const OWNERS = ["franco", "federico"] as const;
export type LeadOwner = (typeof OWNERS)[number];

export type Lead = {
  id: string;
  created_at: string;
  updated_at: string;
  source: string;
  channel: string | null;
  name: string;
  email: string;
  company: string;
  project_type: string;
  budget: string;
  timeline: string;
  idea: string;
  status: LeadStatus;
  owner: LeadOwner | null;
  notes: string;
  /** Opcionales hasta correr supabase/crm.sql. */
  phone?: string;
  /** Monto acordado en USD. */
  value?: number | null;
};

export type NewLead = Pick<Lead, "source" | "name"> &
  Partial<Pick<Lead, "channel" | "email" | "company" | "project_type" | "budget" | "timeline" | "idea" | "owner" | "phone" | "value">>;

let client: SupabaseClient | null | undefined;

/** null si faltan las variables de entorno (el panel muestra cómo activarlo). */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

export async function insertLead(lead: NewLead): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await c.from("leads").insert(lead);
  if (error) console.error("[leads] insert:", error.message);
  return !error;
}

/** Como insertLead pero devuelve la fila (para el alta manual desde el panel). */
export async function createLeadRow(lead: NewLead): Promise<Lead> {
  const c = db();
  if (!c) throw new Error("Base de datos no configurada");
  const { data, error } = await c.from("leads").insert(lead).select("*").single();
  if (error) throw new Error(missingColumn(error.message) ?? error.message);
  return data as Lead;
}

/** Columna nueva de crm.sql que todavía no existe: un mensaje que diga qué hacer. */
export function missingColumn(message: string): string | null {
  return /column .*(phone|value)|(phone|value).* column/i.test(message)
    ? "Falta correr supabase/crm.sql en Supabase para guardar teléfono y monto."
    : null;
}

export async function listLeads(): Promise<Lead[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Lead[];
}

/** Devuelve el nombre del pedido, para contarlo en el feed de cambios. */
export async function patchLead(
  id: string,
  patch: Partial<Pick<Lead, "status" | "owner" | "notes" | "name" | "company" | "email" | "phone" | "value">>,
): Promise<string> {
  const c = db();
  if (!c) throw new Error("Base de datos no configurada");
  const { data, error } = await c
    .from("leads")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("name")
    .single();
  if (error) throw new Error(missingColumn(error.message) ?? error.message);
  return (data as { name: string }).name;
}

export async function removeLead(id: string): Promise<string> {
  const c = db();
  if (!c) throw new Error("Base de datos no configurada");
  const { data, error } = await c.from("leads").delete().eq("id", id).select("name").single();
  if (error) throw new Error(error.message);
  return (data as { name: string }).name;
}

export async function countNewLeads(): Promise<number | null> {
  const c = db();
  if (!c) return null;
  const { count, error } = await c.from("leads").select("id", { count: "exact", head: true }).eq("status", "nuevo");
  if (error) return null;
  return count ?? 0;
}
