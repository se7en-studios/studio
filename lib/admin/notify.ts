// Envío de avisos al celular con ntfy (https://ntfy.sh): gratis, sin cuentas, y la
// app de ntfy recibe la notificación. El «tema» es el secreto: quien lo conoce puede
// leer los avisos, así que tiene que ser largo e imposible de adivinar. Se puede
// apuntar a un servidor propio con NTFY_SERVER. Solo servidor.
import { SITE } from "@/data/site";
import { newLeadNotice, type Notice } from "./digest";

const TIMEOUT_MS = 4000;

const topic = () => process.env.NTFY_TOPIC?.trim() || null;
const server = () =>
  (process.env.NTFY_SERVER?.trim() || "https://ntfy.sh").replace(/\/+$/, "");

export const notificationsConfigured = () => topic() !== null;
/** El tema, para mostrárselo a quien está dentro del panel y lo necesita para suscribirse. */
export const notificationTopic = topic;
export const notificationServer = server;

export type NotifyResult = { ok: true } | { ok: false; error: string };

export async function notify(
  notice: Notice,
  priority: 1 | 2 | 3 | 4 | 5 = 3,
): Promise<NotifyResult> {
  const t = topic();
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
        click: `${SITE.url}${notice.path}`,
        priority,
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
