// Cómo se cuentan en el registro los cambios de una tarea. Puro.
import { dateLabel, diff, type Change } from "./changes";
import { PEOPLE } from "./people";
import type { Task, TaskInput, TaskLinks } from "./task-shared";

const person = (v: unknown) => (v ? PEOPLE[v as keyof typeof PEOPLE]?.name ?? String(v) : "Sin asignar");
const PRIORITY: Record<string, string> = { alta: "Alta", media: "Media", baja: "Baja" };

export function taskDiff(before: Task, patch: Partial<TaskInput>, links?: TaskLinks): Change[] {
  const linkName = (t: Pick<Task, "lead_id" | "project_slug">) =>
    t.lead_id
      ? `Pedido · ${links?.leads.find((l) => l.id === t.lead_id)?.name ?? "—"}`
      : t.project_slug
        ? `Proyecto · ${links?.projects.find((p) => p.slug === t.project_slug)?.name ?? t.project_slug}`
        : null;
  const changes = diff<Task>(before, patch, [
    { field: "title", label: "Título" },
    { field: "assignee", label: "Responsable", format: person },
    { field: "due", label: "Vence", format: dateLabel },
    { field: "priority", label: "Prioridad", format: (v) => PRIORITY[String(v)] ?? String(v) },
    { field: "notes", label: "Notas", long: true },
  ]);
  if ("lead_id" in patch || "project_slug" in patch) {
    const next = { lead_id: patch.lead_id ?? null, project_slug: patch.project_slug ?? null };
    const a = linkName(before);
    const b = linkName(next);
    if (a !== b) changes.push({ field: "link", label: "Vinculada a", before: a, after: b });
  }
  return changes;
}
