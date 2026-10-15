// Acceso a los pedidos (tabla `leads`) desde el servidor. Usa la service role
// key: NUNCA importar este archivo desde un componente de cliente.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { notifyNewLead } from "./notify";
import { upcomingMeetings, type Meeting } from "./sales-shared";
import { allRows } from "./paged";

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
  /** Cuándo pasó a ganado; null si no está ganado. Opcional hasta correr supabase/crm-v2.sql. */
  won_at?: string | null;
  /** Opcionales hasta correr supabase/crm-v3.sql. Cuándo pasó a perdido; null si no está perdido. */
  lost_at?: string | null;
  /** Motivo corto de pérdida (LOST_REASONS en sales-shared.ts) y el detalle. */
  lost_reason?: string | null;
  lost_note?: string | null;
  /** Fecha de cierre prevista (YYYY-MM-DD). */
  expected_close?: string | null;
  /** Reunión agendada (ISO). */
  meeting_at?: string | null;
  /** Ficha de kickoff que mandó el cliente desde el sitio. */
  kickoff?: string | null;
};

export type NewLead = Pick<Lead, "source" | "name"> &
  Partial<Pick<Lead, "channel" | "email" | "company" | "project_type" | "budget" | "timeline" | "idea" | "owner" | "phone" | "value" | "meeting_at" | "kickoff">>;

/** La tabla no existe: falta correr su archivo de supabase/ en la base. */
export const missingTable = (e: { code?: string }) => e.code === "PGRST205" || e.code === "42P01";

let client: SupabaseClient | null | undefined;

/** null si faltan las variables de entorno (el panel muestra cómo activarlo). */
export function db(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

/** Columnas que agregan las migraciones; si falta alguna, se guarda el resto. */
const OPTIONAL_COLUMNS = ["phone", "value", "won_at", "lost_at", "lost_reason", "lost_note", "expected_close", "meeting_at", "kickoff"];

/** Si el error es «falta la columna X» (PostgREST: 'X'; Postgres: "X" o tabla.X). */
const namesColumn = (message: string, col: string) =>
  /column/i.test(message) && [`'${col}'`, `"${col}"`, `.${col} `].some((q) => message.includes(q));

/** La fila sin las columnas opcionales que el error dice que no existen; null si no era eso. */
export function withoutMissing<T extends object>(row: T, message: string): T | null {
  const gone = OPTIONAL_COLUMNS.filter((k) => k in row && namesColumn(message, k));
  if (!gone.length) return null;
  return Object.fromEntries(Object.entries(row).filter(([k]) => !gone.includes(k))) as T;
}

/**
 * Inserta y, si falta alguna columna de una migración sin correr, reintenta sin
 * ella: un pedido del sitio no se pierde por un teléfono o una reunión.
 */
async function insertRow(c: SupabaseClient, row: object) {
  let { data, error } = await c.from("leads").insert(row).select("*").single();
  for (let i = 0; error && i < 3; i++) {
    const less = withoutMissing(row, error.message);
    if (!less) break;
    row = less;
    ({ data, error } = await c.from("leads").insert(row).select("*").single());
  }
  return { data: data as Lead | null, error };
}

export async function insertLead(lead: NewLead): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const { error } = await insertRow(c, lead);
  if (error) console.error("[leads] insert:", error.message);
  // Aviso al celular con la respuesta ya enviada: no demora a quien llenó el formulario.
  if (!error) after(() => notifyNewLead(lead.channel));
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

/** Columna nueva que todavía no existe: un mensaje que diga qué migración correr. */
export function missingColumn(message: string): string | null {
  if (["phone", "value"].some((k) => namesColumn(message, k)))
    return "Falta correr supabase/crm.sql en Supabase para guardar teléfono y monto.";
  if (["lost_reason", "lost_note", "expected_close", "meeting_at", "kickoff"].some((k) => namesColumn(message, k)))
    return "Falta correr supabase/crm-v3.sql en Supabase para guardar ese dato.";
  return null;
}

export async function listLeads(): Promise<Lead[]> {
  const c = db();
  if (!c) return [];
  // Todos: antes se cortaban en 500 sin avisar.
  const { data, error } = await allRows<Lead>((from, to) =>
    c.from("leads").select("*").order("created_at", { ascending: false }).order("id").range(from, to),
  );
  if (error) throw new Error(error.message);
  return data;
}

export type LeadPatch = Partial<
  Pick<Lead, "status" | "owner" | "notes" | "name" | "company" | "email" | "phone" | "value" | "lost_reason" | "lost_note" | "expected_close" | "meeting_at" | "kickoff">
>;

/**
 * Devuelve el pedido antes y después del cambio, para el registro de cambios.
 * Al pasar a ganado o perdido guarda cuándo (won_at, lost_at); al salir, la borra.
 */
export async function patchLead(id: string, patch: LeadPatch): Promise<{ before: Lead; after: Lead }> {
  const c = db();
  if (!c) throw new Error("Base de datos no configurada");
  const cur = await c.from("leads").select("*").eq("id", id).single();
  if (cur.error) throw new Error(cur.error.message);
  const before = cur.data as Lead;
  const now = new Date().toISOString();
  let closing: object =
    patch.status !== undefined && patch.status !== before.status
      ? { won_at: patch.status === "ganado" ? now : null, lost_at: patch.status === "perdido" ? now : null }
      : {};
  const update = (row: object) => c.from("leads").update(row).eq("id", id).select("*").single();
  let { data, error } = await update({ ...patch, ...closing, updated_at: now });
  // Sin crm-v2.sql / crm-v3.sql no hay won_at / lost_at: se guarda igual sin ellas
  // («Ganado este mes» y «para retomar» usan updated_at).
  for (let i = 0; error && i < 2; i++) {
    const less = withoutMissing(closing, error.message);
    if (!less) break;
    closing = less;
    ({ data, error } = await update({ ...patch, ...closing, updated_at: now }));
  }
  if (error) throw new Error(missingColumn(error.message) ?? error.message);
  return { before, after: data as Lead };
}

export async function removeLead(id: string): Promise<string> {
  const c = db();
  if (!c) throw new Error("Base de datos no configurada");
  const { data, error } = await c.from("leads").delete().eq("id", id).select("name").single();
  if (error) throw new Error(error.message);
  return (data as { name: string }).name;
}

/**
 * Pedidos con reunión agendada desde ahora (con una hora de gracia), de la más
 * cercana a la más lejana. [] si falta crm-v3.sql o la base. Para el Calendario.
 */
export async function listMeetings(now = Date.now()): Promise<Meeting[]> {
  const c = db();
  if (!c) return [];
  const { data, error } = await c
    .from("leads")
    .select("id, name, status, meeting_at")
    .gte("meeting_at", new Date(now - 3_600_000).toISOString())
    .order("meeting_at")
    .limit(100);
  if (error) {
    if (!missingColumn(error.message)) console.error("[leads] reuniones:", error.message);
    return [];
  }
  return upcomingMeetings(data as Pick<Lead, "id" | "name" | "status" | "meeting_at">[], now);
}

export async function countNewLeads(): Promise<number | null> {
  const c = db();
  if (!c) return null;
  const { count, error } = await c.from("leads").select("id", { count: "exact", head: true }).eq("status", "nuevo");
  if (error) return null;
  return count ?? 0;
}
