// Herramientas y suscripciones (tabla panel_tools). Usa la service role key:
// NUNCA importar desde un componente de cliente.
import { client, failMissing } from "./panel";
import type { Tool, ToolInput } from "./tool-shared";

const COLUMNS = "id, created_at, name, amount, currency, cycle, renews_on, owner, notes";

const fail = failMissing("Falta correr supabase/finance-v2.sql en Supabase.");

/** numeric llega como string desde PostgREST. */
type Row = Omit<Tool, "amount"> & { amount: string | number };
const toTool = (r: Row): Tool => ({ ...r, amount: Number(r.amount) });

export async function listTools(): Promise<Tool[]> {
  const { data, error } = await client()
    .from("panel_tools")
    .select(COLUMNS)
    .order("name")
    .limit(200);
  if (error) fail(error);
  return (data as Row[]).map(toTool);
}

export async function insertTool(input: ToolInput): Promise<Tool> {
  const { data, error } = await client()
    .from("panel_tools")
    .insert(input)
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return toTool(data as Row);
}

export async function updateTool(
  id: string,
  input: ToolInput,
): Promise<Tool | null> {
  const { data, error } = await client()
    .from("panel_tools")
    .update(input)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toTool(data as Row) : null;
}

export async function removeTool(id: string): Promise<string | null> {
  const { data, error } = await client()
    .from("panel_tools")
    .delete()
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (error) fail(error);
  return (data as { name: string } | null)?.name ?? null;
}
