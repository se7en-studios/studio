// Plantillas de los mensajes a un prospecto (tabla prospect_templates). Igual que
// panel.ts usa la service role key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { client, failMissing } from "./panel";
import { DEFAULT_TEMPLATES, type ProspectTemplate, type TemplateKind } from "./prospect-template-shared";

const fail = failMissing("Falta correr supabase/prospect-templates-v2.sql en Supabase.");
const COLUMNS = "id, name, body, active, kind";

/**
 * Todas, las más viejas primero. La primera vez (tabla vacía) se cargan las sugeridas; como no se
 * puede borrar la última de cada tipo, después nunca vuelve a quedar vacía.
 */
export async function listTemplates(): Promise<ProspectTemplate[]> {
  const read = () => client().from("prospect_templates").select(COLUMNS).order("created_at").order("id");
  let { data, error } = await read();
  if (error) fail(error);
  if (!data?.length) {
    // ignoreDuplicates: si dos pantallas cargan a la vez, no se duplican.
    const seeded = await client().from("prospect_templates").upsert(DEFAULT_TEMPLATES, { onConflict: "id", ignoreDuplicates: true });
    if (seeded.error) fail(seeded.error);
    ({ data, error } = await read());
    if (error) fail(error);
  }
  return data as ProspectTemplate[];
}

export async function insertTemplate(input: Pick<ProspectTemplate, "name" | "body" | "kind">, by: LeadOwner): Promise<ProspectTemplate> {
  const { data, error } = await client()
    .from("prospect_templates")
    .insert({ ...input, created_by: by, updated_by: by })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as ProspectTemplate;
}

export async function patchTemplate(id: string, patch: Partial<Pick<ProspectTemplate, "name" | "body" | "active">>, by: LeadOwner): Promise<ProspectTemplate> {
  const { data, error } = await client()
    .from("prospect_templates")
    .update({ ...patch, updated_by: by, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as ProspectTemplate;
}

/** No borra la última de su tipo: el radar siempre tiene con qué armar cada mensaje. */
export async function removeTemplate(id: string): Promise<void> {
  const { data: row, error: readErr } = await client().from("prospect_templates").select("kind").eq("id", id).maybeSingle();
  if (readErr) fail(readErr);
  if (!row) return;
  const { count, error: countErr } = await client()
    .from("prospect_templates")
    .select("id", { count: "exact", head: true })
    .eq("kind", row.kind as TemplateKind);
  if (countErr) fail(countErr);
  if ((count ?? 0) <= 1) throw new Error("Tiene que quedar al menos una plantilla de este tipo.");
  const { error } = await client().from("prospect_templates").delete().eq("id", id);
  if (error) fail(error);
}
