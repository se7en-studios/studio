// Mensajes entre el equipo: tipos y canales. Puro y sin dependencias de
// servidor: lo usan las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";

export const MESSAGE_MAX = 4000;

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
};

export const projectChannel = (slug: string): Channel => `p:${slug}`;
export const leadChannel = (id: string): Channel => `l:${id}`;

export function isChannel(c: string): boolean {
  return /^(general|p:[a-z0-9-]{1,64}|l:[0-9a-f-]{36})$/i.test(c);
}

export function parseChannel(c: Channel): { kind: "general" } | { kind: "proyecto"; slug: string } | { kind: "pedido"; id: string } {
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
