// Envío de avisos con ntfy (https://ntfy.sh): gratis, sin cuentas. Los recibe la app
// de ntfy en el celular y, para las llamadas, el propio panel abierto en la computadora.
// El «tema» es el secreto: quien lo conoce puede leer los avisos, así que tiene que ser
// largo e imposible de adivinar. Se puede apuntar a un servidor propio con NTFY_SERVER.
// Solo servidor.
import { SITE } from "@/data/site";
import { OWNERS, type LeadOwner } from "./db";
import { newLeadNotice, type Notice } from "./digest";

const TIMEOUT_MS = 4000;

const sharedTopic = () => process.env.NTFY_TOPIC?.trim() || null;
const personalTopic = (to: LeadOwner) =>
  process.env[`NTFY_TOPIC_${to.toUpperCase()}`]?.trim() || null;
/** El tema de esa persona si lo tiene; si no, el compartido. */
const topic = (to?: LeadOwner) => (to && personalTopic(to)) || sharedTopic();
const server = () =>
  (process.env.NTFY_SERVER?.trim() || "https://ntfy.sh").replace(/\/+$/, "");

export const notificationsConfigured = () => sharedTopic() !== null;
/** El tema compartido, para mostrárselo a quien está dentro del panel y lo necesita para suscribirse. */
export const notificationTopic = sharedTopic;
/** El tema al que escucha esa persona (el suyo, o el compartido): el panel lo usa para recibir llamadas. */
export const listenTopic = (who: LeadOwner) => topic(who);
/** Si esa persona tiene su propio tema: la llamada le suena solo a ella. */
export const hasPersonalTopic = (to: LeadOwner) => personalTopic(to) !== null;
export const notificationServer = server;

export type NotifyResult = { ok: true } | { ok: false; error: string };

/** Manda un aviso. `to` elige el tema personal de esa persona, si lo tiene. */
export async function notify(
  notice: Notice,
  priority: 1 | 2 | 3 | 4 | 5 = 3,
  to?: LeadOwner,
): Promise<NotifyResult> {
  const t = topic(to);
  if (!t) return { ok: false, error: "Falta cargar NTFY_TOPIC en Vercel." };
  const token = process.env.NTFY_TOKEN?.trim();
  try {
    const res = await fetch(server(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        topic: t,
        title: notice.title,
        message: notice.message,
        click: notice.url ?? `${SITE.url}${notice.path}`,
        priority,
        tags: notice.tags,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return res.ok
      ? { ok: true }
      : { ok: false, error: `El servicio de avisos respondió ${res.status}.` };
  } catch (e) {
    console.error("[avisos]", e instanceof Error ? e.message : e);
    return {
      ok: false,
      error: "No se pudo conectar con el servicio de avisos.",
    };
  }
}

/** Aviso de pedido nuevo. Si no hay avisos configurados, no hace nada. */
export async function notifyNewLead(
  channel: string | null | undefined,
): Promise<void> {
  if (!notificationsConfigured()) return;
  const res = await notify(newLeadNotice(channel), 4);
  if (!res.ok) console.error("[avisos] pedido nuevo:", res.error);
}

const recent = new Map<string, number>();
const THROTTLE_MS = 60_000;

/**
 * Avisa al otro socio. Nunca rompe lo que se estaba haciendo: si falla, queda en el log.
 * Con `key`, no repite el mismo aviso dentro de un minuto (una charla seguida suena una vez).
 * ponytail: el freno vive en la memoria de cada instancia; alcanza para una charla seguida,
 * si hiciera falta algo exacto va en la base.
 */
export async function notifyPartner(
  from: LeadOwner,
  notice: Notice,
  opts: { key?: string; priority?: 1 | 2 | 3 | 4 | 5 } = {},
): Promise<void> {
  if (!notificationsConfigured()) return;
  const to = OWNERS.find((o) => o !== from);
  if (!to) return;
  if (opts.key) {
    const now = Date.now();
    if (now - (recent.get(opts.key) ?? 0) < THROTTLE_MS) return;
    recent.set(opts.key, now);
  }
  const res = await notify(notice, opts.priority ?? 3, to);
  if (!res.ok) console.error("[avisos]", res.error);
}
