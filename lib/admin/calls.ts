// Llamadas entre Franco y Federico por Google Meet. Meet no se puede incrustar en el
// panel (Google lo bloquea), así que el panel abre la sala en otra pestaña y avisa al otro:
// su panel abierto en la computadora suena y muestra «Unirme», y al celular le llega el
// mismo aviso. Puro y sin dependencias de servidor, para probarlo.
import type { Notice } from "./digest";

/** Abre una sala nueva de Meet (hay que iniciar sesión con Google). */
export const MEET_NEW = "https://meet.google.com/new";

// Los mismos ids que OWNERS de db.ts: acá no se importa para no traer el servidor al navegador.
type Person = "franco" | "federico";
const PEOPLE: readonly Person[] = ["franco", "federico"];
const isPerson = (v: string): v is Person =>
  (PEOPLE as readonly string[]).includes(v);

const CODE = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;
const LOOKUP = /^\/lookup\/[A-Za-z0-9_-]{4,64}$/;

/**
 * El link de una sala de Meet, ya limpio, o null si no lo es. Solo se aceptan salas de
 * meet.google.com: el link viaja en un aviso a otra persona, así que no puede ser cualquier
 * dirección. Se descarta lo que sigue al código (por ejemplo `?authuser=0`, que dice con qué
 * cuenta de Google se entró).
 */
export function parseMeetLink(input: string | null | undefined): string | null {
  const text = (input ?? "").trim();
  if (!text || /\s/.test(text)) return null;
  const bare = text.toLowerCase();
  if (CODE.test(bare)) return `https://meet.google.com/${bare}`;
  let url: URL;
  try {
    url = new URL(text.includes("://") ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.hostname !== "meet.google.com") return null;
  const path = url.pathname.replace(/\/+$/, "");
  const code = path.slice(1).toLowerCase();
  if (CODE.test(code)) return `https://meet.google.com/${code}`;
  if (LOOKUP.test(path)) return `https://meet.google.com${path}`;
  return null;
}

/** El aviso de llamada: quién llama y a quién (en las etiquetas), y la sala para unirse. */
export function callNotice(
  from: { id: Person; name: string },
  to: Person,
  link: string,
): Notice {
  return {
    title: `${from.name} te está llamando`,
    message: "Tocá para unirte a la llamada de Google Meet.",
    path: "/admin/llamadas",
    url: link,
    tags: ["llamada", `de-${from.id}`, `para-${to}`],
  };
}

/** Pasada esta antigüedad, una llamada ya no suena: pudo quedar atrasada en la conexión. */
export const MAX_RING_AGE_S = 90;

export type Incoming = { from: Person; link: string };

/**
 * Lo que llega por la conexión del panel con ntfy (un mensaje en JSON). Devuelve la llamada
 * si es para `me`, reciente y con una sala de Meet válida; si no, null y no suena.
 */
export function incomingCall(
  raw: unknown,
  me: Person,
  nowS = Date.now() / 1000,
): Incoming | null {
  if (typeof raw !== "object" || raw === null) return null;
  const e = raw as {
    event?: unknown;
    tags?: unknown;
    click?: unknown;
    time?: unknown;
  };
  if (e.event !== "message" || !Array.isArray(e.tags)) return null;
  const tags = e.tags.filter((t): t is string => typeof t === "string");
  if (!tags.includes("llamada") || !tags.includes(`para-${me}`)) return null;
  const from = tags.find((t) => t.startsWith("de-"))?.slice(3) ?? "";
  if (!isPerson(from) || from === me) return null;
  const link = typeof e.click === "string" ? parseMeetLink(e.click) : null;
  if (!link) return null;
  if (typeof e.time === "number" && nowS - e.time > MAX_RING_AGE_S) return null;
  return { from, link };
}
