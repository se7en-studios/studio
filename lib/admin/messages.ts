// Mensajes entre el equipo (tablas panel_messages y panel_reads). Usa la
// service role key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { BUCKET, PanelNotReady, client, failV2, safeName, sign } from "./panel";
import {
  MESSAGE_MAX,
  PAGE,
  attachmentPrefix,
  likePattern,
  type Attachment,
  type Channel,
  type ChannelSummary,
  type Message,
} from "./message-shared";

const COLUMNS = "id, created_at, edited_at, channel, author, body";
/** Con adjuntos (daily-v1.sql). Sin la columna se lee como antes. */
const FULL = `${COLUMNS}, attachments`;
const missingCol = (e: { code?: string }) => e.code === "42703" || e.code === "PGRST204";

/** Prueba con adjuntos y, si la columna no está, sin ellos. */
async function read(build: (columns: string) => PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>) {
  let res = await build(FULL);
  if (res.error && missingCol(res.error)) res = await build(COLUMNS);
  if (res.error) failV2(res.error);
  return withUrls(res.data as Message[]);
}

/** Firma los adjuntos para poder abrirlos (una hora, como los archivos de proyectos). */
async function withUrls(ms: Message[]): Promise<Message[]> {
  const paths = ms.flatMap((m) => (m.attachments ?? []).map((a) => a.path));
  if (!paths.length) return ms;
  const urls = await sign(paths);
  return ms.map((m) =>
    m.attachments?.length ? { ...m, attachments: m.attachments.map((a) => ({ ...a, url: urls.get(a.path) ?? null })) } : m,
  );
}
/** Lo que se mira para contar no leídos y armar la lista de conversaciones. */
const WINDOW_DAYS = 120;

/**
 * Los últimos `limit` de un canal, del más viejo al más nuevo. Con `after`,
 * sólo los posteriores (polling); con `before`, la tanda anterior («cargar anteriores»).
 */
export async function listMessages(
  channel: Channel,
  { after, before, limit = PAGE }: { after?: string; before?: string; limit?: number } = {},
): Promise<Message[]> {
  const ms = await read((columns) => {
    let q = client().from("panel_messages").select(columns).eq("channel", channel).order("created_at", { ascending: false }).limit(limit);
    if (after) q = q.gt("created_at", after);
    if (before) q = q.lt("created_at", before);
    return q;
  });
  return ms.reverse();
}

/** Busca en el texto: en un canal o, sin canal, en todos. Los más nuevos primero. */
export async function searchMessages(text: string, channel?: Channel): Promise<Message[]> {
  return read((columns) => {
    let q = client().from("panel_messages").select(columns).ilike("body", likePattern(text)).order("created_at", { ascending: false }).limit(50);
    if (channel) q = q.eq("channel", channel);
    return q;
  });
}

/** URLs firmadas para subir adjuntos directo a Storage (igual que los archivos de proyectos). */
export async function attachmentTargets(channel: Channel, names: string[]) {
  const bucket = client().storage.from(BUCKET);
  const stamp = Date.now().toString(36);
  return Promise.all(
    names.map(async (name, i) => {
      const path = `${attachmentPrefix(channel)}${stamp}${i.toString(36)}-${safeName(name)}`;
      const { data, error } = await bucket.createSignedUploadUrl(path);
      if (error || !data) throw new Error(error?.message ?? "No se pudo preparar la subida");
      return { path, url: data.signedUrl };
    }),
  );
}

export async function insertMessage(channel: Channel, author: LeadOwner, body: string, attachments: Attachment[] = []): Promise<Message> {
  const clean = body.trim().slice(0, MESSAGE_MAX);
  if (!clean && !attachments.length) throw new Error("El mensaje está vacío.");
  const row: Record<string, unknown> = { channel, author, body: clean };
  if (attachments.length) row.attachments = attachments;
  const { data, error } = await client().from("panel_messages").insert(row).select(attachments.length ? FULL : COLUMNS).single();
  if (error) {
    if (attachments.length && (missingCol(error) || error.code === "23514"))
      throw new PanelNotReady("Para mandar adjuntos falta correr supabase/daily-v1.sql en Supabase.");
    failV2(error);
  }
  return (await withUrls([data as unknown as Message]))[0];
}

