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
assert.deepEqual(t, { ingresoUsd: 2000, ingresoArs: 2_000_000, costoUsd: 500, costoArs: 600_000, retiroUsd: 0, retiroArs: 0 });
assert.deepEqual(f.pick(t, "ARS"), { ingreso: 2_000_000, costo: 600_000, retiro: 0 });
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


// Pendientes: no cuentan hasta que se pagan.
const own = (over) => entry({ owner: "ambos", status: "pagado", ...over });
const pend = own({ id: "p", kind: "ingreso", currency: "USD", amount: 900, status: "pendiente" });
assert.equal(f.expand([pend], ["2026-10"]).length, 0);
assert.equal(f.expand([{ ...pend, status: "pagado" }], ["2026-10"]).length, 1);

// Cuentas entre socios: todo se divide 50/50 y el owner es quién puso o cobró la plata.
const settleOf = (list, cur = "USD") => f.settle(f.expand(list, ["2026-10"]), cur);
// Franco pagó un costo de 100 y nadie más puso nada: Federico le debe 50.
assert.deepEqual(settleOf([own({ kind: "costo", amount: 100, owner: "franco" })]).owes, { from: "federico", to: "franco", amount: 50 });
// Federico cobró 300 y los dos parten a la mitad: Federico le debe 150 a Franco.
assert.deepEqual(settleOf([own({ kind: "ingreso", amount: 300, owner: "federico" })]).owes, { from: "federico", to: "franco", amount: 150 });
// Cada uno pagó lo mismo: a mano. Y la cuenta del estudio no genera deuda.
assert.equal(settleOf([own({ kind: "costo", amount: 100, owner: "franco" }), own({ kind: "costo", amount: 100, owner: "federico" })]).owes, null);
assert.equal(settleOf([own({ kind: "costo", amount: 999, owner: "ambos" })]).owes, null);
// Filtro por socio: lo suyo más la mitad de la cuenta del estudio (marcada y a su nombre).
const mine = f.forPartner([own({ id: "a", kind: "ingreso", amount: 300, owner: "ambos" }), own({ id: "b", kind: "ingreso", amount: 100, owner: "franco" }), own({ id: "c", kind: "ingreso", amount: 50, owner: "federico" })], "franco");
assert.deepEqual(mine.map((e) => [e.id, e.amount, e.owner, Boolean(e.studio)]), [["a", 150, "franco", true], ["b", 100, "franco", false]]);
// La cuenta del estudio se reparte mitad y mitad entre los dos.
const studio = settleOf([own({ kind: "ingreso", amount: 300, owner: "ambos" }), own({ kind: "costo", amount: 100, owner: "ambos" })]);
assert.deepEqual([studio.franco, studio.federico], [{ in: 150, out: 50 }, { in: 150, out: 50 }]);
// Se compensan: Franco cobró 400 y pagó 100; Federico pagó 100.
const mix = settleOf([
  own({ kind: "ingreso", amount: 400, owner: "franco" }),
  own({ kind: "costo", amount: 100, owner: "franco" }),
  own({ kind: "costo", amount: 100, owner: "federico" }),
]);
assert.deepEqual([mix.franco, mix.federico], [{ in: 400, out: 100 }, { in: 0, out: 100 }]);
assert.deepEqual(mix.owes, { from: "franco", to: "federico", amount: 200 }); // 300 vs −100 → diferencia 400, la mitad
// En pesos usa la cotización de cada movimiento.
assert.equal(settleOf([own({ kind: "costo", amount: 100, owner: "franco", fx: 1000 })], "ARS").owes.amount, 50_000);
// Un costo recurrente cuenta una vez por mes.
const twoMonths = f.settle(f.expand([own({ kind: "costo", amount: 100, owner: "franco", recurring: true, occurred_on: "2026-09-01" })], ["2026-09", "2026-10"]), "USD");
assert.equal(twoMonths.owes.amount, 100);

