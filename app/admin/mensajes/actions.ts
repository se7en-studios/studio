"use server";

// Mandar, editar y borrar mensajes. Leerlos (y el polling) va por
// app/admin/api/messages: las acciones se despachan de a una y un polling por
// acá trabaría todo lo demás que se toca en el panel.
import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { messageNotice } from "@/lib/admin/digest";
import { notifyPartner } from "@/lib/admin/notify";
import { PEOPLE } from "@/lib/admin/people";
import { editMessage, insertMessage, markRead, removeMessage } from "@/lib/admin/messages";
import { isChannel, parseChannel, type Message } from "@/lib/admin/message-shared";

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const UUID = /^[0-9a-f-]{36}$/i;

export async function sendMessage(channel: string, body: string): Promise<Message> {
  const me = await guard();
  if (!isChannel(channel)) throw new Error("Conversación inválida.");
  const msg = await insertMessage(channel, me.who, body);
  // Lo propio cuenta como leído.
  await markRead(me.who, channel).catch(() => {});
  const { kind } = parseChannel(channel);
  const path = kind === "general" ? "/admin/mensajes" : `/admin/mensajes?c=${encodeURIComponent(channel)}`;
  after(() => notifyPartner(me.who, messageNotice(PEOPLE[me.who].name, kind, path), { key: `msg:${me.who}:${channel}` }));
  return msg;
}

export async function updateMessage(id: string, body: string): Promise<Message> {
  const me = await guard();
  if (!UUID.test(id)) throw new Error("Mensaje inválido.");
  return editMessage(id, me.who, body);
}

export async function deleteMessage(id: string): Promise<void> {
  const me = await guard();
  if (!UUID.test(id)) throw new Error("Mensaje inválido.");
  await removeMessage(id, me.who);
}
