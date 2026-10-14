// Cobros viejos de los proyectos (tabla panel_payments). Los nuevos son ingresos
// de Finanzas con proyecto; estos se pueden corregir o borrar hasta que
// finance-v4.sql los pase a Finanzas. Usa la service role key: NUNCA importar
// este archivo desde un componente de cliente.
import { missingTable } from "./db";
import { PanelNotReady, client } from "./panel";
import type { Payment } from "./payment-shared";

const COLUMNS = "id, created_at, project_slug, paid_on, amount, note, created_by, owner";

function failPayments(e: { code?: string; message: string }): never {
  // Sin la tabla vieja: finance-v4.sql ya pasó los cobros a Finanzas.
  if (missingTable(e)) {
    throw new PanelNotReady("Ese cobro ya pasó a Finanzas: recargá la página.");
  }
  // Columna inexistente: falta supabase/finance-v3.sql (quién cobró cada pago).
  if (e.code === "42703" || e.code === "PGRST204") {
    throw new PanelNotReady("Falta correr supabase/finance-v3.sql en Supabase.");
  }
  throw new Error(e.message);
}

/** numeric llega como string desde PostgREST. */
const normalize = (p: Payment): Payment => ({ ...p, amount: Number(p.amount) });

export async function updatePayment(
  id: string,
  p: Pick<Payment, "project_slug" | "paid_on" | "amount" | "note" | "owner">,
): Promise<Payment | null> {
  const { data, error } = await client()
    .from("panel_payments")
    .update(p)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) failPayments(error);
  return data ? normalize(data as Payment) : null;
}

export async function removePayment(id: string): Promise<Payment> {
  const { data, error } = await client().from("panel_payments").delete().eq("id", id).select(COLUMNS).single();
  if (error) failPayments(error);
  return normalize(data as Payment);
}
