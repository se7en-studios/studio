// Datos de «En vivo» (Oficinas): proyectos con su estado, tareas abiertas,
// eventos y las visitas de cada uno. Usa la service role key: NUNCA importar
// este archivo desde un componente de cliente (los tipos están en
// oficinas-shared.ts).
import { caseBrand } from "@/lib/en-vivo";
import { latestCaptures, type SiteCapture } from "./capturas";
import { db } from "./db";
import { kindOf, type EventKind } from "./event-shared";
import { PanelNotReady, caseProjects, client, fail, getProject, listProjects, type PanelProject } from "./panel";
import { defaultState, type ProjectState } from "./project-shared";
import { listStates } from "./projects";
import {
  WHO,
  daysSince,
  fadeOf,
  resolveVisit,
  salaMasApagada,
  zoneOf,
  type OficinasData,
  type OfiEvent,
  type OfiProject,
  type OfiTask,
  type Who,
} from "./oficinas-shared";

const SLUG = /^[a-z0-9-]{1,64}$/;
/**
 * Lo que se muestra en el mapa: el trabajo en los proyectos. Sin pedidos,
 * finanzas, cuentas, contenido, llamadas ni seguridad (no van en «En vivo»).
 */
const EVENT_KINDS: EventKind[] = ["archivos", "proyecto", "tarea"];
const missingTable = (e: { code?: string }) => e.code === "PGRST205" || e.code === "42P01";
const key = (who: string, slug: string) => `${who}|${slug}`;

type TaskRow = { id: string; title: string; assignee: Who | null; due: string | null; priority: OfiTask["priority"]; project_slug: string | null };
type EventRow = { id: string; created_at: string; actor: Who | null; kind: EventKind; text: string; project_slug: string | null };

const toTask = (t: TaskRow): OfiTask => ({ id: t.id, title: t.title, assignee: t.assignee, due: t.due, priority: t.priority, projectSlug: t.project_slug });
const toEvent = (e: EventRow): OfiEvent => ({ id: e.id, createdAt: e.created_at, actor: e.actor, text: e.text, projectSlug: e.project_slug });

function toProject(p: PanelProject, s: ProjectState, tasks: OfiTask[], events: OfiEvent[], lastVisit: Record<Who, string | null>, capture: SiteCapture | null = null): OfiProject {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline ?? "",
    client: s.client,
    accent: p.accent,
    cover: p.cover,
    url: p.url,
    video: p.video,
    capture,
    brand: p.isCase ? caseBrand(p.slug) : null,
    status: s.status,
    owner: s.owner,
    due: s.due,
    progress: s.progress,
    notes: s.notes,
    isCase: p.isCase,
    openTasks: tasks.filter((t) => t.projectSlug === p.slug),
    events: events.filter((e) => e.projectSlug === p.slug).slice(0, 5),
    lastVisit,
  };
}