const base = { kind: "ingreso", currency: "USD", amount: 10, fx: 1000, occurred_on: "2026-10-05" };
assert.equal(f.cleanEntry({ ...base, status: "pendiente", recurring: true }).value.recurring, false);
assert.equal(f.cleanEntry({ ...base }).value.owner, "ambos");
assert.equal(f.cleanEntry({ ...base, occurred_on: "2026-02-31" }).ok, false); // fecha imposible
assert.equal(f.cleanEntry({ ...base, owner: "nadie" }).value.owner, "ambos");

// Herramientas: la próxima renovación y el costo por mes.
const tl = await import("../lib/admin/tool-shared.ts");
assert.equal(tl.nextRenewal("2026-10-20", "mensual", "2026-10-13"), "2026-10-20");
assert.equal(tl.nextRenewal("2026-08-20", "mensual", "2026-10-21"), "2026-11-20");
assert.equal(tl.nextRenewal("2025-03-05", "anual", "2026-10-13"), "2027-03-05");
assert.equal(tl.nextRenewal("2026-01-31", "mensual", "2026-02-10"), "2026-02-28"); // no se pasa de mes
assert.equal(tl.nextRenewal("2026-01-31", "mensual", "2026-03-01"), "2026-03-31"); // y no arrastra el 28
assert.equal(tl.daysUntil("2026-10-20", "2026-10-13"), 7);
assert.equal(tl.monthlyIn({ amount: 120, currency: "USD", cycle: "anual" }, "USD", 1000), 10);
assert.equal(tl.monthlyIn({ amount: 20, currency: "USD", cycle: "mensual" }, "ARS", 1000), 20_000);
assert.equal(tl.monthlyIn({ amount: 20, currency: "USD", cycle: "mensual" }, "ARS", 0), 0);
assert.equal(tl.logoOf("Claude Max"), "/logos/claude.svg");
assert.equal(tl.logoOf("Algo raro"), null);
assert.equal(tl.cleanTool({ name: " ", amount: 1, currency: "USD", cycle: "mensual", renews_on: "2026-10-01" }).ok, false);
assert.equal(tl.cleanTool({ name: "Vercel", amount: 20, currency: "USD", cycle: "mensual", renews_on: "2026-10-01" }).value.owner, "ambos");
// Las herramientas como costo fijo mensual (lo anual, prorrateado).
const tool = { id: "t1", created_at: "2026-09-10T12:00:00Z", name: "Vercel", amount: 20, currency: "USD", cycle: "mensual", renews_on: "2026-10-20", owner: "franco", notes: "" };
const te = tl.toolEntries([tool, { ...tool, id: "t2", name: "Dominio", amount: 120, cycle: "anual" }, { ...tool, id: "t3", currency: "ARS", amount: 5000 }], 0);
assert.equal(te.length, 2); // la de pesos no se puede convertir sin cotización
assert.deepEqual(te.map((e) => [e.amount, e.owner, e.recurring, e.kind]), [[20, "franco", true, "costo"], [10, "franco", true, "costo"]]);
assert.equal(f.fixedCosts(te, "2026-10").usd, 30);
assert.equal(f.fixedCosts(te, "2026-08").usd, 0); // todavía no estaba cargada
assert.equal(tl.toolEntries([{ ...tool, currency: "ARS", amount: 5000 }], 1000).length, 1);

// Una herramienta cargada a las 22 h del 31/10 (Buenos Aires = 01 h UTC del 1/11) cuenta desde octubre.
assert.equal(tl.toolEntries([{ ...tool, created_at: "2026-11-01T01:00:00Z" }], 0)[0].occurred_on, "2026-10-31");

