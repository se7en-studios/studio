// Mensajes entre el equipo (tablas panel_messages y panel_reads). Usa la
// service role key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { client, failV2 } from "./panel";
import { MESSAGE_MAX, type Channel, type ChannelSummary, type Message } from "./message-shared";

const COLUMNS = "id, created_at, edited_at, channel, author, body";
/** Lo que se mira para contar no leídos y armar la lista de conversaciones. */
const WINDOW_DAYS = 120;

/** Los últimos `limit` de un canal, del más viejo al más nuevo. Con `after`, sólo los posteriores. */
export async function listMessages(channel: Channel, { after, limit = 200 }: { after?: string; limit?: number } = {}): Promise<Message[]> {
  let q = client().from("panel_messages").select(COLUMNS).eq("channel", channel).order("created_at", { ascending: false }).limit(limit);
  if (after) q = q.gt("created_at", after);
  const { data, error } = await q;
  if (error) failV2(error);
  return (data as Message[]).reverse();
}

export async function insertMessage(channel: Channel, author: LeadOwner, body: string): Promise<Message> {
  const clean = body.trim().slice(0, MESSAGE_MAX);
  if (!clean) throw new Error("El mensaje está vacío.");
  const { data, error } = await client().from("panel_messages").insert({ channel, author, body: clean }).select(COLUMNS).single();
  if (error) failV2(error);
  return data as Message;
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
  const { data, error } = await client().from("panel_messages").delete().eq("id", id).eq("author", author).select(COLUMNS).maybeSingle();
  if (error) failV2(error);
  if (!data) throw new Error("Sólo se pueden borrar los mensajes propios.");
  return data as Message;
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
