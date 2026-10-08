// Sesión del panel /admin: una cookie httpOnly firmada con HMAC. La
// contraseña sale de ADMIN_PASSWORD (variable de entorno de Vercel): el repo
// es público, así que no puede vivir en el código.
// La contraseña es compartida; quién entró (Franco o Federico) viaja firmado
// en la misma cookie para que el feed de cambios sepa quién hizo qué.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { OWNERS, type LeadOwner } from "./db";

export type Session = { who: LeadOwner };

const COOKIE = "se7en_admin";
const TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 días
const MIN_SECRET = 32;
let warned = false;

function password(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

function secret(): string | null {
  const p = password();
  if (!p) return null;
  const s = process.env.ADMIN_SESSION_SECRET;
  // Sin ADMIN_SESSION_SECRET se deriva de la contraseña: anda, pero la firma
  // depende de un secreto más débil. No se corta el acceso para no dejar
  // afuera al equipo; en producción se avisa en el log.
  if (process.env.NODE_ENV === "production" && !warned && (!s || s.length < MIN_SECRET)) {
    warned = true;
    console.warn(
      `[admin] ADMIN_SESSION_SECRET falta o tiene menos de ${MIN_SECRET} caracteres. ` +
        "Generar uno con `openssl rand -hex 32` y cargarlo en Vercel."
    );
  }
  if (s) return s;
  return `se7en-admin:${p}`;
}

function sign(value: string, key: string) {
  return createHmac("sha256", key).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function adminConfigured() {
  return Boolean(password());
}

export function checkPassword(input: string) {
  const p = password();
  return Boolean(p) && safeEqual(input, p as string);
}

export async function startSession(who: LeadOwner) {
  const key = secret();
  if (!key) return;
  const exp = Date.now() + TTL_MS;
  const value = `${exp}.${who}`;
  const store = await cookies();
  store.set(COOKIE, `${value}.${sign(value, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: new Date(exp),
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete({ name: COOKIE, path: "/admin" });
}

/** null si no hay sesión válida. Las cookies viejas (sin quién) no valen: hay que volver a entrar. */
export async function getSession(): Promise<Session | null> {
  const key = secret();
  if (!key) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [exp, who, mac] = raw.split(".");
  if (!exp || !who || !mac || Number(exp) < Date.now()) return null;
  if (!safeEqual(mac, sign(`${exp}.${who}`, key))) return null;
  if (!(OWNERS as readonly string[]).includes(who)) return null;
  return { who: who as LeadOwner };
}

/**
 * Para las páginas del panel: siempre por pedido (la sesión y los datos no
 * pueden quedar congelados en el build) y con el chequeo de sesión en cada
 * página, no en el layout, que no se vuelve a renderizar al navegar.
 */
export async function panelSession(): Promise<Session | null> {
  await connection();
  return getSession();
}
