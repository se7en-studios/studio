// Verifica el segundo paso (TOTP): node scripts/check-totp.mjs
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

const t = await import("../lib/admin/totp.ts");

// Vectores de la RFC 6238 (SHA-1, secreto «12345678901234567890»): los últimos 6 dígitos.
const rfcSecret = t.base32Encode(Buffer.from("12345678901234567890"));
assert.equal(rfcSecret, "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
const vectors = [
  [59, "287082"],
  [1111111109, "081804"],
  [1111111111, "050471"],
  [1234567890, "005924"],
  [2000000000, "279037"],
];
for (const [seconds, code] of vectors) assert.equal(t.totpAt(rfcSecret, seconds * 1000), code, `t=${seconds}`);

// Base32: ida y vuelta, y lo que escribe una persona (minúsculas, espacios, guiones, relleno).
const raw = Buffer.from([0, 1, 2, 250, 251, 252, 253, 254, 255, 7]);
assert.deepEqual(t.base32Decode(t.base32Encode(raw)), raw);
assert.deepEqual(t.base32Decode("gezd gnbv-gy3t qojq gezd gnbv gy3t qojq=="), Buffer.from("12345678901234567890"));
assert.equal(t.base32Decode("hola 1"), null); // 1 no es base32
assert.equal(t.base32Decode(""), null);

// Secretos nuevos: 32 letras, distintos cada vez y bien formados.
const s = t.newTotpSecret();
assert.ok(t.isTotpSecret(s));
assert.notEqual(s, t.newTotpSecret());
assert.equal(t.isTotpSecret("corto"), false);

// Verificar: el código de ahora, el del paso anterior y el siguiente valen; más lejos, no.
const now = 1_700_000_000_000;
const at = (off) => t.totpAt(s, now, off);
assert.equal(t.verifyTotp(s, at(0), now), true);
assert.equal(t.verifyTotp(s, at(-1), now), true);
assert.equal(t.verifyTotp(s, at(1), now), true);
assert.equal(t.verifyTotp(s, at(-2), now), false);
assert.equal(t.verifyTotp(s, at(2), now), false);
// Se escribe con espacio en el medio («123 456») y no se acepta basura.
const c = at(0);
assert.equal(t.verifyTotp(s, `${c.slice(0, 3)} ${c.slice(3)}`, now), true);
for (const bad of ["", "12345", "1234567", "abcdef", "12 34 5x"]) assert.equal(t.verifyTotp(s, bad, now), false, bad);
assert.equal(t.verifyTotp("no-es-base32!", c, now), false);
// El código de otro secreto no sirve.
assert.equal(t.verifyTotp(t.newTotpSecret(), c, now), false);

// El enlace que lee la app.
const uri = t.otpauthUri("franco", s);
assert.match(uri, /^otpauth:\/\/totp\/Se7en%20Panel%3Afranco\?secret=[A-Z2-7]{32}&issuer=Se7en%20Panel&algorithm=SHA1&digits=6&period=30$/);

console.log("totp OK");