// Cobros de proyecto: como ingreso de Finanzas y validación del formulario de edición.
const ps = await import('../lib/admin/payment-shared.ts');
const pay = { id: 'abc', created_at: '', project_slug: 'apex', paid_on: '2026-10-05', amount: 300, note: 'Seña', created_by: 'franco', owner: 'franco' };
const pe = ps.paymentToEntry(pay, 1200);
assert.deepEqual([pe.id, pe.kind, pe.currency, pe.amount, pe.source, pe.owner, pe.fx], ['cobro-abc', 'ingreso', 'USD', 300, 'cobro', 'franco', 1200]);
assert.equal(f.arsOf(pe), 360_000);
assert.equal(ps.cleanPayment({ ...pay, amount: 0 }).ok, false);
assert.equal(ps.cleanPayment({ ...pay, paid_on: '2026-02-31' }).ok, false);
assert.equal(ps.cleanPayment({ ...pay, project_slug: '' }).ok, false);
assert.equal(ps.cleanPayment({ ...pay, owner: 'nadie', note: '  hola  ' }).value.owner, 'ambos');
assert.equal(ps.cleanPayment({ ...pay, note: '  hola  ' }).value.note, 'hola');

// Un cobro viejo que finance-v4.sql ya copió (mismo id) no se cuenta dos veces.
const merged = ps.withLegacy([entry({ id: 'abc', kind: 'ingreso' })], [pe, ps.paymentToEntry({ ...pay, id: 'def' }, 0)]);
assert.deepEqual(merged.map((e) => e.id), ['abc', 'cobro-def']);

// «Por cobrar»: la misma cuenta en Inicio, Finanzas y la ficha.
const TODAY = '2026-10-14';
const inc = (over) => entry({ kind: 'ingreso', currency: 'USD', status: 'pagado', owner: 'ambos', ...over });
const muzzaga = { slug: 'muzzaga', name: 'Muzzaga', budget: null, status: 'mantenimiento' };
// Como en producción: 983 cobrados (dos recurrentes desde octubre) y 1.816 en cuotas pendientes, sin monto acordado.
const real = [
  inc({ id: 'm1', project_slug: 'muzzaga', amount: 833, occurred_on: '2026-10-13', recurring: true }),
  inc({ id: 'm2', project_slug: 'muzzaga', amount: 150, occurred_on: '2026-10-13', recurring: true }),
  inc({ id: 'm3', project_slug: 'muzzaga', amount: 833, occurred_on: '2026-11-13', status: 'pendiente' }),
  inc({ id: 'm4', project_slug: 'muzzaga', amount: 150, occurred_on: '2026-11-13', status: 'pendiente' }),
  inc({ id: 'm5', project_slug: 'muzzaga', amount: 833, occurred_on: '2026-12-13', status: 'pendiente' }),
  inc({ id: 'pp', project_slug: 'pone-la-pava', currency: 'ARS', amount: 600_000, fx: 1538.7, occurred_on: '2026-09-13' }),
  entry({ id: 'c1', kind: 'costo', amount: 35 }),
];
const mz = ps.projectMoney(muzzaga, real, TODAY);
assert.deepEqual([mz.paid, mz.pending, mz.owed, mz.uncovered, mz.late, mz.done], [983, 1816, 1816, 0, 0, true]);
const all = ps.receivables([muzzaga, { slug: 'pone-la-pava', name: 'Poné La Pava', budget: null, status: 'mantenimiento' }], real, TODAY);
assert.equal(all.total, 1816);
assert.deepEqual(all.projects.map((p) => p.slug), ['muzzaga']);
// Un recurrente cobrado cuenta una vez por mes hasta hoy: en noviembre ya van dos.
assert.equal(ps.projectMoney(muzzaga, real, '2026-11-02').paid, 1966);
// Con monto acordado: el saldo, o los pendientes si son más; un pendiente es una cuota del saldo, no se suma aparte.
const deal = { slug: 'apex', name: 'Apex', budget: 3000, status: 'desarrollo' };
const apex = [inc({ id: 'a1', project_slug: 'apex', amount: 1000 }), inc({ id: 'a2', project_slug: 'apex', amount: 500, status: 'pendiente', occurred_on: '2026-10-01' })];
const ax = ps.projectMoney(deal, apex, TODAY);
assert.deepEqual([ax.paid, ax.pending, ax.owed, ax.uncovered, ax.late, ax.done], [1000, 500, 2000, 1500, 500, false]);
assert.equal(ps.projectMoney(deal, [...apex, inc({ id: 'a3', project_slug: 'apex', amount: 2500, status: 'pendiente' })], TODAY).owed, 3000);
// Cobrado de más: no queda saldo negativo.
assert.equal(ps.projectMoney(deal, [inc({ id: 'a4', project_slug: 'apex', amount: 3500 })], TODAY).owed, 0);
// Pausado: no debe su saldo, pero lo anotado como pendiente sí.
assert.equal(ps.projectMoney({ ...deal, status: 'pausado' }, apex, TODAY).owed, 500);
// Los costos y los ingresos de otros proyectos no cuentan; los pendientes sin proyecto suman aparte.
const loose = ps.receivables([deal], [...apex, inc({ id: 'x', amount: 200, status: 'pendiente' }), inc({ id: 'y', project_slug: 'borrado', amount: 100, status: 'pendiente' }), entry({ id: 'z', kind: 'costo', project_slug: 'apex', amount: 999, status: 'pendiente' })], TODAY);
assert.deepEqual([loose.total, loose.loose], [2300, 300]);
// Un pendiente en pesos va a dólares con su cotización.
assert.equal(ps.receivables([], [inc({ id: 'ars', currency: 'ARS', amount: 150_000, fx: 1500, status: 'pendiente' })], TODAY).total, 100);

