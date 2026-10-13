// Cifrado de la caja fuerte (Cuentas). AES-256-GCM con una llave que vive en Vercel
// (VAULT_KEY, 64 caracteres hexadecimales) y no en la base: una copia de la base sin esa
// llave no se puede leer. Cada dato lleva su propio IV al azar y queda atado a su fila
// (`aad`): no se puede copiar el texto cifrado de una cuenta a otra. Solo servidor.
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const KEY_HEX = /^[0-9a-f]{64}$/i;
const VERSION = "v1";

/** La llave, o null si falta o no tiene 64 caracteres hexadecimales. */
export function vaultKey(): Buffer | null {
  const k = process.env.VAULT_KEY?.trim();
  return k && KEY_HEX.test(k) ? Buffer.from(k, "hex") : null;
}

export const vaultReady = () => vaultKey() !== null;

/** Una llave nueva para cargar en Vercel: `openssl rand -hex 32` hace lo mismo. */
export const newVaultKey = () => randomBytes(32).toString("hex");

export function encrypt(
  plain: string,
  aad: string,
  key: Buffer | null = vaultKey(),
): string {
  if (!key) throw new Error("Falta VAULT_KEY en Vercel.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(aad));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [
    VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(".");
}

export function decrypt(
  payload: string,
  aad: string,
  key: Buffer | null = vaultKey(),
): string {
  if (!key) throw new Error("Falta VAULT_KEY en Vercel.");
  const [version, iv, tag, data] = payload.split(".");
  if (version !== VERSION || !iv || !tag || !data)
    throw new Error("Dato cifrado inválido.");
  try {
    const ivBuf = Buffer.from(iv, "base64url");
    const tagBuf = Buffer.from(tag, "base64url");
    // Largos fijos: un tag recortado o un IV raro no se aceptan.
    if (ivBuf.length !== 12 || tagBuf.length !== 16) throw new Error("formato");
    const decipher = createDecipheriv("aes-256-gcm", key, ivBuf, { authTagLength: 16 });
    decipher.setAAD(Buffer.from(aad));
    decipher.setAuthTag(tagBuf);
    return Buffer.concat([
      decipher.update(Buffer.from(data, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    // Llave equivocada o dato alterado: no se distingue, y no se filtra nada del error.
    throw new Error("No se pudo descifrar: ¿cambió la llave VAULT_KEY?");
  }
}
