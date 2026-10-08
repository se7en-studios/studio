// Proyectos, archivos y feed de cambios del panel. Igual que db.ts usa la
// service role key: NUNCA importar este archivo desde un componente de cliente
// (los tipos sí, con `import type`).
import { projects as cases } from "@/data/projects";
import { db, type LeadOwner } from "./db";
import type { Change } from "./changes";

export const BUCKET = "panel";
/** Máximo por archivo del plan Free de Supabase. panel.sql lo repite en el bucket. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 20;
/** Lo que dura una URL firmada: alcanza para una pestaña del panel abierta un rato. */
const SIGNED_TTL = 60 * 60;

export const FOLDERS = [
  { id: "diseno", label: "Diseño" },
  { id: "entregables", label: "Entregables" },
  { id: "contenido", label: "Contenido" },
  { id: "documentos", label: "Documentos" },
  { id: "referencias", label: "Referencias" },
] as const;
export type FolderId = (typeof FOLDERS)[number]["id"];

export function isFolder(id: string): id is FolderId {
  return FOLDERS.some((f) => f.id === id);
}

export function folderLabel(id: string): string {
  return FOLDERS.find((f) => f.id === id)?.label ?? id;
}

export type PanelProject = {
  slug: string;
  name: string;
  category: string;
  year: string | null;
  accent: string;
  url: string | null;
  tagline: string | null;
  /** Ruta de /public (casos) o URL firmada de la última imagen subida. */
  cover: string | null;
  /** Video de hover de la web, sólo en casos. */
  video: string | null;
  isCase: boolean;
  files: number;
  updatedAt: string | null;
};

export type PanelFile = {
  id: string;
  created_at: string;
  project_slug: string;
  folder: FolderId;
  path: string;
  name: string;
  mime: string;
  size: number;
  uploaded_by: LeadOwner | null;
  url: string | null;
};

export type EventKind = "archivos" | "proyecto" | "pedido" | "tarea";

export type PanelEvent = {
  id: string;
  created_at: string;
  actor: LeadOwner | null;
  kind: EventKind;
  text: string;
  project_slug: string | null;
  /** Desde panel-v2.sql; antes de correrlo llegan vacíos. */
  lead_id: string | null;
  changes: Change[];
  paths: string[];
  thumbs: string[];
};

/** Falta la base o faltan las tablas: la página muestra cómo activarlo en vez de romperse. */
export class PanelNotReady extends Error {}

export function client() {
  const c = db();
  if (!c) throw new PanelNotReady("Falta conectar la base de datos.");
  return c;
}

export function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Faltan las tablas del panel en Supabase.");
  }
  throw new Error(e.message);
}

/** Para las tablas de panel-v2.sql: si faltan, el aviso dice qué archivo correr. */
export function failV2(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Falta correr supabase/panel-v2.sql en Supabase.");
  }
  throw new Error(e.message);
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif|svg)$/i;

export function isImage(mimeOrPath: string) {
  return mimeOrPath.startsWith("image/") || IMAGE_EXT.test(mimeOrPath);
}

async function sign(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths)];
  if (!unique.length) return out;
  const { data, error } = await client().storage.from(BUCKET).createSignedUrls(unique, SIGNED_TTL);
  if (error) {
    console.error("[panel] firmar URLs:", error.message);
    return out;
  }
  for (const d of data ?? []) if (d.path && d.signedUrl) out.set(d.path, d.signedUrl);
  return out;
}

// --- Proyectos -------------------------------------------------------------

type Stat = { files: number; updatedAt: string; image: string | null };

function fromCase(p: (typeof cases)[number], stat?: Stat): PanelProject {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    year: p.year,
    accent: p.brand?.accent ?? "#ff4d2e",
    url: p.url,
    tagline: p.brand?.tagline ?? p.shortDescription,
    cover: p.image,
    video: p.video?.mp4 ?? null,
    isCase: true,
    files: stat?.files ?? 0,
    updatedAt: stat?.updatedAt ?? null,
  };
}

export type ProjectRow = { slug: string; created_at: string; name: string; category: string; url: string; accent: string };

function fromRow(p: ProjectRow, stat: Stat | undefined, cover: string | null): PanelProject {
  return {
    slug: p.slug,
    name: p.name,
    category: p.category,
    year: p.created_at.slice(0, 4),
    accent: p.accent,
    url: p.url || null,
    tagline: null,
    cover,
    video: null,
    isCase: false,
    files: stat?.files ?? 0,
    updatedAt: stat?.updatedAt ?? p.created_at,
  };
}