/** Todo lo que necesita el mapa, en una ida al servidor. Sin base, los casos de la web solos. */
export async function getOficinasData(me: Who): Promise<OficinasData> {
  const generatedAt = new Date().toISOString();
  if (!db()) {
    const none = { federico: null, franco: null };
    return {
      me,
      generatedAt,
      visitsReady: false,
      projects: caseProjects().map((p) => toProject(p, defaultState(p.slug, p.isCase), [], [], none)),
      studioEvents: [],
      openTasks: [],
    };
  }
  const c = client();
  const [projects, states, tasksRes, eventsRes, visitsRes, readsRes, captures] = await Promise.all([
    listProjects(),
    listStates().catch((e) => {
      // Sin panel-v2.sql el mapa anda igual: todos con el estado por defecto.
      if (e instanceof PanelNotReady) return new Map<string, ProjectState>();
      throw e;
    }),
    c.from("panel_tasks").select("id, title, assignee, due, priority, project_slug").is("done_at", null).is("lead_id", null).limit(1000),
    c.from("panel_events").select("id, created_at, actor, kind, text, project_slug").in("kind", EVENT_KINDS).order("created_at", { ascending: false }).limit(400),
    c.from("panel_room_visits").select("who, project_slug, visited_at"),
    c.from("panel_reads").select("who, channel, last_read_at").like("channel", "p:%"),
    // Sin capturas.sql, o si falla, la tele usa la captura fija: no corta el mapa.
    latestCaptures().catch(() => new Map<string, SiteCapture>()),
  ]);
  if (tasksRes.error && !missingTable(tasksRes.error)) fail(tasksRes.error);
  if (eventsRes.error) fail(eventsRes.error);
  if (visitsRes.error && !missingTable(visitsRes.error)) fail(visitsRes.error);
  if (readsRes.error && !missingTable(readsRes.error)) fail(readsRes.error);

  const tasks = ((tasksRes.data ?? []) as TaskRow[]).map(toTask);
  // Sin panel-v3.sql, lo de Cuentas o Finanzas viene anotado como «proyecto»: se reconoce por el texto.
  const events = ((eventsRes.data ?? []) as EventRow[]).filter((e) => EVENT_KINDS.includes(kindOf(e.kind, e.text))).map(toEvent);
  const rows = new Map(((visitsRes.data ?? []) as { who: string; project_slug: string; visited_at: string }[]).map((v) => [key(v.who, v.project_slug), v.visited_at]));
  const reads = new Map(((readsRes.data ?? []) as { who: string; channel: string; last_read_at: string }[]).map((r) => [key(r.who, r.channel.slice(2)), r.last_read_at]));
  // Mi último cambio en cada proyecto: los eventos ya vienen del más nuevo al más viejo.
  const own = new Map<string, string>();
  for (const e of events) if (e.actor && e.projectSlug && !own.has(key(e.actor, e.projectSlug))) own.set(key(e.actor, e.projectSlug), e.createdAt);

  const visitOf = (who: Who, slug: string) => resolveVisit(rows.get(key(who, slug)) ?? null, reads.get(key(who, slug)) ?? null, own.get(key(who, slug)) ?? null);
  const out = projects
    .map((p) =>
      toProject(p, states.get(p.slug) ?? defaultState(p.slug, p.isCase), tasks, events, { federico: visitOf("federico", p.slug), franco: visitOf("franco", p.slug) }, captures.get(p.slug) ?? null),
    )
    // Orden fijo para que las salas no cambien de lugar con cada movimiento.
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    me,
    generatedAt,
    visitsReady: !visitsRes.error,
    projects: out,
    studioEvents: events.slice(0, 6),
    openTasks: tasks,
  };
}

export type SalaMasApagada = { slug: string; name: string; accent: string; days: number | null; fade: number; lit: number; total: number };

/**
 * Para la tarjeta de Inicio: la sala más apagada de `who` con las mismas reglas
 * y la misma semilla que el mapa, y cuántas siguen prendidas. null sin proyectos.
 */
export async function getSalaMasApagada(who: Who): Promise<SalaMasApagada | null> {
  const data = await getOficinasData(who);
  const now = Date.now();
  const visitOf = (slug: string) => data.projects.find((p) => p.slug === slug)?.lastVisit[who] ?? null;
  const worst = salaMasApagada(data.projects, visitOf, now);
  if (!worst) return null;
  const lit = data.projects.filter((p) => fadeOf(daysSince(p.lastVisit[who], now), zoneOf(p.status)) === 0).length;
  const accent = data.projects.find((p) => p.slug === worst.slug)?.accent ?? "#ff4d2e";
  return { ...worst, accent, lit, total: data.projects.length };
}

/** Guarda que `who` entró a la sala. Devuelve la hora guardada. */
export async function recordVisit(who: Who, slug: string): Promise<string> {
  if (!WHO.includes(who)) throw new Error("Sesión inválida.");
  if (!SLUG.test(slug)) throw new Error("Sala inválida.");
  if (!(await getProject(slug))) throw new Error("Esa sala no existe.");
  const visitedAt = new Date().toISOString();
  const { error } = await client().from("panel_room_visits").upsert({ who, project_slug: slug, visited_at: visitedAt });
  if (error) {
    if (missingTable(error)) throw new PanelNotReady("Falta correr supabase/oficinas.sql en Supabase.");
    throw new Error(error.message);
  }
  return visitedAt;
}
