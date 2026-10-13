// Panel de contenido de Instagram (tabla content_posts). Igual que panel.ts usa
// la service role key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { PanelNotReady, client, sign } from "./panel";
import type { ContentFile, ContentPost } from "./content-shared";

const COLUMNS = "id, post_date, kind, title, pinned, steps, tips, caption, files, done_at, done_by";

type StoredFile = { path: string; name: string; size: number; mime: string };
type Row = Omit<ContentPost, "files"> & { files: StoredFile[] };

function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Falta correr supabase/content.sql en Supabase.");
  }
  throw new Error(e.message);
}

/** Todos los posts por fecha, con una URL firmada por archivo. */
export async function listPosts(): Promise<ContentPost[]> {
  const { data, error } = await client().from("content_posts").select(COLUMNS).order("post_date").order("id");
  if (error) fail(error);
  const rows = data as Row[];
  const urls = await sign(rows.flatMap((r) => r.files.map((f) => f.path)));
  return rows.map((r) => ({
    ...r,
    files: r.files.map<ContentFile>((f) => ({ name: f.name, size: f.size, mime: f.mime, url: urls.get(f.path) ?? null })),
  }));
}

/** Marca o desmarca un post como publicado. Devuelve null si el id no existe. */
export async function setPostDone(id: string, by: LeadOwner | null): Promise<{ title: string } | null> {
  const { data, error } = await client()
    .from("content_posts")
    .update({ done_at: by ? new Date().toISOString() : null, done_by: by })
    .eq("id", id)
    .select("title")
    .maybeSingle();
  if (error) fail(error);
  return data as { title: string } | null;
}

export type DuePost = Pick<ContentPost, "id" | "post_date" | "kind" | "title">;

/** Posts de hoy o atrasados que todavía no se publicaron, el más viejo primero. */
export async function listDue(today: string): Promise<DuePost[]> {
  const { data, error } = await client()
    .from("content_posts")
    .select("id, post_date, kind, title")
    .is("done_at", null)
    .lte("post_date", today)
    .order("post_date")
    .order("id");
  if (error) fail(error);
  return data as DuePost[];
}

export type CalendarPost = Pick<ContentPost, "id" | "post_date" | "kind" | "title" | "pinned" | "done_at">;

/** Todos los posts sin archivos ni captions, para el calendario. */
export async function listPostsLite(): Promise<CalendarPost[]> {
  const { data, error } = await client()
    .from("content_posts")
    .select("id, post_date, kind, title, pinned, done_at")
    .order("post_date")
    .order("id");
  if (error) fail(error);
  return data as CalendarPost[];
}
