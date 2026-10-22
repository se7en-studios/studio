// Verifica lo del canal en vivo de la oficina: los números de la medición y
// los pases (un pase firmado por el servidor, un pedido firmado por la pestaña,
// y que nada adulterado pase). node scripts/check-en-vivo.mjs
import assert from "node:assert/strict";
import { register } from "node:module";
import { webcrypto } from "node:crypto";

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

const S = await import("../lib/admin/oficinas-shared.ts");

// Los números: visitas por día, cuánto se quedan y cuántas se cruzaron con un socio
{
  const r = (visitor, kind, at, detail = null, value = null) => ({ visitor, kind, at, detail, value });
  const rows = [
    r("aaaaaaaaaa", "abrir", "2026-10-20T10:00:00Z"),
    r("aaaaaaaaaa", "salir", "2026-10-20T10:02:00Z", null, 120),
    r("aaaaaaaaaa", "abrir", "2026-10-20T12:00:00Z"),
    r("aaaaaaaaaa", "salir", "2026-10-20T12:00:30Z", null, 30),
    r("bbbbbbbbbb", "abrir", "2026-10-21T09:00:00Z"),
    r("bbbbbbbbbb", "socio", "2026-10-21T09:00:10Z", "franco"),
    r("bbbbbbbbbb", "gesto", "2026-10-21T09:01:00Z", "hola:socio"),
    r("bbbbbbbbbb", "whatsapp", "2026-10-21T09:02:00Z", "ficha"),
    r("bbbbbbbbbb", "salir", "2026-10-21T09:05:00Z", null, 300),
    // Se cruzó con un socio sin abrir la oficina ese día (no cuenta como cruce)
    r("cccccccccc", "socio", "2026-10-21T11:00:00Z", "federico"),
    r("cccccccccc", "aviso", "2026-10-21T11:00:05Z", "federico"),
    r("cccccccccc", "contacto", "2026-10-21T11:01:00Z", "barra"),
  ];
  assert.deepEqual(S.summarizeOffice(rows, 30), { days: 30, opens: 3, visitors: 2, avgSeconds: 150, medianSeconds: 120, met: 1, gestures: 1, calls: 1, whatsapp: 1, contact: 1 });
  assert.deepEqual(S.summarizeOffice([], 30), { days: 30, opens: 0, visitors: 0, avgSeconds: null, medianSeconds: null, met: 0, gestures: 0, calls: 0, whatsapp: 0, contact: 0 });
}

// Los pases, con un secreto de prueba
process.env.ADMIN_SESSION_SECRET = "prueba-del-canal-en-vivo-con-32-caracteres-o-mas";
const P = await import("../lib/en-vivo-pase.ts");
{
  const subtle = webcrypto.subtle;
  const ECDSA = { name: "ECDSA", namedCurve: "P-256" }, SIG = { name: "ECDSA", hash: "SHA-256" };
  const pair = await subtle.generateKey(ECDSA, false, ["sign", "verify"]);
  const key = Buffer.from(await subtle.exportKey("raw", pair.publicKey)).toString("base64url");
  assert.ok(P.validTabKey(key));
  assert.ok(!P.validTabKey("corta"));

  const reply = P.issuePass({ id: "v-0123456789", look: "v:0123456789", name: null }, key);
  assert.ok(reply);
  const body = P.readPass(reply.pass, reply.sig);
  assert.equal(body?.i, "v-0123456789");
  assert.equal(body?.k, key);

  // Un pase tocado, o firmado para otro, no vale
  const forged = Buffer.from(JSON.stringify({ ...body, i: "federico", l: "federico" })).toString("base64url");
  assert.equal(P.readPass(forged, reply.sig), null);
  // Vencido
  assert.equal(P.readPass(reply.pass, reply.sig, body.e + 1), null);

  // Lo que firma la pestaña se verifica con la llave del pase; lo tocado, no
  const d = JSON.stringify({ to: "franco", t: Date.now() });
  const z = Buffer.from(await subtle.sign(SIG, pair.privateKey, Buffer.from(`aviso|${d}`))).toString("base64url");
  assert.ok(P.tabSigned(body, `aviso|${d}`, z));
  assert.ok(!P.tabSigned(body, `aviso|${d.replace("franco", "federico")}`, z));
  // Otra pestaña no puede firmar por ésta
  const other = await subtle.generateKey(ECDSA, false, ["sign", "verify"]);
  const z2 = Buffer.from(await subtle.sign(SIG, other.privateKey, Buffer.from(`aviso|${d}`))).toString("base64url");
  assert.ok(!P.tabSigned(body, `aviso|${d}`, z2));
}

console.log("check-en-vivo: ok");
