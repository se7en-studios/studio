// Verifica las cuentas de las propuestas: node scripts/check-proposals.mjs
// Importa el .ts directo (Node 22+); el hook deja resolver imports sin extensión.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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

const p = await import("../lib/admin/proposal-shared.ts");

const base = {
  id: "11111111-1111-1111-1111-111111111111",
  version: 2,
  title: "Tienda",
  intro: "",
  items: ["Catálogo", "Checkout"],
  optionals: [
    { id: "payments", name: "Pagos", price: 350, days: 2 },
    { id: "i18n", name: "Idiomas", price: 250.5, days: 3 },
  ],
  base_amount: 2400,
  currency: "USD",
  days: 14,
  valid_until: "2026-10-20",
  payment: { deposit_pct: 50, installments: 1 },
};

// Totales con opcionales: sólo suman los tildados que existen.
assert.equal(p.totalOf(base, []), 2400);
assert.equal(p.totalOf(base, ["payments"]), 2750);
assert.equal(p.totalOf(base, ["payments", "i18n"]), 3000.5);
assert.equal(p.totalOf(base, ["nada"]), 2400);
assert.equal(p.daysOf(base, ["i18n"]), 17);
assert.deepEqual(p.cleanSelection(base, ["i18n", "payments", "i18n", "x", 3]), ["payments", "i18n"]);

// Vencimiento: hasta valid_until inclusive se puede aceptar.
const sent = { ...base, status: "enviada", revoked_at: null };
assert.equal(p.statusOf(sent, "2026-10-20"), "enviada");
assert.equal(p.statusOf(sent, "2026-10-21"), "vencida");
assert.equal(p.statusOf({ ...sent, status: "vista" }, "2026-10-21"), "vencida");
assert.equal(p.statusOf({ ...sent, status: "aceptada" }, "2026-12-01"), "aceptada");
assert.equal(p.statusOf({ ...sent, status: "borrador" }, "2026-12-01"), "borrador");
assert.equal(p.isOpen(sent, "2026-10-20"), true);
assert.equal(p.isOpen(sent, "2026-10-21"), false);
assert.equal(p.isOpen({ ...sent, revoked_at: "2026-10-10T00:00:00Z" }, "2026-10-15"), false);
assert.equal(p.isOpen({ ...sent, status: "borrador" }, "2026-10-15"), false);

// Transiciones de estado.
assert.ok(p.canTransition("borrador", "enviada"));
assert.ok(p.canTransition("enviada", "vista"));
assert.ok(p.canTransition("enviada", "aceptada"));
assert.ok(p.canTransition("vista", "rechazada"));
assert.ok(!p.canTransition("borrador", "aceptada"));
assert.ok(!p.canTransition("vista", "enviada"));
assert.ok(!p.canTransition("aceptada", "rechazada"));
assert.ok(!p.canTransition("rechazada", "aceptada"));

// Plan de cobros: seña al aceptar, saldo a la entrega (14 hábiles ≈ 20 corridos).
assert.deepEqual(p.paymentPlan(3000, { deposit_pct: 50, installments: 1 }, "2026-10-15", 14), [
  { label: "Seña", amount: 1500, due: "2026-10-15" },
  { label: "Saldo", amount: 1500, due: "2026-11-04" },
]);
const cuotas = p.paymentPlan(1000, { deposit_pct: 30, installments: 3 }, "2026-01-31", 5);
assert.deepEqual(cuotas.map((c) => c.label), ["Seña", "Cuota 1/3", "Cuota 2/3", "Cuota 3/3"]);
assert.equal(Math.round(cuotas.reduce((s, c) => s + c.amount, 0) * 100) / 100, 1000);
assert.equal(cuotas[3].amount, 233.34);
assert.deepEqual(p.paymentPlan(800, { deposit_pct: 100, installments: 6 }, "2026-10-15", 10), [{ label: "Seña", amount: 800, due: "2026-10-15" }]);
assert.equal(p.paymentPlan(800, { deposit_pct: 0, installments: 2 }, "2026-10-15", 10)[0].label, "Cuota 1/2");

// Hash estable: el orden de las claves no importa; cualquier cambio sí.
assert.equal(p.canonical({ b: 1, a: [1, { d: 2, c: null }] }), '{"a":[1,{"c":null,"d":2}],"b":1}');
const signer = { name: "Ana Pérez", email: "ana@x.com", at: "2026-10-15T13:00:00.000Z" };
const h1 = await p.acceptanceHash(base, ["payments"], signer);
const shuffled = Object.fromEntries(Object.entries(base).reverse());
assert.equal(await p.acceptanceHash(shuffled, ["payments"], { at: signer.at, email: signer.email, name: signer.name }), h1);
assert.match(h1, /^[0-9a-f]{64}$/);
assert.equal(h1, createHash("sha256").update(p.canonical(p.acceptedContent(base, ["payments"], signer))).digest("hex"));
assert.notEqual(await p.acceptanceHash(base, ["payments", "i18n"], signer), h1);
assert.notEqual(await p.acceptanceHash({ ...base, base_amount: 2401 }, ["payments"], signer), h1);
assert.notEqual(await p.acceptanceHash(base, ["payments"], { ...signer, email: "otra@x.com" }), h1);
assert.equal(p.acceptedContent(base, ["payments"], signer).total, 2750);

// Validación del panel.
assert.equal(p.cleanContent({ ...base, title: " " }).ok, false);
assert.equal(p.cleanContent({ ...base, items: ["", " "] }).ok, false);
assert.equal(p.cleanContent({ ...base, base_amount: 0 }).ok, false);
assert.equal(p.cleanContent({ ...base, valid_until: "2026-02-31" }).ok, false);
assert.equal(p.cleanContent({ ...base, payment: { deposit_pct: 120, installments: 1 } }).ok, false);
assert.equal(p.cleanContent({ ...base, currency: "EUR" }).ok, false);
const ok = p.cleanContent({ ...base, optionals: [...base.optionals, { id: "payments", name: "Repetido", price: 1, days: 0 }, { name: "", price: 5 }] });
assert.ok(ok.ok);
assert.deepEqual(ok.value.optionals.map((o) => o.id), ["payments", "i18n", "payments-3"]);
assert.equal(p.cleanSigner({ name: "Al", email: "a@b.co" }).ok, false);
assert.equal(p.cleanSigner({ name: "Ana Pérez", email: "nope" }).ok, false);
assert.deepEqual(p.cleanSigner({ name: " Ana Pérez ", email: "ANA@X.COM" }), { ok: true, value: { name: "Ana Pérez", email: "ana@x.com" } });

// Borrador desde el cotizador: mismos precios que /pricing.
const d = p.draftFromQuote("ecommerce", "standard", "USD", "2026-10-14");
assert.equal(d.base_amount, 2400);
assert.equal(d.days, 14);
assert.equal(d.valid_until, "2026-10-29");
assert.equal(d.optionals.find((o) => o.id === "payments").price, 350);
const x = p.draftFromQuote("ecommerce", "express", "USD", "2026-10-14");
assert.equal(x.base_amount, 2880);
assert.equal(x.days, 8);
assert.ok(p.cleanContent(d).ok);

console.log("check-proposals: ok");
