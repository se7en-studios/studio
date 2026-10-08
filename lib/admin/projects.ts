// Estado de gestión de los proyectos (tabla panel_project_state). Usa la
// service role key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { client, failV2 } from "./panel";
import { defaultState, type ProjectState, type ProjectStateInput } from "./project-shared";

const COLUMNS = "slug, updated_at, updated_by, status, owner, client, lead_id, start_date, due, progress, budget, notes";

/** slug → estado guardado. Los que no tienen fila usan defaultState(). */
export async function listStates(): Promise<Map<string, ProjectState>> {
  const { data, error } = await client().from("panel_project_state").select(COLUMNS);
  if (error) failV2(error);
  return new Map((data as ProjectState[]).map((s) => [s.slug, normalize(s)]));
}

export async function getState(slug: string, isCase: boolean): Promise<ProjectState> {
  const { data, error } = await client().from("panel_project_state").select(COLUMNS).eq("slug", slug).maybeSingle();
  if (error) failV2(error);
  return data ? normalize(data as ProjectState) : defaultState(slug, isCase);
}

/** Guarda el cambio y devuelve el antes y el después, para el registro. */
export async function upsertState(
  slug: string,
  isCase: boolean,
  patch: ProjectStateInput,
  by: LeadOwner,
): Promise<{ before: ProjectState; after: ProjectState }> {
  const before = await getState(slug, isCase);
  const { updated_at: _u, ...base } = before;
  void _u;
  const { data, error } = await client()
    .from("panel_project_state")
    .upsert({ ...base, ...patch, slug, updated_by: by, updated_at: new Date().toISOString() })
    .select(COLUMNS)
    .single();
  if (error) failV2(error);
  return { before, after: normalize(data as ProjectState) };
}

/** numeric llega como string desde PostgREST. */
function normalize(s: ProjectState): ProjectState {
  return { ...s, budget: s.budget == null ? null : Number(s.budget), progress: Number(s.progress ?? 0) };
}
