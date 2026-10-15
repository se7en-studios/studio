// Mensajes entre el equipo: tipos y canales. Puro y sin dependencias de
// servidor: lo usan las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";

export const MESSAGE_MAX = 4000;
/** Mensajes por tanda: los últimos al abrir y de a tantos con «cargar anteriores». */
export const PAGE = 200;
export const MAX_ATTACHMENTS = 10;

/** Archivo adjunto: va directo del navegador a Storage, como los de los proyectos. */
export type Attachment = {
  path: string;
  name: string;
  size: number;
  mime: string;
  /** URL firmada, la pone el servidor al leer. */
  url?: string | null;
};

/** 'general', 'p:<slug>' (un proyecto) o 'l:<uuid>' (un pedido). */
export type Channel = string;
export const GENERAL: Channel = "general";

export type Message = {
  id: string;
  created_at: string;
  edited_at: string | null;
  channel: Channel;
  author: LeadOwner;
  body: string;
  /** Desde daily-v1.sql; antes llegan vacíos. */
  attachments?: Attachment[];
};

/** Carpeta de Storage de los adjuntos de un canal. El «_» no puede ser slug de proyecto. */
export const attachmentPrefix = (c: Channel) => `_chat/${c.replace(":", "-")}/`;

/** Para buscar con ilike: los comodines del texto se buscan literales. */
export const likePattern = (q: string) =>
  `%${q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;

export const projectChannel = (slug: string): Channel => `p:${slug}`;
export const leadChannel = (id: string): Channel => `l:${id}`;

export function isChannel(c: string): boolean {
  return /^(general|p:[a-z0-9-]{1,64}|l:[0-9a-f-]{36})$/i.test(c);
}

export function parseChannel(
  c: Channel,
):
  | { kind: "general" }
  | { kind: "proyecto"; slug: string }
  | { kind: "pedido"; id: string } {
  if (c.startsWith("p:")) return { kind: "proyecto", slug: c.slice(2) };
  if (c.startsWith("l:")) return { kind: "pedido", id: c.slice(2) };
  return { kind: "general" };
}

/** Resumen de un canal para la lista de conversaciones. */
export type ChannelSummary = {
  channel: Channel;
  last: Message | null;
  unread: number;
};

/** Sólo adjuntos subidos a la carpeta de ese canal (los preparó el servidor). */
export function cleanAttachments(channel: Channel, list: unknown): Attachment[] {
  if (!Array.isArray(list)) return [];
  const prefix = attachmentPrefix(channel);
  return list
    .filter(
      (a): a is Attachment =>
        a && typeof a.path === "string" && a.path.startsWith(prefix) && !a.path.includes("..") && a.path.length <= 300,
    )
    .slice(0, MAX_ATTACHMENTS)
    .map((a) => ({
      path: a.path,
      name: String(a.name ?? "archivo").slice(0, 200),
      size: Math.max(0, Math.round(Number(a.size) || 0)),
      mime: String(a.mime ?? "").slice(0, 100),
    }));
}
