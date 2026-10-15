// Copia de seguridad: qué tablas lleva y cómo se cifra con una frase. Puro (sólo
// node:crypto y node:zlib): lo usan el servidor y scripts/restore-backup.mjs.
//
// Cifrado con una frase. El JSON se comprime (gzip) y se cifra
// con AES-256-GCM (el mismo de la caja fuerte, vault-crypto.ts) con una llave que
// sale de la frase con scrypt: sin la frase no se puede leer, aunque el archivo
// quede en un lugar público (por ejemplo, un artefacto de GitHub Actions).
import { randomBytes, scryptSync } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { decrypt, encrypt } from "./vault-crypto";

/** Las tablas del panel y de los pedidos, padres antes que hijos (así se restauran). */
export const BACKUP_TABLES = [
  "leads",
  "panel_lead_activity",
  "panel_projects",
  "panel_project_state",
  "panel_files",
  "panel_payments",
  "panel_finance",
  "panel_tools",
  "panel_tasks",
  "panel_messages",
  "panel_reads",
  "panel_events",
  "content_posts",
  "panel_vault",
] as const;

export const ENCRYPTED_FORMAT = "se7en-respaldo-cifrado";
// 20+: la copia mensual queda como artefacto de Actions de un repo público y se
// puede intentar adivinar la frase sin conexión. Mejor 5 o 6 palabras al azar.
export const MIN_PASSPHRASE = 20;
// scrypt con N = 2^15: unos 100 ms por intento, caro para probar frases a ciegas.
const KDF = { N: 32_768, r: 8, p: 1 };
const AAD = ENCRYPTED_FORMAT;

export type EncryptedBackup = {
  format: typeof ENCRYPTED_FORMAT;
  v: 1;
  exported_at: string;
  kdf: { name: "scrypt"; N: number; r: number; p: number; salt: string };
  data: string;
};

const keyFrom = (passphrase: string, salt: Buffer, k = KDF) =>
  scryptSync(passphrase.normalize("NFC"), salt, 32, {
    ...k,
    maxmem: 256 * k.N * k.r,
  });

export function encryptBackup(
  json: string,
  passphrase: string,
  exportedAt: string,
): EncryptedBackup {
  if (passphrase.length < MIN_PASSPHRASE)
    throw new Error(
      `La frase tiene que tener ${MIN_PASSPHRASE} caracteres o más.`,
    );
  const salt = randomBytes(16);
  const packed = gzipSync(Buffer.from(json, "utf8")).toString("base64");
  return {
    format: ENCRYPTED_FORMAT,
    v: 1,
    exported_at: exportedAt,
    kdf: { name: "scrypt", ...KDF, salt: salt.toString("base64url") },
    data: encrypt(packed, AAD, keyFrom(passphrase, salt)),
  };
}

export const isEncryptedBackup = (x: unknown): x is EncryptedBackup =>
  typeof x === "object" &&
  x !== null &&
  (x as { format?: unknown }).format === ENCRYPTED_FORMAT;

/** El JSON original. Frase equivocada o archivo alterado: error, sin distinguir cuál. */
export function decryptBackup(
  file: EncryptedBackup,
  passphrase: string,
): string {
  const { kdf } = file;
  if (file.v !== 1 || kdf?.name !== "scrypt" || !kdf.salt)
    throw new Error("Archivo cifrado inválido.");
  // Límites para que un archivo manipulado no cuelgue la máquina con un scrypt gigante.
  if (kdf.N > 1 << 20 || kdf.r > 16 || kdf.p > 4)
    throw new Error("Archivo cifrado inválido.");
  let packed: string;
  try {
    packed = decrypt(
      file.data,
      AAD,
      keyFrom(passphrase, Buffer.from(kdf.salt, "base64url"), kdf),
    );
  } catch {
    throw new Error(
      "No se pudo descifrar: la frase no es esa o el archivo está dañado.",
    );
  }
  return gunzipSync(Buffer.from(packed, "base64")).toString("utf8");
}