// --- Plata con fecha (plata-shared) ---------------------------------------------
const pl = await import("../lib/admin/plata-shared.ts");

// Retiros de socios: no son costo, van aparte y no tocan el resultado ni los costos fijos.
const withdrawal = entry({ id: "r", kind: "costo", category: "retiros", amount: 300, recurring: true, occurred_on: "2026-09-01" });
const tr = f.totals(f.expand([...list, withdrawal], ["2026-10"]));
assert.deepEqual([tr.costoUsd, tr.retiroUsd], [500, 300]);
assert.equal(f.fixedCosts([...list, withdrawal], "2026-10").usd, 500);
assert.equal(f.isWithdrawal(withdrawal), true);

// Cotización y fuente: se guardan tal cual; una fuente inventada queda en null.
assert.equal(f.cleanEntry({ ...base, fx_source: "mep" }).value.fx_source, "mep");
assert.equal(f.cleanEntry({ ...base, fx_source: "inventada" }).value.fx_source, null);
// Fecha prevista: un pendiente vence en su fecha; uno pagado conserva la que traía.
assert.equal(f.cleanEntry({ ...base, status: "pendiente" }).value.due_on, "2026-10-05");
assert.equal(f.cleanEntry({ ...base, due_on: "2026-09-30" }).value.due_on, "2026-09-30");
assert.equal(f.cleanEntry({ ...base }).value.due_on, null);

