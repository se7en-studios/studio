// Cobros de los proyectos (tabla panel_payments). Usa la service role key:
// NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { PanelNotReady, client } from "./panel";
import type { Payment } from "./payment-shared";

const COLUMNS = "id, created_at, project_slug, paid_on, amount, note, created_by";

function failPayments(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Falta correr supabase/payments.sql en Supabase.");
  }
  throw new Error(e.message);
}

/** numeric llega como string desde PostgREST. */
const normalize = (p: Payment): Payment => ({ ...p, amount: Number(p.amount) });

export async function listPayments(slug: string): Promise<Payment[]> {
  const { data, error } = await client()
    .from("panel_payments")
    .select(COLUMNS)
    .eq("project_slug", slug)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) failPayments(error);
  return (data as Payment[]).map(normalize);
}

/** slug → total cobrado, de todos los proyectos (para Inicio). */
export async function paidBySlug(): Promise<Map<string, number>> {
  // ponytail: trae todas las filas y suma acá; con miles de cobros conviene una vista con sum() en SQL.
  const { data, error } = await client().from("panel_payments").select("project_slug, amount").limit(5000);
  if (error) failPayments(error);
  const out = new Map<string, number>();
  for (const r of data as { project_slug: string; amount: string | number }[]) {
    out.set(r.project_slug, (out.get(r.project_slug) ?? 0) + Number(r.amount));
  }
  return out;
}

export async function insertPayment(
  p: Pick<Payment, "project_slug" | "paid_on" | "amount" | "note">,
  by: LeadOwner,
): Promise<Payment> {
  const { data, error } = await client()
    .from("panel_payments")
    .insert({ ...p, created_by: by })
    .select(COLUMNS)
    .single();
  if (error) failPayments(error);
  return normalize(data as Payment);
}

export async function removePayment(id: string): Promise<Payment> {
  const { data, error } = await client().from("panel_payments").delete().eq("id", id).select(COLUMNS).single();
  if (error) failPayments(error);
  return normalize(data as Payment);
}
