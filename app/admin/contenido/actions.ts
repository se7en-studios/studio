"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { setPostDone } from "@/lib/admin/content";
import { logEvent } from "@/lib/admin/panel";

const ID = /^[\w-]{1,80}$/;

/** Tilda o destilda un post como publicado. El registro va con after(). */
export async function markPublished(id: string, done: boolean): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!ID.test(id)) return { error: "Post inválido." };
  try {
    const post = await setPostDone(id, done ? me.who : null);
    if (!post) return { error: "Ese post no existe." };
    after(() =>
      logEvent({ actor: me.who, kind: "proyecto", text: `${done ? "publicó" : "desmarcó"} «${post.title}» en Instagram` }),
    );
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Algo falló. Probá de nuevo." };
  }
}