// Un ingreso recurrente que es plan no cuenta solo: cuentan sus pendientes cobrados.
const abono = inc({ id: "plan1", project_slug: "muzzaga", amount: 150, occurred_on: "2026-08-31", recurring: true, plan: true, fx_source: "mep" });
assert.equal(f.expand([abono], ["2026-09", "2026-10"]).length, 0);
const dues = pl.missingDues([abono], "2026-10-14");
assert.deepEqual(dues.map((d) => [d.occurred_on, d.series, d.status, d.amount]), [
  ["2026-08-31", "plan1:2026-08", "pendiente", 150],
  ["2026-09-30", "plan1:2026-09", "pendiente", 150], // 31 → último día del mes
  ["2026-10-31", "plan1:2026-10", "pendiente", 150],
]);
assert.equal(dues[0].project_slug, "muzzaga");
// Idempotente: los que ya están (misma series) no se vuelven a generar.
const had = [abono, inc({ id: "d1", series: "plan1:2026-08" }), inc({ id: "d2", series: "plan1:2026-09", status: "pendiente" })];
assert.deepEqual(pl.missingDues(had, "2026-10-14").map((d) => d.series), ["plan1:2026-10"]);
// Con «hasta», no pasa de ese mes; un recurrente sin plan (sin finance-v5.sql) no genera nada.
assert.equal(pl.missingDues([{ ...abono, until: "2026-09-15" }], "2026-12-01").length, 2);
assert.equal(pl.missingDues([{ ...abono, plan: false }], "2026-12-01").length, 0);
// Si el proyecto tiene plan en Mantenimiento, ese módulo genera el cobro: el recurrente de «mantenimiento» no genera otro.
const abonoMant = { ...abono, category: "mantenimiento" };
assert.equal(pl.missingDues([abonoMant], "2026-10-14", new Set(["muzzaga"])).length, 0);
assert.equal(pl.missingDues([abonoMant], "2026-10-14", new Set(["otro"])).length, 3);
assert.equal(pl.missingDues([abono], "2026-10-14", new Set(["muzzaga"])).length, 3);
// La forma que usa Mantenimiento: clave propia por sitio.
const mant = pl.monthlyDues(
  { key: "abono:apex", start: "2026-10-10", until: null, entry: { kind: "ingreso", currency: "USD", amount: 80, fx: 1500, category: "mantenimiento", description: "Abono", project_slug: "apex", owner: "ambos" } },
  "2026-11-01",
);
assert.deepEqual(mant.map((d) => d.series), ["abono:apex:2026-10", "abono:apex:2026-11"]);

// Cuotas: el total exacto, la última se lleva los centavos; una por mes.
assert.deepEqual(pl.installments(1000, 3, "2026-01-31"), [
  { amount: 333.33, due: "2026-01-31" },
  { amount: 333.33, due: "2026-02-28" },
  { amount: 333.34, due: "2026-03-31" },
]);
assert.equal(pl.installments(500, 0, "2026-10-01").length, 1);

// Cobros vencidos, proyección y días para cobrar.
const sched = [
  inc({ id: "v1", amount: 100, status: "pendiente", occurred_on: "2026-09-14" }), // 30 días vencido
  inc({ id: "v2", amount: 50, status: "pendiente", occurred_on: "2026-10-13" }),
  inc({ id: "f1", amount: 200, status: "pendiente", occurred_on: "2026-10-20" }),
  inc({ id: "f2", amount: 300, status: "pendiente", occurred_on: "2026-12-01" }),
  inc({ id: "f3", amount: 999, status: "pendiente", occurred_on: "2027-03-01" }),
  entry({ id: "cc", kind: "costo", amount: 70, status: "pendiente", occurred_on: "2026-09-01" }),
];
assert.deepEqual(pl.overdue(sched, TODAY), { total: 150, count: 2, oldestDays: 30 });
assert.deepEqual(pl.projection(sched, TODAY), { d30: 200, d60: 500, d90: 500 });
// Los meses que faltan generar de un plan entran en la proyección (el de octubre ya está generado).
const generated = pl.missingDues([abono], TODAY).map((d, i) => inc({ ...d, id: `g${i}` }));
assert.deepEqual(pl.projection([abono, ...generated], TODAY), { d30: 150, d60: 300, d90: 450 });
const paidLate = [
  inc({ id: "p1", due_on: "2026-09-01", occurred_on: "2026-09-21" }), // 20 días
  inc({ id: "p2", due_on: "2026-10-01", occurred_on: "2026-09-25" }), // antes de tiempo: 0
  inc({ id: "p3", occurred_on: "2026-10-01" }), // sin vencimiento: no cuenta
];
assert.equal(pl.daysToCollect(paidLate, TODAY), 10);
assert.equal(pl.daysToCollect([inc({ id: "p3" })], TODAY), null);

