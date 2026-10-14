// Ingresos y costos (tabla panel_finance). Los cobros de los proyectos son
// ingresos con proyecto; los viejos de panel_payments se leen hasta correr
// finance-v4.sql. Usa la service role key: NUNCA importar desde un componente de cliente.
import { missingTable, type LeadOwner } from "./db";
import type { Entry, EntryInput } from "./finance-shared";
import { fetchRates, referenceRate } from "./fx";
import { paymentToEntry, type Payment } from "./payment-shared";
import { allRows } from "./paged";
import { PanelNotReady, client } from "./panel";

const LEGACY_COLUMNS =
  "id, kind, occurred_on, currency, amount, fx, category, description, project_slug, recurring, until, created_by";
const COLUMNS = `${LEGACY_COLUMNS}, owner, status`;

function fail(e: { code?: string; message: string }): never {
  if (missingTable(e)) {
    throw new PanelNotReady("Falta correr supabase/finance.sql en Supabase.");
  }
  // Columna inexistente: falta supabase/finance-v2.sql (socios y pendientes).
  if (e.code === "42703" || e.code === "PGRST204") {
    throw new PanelNotReady(
      "Falta correr supabase/finance-v2.sql en Supabase.",
    );
  }
  throw new Error(e.message);
}

/** numeric llega como string desde PostgREST. */
type Row = Omit<Entry, "amount" | "fx" | "source" | "owner" | "status"> &
  Partial<Pick<Entry, "owner" | "status">> & {
    amount: string | number;
    fx: string | number;
  };
const toEntry = (r: Row): Entry => ({
  ...r,
  amount: Number(r.amount),
  fx: Number(r.fx),
  owner: r.owner ?? "ambos",
  status: r.status ?? "pagado",
  source: "manual",
});

const select = (columns: string, slug?: string) =>
  allRows<Row>((from, to) => {
    let q = client().from("panel_finance").select(columns);
    if (slug) q = q.eq("project_slug", slug);
    return q
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, to);
  });

/** Todos los movimientos, o los de un proyecto. */
export async function listEntries(slug?: string): Promise<Entry[]> {
  let res = await select(COLUMNS, slug);
  // Sin finance-v2.sql sigue andando como antes (todo «ambos» y pagado), hasta que se corra.
  if (res.error?.code === "42703") res = await select(LEGACY_COLUMNS, slug);
  if (res.error) fail(res.error);
  return res.data.map(toEntry);
}

/**
 * Los cobros viejos de los proyectos (USD, tabla panel_payments) como ingresos.
 * No guardan cotización: el equivalente en pesos se calcula con la de hoy.
 * Después de finance-v4.sql la tabla ya no está y no hay ninguno.
 */
export async function listCobros(fx: number, slug?: string): Promise<Entry[]> {
  const { data, error } = await allRows<Omit<Payment, "amount"> & { amount: string | number }>((from, to) => {
    let q = client()
      .from("panel_payments")
      .select("id, created_at, project_slug, paid_on, amount, note, created_by, owner");
    if (slug) q = q.eq("project_slug", slug);
    return q.order("paid_on", { ascending: false }).order("id").range(from, to);
  });
  if (error) {
    if (missingTable(error)) return [];
    // Falta finance-v3.sql: se avisa (la página muestra el paso) en vez de perder los ingresos en silencio.
    if (error.code === "42703")
      throw new PanelNotReady("Falta correr supabase/finance-v3.sql en Supabase.");
    throw new Error(error.message);
  }
  return data.map((p) =>
    paymentToEntry({ ...p, amount: Number(p.amount) }, fx),
  );
}

/**
 * Pesos por dólar para un cobro cargado desde la ficha de un proyecto: la de
 * referencia de hoy o, si no responde, la del último movimiento. 0 si no hay ninguna.
 */
export async function currentFx(): Promise<number> {
  const today = referenceRate(await fetchRates());
  if (today) return today;
  const { data, error } = await client()
    .from("panel_finance")
    .select("fx")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error);
  return data ? Number((data as { fx: string | number }).fx) : 0;
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

export async function updateEntry(id: string, input: EntryInput): Promise<Entry | null> {
  const { data, error } = await client()
    .from("panel_finance")
    .update(input)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toEntry(data as Row) : null;
}

/** Marca un pendiente como pagado, con la fecha en que realmente se pagó. */
export async function settleEntry(
  id: string,
  paidOn: string,
): Promise<Entry | null> {
  const { data, error } = await client()
    .from("panel_finance")
    .update({ status: "pagado", occurred_on: paidOn })
    .eq("id", id)
    .eq("status", "pendiente")
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toEntry(data as Row) : null;
}

type Removed = Pick<Entry, "kind" | "description" | "category" | "currency" | "occurred_on" | "project_slug"> & { amount: number };

export async function removeEntry(id: string): Promise<Removed | null> {
  const { data, error } = await client()
    .from("panel_finance")
    .delete()
    .eq("id", id)
    .select("kind, description, category, currency, amount, occurred_on, project_slug")
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const row = data as Omit<Removed, "amount"> & { amount: string | number };
  return { ...row, amount: Number(row.amount) };
}
