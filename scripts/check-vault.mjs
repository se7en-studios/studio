// Verifica la caja fuerte (Cuentas): node scripts/check-vault.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

// Importa el .ts directo (Node 22+); el hook deja resolver imports sin extensión.
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) {
        try { return await next(s, c); }
        catch (e) { if (s.startsWith(".")) return next(s + ".ts", c); throw e; }
      }`,
    ),
);

const crypto = await import("../lib/admin/vault-crypto.ts");
const shared = await import("../lib/admin/vault-shared.ts");

// --- Cifrado ---------------------------------------------------------------------
const key = Buffer.alloc(32, 7);
const aad = "11111111-1111-1111-1111-111111111111:secret";
const clave = "Pa$$w0rd con ñ y emojis 🔐";

const sealed = crypto.encrypt(clave, aad, key);
assert.match(sealed, /^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
assert.ok(!sealed.includes("Pa$$w0rd"), "el texto cifrado no puede contener la clave");
assert.equal(crypto.decrypt(sealed, aad, key), clave);
// Cada cifrado lleva su IV: la misma clave nunca da el mismo texto.
assert.notEqual(crypto.encrypt(clave, aad, key), sealed);

// Atado a su fila y a su campo: no sirve copiado a otra cuenta ni a las notas.
assert.throws(() => crypto.decrypt(sealed, "22222222-2222-2222-2222-222222222222:secret", key), /No se pudo descifrar/);
assert.throws(() => crypto.decrypt(sealed, aad.replace("secret", "notes"), key), /No se pudo descifrar/);
// Otra llave, o un dato alterado, no abren nada.
assert.throws(() => crypto.decrypt(sealed, aad, Buffer.alloc(32, 8)), /No se pudo descifrar/);
const [v, iv, tag, data] = sealed.split(".");
// Se invierte un bit del primer byte: siempre cambia el dato (cambiar una letra del
// base64 a veces no, si cae en los bits de relleno o ya era esa letra).
const flipByte = (b64) => {
  const buf = Buffer.from(b64, "base64url");
  buf[0] ^= 1;
  return buf.toString("base64url");
};
const flipped = flipByte(data);
assert.throws(() => crypto.decrypt([v, iv, tag, flipped].join("."), aad, key));
assert.throws(() => crypto.decrypt("basura", aad, key), /inválido/);
// Un tag recortado o un IV de otro largo no se aceptan (GCM sin largo fijo permitiría tags cortos).
const shortTag = Buffer.from(tag, "base64url").subarray(0, 4).toString("base64url");
assert.throws(() => crypto.decrypt([v, iv, shortTag, data].join("."), aad, key), /No se pudo descifrar/);
assert.throws(() => crypto.decrypt([v, Buffer.alloc(16).toString("base64url"), tag, data].join("."), aad, key), /No se pudo descifrar/);
// Sin llave no se cifra ni se descifra (y no se cae en una llave vacía).
assert.throws(() => crypto.encrypt("x", aad, null), /VAULT_KEY/);
assert.throws(() => crypto.decrypt(sealed, aad, null), /VAULT_KEY/);

// La llave de Vercel: 64 caracteres hexadecimales.
const prev = process.env.VAULT_KEY;
process.env.VAULT_KEY = "no-es-una-llave";
assert.equal(crypto.vaultReady(), false);
process.env.VAULT_KEY = crypto.newVaultKey();
assert.equal(crypto.vaultReady(), true);
assert.equal(crypto.decrypt(crypto.encrypt("hola", "a:b"), "a:b"), "hola");
if (prev === undefined) delete process.env.VAULT_KEY;
else process.env.VAULT_KEY = prev;

// --- Validación ------------------------------------------------------------------
const base = { service: "Vercel", label: "", url: "", username: "", twofa: "app", owner: "ambos", secret: "x" };
assert.equal(shared.cleanAccount({ ...base, service: "  " }, { creating: true }).ok, false);
assert.equal(shared.cleanAccount({ ...base, secret: "" }, { creating: true }).ok, false); // al crear, la clave es obligatoria
assert.equal(shared.cleanAccount({ ...base, secret: "" }, { creating: false }).ok, true); // al editar, vacía = no cambiar
assert.equal(shared.cleanAccount({ ...base, secret: "" }, { creating: false }).value.secret, null);
// Solo https: nada de http, javascript: ni otros esquemas.
for (const bad of ["http://vercel.com", "javascript:alert(1)", "https://", "vercel.com"])
  assert.equal(shared.cleanAccount({ ...base, url: bad }, { creating: true }).ok, false, bad);
assert.equal(shared.cleanAccount({ ...base, url: "https://vercel.com/login" }, { creating: true }).value.url, "https://vercel.com/login");
// El truco del usuario embebido (https://google.com@otro.com lleva a otro.com), mayúsculas y hosts sin punto.
for (const bad of ["https://accounts.google.com@evil.com", "https://user:pass@vercel.com", "https://localhost", "HTTP://vercel.com"])
  assert.equal(shared.cleanAccount({ ...base, url: bad }, { creating: true }).ok, false, bad);
assert.equal(shared.cleanAccount({ ...base, url: "HTTPS://Vercel.com/login" }, { creating: true }).value.url, "https://vercel.com/login");
// Valores raros caen en los de siempre.
const odd = shared.cleanAccount({ ...base, twofa: "otro", owner: "nadie" }, { creating: true }).value;
assert.deepEqual([odd.twofa, odd.owner], ["app", "ambos"]);
assert.equal(shared.cleanAccount({ ...base, secret: "x".repeat(shared.MAX_SECRET + 1) }, { creating: true }).ok, false);

// --- Rotación y 2FA ------------------------------------------------------------------
assert.equal(shared.daysSince("2026-04-16", "2026-10-13"), 180);
assert.equal(shared.isStale({ rotated_on: "2026-04-16" }, "2026-10-13"), false); // justo 180 días
assert.equal(shared.isStale({ rotated_on: "2026-04-15" }, "2026-10-13"), true);
assert.equal(shared.weak2fa({ twofa: "sms" }), true);
assert.equal(shared.weak2fa({ twofa: "ninguno" }), true);
assert.equal(shared.weak2fa({ twofa: "llave" }), false);
assert.equal(shared.ageLabel(0), "hoy");
assert.equal(shared.ageLabel(1), "hace 1 día");
assert.equal(shared.ageLabel(45), "hace 1 mes");
assert.equal(shared.ageLabel(400), "hace 1 año");

// Copia de seguridad cifrada con una frase: vuelve igual, y con otra frase no se abre.
const bk = await import("../lib/admin/backup-shared.ts");
const json = JSON.stringify({ app: "se7en-panel", tables: { leads: { rows: [{ id: "1", name: "Ana ñandú" }] } } });
const box = bk.encryptBackup(json, "una frase bastante larga", "2026-10-14T00:00:00Z");
assert.ok(bk.isEncryptedBackup(box));
assert.ok(!box.data.includes("Ana"));
assert.equal(bk.decryptBackup(box, "una frase bastante larga"), json);
assert.throws(() => bk.decryptBackup(box, "otra frase bastante larga"), /No se pudo descifrar/);
assert.throws(() => bk.decryptBackup({ ...box, data: box.data.split(".").map((p, i) => (i === 3 ? flipByte(p) : p)).join(".") }, "una frase bastante larga"), /No se pudo descifrar/);
assert.throws(() => bk.encryptBackup(json, "corta", "x"), /12 caracteres/);
assert.throws(() => bk.decryptBackup({ ...box, kdf: { ...box.kdf, N: 1 << 24 } }, "x"), /inválido/);

console.log("vault OK");
