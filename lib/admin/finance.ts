// Ingresos y costos (tabla panel_finance). Los cobros de los proyectos son
// ingresos con proyecto; los viejos de panel_payments se leen hasta correr
// finance-v4.sql. Usa la service role key: NUNCA importar desde un componente de cliente.
import { missingTable, type LeadOwner } from "./db";
import type { Entry, EntryInput, FxSource } from "./finance-shared";
import { fetchRates, referenceRate, referenceSource } from "./fx";
import { paymentToEntry, type Payment } from "./payment-shared";
import { allRows } from "./paged";
import { PanelNotReady, client } from "./panel";
import { missingDues, type TaxCategory } from "./plata-shared";
import { dayKey } from "./task-shared";

const LEGACY_COLUMNS =
  "id, kind, occurred_on, currency, amount, fx, category, description, project_slug, recurring, until, created_by";
const V2_COLUMNS = `${LEGACY_COLUMNS}, owner, status`;
// finance-v5.sql: fuente de la cotización, fecha prevista y clave de los pendientes generados por mes.
const COLUMNS = `${V2_COLUMNS}, fx_source, due_on, series`;
const missingV5 = (e: { code?: string } | null) => e?.code === "42703" || e?.code === "PGRST204";
/** Sin finance-v5.sql, lo que se guarda va sin las columnas nuevas. */
const V5_FIELDS = ["fx_source", "due_on", "series"] as const;
const withoutV5 = <T extends object>(row: T) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => !(V5_FIELDS as readonly string[]).includes(k)));

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
  // Con finance-v5.sql un ingreso recurrente es un plan: genera un pendiente por mes.
  plan: "series" in r && r.kind === "ingreso" && r.recurring,
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

/**
 * Todos los movimientos, o los de un proyecto. Antes genera los pendientes del
 * mes de cada ingreso recurrente que falten (idempotente), así Inicio, Finanzas
 * y la ficha los ven igual sin depender de quién abrió qué primero.
 */
export async function listEntries(slug?: string): Promise<Entry[]> {
  const [entries, abonos] = await Promise.all([readEntries(slug), maintenanceSlugs()]);
  const due = missingDues(entries, dayKey(), abonos);
  if (!due.length) return entries;
  return (await insertDues(due)) ? readEntries(slug) : entries;
}

/** Proyectos con plan activo en Mantenimiento; vacío si falta maintenance.sql. */
async function maintenanceSlugs(): Promise<Set<string>> {
  const { data, error } = await client().from("panel_maintenance_plans").select("project_slug").eq("active", true);
  if (error) return new Set();
  return new Set((data as { project_slug: string }[]).map((r) => r.project_slug));
}

async function readEntries(slug?: string): Promise<Entry[]> {
  let res = await select(COLUMNS, slug);
  // Sin finance-v5.sql (o v2) sigue andando como antes, hasta que se corra.
  if (res.error?.code === "42703") res = await select(V2_COLUMNS, slug);
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
export async function currentFx(): Promise<{ fx: number; source: FxSource | null }> {
  const rates = await fetchRates();
  const today = referenceRate(rates);
  if (today) return { fx: today, source: referenceSource(rates) };
  const { data, error } = await client()
    .from("panel_finance")
    .select("fx")
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail(error);
  return { fx: data ? Number((data as { fx: string | number }).fx) : 0, source: "estimada" };
}

/** Escribe y devuelve la fila; sin finance-v5.sql reintenta sin las columnas nuevas. */
async function write(
  run: (row: object, columns: string) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>,
  row: object,
): Promise<Entry | null> {
  let res = await run(row, COLUMNS);
  if (missingV5(res.error)) res = await run(withoutV5(row), V2_COLUMNS);
  if (res.error) fail(res.error);
  return res.data ? toEntry(res.data as Row) : null;
}

/** `by` es null cuando lo genera el sistema (cobros de mantenimiento). */
export async function insertEntry(input: EntryInput, by: LeadOwner | null): Promise<Entry> {
  const entry = await write(
    (row, columns) => client().from("panel_finance").insert(row).select(columns).single(),
    { ...input, created_by: by },
  );
  return entry as Entry;
}

export async function updateEntry(id: string, input: EntryInput): Promise<Entry | null> {
  return write((row, columns) => client().from("panel_finance").update(row).eq("id", id).select(columns).maybeSingle(), input);
}

/**
 * Los pendientes de cada mes de un plan (ver monthlyDues en plata-shared):
 * los que ya están (misma `series`) se saltean, así que se puede llamar cada
 * vez que se abre una página. Sin finance-v5.sql no hace nada.
 */
export async function insertDues(rows: EntryInput[], by: LeadOwner | null = null): Promise<number> {
  if (!rows.length) return 0;
  const { data, error } = await client()
    .from("panel_finance")
    .upsert(
      rows.map((r) => ({ ...r, created_by: by })),
      { onConflict: "series", ignoreDuplicates: true },
    )
    .select("id");
  if (missingV5(error) || error?.code === "42P10") return 0;
  if (error) fail(error);
  return data?.length ?? 0;
}

/**
 * Marca un pendiente como pagado: la fecha real es `paidOn`, la prevista queda
 * en due_on y la cotización pasa a ser la de ese día (si la hay).
 */
export async function settleEntry(
  id: string,
  paidOn: string,
  rate: { fx: number; source: FxSource | null },
): Promise<Entry | null> {
  const { data: row, error: readError } = await client()
    .from("panel_finance")
    .select("occurred_on")
    .eq("id", id)
    .eq("status", "pendiente")
    .maybeSingle();
  if (readError) fail(readError);
  if (!row) return null;
  return write(
    (patch, columns) =>
      client().from("panel_finance").update(patch).eq("id", id).eq("status", "pendiente").select(columns).maybeSingle(),
    {
      status: "pagado",
      occurred_on: paidOn,
      due_on: (row as { occurred_on: string }).occurred_on,
      ...(rate.fx > 0 ? { fx: rate.fx, fx_source: rate.source } : {}),
    },
  );
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

// --- Monotributo -----------------------------------------------------------------

/** La categoría de monotributo de cada socio (tabla panel_monotributo, finance-v5.sql). null si falta la tabla. */
export async function listTaxCategories(): Promise<Partial<Record<LeadOwner, TaxCategory>> | null> {
  const { data, error } = await client().from("panel_monotributo").select("owner, category");
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return null;
    throw new Error(error.message);
  }
  return Object.fromEntries((data as { owner: LeadOwner; category: TaxCategory }[]).map((r) => [r.owner, r.category]));
}

export async function setTaxCategory(owner: LeadOwner, category: TaxCategory): Promise<void> {
  const { error } = await client().from("panel_monotributo").upsert({ owner, category, updated_at: new Date().toISOString() });
  if (error?.code === "PGRST205" || error?.code === "42P01")
    throw new PanelNotReady("Falta correr supabase/finance-v5.sql en Supabase.");
  if (error) throw new Error(error.message);
}