/** Sólo los casos de la web, para cuando la base todavía no está. */
export function caseProjects(): PanelProject[] {
  return cases.map((p) => fromCase(p));
}

/** Casos de la web + proyectos del panel, el que tuvo movimiento más reciente primero. */
export async function listProjects(): Promise<PanelProject[]> {
  const c = client();
  const [rows, files] = await Promise.all([
    c.from("panel_projects").select("slug, created_at, name, category, url, accent"),
    c
      .from("panel_files")
      .select("project_slug, path, mime, created_at")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (rows.error) fail(rows.error);
  if (files.error) fail(files.error);

  const stats = new Map<string, Stat>();
  for (const f of files.data as { project_slug: string; path: string; mime: string; created_at: string }[]) {
    const s = stats.get(f.project_slug) ?? { files: 0, updatedAt: f.created_at, image: null };
    s.files++;
    if (!s.image && isImage(f.mime)) s.image = f.path;
    stats.set(f.project_slug, s);
  }

  const custom = rows.data as ProjectRow[];
  const covers = await sign(custom.map((p) => stats.get(p.slug)?.image).filter((x): x is string => Boolean(x)));
  const all = [
    ...custom.map((p) => {
      const s = stats.get(p.slug);
      return fromRow(p, s, s?.image ? covers.get(s.image) ?? null : null);
    }),
    ...cases.map((p) => fromCase(p, stats.get(p.slug))),
  ];
  // Estable: sin movimiento quedan en el orden del portfolio.
  return all.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

export async function getProject(slug: string): Promise<PanelProject | null> {
  const found = cases.find((p) => p.slug === slug);
  if (found) return fromCase(found);
  const c = db();
  if (!c) return null;
  const { data, error } = await c
    .from("panel_projects")
    .select("slug, created_at, name, category, url, accent")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail(error);
  return data ? fromRow(data as ProjectRow, undefined, null) : null;
}

/** slug → nombre de todos los proyectos, sin firmar portadas (para el feed y los selectores). */
export async function projectNames(): Promise<Record<string, string>> {
  const names: Record<string, string> = Object.fromEntries(cases.map((p) => [p.slug, p.name]));
  const c = db();
  if (!c) return names;
  const { data, error } = await c.from("panel_projects").select("slug, name");
  if (error) return names;
  for (const p of data as { slug: string; name: string }[]) names[p.slug] = p.name;
  return names;
}

/** Edita un proyecto del panel (los casos de la web se editan en data/projects.ts). */
export async function updateProjectRow(
  slug: string,
  patch: Partial<Pick<ProjectRow, "name" | "category" | "url" | "accent">>,
): Promise<{ before: ProjectRow; after: ProjectRow }> {
  const c = client();
  const cur = await c.from("panel_projects").select("slug, created_at, name, category, url, accent").eq("slug", slug).single();
  if (cur.error) fail(cur.error);
  const { data, error } = await c
    .from("panel_projects")
    .update(patch)
    .eq("slug", slug)
    .select("slug, created_at, name, category, url, accent")
    .single();
  if (error) fail(error);
  return { before: cur.data as ProjectRow, after: data as ProjectRow };
}

export function slugify(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Crea el proyecto con un slug libre (no pisa casos ni proyectos existentes). */
export async function insertProject(p: {
  name: string;
  category: string;
  url: string;
  accent: string;
  created_by: LeadOwner;
}): Promise<string> {
  const c = client();
  const base = slugify(p.name) || "proyecto";
  const { data, error } = await c.from("panel_projects").select("slug").like("slug", `${base}%`);
  if (error) fail(error);
  const taken = new Set([...cases.map((x) => x.slug), ...(data as { slug: string }[]).map((x) => x.slug)]);
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  const insert = await c.from("panel_projects").insert({ ...p, slug });
  if (insert.error) fail(insert.error);
  return slug;
}

/**
 * Borra un proyecto del panel: desvincula sus tareas, saca sus archivos de
 * Storage y de la tabla, y borra la fila. Devuelve el nombre y cuántos
 * archivos se fueron, para contarlo en el feed.
 *
 * Los casos de data/projects.ts NO se pueden borrar desde acá: viven en el
 * repo, así que sacarlos es un cambio de código y un deploy. La acción lo
 * rechaza y la UI directamente no muestra el botón.
 *
 * El orden importa. Primero lo reversible (desvincular tareas) y último lo
 * destructivo, para que un error a mitad de camino no deje archivos huérfanos
 * sin proyecto al que pertenecer.
 */
export async function removeProject(slug: string): Promise<{ name: string; files: number }> {
  if (cases.some((c) => c.slug === slug)) {
    throw new Error("Ese proyecto es un caso de la web: se saca del repo, no del panel.");
  }
  const c = client();

  const found = await c.from("panel_projects").select("name").eq("slug", slug).maybeSingle();
  if (found.error) fail(found.error);
  if (!found.data) throw new Error("Ese proyecto ya no existe.");
  const { name } = found.data as { name: string };

  // Las tareas sobreviven: son trabajo anotado y perderlas por borrar un
  // proyecto sería peor que dejarlas sueltas. Quedan sin vincular.
  const unlink = await c.from("panel_tasks").update({ project_slug: null }).eq("project_slug", slug);
  if (unlink.error) fail(unlink.error);

  // panel_files no tiene FK al proyecto, así que no hay cascade que lo haga
  // solo. Va en lotes a propósito: una consulta de PostgREST devuelve 1000
  // filas como máximo, y vaciar la tabla de una sin haber sacado todos los
  // objetos de Storage los dejaría huérfanos para siempre. Cada vuelta borra
  // de Storage y después exactamente esas filas, así que no queda nada suelto.
  let files = 0;
  for (;;) {
    const rows = await c.from("panel_files").select("id, path").eq("project_slug", slug).limit(100);
    if (rows.error) fail(rows.error);
    const batch = rows.data as { id: string; path: string }[];
    if (!batch.length) break;
    const gone = await c.storage.from(BUCKET).remove(batch.map((r) => r.path));
    if (gone.error) throw new Error(gone.error.message);
    const del = await c.from("panel_files").delete().in(
      "id",
      batch.map((r) => r.id),
    );
    if (del.error) fail(del.error);
    files += batch.length;
  }

  // El estado de gestión (panel v2) no tiene FK: sin esto, un proyecto nuevo
  // con el mismo slug heredaría etapa, cliente y responsable del borrado.
  // Si panel-v2.sql todavía no corrió no hay nada que limpiar.
  const state = await c.from("panel_project_state").delete().eq("slug", slug);
  if (state.error && state.error.code !== "PGRST205" && state.error.code !== "42P01") fail(state.error);

  const del = await c.from("panel_projects").delete().eq("slug", slug);
  if (del.error) fail(del.error);
  return { name, files };
}

// --- Archivos --------------------------------------------------------------

export async function listFiles(slug: string): Promise<PanelFile[]> {
  const { data, error } = await client()
    .from("panel_files")
    .select("id, created_at, project_slug, folder, path, name, mime, size, uploaded_by")
    .eq("project_slug", slug)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) fail(error);
  const rows = data as Omit<PanelFile, "url">[];
  const urls = await sign(rows.map((r) => r.path));
  return rows.map((r) => ({ ...r, url: urls.get(r.path) ?? null }));
}

/**
 * Cuantos archivos tiene el proyecto, sin traerlos. Lo necesita el boton de
 * borrar para avisar que se lleva puesto antes de que confirmes: getProject no
 * completa `files` (queda en 0 siempre) y listFiles traeria hasta 500 filas, y
 * firmaria una URL por cada una, para usar nada mas que el largo.
 */
export async function countFiles(slug: string): Promise<number> {
  const { count, error } = await client()
    .from("panel_files")
    .select("id", { count: "exact", head: true })
    .eq("project_slug", slug);
  if (error) fail(error);
  return count ?? 0;
}

function safeName(name: string) {
  const clean = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean.slice(-80) || "archivo";
}

/**
 * Una URL firmada de subida por archivo. El navegador sube directo a Storage:
 * pasar el archivo por una función de Vercel cortaría todo lo que pase 4,5 MB.
 */
export async function uploadTargets(slug: string, folder: FolderId, names: string[]) {
  const bucket = client().storage.from(BUCKET);
  const stamp = Date.now().toString(36);
  return Promise.all(
    names.map(async (name, i) => {
      const path = `${slug}/${folder}/${stamp}${i.toString(36)}-${safeName(name)}`;
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "No se pudo preparar la subida");
      return { path, url: data.signedUrl };
    }),
  );
}

export async function insertFiles(rows: Omit<PanelFile, "id" | "created_at" | "url">[]) {
  const { error } = await client().from("panel_files").insert(rows);
  if (error) fail(error);
}

/** Borra el archivo de Storage y de la tabla. Devuelve la fila para contarlo en el feed. */
export async function removeFile(id: string): Promise<Omit<PanelFile, "url">> {
  const c = client();
  const { data, error } = await c
    .from("panel_files")
    .select("id, created_at, project_slug, folder, path, name, mime, size, uploaded_by")
    .eq("id", id)
    .single();
  if (error) fail(error);
  const row = data as Omit<PanelFile, "url">;
  const gone = await c.storage.from(BUCKET).remove([row.path]);
  if (gone.error) throw new Error(gone.error.message);
  const del = await c.from("panel_files").delete().eq("id", id);
  if (del.error) fail(del.error);
  return row;
}

export async function countFilesSince(iso: string): Promise<number> {
  const { count, error } = await client()
    .from("panel_files")
    .select("id", { count: "exact", head: true })
    .gte("created_at", iso);
  if (error) fail(error);
  return count ?? 0;
}

// --- Cambios ---------------------------------------------------------------

/** Columna que todavía no existe (falta correr panel-v2.sql). */
const missingCol = (e: { code?: string; message: string }) => e.code === "42703" || e.code === "PGRST204" || /column .* does not exist|schema cache/i.test(e.message);

export type NewEvent = {
  actor: LeadOwner;
  kind: EventKind;
  text: string;
  project_slug?: string | null;
  lead_id?: string | null;
  changes?: Change[];
  paths?: string[];
};

/**
 * Nunca rompe la acción que lo llama: si el feed falla, se pierde la línea y
 * nada más. Sin panel-v2.sql guarda la línea sin el detalle de los cambios.
 */
export async function logEvent(e: NewEvent) {
  const c = db();
  if (!c) return;
  const { lead_id = null, changes = [], ...base } = e;
  const row = { ...base, paths: e.paths ?? [] };
  let { error } = await c.from("panel_events").insert({ ...row, lead_id, changes });
  if (error && missingCol(error)) ({ error } = await c.from("panel_events").insert(row));
  if (error) console.error("[panel] feed:", error.message);
}

const EVENT_COLUMNS = "id, created_at, actor, kind, text, project_slug, paths";

export type EventFilter = {
  limit?: number;
  kind?: EventKind;
  actor?: LeadOwner;
  projectSlug?: string;
  leadId?: string;
  /** ISO: sólo lo anterior a esto (para «cargar más»). */
  before?: string;
  q?: string;
};

export async function listEvents({ limit = 50, kind, actor, projectSlug, leadId, before, q }: EventFilter = {}): Promise<PanelEvent[]> {
  const run = (columns: string, withLead: boolean) => {
    let query = client().from("panel_events").select(columns).order("created_at", { ascending: false }).limit(limit);
    if (kind) query = query.eq("kind", kind);
    if (actor) query = query.eq("actor", actor);
    if (projectSlug) query = query.eq("project_slug", projectSlug);
    if (leadId && withLead) query = query.eq("lead_id", leadId);
    if (before) query = query.lt("created_at", before);
    if (q) query = query.ilike("text", `%${q.replace(/[%_,()]/g, " ").slice(0, 80)}%`);
    return query;
  };
  let res = await run(`${EVENT_COLUMNS}, lead_id, changes`, true);
  if (res.error && missingCol(res.error)) {
    // Sin panel-v2.sql no hay forma de filtrar por pedido.
    if (leadId) return [];
    res = await run(EVENT_COLUMNS, false);
  }
  if (res.error) fail(res.error);
  const rows = (res.data as unknown as Omit<PanelEvent, "thumbs">[]).map((r) => ({
    ...r,
    lead_id: r.lead_id ?? null,
    changes: Array.isArray(r.changes) ? r.changes : [],
  }));
  const thumbPaths = (r: Omit<PanelEvent, "thumbs">) => r.paths.filter((p) => isImage(p)).slice(0, 4);
  const urls = await sign(rows.flatMap(thumbPaths));
  return rows.map((r) => ({
    ...r,
    thumbs: thumbPaths(r)
      .map((p) => urls.get(p))
      .filter((u): u is string => Boolean(u)),
  }));
}
