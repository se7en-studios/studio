// Ingresos y costos (tabla panel_finance) y los cobros de proyectos que entran
// como ingresos. Usa la service role key: NUNCA importar desde un componente de cliente.
import type { LeadOwner } from "./db";
import type { Entry, EntryInput } from "./finance-shared";
import { PanelNotReady, client } from "./panel";

const COLUMNS =
  "id, kind, occurred_on, currency, amount, fx, category, description, project_slug, recurring, until, created_by";
const LIMIT = 5000;

function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Falta correr supabase/finance.sql en Supabase.");
  }
  throw new Error(e.message);
}

/** numeric llega como string desde PostgREST. */
type Row = Omit<Entry, "amount" | "fx" | "source"> & {
  amount: string | number;
  fx: string | number;
};
const toEntry = (r: Row): Entry => ({
  ...r,
  amount: Number(r.amount),
  fx: Number(r.fx),
  source: "manual",
});

export async function listEntries(): Promise<Entry[]> {
  const { data, error } = await client()
    .from("panel_finance")
    .select(COLUMNS)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (error) fail(error);
  return (data as Row[]).map(toEntry);
}

/**
 * Los cobros de los proyectos (USD) como ingresos. No guardan cotización: el
 * equivalente en pesos se calcula con la de hoy. Sin la tabla de cobros, no hay ingresos de este tipo.
 */
export async function listCobros(fx: number): Promise<Entry[]> {
  const { data, error } = await client()
    .from("panel_payments")
    .select("id, project_slug, paid_on, amount, note, created_by")
    .order("paid_on", { ascending: false })
    .limit(LIMIT);
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    throw new Error(error.message);
  }
  return (
    data as {
      id: string;
      project_slug: string;
      paid_on: string;
      amount: string | number;
      note: string;
      created_by: LeadOwner | null;
    }[]
  ).map((p): Entry => ({
    id: `cobro-${p.id}`,
    kind: "ingreso",
    occurred_on: p.paid_on,
    currency: "USD",
    amount: Number(p.amount),
    fx,
    category: "proyecto",
    description: p.note,
    project_slug: p.project_slug,
    recurring: false,
    until: null,
    created_by: p.created_by,
    source: "cobro",
  }));
}

export async function insertEntry(
  input: EntryInput,
  by: LeadOwner,
): Promise<Entry> {
  const { data, error } = await client()
    .from("panel_finance")
    .insert({ ...input, created_by: by })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return toEntry(data as Row);
}

export async function removeEntry(
  id: string,
): Promise<{
  kind: Entry["kind"];
  description: string;
  category: string;
} | null> {
  const { data, error } = await client()
    .from("panel_finance")
    .delete()
    .eq("id", id)
    .select("kind, description, category")
    .maybeSingle();
  if (error) fail(error);
  return data as {
    kind: Entry["kind"];
    description: string;
    category: string;
  } | null;
}
