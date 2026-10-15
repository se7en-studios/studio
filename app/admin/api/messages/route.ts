// Mensajes de una conversación. `after` trae sólo lo nuevo (polling), `before`
// la tanda anterior y `read=1` la marca como leída. Con `q` busca en el texto:
// en `channel` si viene, o en todas las conversaciones.
import type { NextRequest } from "next/server";
import { listMessages, markRead, searchMessages } from "@/lib/admin/messages";
import { isChannel, type Message } from "@/lib/admin/message-shared";
import { withSession } from "../guard";

const validDate = (v: string | null) => {
  if (v && Number.isNaN(Date.parse(v))) throw new Error("Fecha inválida.");
  return v ?? undefined;
};

export function GET(req: NextRequest) {
  return withSession<{ messages: Message[] }>(async (me) => {
    const p = req.nextUrl.searchParams;
    const channel = p.get("channel") ?? "";
    const q = (p.get("q") ?? "").trim().slice(0, 100);
    if (q) {
      if (q.length < 2) return { messages: [] };
      if (channel && !isChannel(channel)) throw new Error("Conversación inválida.");
      return { messages: await searchMessages(q, channel || undefined) };
    }
    if (!isChannel(channel)) throw new Error("Conversación inválida.");
    const after = validDate(p.get("after"));
    const before = validDate(p.get("before"));
    const [messages] = await Promise.all([
      listMessages(channel, { after, before }),
      p.get("read") === "1" ? markRead(me.who, channel) : null,
    ]);
    return { messages };
  });
}
