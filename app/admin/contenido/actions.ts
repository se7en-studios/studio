"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { dateLabel } from "@/lib/admin/changes";
import { insertPost, setPostDone, updatePost } from "@/lib/admin/content";
import { cleanPost, type ContentPost, type PostInput } from "@/lib/admin/content-shared";
import { logEvent } from "@/lib/admin/panel";

const ID = /^[\w-]{1,80}$/;
const message = (e: unknown) => (e instanceof Error ? e.message : "Algo falló. Probá de nuevo.");

/** Tilda o destilda un post como publicado. El registro va con after(). */
export async function markPublished(id: string, done: boolean): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!ID.test(id)) return { error: "Post inválido." };
  try {
    const post = await setPostDone(id, done ? me.who : null);
    if (!post) return { error: "Ese post no existe." };
    after(() =>
      logEvent({ actor: me.who, kind: "contenido", text: `${done ? "publicó" : "desmarcó"} «${post.title}» en Instagram` }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** Crea un post (sin `id`) o lo edita; cambiar la fecha lo reprograma. */
export async function savePost(id: string | null, input: PostInput): Promise<{ post?: ContentPost; error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (id !== null && !ID.test(id)) return { error: "Post inválido." };
  try {
    const clean = cleanPost(input);
    if (id === null) {
      const post = await insertPost(clean);
      after(() => logEvent({ actor: me.who, kind: "contenido", text: `agendó «${post.title}» para el ${dateLabel(post.post_date)}` }));
      return { post };
    }
    const res = await updatePost(id, clean);
    if (!res) return { error: "Ese post no existe." };
    const moved = res.before.post_date !== res.after.post_date;
    after(() =>
      logEvent({
        actor: me.who,
        kind: "contenido",
        text: moved
          ? `reprogramó «${res.after.title}» del ${dateLabel(res.before.post_date)} al ${dateLabel(res.after.post_date)}`
          : `editó «${res.after.title}»`,
      }),
    );
    // Los archivos no cambian: el cliente conserva las URLs firmadas que ya tiene.
    return { post: { ...res.after, files: [] } };
  } catch (e) {
    return { error: message(e) };
  }
}
