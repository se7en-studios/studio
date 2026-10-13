// Segundo paso al entrar: códigos de 6 dígitos que cambian cada 30 segundos (RFC 6238),
// los mismos que genera Google Authenticator, Aegis, el gestor de contraseñas, etc.
// Puro y con node:crypto, sin dependencias. Solo servidor (y las pruebas).
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const STEP_SECONDS = 30;
export const DIGITS = 6;

/** Un secreto de 20 bytes (160 bits) escrito en base32: lo que se carga en la app. */
export const newTotpSecret = () => base32Encode(randomBytes(20));

/** El secreto bien formado: 32 letras A-Z y 2-7 (20 bytes). */
export const isTotpSecret = (text: string) => /^[A-Z2-7]{32}$/.test(text);

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** null si tiene letras que no son base32. Ignora espacios, guiones, mayúsculas y el relleno «=». */
export function base32Decode(text: string): Buffer | null {
  const clean = text.toUpperCase().replace(/[\s=-]/g, "");
  if (!clean) return null;
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return null;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** El código de 6 dígitos de un momento (`offset` = pasos de 30 s hacia atrás o adelante). */
export function totpAt(secret: string, timeMs: number, offset = 0): string {
  const key = base32Decode(secret);
  if (!key) throw new Error("Secreto inválido.");
  const counter = Math.floor(timeMs / 1000 / STEP_SECONDS) + offset;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", key).update(msg).digest();
  const at = mac[mac.length - 1] & 15;
  const bin =
    ((mac[at] & 127) << 24) |
    (mac[at + 1] << 16) |
    (mac[at + 2] << 8) |
    mac[at + 3];
  return String(bin % 10 ** DIGITS).padStart(DIGITS, "0");
}

/**
 * ¿Es el código de ahora? Acepta un paso para cada lado (30 s) por si el reloj del celular
 * está un poco corrido. Recorre todas las opciones y compara a tiempo constante.
 * ponytail: un código vale mientras dure su ventana; si hiciera falta que valga una sola vez,
 * hay que guardar el último paso usado.
 */
export function verifyTotp(
  secret: string,
  code: string,
  nowMs = Date.now(),
  window = 1,
): boolean {
  const given = code.replace(/\s/g, "");
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(given) || !base32Decode(secret))
    return false;
  let ok = false;
  for (let off = -window; off <= window; off++) {
    const expected = Buffer.from(totpAt(secret, nowMs, off));
    if (timingSafeEqual(expected, Buffer.from(given))) ok = true;
  }
  return ok;
}

/** El enlace otpauth:// que lee la app (por el QR o tocándolo en el celular). */
export function otpauthUri(
  account: string,
  secret: string,
  issuer = "Se7en Panel",
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}
