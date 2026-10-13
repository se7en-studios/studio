// Verifica las cuentas de Finanzas: node scripts/check-finance.mjs
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

const f = await import("../lib/admin/finance-shared.ts");

const entry = (over) => ({
  id: "x", kind: "costo", occurred_on: "2026-10-05", currency: "USD", amount: 100, fx: 1000, category: "otros",
  description: "", project_slug: null, recurring: false, until: null, created_by: null, source: "manual", ...over,
});

// Conversión en las dos direcciones, con la cotización de cada movimiento.
assert.equal(f.usdOf(entry({ currency: "USD", amount: 100 })), 100);
assert.equal(f.arsOf(entry({ currency: "USD", amount: 100 })), 100_000);
assert.equal(f.usdOf(entry({ currency: "ARS", amount: 500_000 })), 500);
assert.equal(f.arsOf(entry({ currency: "ARS", amount: 500_000 })), 500_000);
assert.deepEqual(f.otherCurrency(entry({ currency: "ARS", amount: 1500, fx: 1000 })), { currency: "USD", amount: 1.5 });
assert.equal(f.fmt(1234.6, "USD"), "USD 1.235");
assert.equal(f.fmt(1500000, "ARS"), "$ 1.500.000");

// Períodos.
assert.deepEqual(f.periodMonths("mes", "2026-10-13", []), ["2026-10"]);
assert.deepEqual(f.periodMonths("3m", "2026-10-13", []), ["2026-08", "2026-09", "2026-10"]);
assert.equal(f.periodMonths("12m", "2026-01-31", []).at(0), "2025-02");
assert.deepEqual(f.periodMonths("todo", "2026-10-13", [{ occurred_on: "2026-08-20" }]), ["2026-08", "2026-09", "2026-10"]);

// Un movimiento puntual cuenta una vez; uno recurrente, en cada mes desde que empieza hasta que termina.
const months = ["2026-08", "2026-09", "2026-10", "2026-11"];
assert.equal(f.expand([entry({ occurred_on: "2026-09-10" })], months).length, 1);
assert.deepEqual(f.expand([entry({ occurred_on: "2026-09-10", recurring: true })], months).map((o) => o.month), ["2026-09", "2026-10", "2026-11"]);
assert.deepEqual(
  f.expand([entry({ occurred_on: "2026-09-10", recurring: true, until: "2026-10-31" })], months).map((o) => o.month),
  ["2026-09", "2026-10"],
);

// Totales y resultado: un ingreso en pesos y un costo en dólares, cada uno con su cotización.
const list = [
  entry({ id: "i", kind: "ingreso", currency: "ARS", amount: 2_000_000, fx: 1000 }),
  entry({ id: "c", kind: "costo", currency: "USD", amount: 500, fx: 1200, recurring: true, occurred_on: "2026-09-01" }),
];
const t = f.totals(f.expand(list, ["2026-10"]));
assert.deepEqual(t, { ingresoUsd: 2000, ingresoArs: 2_000_000, costoUsd: 500, costoArs: 600_000 });
assert.deepEqual(f.pick(t, "ARS"), { ingreso: 2_000_000, costo: 600_000 });
assert.equal(f.margin(t.ingresoUsd, t.costoUsd), 75);
assert.equal(f.margin(0, 100), null);
assert.deepEqual(f.fixedCosts(list, "2026-10"), { usd: 500, ars: 600_000 });
assert.deepEqual(f.fixedCosts(list, "2026-08"), { usd: 0, ars: 0 }); // todavía no empezaba
const monthly = f.byMonth(f.expand(list, ["2026-09", "2026-10"]), ["2026-09", "2026-10"]);
assert.deepEqual(monthly.map((m) => [m.month, m.costoUsd, m.ingresoUsd]), [["2026-09", 500, 0], ["2026-10", 500, 2000]]);

// Validación: rechaza lo inválido y normaliza lo válido.
const ok = { kind: "costo", currency: "ARS", amount: "1500.456", fx: "1200", occurred_on: "2026-10-01", category: "infra", description: "  Vercel  " };
const good = f.cleanEntry(ok);
assert.ok(good.ok);
assert.equal(good.value.amount, 1500.46);
assert.equal(good.value.description, "Vercel");
assert.equal(good.value.category, "infra");
for (const bad of [
  { ...ok, kind: "otro" }, { ...ok, currency: "EUR" }, { ...ok, amount: 0 }, { ...ok, amount: -5 }, { ...ok, amount: "abc" },
  { ...ok, fx: 0 }, { ...ok, occurred_on: "01/10/2026" }, { ...ok, project_slug: "../x" },
  { ...ok, recurring: true, until: "2026-09-01" },
]) assert.equal(f.cleanEntry(bad).ok, false, JSON.stringify(bad));
assert.equal(f.cleanEntry({ ...ok, category: "inventada" }).value.category, "otros");

// Montos como se escriben en Argentina.
assert.equal(f.parseAmount("1.500,50"), 1500.5);
assert.equal(f.parseAmount("1.500"), 1500);
assert.equal(f.parseAmount("1500.5"), 1500.5);
assert.equal(f.parseAmount("12,5"), 12.5);
assert.equal(f.parseAmount("2.000.000"), 2_000_000);
assert.equal(f.parseAmount(" 350 "), 350);
assert.ok(Number.isNaN(f.parseAmount("")));
assert.ok(Number.isNaN(f.parseAmount("mil")));

console.log("finance OK");
