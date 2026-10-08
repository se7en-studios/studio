// Lo que busca la paleta de comandos (⌘K): pedidos, proyectos y tareas, sólo
// lo necesario para mostrarlos y saltar a cada uno.
import { db } from "@/lib/admin/db";
import { caseProjects, projectNames } from "@/lib/admin/panel";
import { withSession } from "../guard";

export type SearchIndex = {
  leads: { id: string; name: string; company: string; status: string }[];
  projects: { slug: string; name: string }[];
  tasks: { id: string; title: string; done: boolean }[];
};

export function GET() {
  return withSession<SearchIndex>(async () => {
    const c = db();
    if (!c) return { leads: [], projects: caseProjects().map((p) => ({ slug: p.slug, name: p.name })), tasks: [] };
    const [leads, names, tasks] = await Promise.all([
      c.from("leads").select("id, name, company, status").order("created_at", { ascending: false }).limit(500),
      projectNames(),
      c.from("panel_tasks").select("id, title, done_at").order("created_at", { ascending: false }).limit(500),
    ]);
    return {
      leads: (leads.data ?? []) as SearchIndex["leads"],
      projects: Object.entries(names).map(([slug, name]) => ({ slug, name })),
      tasks: ((tasks.data ?? []) as { id: string; title: string; done_at: string | null }[]).map((t) => ({
        id: t.id,
        title: t.title,
        done: Boolean(t.done_at),
      })),
    };
  });
}
