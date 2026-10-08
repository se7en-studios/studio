// Tareas del panel (tabla panel_tasks). Igual que panel.ts usa la service role
// key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { caseProjects, client, fail } from "./panel";
import type { Task, TaskInput, TaskLinks } from "./task-shared";

const COLUMNS =
  "id, created_at, updated_at, title, notes, assignee, due, priority, done_at, lead_id, project_slug, created_by";
/** Las hechas sólo interesan un tiempo: más viejas que esto no se cargan. */
const DONE_WINDOW_DAYS = 30;

/** Abiertas + hechas en los últimos 30 días. Con `leadId` o `projectSlug`, sólo las de ese pedido o proyecto. */
export async function listTasks({ leadId, projectSlug }: { leadId?: string; projectSlug?: string } = {}): Promise<
  Task[]
> {
  const since = new Date(
    Date.now() - DONE_WINDOW_DAYS * 86_400_000,
  ).toISOString();
  let q = client()
    .from("panel_tasks")
    .select(COLUMNS)
    .or(`done_at.is.null,done_at.gte.${since}`)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (leadId) q = q.eq("lead_id", leadId);
  if (projectSlug) q = q.eq("project_slug", projectSlug);
  const { data, error } = await q;
  if (error) fail(error);
  return data as Task[];
}

export async function insertTask(
  input: TaskInput,
  by: LeadOwner,
): Promise<Task> {
  const { data, error } = await client()
    .from("panel_tasks")
    .insert({ ...input, created_by: by })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as Task;
}

export async function patchTask(
  id: string,
  patch: Partial<TaskInput> & { done_at?: string | null },
): Promise<Task> {
  const { data, error } = await client()
    .from("panel_tasks")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as Task;
}

export async function getTask(id: string): Promise<Task> {
  const { data, error } = await client().from("panel_tasks").select(COLUMNS).eq("id", id).single();
  if (error) fail(error);
  return data as Task;
}

/** Devuelve la tarea borrada, para contarla en el registro. */
export async function removeTask(id: string): Promise<Task> {
  const { data, error } = await client()
    .from("panel_tasks")
    .delete()
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as Task;
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
  const { count, error } = await client()
    .from("panel_tasks")
    .select("id", { count: "exact", head: true })
    .eq("assignee", who)
    .is("done_at", null)
    .lt("due", today);
  if (error) fail(error);
  return count ?? 0;
}
