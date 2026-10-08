// Proyectos, archivos y feed de cambios del panel. Igual que db.ts usa la
// service role key: NUNCA importar este archivo desde un componente de cliente
// (los tipos sí, con `import type`).
import { projects as cases } from "@/data/projects";
import { db, type LeadOwner } from "./db";

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

export type EventKind = "archivos" | "proyecto" | "pedido";

export type PanelEvent = {
  id: string;
  created_at: string;
  actor: LeadOwner | null;
  kind: EventKind;
  text: string;
  project_slug: string | null;
  paths: string[];
  thumbs: string[];
};

/** Falta la base o faltan las tablas: la página muestra cómo activarlo en vez de romperse. */
export class PanelNotReady extends Error {}

function client() {
  const c = db();
  if (!c) throw new PanelNotReady("Falta conectar la base de datos.");
  return c;
}

function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Faltan las tablas del panel en Supabase.");
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

type ProjectRow = { slug: string; created_at: string; name: string; category: string; url: string; accent: string };

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

/** Nunca rompe la acción que lo llama: si el feed falla, se pierde la línea y nada más. */
export async function logEvent(e: {
  actor: LeadOwner;
  kind: EventKind;
  text: string;
  project_slug?: string | null;
  paths?: string[];
}) {
  const c = db();
  if (!c) return;
  const { error } = await c.from("panel_events").insert({ ...e, paths: e.paths ?? [] });
  if (error) console.error("[panel] feed:", error.message);
}

export async function listEvents({ limit = 50, kind }: { limit?: number; kind?: EventKind } = {}): Promise<PanelEvent[]> {
  let q = client()
    .from("panel_events")
    .select("id, created_at, actor, kind, text, project_slug, paths")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (kind) q = q.eq("kind", kind);
  const { data, error } = await q;
  if (error) fail(error);
  const rows = data as Omit<PanelEvent, "thumbs">[];
  const thumbPaths = (r: Omit<PanelEvent, "thumbs">) => r.paths.filter((p) => isImage(p)).slice(0, 4);
  const urls = await sign(rows.flatMap(thumbPaths));
  return rows.map((r) => ({
    ...r,
    thumbs: thumbPaths(r)
      .map((p) => urls.get(p))
      .filter((u): u is string => Boolean(u)),
  }));
}
