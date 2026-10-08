// Mensajes de una conversación. `after` trae sólo lo nuevo (polling) y
// `read=1` la marca como leída.
import type { NextRequest } from "next/server";
import { listMessages, markRead } from "@/lib/admin/messages";
import { isChannel, type Message } from "@/lib/admin/message-shared";
import { withSession } from "../guard";

export function GET(req: NextRequest) {
  return withSession<{ messages: Message[] }>(async (me) => {
    const p = req.nextUrl.searchParams;
    const channel = p.get("channel") ?? "";
    if (!isChannel(channel)) throw new Error("Conversación inválida.");
    const after = p.get("after") ?? undefined;
    if (after && Number.isNaN(Date.parse(after))) throw new Error("Fecha inválida.");
    const [messages] = await Promise.all([
      listMessages(channel, { after }),
      p.get("read") === "1" ? markRead(me.who, channel) : null,
    ]);
    return { messages };
  });
}
