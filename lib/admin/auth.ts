// Sesión del panel /admin: una cookie httpOnly firmada con HMAC. La
// contraseña sale de ADMIN_PASSWORD (variable de entorno de Vercel): el repo
// es público, así que no puede vivir en el código.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

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

export async function startSession() {
  const key = secret();
  if (!key) return;
  const exp = String(Date.now() + TTL_MS);
  const store = await cookies();
  store.set(COOKIE, `${exp}.${sign(exp, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/admin",
    expires: new Date(Number(exp)),
  });
}

export async function endSession() {
  const store = await cookies();
  store.delete({ name: COOKIE, path: "/admin" });
}

export async function isAdmin(): Promise<boolean> {
  const key = secret();
  if (!key) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, mac] = raw.split(".");
  if (!exp || !mac || Number(exp) < Date.now()) return false;
  return safeEqual(mac, sign(exp, key));
}