/** Sólo quien lo escribió puede editarlo o borrarlo. */
export async function editMessage(id: string, author: LeadOwner, body: string): Promise<Message> {
  const clean = body.trim().slice(0, MESSAGE_MAX);
  if (!clean) throw new Error("El mensaje está vacío.");
  const { data, error } = await client()
    .from("panel_messages")
    .update({ body: clean, edited_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author", author)
    .select(COLUMNS)
    .maybeSingle();
  if (error) failV2(error);
  if (!data) throw new Error("Sólo se pueden editar los mensajes propios.");
  return data as Message;
}

export async function removeMessage(id: string, author: LeadOwner): Promise<Message> {
  const c = client();
  const del = (columns: string) => c.from("panel_messages").delete().eq("id", id).eq("author", author).select(columns).maybeSingle();
  let res = await del(FULL);
  if (res.error && missingCol(res.error)) res = await del(COLUMNS);
  if (res.error) failV2(res.error);
  const msg = res.data as unknown as Message | null;
  if (!msg) throw new Error("Sólo se pueden borrar los mensajes propios.");
  // Los adjuntos se van con el mensaje; si Storage falla quedan huérfanos, no se rompe nada.
  const paths = (msg.attachments ?? []).map((a) => a.path);
  if (paths.length) {
    const gone = await c.storage.from(BUCKET).remove(paths);
    if (gone.error) console.error("[mensajes] borrar adjuntos:", gone.error.message);
  }
  return msg;
}

export async function markRead(who: LeadOwner, channel: Channel) {
  const { error } = await client()
    .from("panel_reads")
    .upsert({ who, channel, last_read_at: new Date().toISOString() });
  if (error) failV2(error);
}

/**
 * Todas las conversaciones con su último mensaje y cuántos no leyó `who`,
 * la más reciente primero. Para dos personas alcanza con traer la ventana
 * reciente y contar en memoria.
 */
export async function channelSummaries(who: LeadOwner): Promise<ChannelSummary[]> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const c = client();
  const [msgs, reads] = await Promise.all([
    c.from("panel_messages").select(COLUMNS).gte("created_at", since).order("created_at", { ascending: false }).limit(3000),
    c.from("panel_reads").select("channel, last_read_at").eq("who", who),
  ]);
  if (msgs.error) failV2(msgs.error);
  if (reads.error) failV2(reads.error);
  const read = new Map((reads.data as { channel: string; last_read_at: string }[]).map((r) => [r.channel, r.last_read_at]));
  const by = new Map<Channel, ChannelSummary>();
  for (const m of msgs.data as Message[]) {
    const s = by.get(m.channel) ?? { channel: m.channel, last: m, unread: 0 };
    const seen = read.get(m.channel);
    if (m.author !== who && (!seen || m.created_at > seen)) s.unread++;
    by.set(m.channel, s);
  }
  return [...by.values()];
}

/**
 * Total de no leídos (para el contador de la barra lateral, que se consulta
 * cada 30 s): sólo trae canal y fecha de los mensajes del otro.
 */
export async function unreadTotal(who: LeadOwner): Promise<number> {
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
  const c = client();
  const [msgs, reads] = await Promise.all([
    c.from("panel_messages").select("channel, created_at").neq("author", who).gte("created_at", since).limit(2000),
    c.from("panel_reads").select("channel, last_read_at").eq("who", who),
  ]);
  if (msgs.error) failV2(msgs.error);
  if (reads.error) failV2(reads.error);
  const read = new Map((reads.data as { channel: string; last_read_at: string }[]).map((r) => [r.channel, r.last_read_at]));
  return (msgs.data as { channel: string; created_at: string }[]).filter((m) => {
    const seen = read.get(m.channel);
    return !seen || m.created_at > seen;
  }).length;
}
