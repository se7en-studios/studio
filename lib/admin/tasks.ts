// Tareas del panel (tabla panel_tasks). Igual que panel.ts usa la service role
// key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { PanelNotReady, caseProjects, client, fail } from "./panel";
import type { Task, TaskInput, TaskLinks } from "./task-shared";

const LEGACY_COLUMNS =
  "id, created_at, updated_at, title, notes, assignee, due, priority, done_at, lead_id, project_slug, created_by";
const COLUMNS = `${LEGACY_COLUMNS}, waiting, recur`;

const missingCol = (e: { code?: string }) => e.code === "42703" || e.code === "PGRST204";
/** Sin daily-v1.sql: las tareas andan igual, sin «esperando» ni repetición. */
const withDefaults = (t: Partial<Task>) => ({ waiting: false, recur: null, ...t }) as Task;
function failTask(e: { code?: string; message: string }): never {
  if (missingCol(e)) throw new PanelNotReady("Falta correr supabase/daily-v1.sql en Supabase.");
  fail(e);
}
/** Las hechas sólo interesan un tiempo: más viejas que esto no se cargan. */
const DONE_WINDOW_DAYS = 30;

/** Abiertas + hechas en los últimos 30 días. Con `leadId` o `projectSlug`, sólo las de ese pedido o proyecto. */
export async function listTasks({ leadId, projectSlug }: { leadId?: string; projectSlug?: string } = {}): Promise<
  Task[]
> {
  const since = new Date(
    Date.now() - DONE_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  const select = (columns: string) => {
    let q = client()
      .from("panel_tasks")
      .select(columns)
      .or(`done_at.is.null,done_at.gte.${since}`)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (leadId) q = q.eq("lead_id", leadId);
    if (projectSlug) q = q.eq("project_slug", projectSlug);
    return q;
  };
  let res = await select(COLUMNS);
  if (res.error && missingCol(res.error)) res = await select(LEGACY_COLUMNS);
  if (res.error) fail(res.error);
  return (res.data as unknown as Partial<Task>[]).map(withDefaults);
}

export async function insertTask(
  input: TaskInput,
  by: LeadOwner,
): Promise<Task> {
  const run = (columns: string) =>
    client().from("panel_tasks").insert({ ...input, created_by: by }).select(columns).single();
  let res = await run(COLUMNS);
  if (res.error && missingCol(res.error) && !("waiting" in input) && !("recur" in input)) res = await run(LEGACY_COLUMNS);
  if (res.error) failTask(res.error);
  return withDefaults(res.data as unknown as Partial<Task>);
}

/** Varias de una vez (plantillas de proyecto). */
export async function insertTasks(inputs: TaskInput[], by: LeadOwner): Promise<number> {
  if (!inputs.length) return 0;
  const { error } = await client()
    .from("panel_tasks")
    .insert(inputs.map((t) => ({ ...t, created_by: by })));
  if (error) fail(error);
  return inputs.length;
}

export async function patchTask(
  id: string,
  patch: Partial<TaskInput> & { done_at?: string | null },
): Promise<Task> {
  const run = (columns: string) =>
    client()
      .from("panel_tasks")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select(columns)
      .single();
  let res = await run(COLUMNS);
  if (res.error && missingCol(res.error) && !("waiting" in patch) && !("recur" in patch)) res = await run(LEGACY_COLUMNS);
  if (res.error) failTask(res.error);
  return withDefaults(res.data as unknown as Partial<Task>);
}

export async function getTask(id: string): Promise<Task> {
  const run = (columns: string) => client().from("panel_tasks").select(columns).eq("id", id).single();
  let res = await run(COLUMNS);
  if (res.error && missingCol(res.error)) res = await run(LEGACY_COLUMNS);
  if (res.error) fail(res.error);
  return withDefaults(res.data as unknown as Partial<Task>);
}

/** Devuelve la tarea borrada, para contarla en el registro. */
export async function removeTask(id: string): Promise<Task> {
  const { data, error } = await client()
    .from("panel_tasks")
    .delete()
    .eq("id", id)
    .select(LEGACY_COLUMNS)
    .single();
  if (error) fail(error);
  return withDefaults(data as unknown as Partial<Task>);
}

/** Pedidos y proyectos para vincular tareas (sólo id/slug y nombre). */
export async function taskLinks(): Promise<TaskLinks> {
  const c = client();
  const [leads, projects] = await Promise.all([
    c.from("leads").select("id, name").order("created_at", { ascending: false }).limit(300),
    c.from("panel_projects").select("slug, name").order("created_at", { ascending: false }),
  ]);
  if (leads.error) fail(leads.error);
  if (projects.error) fail(projects.error);
  return {
    leads: leads.data as TaskLinks["leads"],
    projects: [
      ...(projects.data as TaskLinks["projects"]),
      ...caseProjects().map((p) => ({ slug: p.slug, name: p.name })),
    ],
  };
}

/** Tareas abiertas de `who` con fecha pasada (para el contador de la barra lateral). */
export async function countOverdue(who: LeadOwner, today: string): Promise<number> {
  const run = (skipWaiting: boolean) => {
    const q = client()
      .from("panel_tasks")
      .select("id", { count: "exact", head: true })
      .eq("assignee", who)
      .is("done_at", null)
      .lt("due", today);
    // Las que esperan al cliente no cuentan como vencidas.
    return skipWaiting ? q.eq("waiting", false) : q;
  };
  let res = await run(true);
  if (res.error && missingCol(res.error)) res = await run(false);
  if (res.error) fail(res.error);
  return res.count ?? 0;
}