// Caja y meses que alcanza: lo cobrado menos costos y retiros; gasto = costos promedio de 3 meses.
const cash = [
  inc({ id: "k1", amount: 6000, occurred_on: "2026-08-10" }),
  entry({ id: "k2", kind: "costo", amount: 500, recurring: true, occurred_on: "2026-08-01" }),
  entry({ id: "k3", kind: "costo", category: "retiros", amount: 1000, occurred_on: "2026-09-10" }),
];
assert.deepEqual(pl.runway(cash, TODAY, "USD"), { balance: 3500, burn: 500, months: 7 });
assert.equal(pl.runway([inc({ id: "k1", amount: 10 })], TODAY, "USD").months, null);

// Concentración: el cliente más grande sobre lo cobrado con proyecto.
const conc = pl.concentration(
  [inc({ id: "c1", project_slug: "a", amount: 300 }), inc({ id: "c2", project_slug: "b", amount: 100 }), inc({ id: "c3", project_slug: "c", amount: 600 }), inc({ id: "c4", amount: 5000 })],
  ["2026-10"],
  (slug) => (slug === "b" ? "Otro" : "Cliente A"),
);
assert.deepEqual(conc, { client: "Cliente A", amount: 900, share: 90 });
assert.equal(pl.concentration([], ["2026-10"], (s) => s), null);

// Monotributo: lo facturado por un socio en 12 meses (lo suyo + la mitad del estudio), en pesos.
const billed = [
  inc({ id: "b1", owner: "franco", currency: "ARS", amount: 1_000_000, occurred_on: "2026-05-01" }),
  inc({ id: "b2", owner: "ambos", amount: 1000, fx: 1500, occurred_on: "2026-10-01" }), // 1.500.000 / 2
  inc({ id: "b3", owner: "federico", amount: 1000, occurred_on: "2026-10-01" }),
  inc({ id: "b4", owner: "franco", currency: "ARS", amount: 9_000_000, occurred_on: "2025-10-01" }), // hace más de un año
  inc({ id: "b5", owner: "franco", currency: "ARS", amount: 7_000_000, status: "pendiente" }),
];
assert.equal(pl.billedLast12(billed, "franco", TODAY), 1_750_000);
assert.equal(pl.taxMeter(1_000_000, "A").level, "ok");
assert.equal(pl.taxMeter(9_000_000, "A").level, "75");
assert.equal(pl.taxMeter(11_000_000, "A").level, "90");
assert.equal(pl.taxMeter(13_000_000, "A").level, "over");
assert.ok(pl.TAX_CATEGORIES.length === 11 && pl.MONOTRIBUTO.vigencia && pl.MONOTRIBUTO.fuente);

// Herramientas: cambiar el precio deja el viejo en sus meses; dar de baja corta en ese mes.
assert.equal(tl.priceBefore(tool, { amount: 20, currency: "USD", cycle: "mensual" }, "2026-12-05", 1500), null); // no cambió
assert.equal(tl.priceBefore({ ...tool, created_at: "2026-12-01T12:00:00Z" }, { amount: 30, currency: "USD", cycle: "mensual" }, "2026-12-05", 1500), null); // cargada este mes
const oldPrice = tl.priceBefore(tool, { amount: 30, currency: "USD", cycle: "mensual" }, "2026-12-05", 1500);
assert.deepEqual(oldPrice, { amount: 20, currency: "USD", cycle: "mensual", until: "2026-11-30", fx: 1500 });
const repriced = tl.toolEntries([{ ...tool, amount: 30, prices: [oldPrice] }], 2000);
assert.deepEqual(repriced.map((e) => [e.id, e.occurred_on, e.until, e.amount, e.fx]), [
  ["tool-t1-0", "2026-09-10", "2026-11-30", 20, 1500],
  ["tool-t1", "2026-12-01", null, 30, 2000],
]);
assert.deepEqual(["2026-10", "2026-12"].map((m) => f.fixedCosts(repriced, m).usd), [20, 30]);
const ended = tl.toolEntries([{ ...tool, ended_on: "2026-10-20" }], 0);
assert.deepEqual(["2026-10", "2026-11"].map((m) => f.fixedCosts(ended, m).usd), [20, 0]);

console.log("finance OK");
