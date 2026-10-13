"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { callNotice, parseMeetLink } from "@/lib/admin/calls";
import { OWNERS, type LeadOwner } from "@/lib/admin/db";
import { notificationsConfigured, notify } from "@/lib/admin/notify";
import { logEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";

const isOwner = (v: string): v is LeadOwner =>
  (OWNERS as readonly string[]).includes(v);

/**
 * Avisa a `target` que lo están llamando a esa sala de Meet: le suena el panel abierto en la
 * computadora y le llega al celular. El link se valida acá: es lo que se manda a otra persona.
 */
export async function ringPerson(
  target: string,
  link: string,
): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  if (!isOwner(target) || target === me.who)
    return { error: "Esa persona no existe." };
  const name = PEOPLE[target].name;
  const room = parseMeetLink(link);
  if (!room)
    return {
      error:
        "Ese no parece un link de Google Meet. Tiene que verse como meet.google.com/abc-defg-hij.",
    };
  if (!notificationsConfigured())
    return {
      error: `Los avisos todavía no están activados: mandale el link a ${name} por WhatsApp.`,
    };

  const res = await notify(
    callNotice({ id: me.who, name: PEOPLE[me.who].name }, target, room),
    5,
    target,
  );
  if (!res.ok) return { error: res.error };
  after(() =>
    logEvent({
      actor: me.who,
      kind: "proyecto",
      text: `llamó a ${name} por Meet`,
    }),
  );
  return {};
}
