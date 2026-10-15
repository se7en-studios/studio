// Herramientas y suscripciones (tabla panel_tools). Usa la service role key:
// NUNCA importar desde un componente de cliente.
import { client, failMissing } from "./panel";
import { dayKey } from "./task-shared";
import { priceBefore, type Tool, type ToolInput, type ToolPrice } from "./tool-shared";

const OLD_COLUMNS = "id, created_at, name, amount, currency, cycle, renews_on, owner, notes";
// Con finance-v5.sql: baja con fecha e historial de precios.
const COLUMNS = `${OLD_COLUMNS}, ended_on, prices`;
const missingV5 = (e: { code?: string } | null) => e?.code === "42703" || e?.code === "PGRST204";

const fail = failMissing("Falta correr supabase/finance-v2.sql en Supabase.");

/** numeric llega como string desde PostgREST. */
type Row = Omit<Tool, "amount"> & { amount: string | number };
const toTool = (r: Row): Tool => ({
  ...r,
  amount: Number(r.amount),
  prices: (r.prices ?? []).map((p) => ({ ...p, amount: Number(p.amount), fx: Number(p.fx) })),
});

/** Todas, también las dadas de baja: sus meses siguen contando como costo. */
export async function listTools(): Promise<Tool[]> {
  const list = (columns: string) => client().from("panel_tools").select(columns).order("name").limit(200);
  let res = await list(COLUMNS);
  if (missingV5(res.error)) res = await list(OLD_COLUMNS);
  if (res.error) fail(res.error);
  return (res.data as unknown as Row[]).map(toTool);
}

export async function insertTool(input: ToolInput): Promise<Tool> {
  const insert = (columns: string) => client().from("panel_tools").insert(input).select(columns).single();
  let res = await insert(COLUMNS);
  if (missingV5(res.error)) res = await insert(OLD_COLUMNS);
  if (res.error) fail(res.error);
  return toTool(res.data as unknown as Row);
}

/**
 * Si cambió el precio, el viejo queda en el historial con la cotización de hoy
 * (`fx`) para los meses pasados. Sin finance-v5.sql se pisa como antes.
 */
export async function updateTool(id: string, input: ToolInput, fx: number): Promise<Tool | null> {
  const db = client().from("panel_tools");
  const old = await db.select(COLUMNS).eq("id", id).maybeSingle();
  if (old.error && !missingV5(old.error)) fail(old.error);
  let patch: ToolInput & { prices?: ToolPrice[] } = input;
  if (old.data) {
    const prev = toTool(old.data as unknown as Row);
    const before = priceBefore(prev, input, dayKey(), fx);
    if (before) patch = { ...input, prices: [...(prev.prices ?? []), before] };
  }
  const { data, error } = await client()
    .from("panel_tools")
    .update(patch)
    .eq("id", id)
    .select(old.data ? COLUMNS : OLD_COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toTool(data as unknown as Row) : null;
}

/**
 * Da de baja una herramienta con la fecha de hoy: los meses en que se pagó
 * siguen contando. Sin finance-v5.sql, se borra como antes.
 */
export async function removeTool(id: string): Promise<{ name: string; ended_on: string | null } | null> {
  const ended_on = dayKey();
  const soft = await client()
    .from("panel_tools")
    .update({ ended_on })
    .eq("id", id)
    .is("ended_on", null)
    .select("name")
    .maybeSingle();
  if (!missingV5(soft.error)) {
    if (soft.error) fail(soft.error);
    return soft.data ? { name: (soft.data as { name: string }).name, ended_on } : null;
  }
  const { data, error } = await client().from("panel_tools").delete().eq("id", id).select("name").maybeSingle();
  if (error) fail(error);
  return data ? { name: (data as { name: string }).name, ended_on: null } : null;
}
