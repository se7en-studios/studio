// Verifica el portal del cliente (tokens, sesión, qué se filtra y el reporte mensual): node scripts/check-portal.mjs
// Importa el .ts directo (Node 22+); el hook deja resolver imports sin extensión.
import assert from "node:assert/strict";
import { register } from "node:module";

register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) {
        try { return await next(s, c); }
        catch (e) { if (s.startsWith(".")) return next(s + ".ts", c); throw e; }
      }`,
    ),
);

const t = await import("../lib/admin/portal-token.ts");
const p = await import("../lib/admin/portal-shared.ts");

// --- Tokens: 256 bits, al azar, se guarda sólo el hash --------------------------------
const a = t.newToken();
const b = t.newToken();
assert.equal(a.length, 43);
assert.ok(t.isTokenShape(a));
assert.notEqual(a, b);
assert.equal(Buffer.from(a, "base64url").length, 32);
assert.match(t.hashToken(a), /^[0-9a-f]{64}$/);
assert.notEqual(t.hashToken(a), a);
assert.equal(t.hashToken(a), t.hashToken(a));
for (const bad of ["", "abc", `${a}x`, a.slice(1), `${a.slice(0, 42)}.`, "../../etc/passwd"]) assert.equal(t.isTokenShape(bad), false, bad);

// --- Sesión firmada: atada a link y cliente, vence, no se puede tocar -------------------
const KEY = "k".repeat(40);
const LINK = "11111111-1111-4111-8111-111111111111";
const CLIENT = "22222222-2222-4222-8222-222222222222";
const OTHER = "33333333-3333-4333-8333-333333333333";
const now = 1_800_000_000_000;
const v = t.sessionValue(LINK, CLIENT, now + 3600_000, KEY);
const s = t.parseSession(v, KEY, now);
assert.deepEqual([s.linkId, s.clientId], [LINK, CLIENT]);
assert.equal(t.parseSession(v, KEY, now + 3600_001), null); // vencida
assert.equal(t.parseSession(v, "x".repeat(40), now), null); // otra clave
assert.equal(t.parseSession(v.replace(CLIENT, OTHER), KEY, now), null); // cambiar el cliente rompe la firma
assert.equal(t.parseSession(v.replace(/^\d+/, String(now + 9e9)), KEY, now), null); // estirar el vencimiento también
assert.equal(t.parseSession(`${v}.x`, KEY, now), null);
assert.equal(t.parseSession(undefined, KEY, now), null);
assert.equal(t.parseSession("1.2.3.4", KEY, now), null);
// La firma del portal no sirve como cookie del panel ni al revés: lleva el prefijo «portal:».
assert.equal(t.parseSession(t.sessionValue(LINK, "no-uuid", now + 1000, KEY), KEY, now), null);

// CSRF: atado a la cookie; el de otra sesión no sirve.
const s2 = t.parseSession(t.sessionValue(LINK, OTHER, now + 3600_000, KEY), KEY, now);
assert.ok(t.checkCsrf(s, KEY, t.csrfToken(s, KEY)));
assert.equal(t.checkCsrf(s, KEY, t.csrfToken(s2, KEY)), false);
assert.equal(t.checkCsrf(s, KEY, ""), false);
assert.equal(t.checkCsrf(s, KEY, null), false);

// Duración y clave: falla cerrado sin un secreto largo.
assert.equal(t.sessionHours(undefined), 12);
assert.equal(t.sessionHours("4"), 4);
assert.equal(t.sessionHours("0"), 12);
assert.equal(t.sessionHours("9999"), 12);
assert.equal(t.portalKey({}), null);
assert.equal(t.portalKey({ ADMIN_SESSION_SECRET: "corto" }), null);
assert.equal(t.portalKey({ PORTAL_SESSION_SECRET: "p".repeat(32) }), "p".repeat(32));
assert.equal(t.portalKey({ ADMIN_SESSION_SECRET: "a".repeat(32) }), `${"a".repeat(32)}:portal`); // subllave, nunca la misma

// --- Visibilidad: sólo lo del cliente y sólo lo marcado ----------------------------------
const mine = new Set(["acme-web"]);
const files = [
  { id: "1", created_at: "", project_slug: "acme-web", name: "ok.pdf", mime: "", size: 1, path: "a", client_visible: true },
  { id: "2", created_at: "", project_slug: "acme-web", name: "privado.pdf", mime: "", size: 1, path: "b", client_visible: false },
  { id: "3", created_at: "", project_slug: "acme-web", name: "sin-columna.pdf", mime: "", size: 1, path: "c" },
  { id: "4", created_at: "", project_slug: "otro-cliente", name: "ajeno.pdf", mime: "", size: 1, path: "d", client_visible: true },
  { id: "5", created_at: "", project_slug: "acme-web", name: "null.pdf", mime: "", size: 1, path: "e", client_visible: null },
];
assert.deepEqual(p.clientFiles(files, mine).map((f) => f.id), ["1"]);
assert.deepEqual(p.clientFiles(files, new Set()), []);

const today = "2026-10-14";
const charge = (over) => ({ id: "c", kind: "ingreso", occurred_on: "2026-10-01", currency: "USD", amount: "500", description: "Seña", project_slug: "acme-web", recurring: false, status: "pagado", fx: 1200, owner: "franco", created_by: "federico", ...over });
const charges = p.clientCharges(
  [
    charge({ id: "paid" }),
    charge({ id: "late", status: "pendiente", occurred_on: "2026-10-10" }),
    charge({ id: "next", status: "pendiente", occurred_on: "2026-11-10" }),
    charge({ id: "cost", kind: "costo" }),
    charge({ id: "plan", recurring: true }),
    charge({ id: "ajeno", project_slug: "otro-cliente" }),
    charge({ id: "suelto", project_slug: null }),
    charge({ id: "viejo", status: undefined, occurred_on: "2026-01-01" }),
  ],
  mine,
  today,
);
assert.deepEqual(charges.map((c) => [c.id, c.state]), [["late", "vencido"], ["next", "pendiente"], ["paid", "cobrado"], ["viejo", "cobrado"]]);
assert.equal(charges[0].amount, 500);
// Sin datos internos: ni cotización, ni socio, ni quién lo cargó.
for (const c of charges) for (const k of ["fx", "owner", "created_by", "status", "recurring", "kind"]) assert.ok(!(k in c), k);

const req = (over) => ({ id: "r", created_at: "2026-10-02T10:00:00Z", updated_at: "", project_slug: "acme-web", title: "Cambiar teléfono", notes: "interno", priority: "alta", status: "hecho", minutes: 90, due: null, done_at: "2026-10-03T10:00:00Z", created_by: "franco", ...over });
const shown = p.clientRequests([req(), req({ id: "ajeno", project_slug: "otro-cliente" })], mine);
assert.deepEqual(shown.map((r) => r.id), ["r"]);
for (const k of ["notes", "minutes", "priority", "created_by"]) assert.ok(!(k in shown[0]), k);

// --- Validación de lo que manda el cliente ------------------------------------------------
assert.equal(p.cleanClientRequest({ project_slug: "otro-cliente", title: "Hola mundo" }, mine).ok, false); // proyecto ajeno
assert.equal(p.cleanClientRequest({ project_slug: "acme-web", title: "x" }, mine).ok, false);
assert.deepEqual(p.cleanClientRequest({ project_slug: "acme-web", title: "  Cambiar logo ", notes: "n" }, mine), { ok: true, value: { project_slug: "acme-web", title: "Cambiar logo", notes: "n" } });
assert.equal(p.cleanDecision({ decision: "aprobado", signer: "A" }).ok, false); // nombre muy corto
assert.equal(p.cleanDecision({ decision: "cambios", signer: "Ana" }).ok, false); // cambios sin decir cuáles
assert.equal(p.cleanDecision({ decision: "borrar", signer: "Ana" }).ok, false);
assert.deepEqual(p.cleanDecision({ decision: "aprobado", signer: "  Ana   Pérez " }), { ok: true, value: { decision: "aprobado", comment: "", signer: "Ana Pérez" } });
assert.equal(p.cleanLink("javascript:alert(1)"), null);
assert.equal(p.cleanLink("data:text/html,x"), null);
assert.equal(p.cleanLink(""), "");
assert.equal(p.cleanLink("https://figma.com/x"), "https://figma.com/x");
assert.equal(p.cleanApproval({ title: "Home", link: "javascript:x" }).ok, false);
assert.equal(p.cleanApproval({ title: "", link: "" }).ok, false);
assert.equal(p.cleanApproval({ title: "Home", file_id: "../x" }).ok, false);

// --- Reporte mensual -----------------------------------------------------------------------
assert.equal(p.reportMonth(undefined, today), "2026-10");
assert.equal(p.reportMonth("2026-09", today), "2026-09");
assert.equal(p.reportMonth("2025-11", today), "2025-11"); // 11 meses atrás: entra
assert.equal(p.reportMonth("2025-10", today), "2026-10"); // 12 atrás: no
assert.equal(p.reportMonth("2026-11", today), "2026-10"); // futuro: no
assert.equal(p.reportMonth("2026-13", today), "2026-10");

const reqs = [
  req({ id: "a", done_at: "2026-10-03T10:00:00Z", minutes: 90 }),
  req({ id: "b", done_at: "2026-09-20T10:00:00Z", minutes: 600 }), // otro mes
  req({ id: "c", status: "en_curso", done_at: null, minutes: 60 }), // abierto: cuenta en el mes actual, no figura como resuelto
  req({ id: "d", project_slug: "otro-cliente", minutes: 999 }),
];
const checks = [
  { project_slug: "acme-web", checked_at: "2026-10-01T08:00:00Z", ok: true },
  { project_slug: "acme-web", checked_at: "2026-10-02T08:00:00Z", ok: true },
  { project_slug: "acme-web", checked_at: "2026-10-03T08:00:00Z", ok: true },
  { project_slug: "acme-web", checked_at: "2026-10-04T08:00:00Z", ok: false },
  { project_slug: "acme-web", checked_at: "2026-09-04T08:00:00Z", ok: false },
  { project_slug: "otro-cliente", checked_at: "2026-10-04T08:00:00Z", ok: false },
];
const r = p.monthlyReport("acme-web", "2026-10", today, reqs, { hours_included: 2, active: true }, checks);
assert.deepEqual(r.resolved.map((x) => x.id), ["a"]);
assert.equal(r.hours, 2.5);
assert.equal(r.included, 2);
assert.equal(r.over, true);
assert.equal(r.uptime, 75);
assert.equal(r.checks, 4);
const sep = p.monthlyReport("acme-web", "2026-09", today, reqs, { hours_included: 20, active: true }, checks);
assert.deepEqual([sep.resolved.length, sep.hours, sep.over, sep.uptime], [1, 10, false, 0]);
const none = p.monthlyReport("acme-web", "2026-08", today, reqs, null, checks);
assert.deepEqual([none.included, none.uptime, p.reportHasData(none)], [null, null, false]);
assert.equal(p.monthlyReport("acme-web", "2026-10", today, reqs, { hours_included: 2, active: false }, []).included, null); // plan pausado: sin tope

console.log("check-portal: OK");
