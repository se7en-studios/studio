// Tokens y sesión del portal del cliente. Funciones puras (la clave entra por
// parámetro) para poder probarlas en scripts/check-portal.mjs. Sólo servidor:
// usa node:crypto.
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/** 32 bytes al azar = 256 bits, en base64url (43 caracteres). */
export const newToken = () => randomBytes(32).toString("base64url");
export const isTokenShape = (t: string) => /^[A-Za-z0-9_-]{43}$/.test(t);
/** Lo único que se guarda: el sha256 en hex. Se busca por hash, no se compara el token. */
export const hashToken = (t: string) =>
  createHash("sha256").update(t).digest("hex");

const sign = (value: string, key: string) =>
  createHmac("sha256", key).update(value).digest("base64url");

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PortalCookie = {
  exp: number;
  linkId: string;
  clientId: string;
  mac: string;
};

/** «exp.linkId.clientId.firma». La firma usa una subllave propia del portal. */
export function sessionValue(
  linkId: string,
  clientId: string,
  exp: number,
  key: string,
): string {
  const value = `${exp}.${linkId}.${clientId}`;
  return `${value}.${sign(`portal:${value}`, key)}`;
}

/** La cookie si la firma es buena y no venció; null si no. Falta ver en la base que el link siga vivo. */
export function parseSession(
  raw: string | undefined,
  key: string,
  now = Date.now(),
): PortalCookie | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [expRaw, linkId, clientId, mac] = parts;
  const exp = Number(expRaw);
  if (
    !Number.isSafeInteger(exp) ||
    exp < now ||
    !UUID.test(linkId) ||
    !UUID.test(clientId)
  )
    return null;
  if (!safeEqual(mac, sign(`portal:${expRaw}.${linkId}.${clientId}`, key)))
    return null;
  return { exp, linkId, clientId, mac };
}

/** Token anti-CSRF de las acciones del portal: atado a la cookie, no se puede armar sin la clave. */
export const csrfToken = (s: Pick<PortalCookie, "mac">, key: string) =>
  sign(`csrf:${s.mac}`, key);
export const checkCsrf = (
  s: Pick<PortalCookie, "mac">,
  key: string,
  token: unknown,
) => typeof token === "string" && safeEqual(token, csrfToken(s, key));

/** Horas que dura la sesión (PORTAL_SESSION_HOURS, de 1 a 168; 12 si no está o no sirve). */
export function sessionHours(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 168 ? n : 12;
}

/**
 * La clave de firma: PORTAL_SESSION_SECRET o, si no está, una subllave de
 * ADMIN_SESSION_SECRET. Las dos tienen que tener 32 caracteres o más; si no hay
 * ninguna, el portal queda apagado (falla cerrado).
 */
export function portalKey(env: Record<string, string | undefined>): string | null {
  const own = env.PORTAL_SESSION_SECRET?.trim();
  if (own && own.length >= 32) return own;
  const admin = env.ADMIN_SESSION_SECRET?.trim();
  if (admin && admin.length >= 32) return `${admin}:portal`;
  return null;
}
