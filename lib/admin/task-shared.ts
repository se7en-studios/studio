// Tipos y fechas de las tareas. Puro y sin dependencias de servidor: lo usan
// las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";

export const PRIORITIES = ["alta", "media", "baja"] as const;
export type TaskPriority = (typeof PRIORITIES)[number];

export type Task = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  notes: string;
  assignee: LeadOwner | null;
  /** YYYY-MM-DD, sin hora. */
  due: string | null;
  priority: TaskPriority;
  done_at: string | null;
  lead_id: string | null;
  project_slug: string | null;
  created_by: LeadOwner | null;
};

export type TaskInput = Pick<
  Task,
  | "title"
  | "notes"
  | "assignee"
  | "due"
  | "priority"
  | "lead_id"
  | "project_slug"
>;

/** Lo que se puede vincular a una tarea, para los selectores. */
export type TaskLinks = {
  leads: { id: string; name: string }[];
  projects: { slug: string; name: string }[];
};

export const TITLE_MAX = 200;
export const NOTES_MAX = 5000;

const TZ = "America/Argentina/Buenos_Aires";

/** YYYY-MM-DD de hoy (o de hoy + n días) en hora de Argentina. */
export function dayKey(offsetDays = 0, from = Date.now()) {
  return new Date(from + offsetDays * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: TZ,
  });
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export type Bucket =
  "vencidas" | "hoy" | "semana" | "despues" | "sinfecha" | "hechas";

export const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Próximos 7 días" },
  { id: "despues", label: "Más adelante" },
  { id: "sinfecha", label: "Sin fecha" },
  { id: "hechas", label: "Hechas" },
];

export function bucket(
  t: Pick<Task, "due" | "done_at">,
  today = dayKey(),
): Bucket {
  if (t.done_at) return "hechas";
  if (!t.due) return "sinfecha";
  const d = daysBetween(today, t.due);
  if (d < 0) return "vencidas";
  if (d === 0) return "hoy";
  return d <= 7 ? "semana" : "despues";
}

/** «hoy», «mañana», «hace 3 días», «vie 10 oct». */
export function dueLabel(due: string, today = dayKey()) {
  const d = daysBetween(today, due);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  if (d < 0) return `hace ${-d} días`;
  const date = new Date(`${due}T12:00:00`);
  return date
    .toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(/\./g, "");
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

/** Abiertas: por fecha (sin fecha al final) y prioridad. Hechas: la más reciente primero. */
export function compareTasks(a: Task, b: Task) {
  if (a.done_at || b.done_at)
    return (b.done_at ?? "").localeCompare(a.done_at ?? "");
  if (a.due !== b.due) return (a.due ?? "9999").localeCompare(b.due ?? "9999");
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    a.created_at.localeCompare(b.created_at)
  );
}

/** Valida y recorta lo que llega del cliente. Tira error con un mensaje para mostrar. */
export function cleanInput(
  input: Partial<TaskInput>,
  owners: readonly string[],
): Partial<TaskInput> {
  const out: Partial<TaskInput> = {};
  if (input.title !== undefined) {
    const title = String(input.title).trim().slice(0, TITLE_MAX);
    if (!title) throw new Error("La tarea necesita un título.");
    out.title = title;
  }
  if (input.notes !== undefined)
    out.notes = String(input.notes).slice(0, NOTES_MAX);
  if (input.assignee !== undefined) {
    if (input.assignee !== null && !owners.includes(input.assignee))
      throw new Error("Responsable inválido.");
    out.assignee = input.assignee;
  }
  if (input.due !== undefined) {
    if (input.due !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.due))
      throw new Error("Fecha inválida.");
    out.due = input.due || null;
  }
  if (input.priority !== undefined) {
    if (!PRIORITIES.includes(input.priority))
      throw new Error("Prioridad inválida.");
    out.priority = input.priority;
  }
  if (input.lead_id !== undefined) {
    if (input.lead_id !== null && !/^[0-9a-f-]{36}$/i.test(input.lead_id))
      throw new Error("Pedido inválido.");
    out.lead_id = input.lead_id;
  }
  if (input.project_slug !== undefined) {
    if (
      input.project_slug !== null &&
      !/^[a-z0-9-]{1,64}$/.test(input.project_slug)
    )
      throw new Error("Proyecto inválido.");
    out.project_slug = input.project_slug;
  }
  return out;
}
