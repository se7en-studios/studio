// Verifica las cuentas de Horas (cronómetro y tramos) y de Números: node scripts/check-numbers.mjs
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

const t = await import("../lib/admin/time-shared.ts");
const n = await import("../lib/admin/numbers-shared.ts");
const m = await import("../lib/admin/maintenance-shared.ts");
const p = await import("../lib/admin/plata-shared.ts");

const today = "2026-10-14";
const NOW = Date.parse("2026-10-14T15:00:00-03:00");
const tramo = (over) => ({
  id: "t1", who: "franco", project_slug: "muzzaga", maintenance_request_id: null,
  started_at: "2026-10-10T15:00:00.000Z", ended_at: "2026-10-10T16:00:00.000Z", minutes: 60, note: "", ...over,
});
const entry = (over) => ({
  id: "e", kind: "ingreso", occurred_on: "2026-10-05", currency: "USD", amount: 100, fx: 1000, category: "proyecto",
  description: "", project_slug: "muzzaga", recurring: false, until: null, owner: "ambos", status: "pagado",
  created_by: null, source: "manual", ...over,
});
const lead = (over) => ({
  id: "l", created_at: "2026-09-01T12:00:00Z", updated_at: "2026-10-05T12:00:00Z", source: "start", channel: null,
  name: "", email: "", company: "", project_type: "", budget: "", timeline: "", idea: "", status: "nuevo", owner: null, notes: "", ...over,
});

// --- Tramos ------------------------------------------------------------------------
assert.equal(t.minutesBetween("2026-10-14T10:00:00Z", "2026-10-14T11:29:40Z"), 90); // redondea
assert.equal(t.minutesBetween("2026-10-10T10:00:00Z", "2026-10-14T10:00:00Z"), 1440); // cronómetro olvidado: tope de un día
assert.equal(t.minutesBetween("2026-10-14T10:00:00Z", "2026-10-14T09:00:00Z"), 0); // nunca negativo
assert.equal(t.entryMinutes(tramo()), 60);
assert.equal(t.entryMinutes(tramo({ started_at: new Date(NOW - 25 * 60_000).toISOString(), ended_at: null, minutes: null }), NOW), 25); // corriendo
// Un tramo a mano empieza al mediodía de Argentina y cae en ese día aunque UTC sea otro.
assert.equal(t.manualStart("2026-10-14"), "2026-10-14T15:00:00.000Z");
assert.equal(t.entryDay({ started_at: "2026-10-15T01:30:00Z" }), "2026-10-14"); // 22:30 en Argentina
assert.equal(t.entryDay({ started_at: t.manualStart("2026-03-01") }), "2026-03-01");

assert.deepEqual(t.cleanManual({ day: "2026-10-13", minutes: "45", note: "  arreglo  " }, today), { ok: true, value: { day: "2026-10-13", minutes: 45, note: "arreglo" } });
assert.equal(t.cleanManual({ day: "2026-10-15", minutes: 30 }, today).ok, false); // futuro
assert.equal(t.cleanManual({ day: "2026-02-31", minutes: 30 }, today).ok, false);
assert.equal(t.cleanManual({ day: today, minutes: 0 }, today).ok, false);
assert.equal(t.cleanManual({ day: today, minutes: 1441 }, today).ok, false);
assert.equal(t.cleanManual({ day: today, minutes: "abc" }, today).ok, false);
assert.equal(t.cleanManual({ day: today, minutes: 10, note: "x".repeat(900) }, today).value.note.length, 500);

assert.deepEqual(t.cleanTarget("muzzaga", null), { slug: "muzzaga", requestId: null });
assert.deepEqual(t.cleanTarget("muzzaga", ""), { slug: "muzzaga", requestId: null });
assert.equal(t.cleanTarget("../x", null), null);
assert.equal(t.cleanTarget("muzzaga", "no-es-uuid"), null);
const RID = "0b9a7d3e-1111-4222-8333-444455556666";
assert.deepEqual(t.cleanTarget("muzzaga", RID), { slug: "muzzaga", requestId: RID });

// El tiempo de un pedido: lo viejo cargado a mano + sus tramos.
const tramos = [tramo({ maintenance_request_id: RID }), tramo({ id: "t2", maintenance_request_id: RID, minutes: 30 }), tramo({ id: "t3" })];
const byReq = t.minutesByRequest(tramos);
assert.equal(byReq.get(RID), 90);
assert.equal(t.requestMinutes({ id: RID, minutes: 15 }, byReq), 105);
assert.equal(t.requestMinutes({ id: "otro", minutes: 15 }, byReq), 15); // pedido viejo sin tramos: lo de antes
assert.equal(t.projectMinutesInMonth(tramos, "muzzaga", "2026-10"), 150);
assert.equal(t.projectMinutesInMonth(tramos, "muzzaga", "2026-09"), 0);
assert.equal(t.clock(3_723_000), "1:02:03");
assert.equal(t.clock(-5), "0:00:00");

// Horas del abono: los minutos viejos de los pedidos más los tramos del mes.
const plan = { project_slug: "muzzaga", hours_included: 4 };
const reqs = [{ project_slug: "muzzaga", minutes: 30, done_at: null }];
assert.deepEqual(m.hoursUsage(plan, "muzzaga", reqs, today), { used: 0.5, included: 4, over: false }); // sin tramos: como antes
assert.deepEqual(m.hoursUsage(plan, "muzzaga", reqs, today, tramos), { used: 3, included: 4, over: false });
assert.deepEqual(m.hoursUsage({ ...plan, hours_included: 2 }, "muzzaga", reqs, today, tramos), { used: 3, included: 2, over: true });

// --- Semáforos y períodos ---------------------------------------------------------
assert.equal(n.toneUp(0.75, n.RECURRING_SHARE), "green");
assert.equal(n.toneUp(0.5, n.RECURRING_SHARE), "amber");
assert.equal(n.toneUp(0.1, n.RECURRING_SHARE), "red");
assert.equal(n.toneUp(null, n.RECURRING_SHARE), null);
assert.equal(n.toneDown(0.2, n.CONCENTRATION), "green"); // 20 % justo todavía no es riesgo
assert.equal(n.toneDown(0.25, n.CONCENTRATION), "amber");
assert.equal(n.toneDown(0.5, n.CONCENTRATION), "red");
assert.equal(n.toneDown(40, n.DAYS_TO_COLLECT), "green");
assert.equal(n.toneDown(61, n.DAYS_TO_COLLECT), "red");
assert.equal(n.toneUp(0.2, n.WIN_RATE), "amber");
assert.equal(n.toneUp(0.3, n.WIN_RATE), "green");

assert.deepEqual(n.windows("mes", today), { cur: ["2026-10"], prev: ["2026-09"], prevEnd: "2026-09-30" });
assert.deepEqual(n.windows("trimestre", "2026-02-10"), { cur: ["2025-12", "2026-01", "2026-02"], prev: ["2025-09", "2025-10", "2025-11"], prevEnd: "2025-11-30" });
assert.equal(n.last12(today).length, 12);
assert.equal(n.last12(today)[0], "2025-11");
assert.equal(n.change(120, 100), 0.2);
assert.equal(n.change(1, 0), null);
assert.equal(n.change(null, 5), null);

// --- Plata ----------------------------------------------------------------------------
const money = [
  entry({ id: "a", amount: 300 }), // proyecto, octubre
  entry({ id: "b", category: "mantenimiento", amount: 100 }), // abono cobrado
  entry({ id: "c", amount: 999, status: "pendiente" }), // pendiente: no cuenta
  entry({ id: "d", kind: "costo", category: "hosting", amount: 50 }),
  entry({ id: "s", category: "otros", amount: 100, series: "x:2026-10", project_slug: null }), // pendiente generado y cobrado
];
assert.deepEqual(n.recurringIncome(money, ["2026-10"]), { total: 500, recurring: 200, share: 0.4 });
assert.deepEqual(n.recurringIncome(money, ["2026-09"]), { total: 0, recurring: 0, share: null });

const dues = [
  entry({ id: "p1", status: "pendiente", occurred_on: "2026-09-20", due_on: "2026-09-20" }), // vencido hoy
  entry({ id: "p2", status: "pagado", occurred_on: "2026-10-03", due_on: "2026-09-25" }), // vencido al 30/09, se cobró después
  entry({ id: "p3", status: "pagado", occurred_on: "2026-09-10", due_on: "2026-09-01" }), // ya cobrado al 30/09
  entry({ id: "p4", status: "pendiente", occurred_on: "2026-10-30", due_on: "2026-10-30" }), // vence más adelante
];
assert.deepEqual(n.overdueAt(dues, today), { total: p.overdue(dues, today).total, count: p.overdue(dues, today).count }); // hoy, igual que overdue()
assert.deepEqual(n.overdueAt(dues, "2026-09-30"), { total: 200, count: 2 });
assert.equal(n.daysToCollectIn(dues, ["2026-10"]), 8);
assert.equal(n.daysToCollectIn(dues, ["2026-09"]), 9);
assert.equal(n.daysToCollectIn(dues, ["2026-08"]), null);

// --- Ventas ---------------------------------------------------------------------------
const leads = [
  lead({ id: "1", status: "ganado", won_at: "2026-10-02T12:00:00Z", channel: "referido" }),
  lead({ id: "2", status: "perdido", lost_at: "2026-10-03T12:00:00Z", channel: "referido" }),
  lead({ id: "3", status: "perdido", lost_at: "2026-10-04T12:00:00Z" }), // sin canal: el formulario (start)
  lead({ id: "4", status: "ganado", won_at: "2026-09-02T12:00:00Z" }),
  lead({ id: "5", status: "propuesta" }), // abierto: no está decidido
];
assert.equal(n.decidedIn(leads, ["2026-10"]).length, 3);
assert.equal(n.winRateIn(leads, ["2026-10"]), 1 / 3);
assert.equal(n.winRateIn(leads, ["2026-09"]), 1);
assert.equal(n.winRateIn(leads, ["2026-08"]), null);
assert.deepEqual(n.channelConversion(leads, ["2026-10"]), [
  { key: "referido", won: 1, decided: 2, rate: 0.5 },
  { key: "start", won: 0, decided: 1, rate: 0 },
]);

// --- Tarifa efectiva por hora -----------------------------------------------------
// Estudio en octubre: 400 USD de proyectos (el «s» sin proyecto no cuenta) / (150 min de tramos + 30 de un pedido viejo) = 3 h.
assert.deepEqual(n.studioRate(money, tramos, reqs, ["2026-10"], today), { usd: 400, hours: 3, rate: 133.33 });
assert.deepEqual(n.studioRate(money, [], [], ["2026-10"], today), { usd: 400, hours: 0, rate: null }); // sin horas no hay tarifa

// Proyecto con abono desde el 10/10: lo de antes es del proyecto; lo de después y los pedidos viejos, del abono.
const work = [
  tramo({ id: "w1", started_at: "2026-09-20T15:00:00Z", minutes: 120 }),
  tramo({ id: "w2", started_at: "2026-10-12T15:00:00Z", minutes: 30, maintenance_request_id: RID }),
  tramo({ id: "w3", project_slug: "otro", started_at: "2026-10-12T15:00:00Z", minutes: 60 }),
];
const rows = n.rateRows(money, work, reqs, [{ project_slug: "muzzaga", start_date: "2026-10-10" }], today);
assert.deepEqual(rows, [
  { slug: "muzzaga", kind: "proyecto", usd: 300, hours: 2, rate: 150 },
  { slug: "muzzaga", kind: "abono", usd: 100, hours: 1, rate: 100 },
  { slug: "otro", kind: "proyecto", usd: 0, hours: 1, rate: 0 },
]);
// Sin plan, todo lo cobrado y todas las horas son del proyecto.
assert.deepEqual(n.rateRows(money, work.slice(0, 2), [], [], today), [{ slug: "muzzaga", kind: "proyecto", usd: 400, hours: 2.5, rate: 160 }]);

console.log("check-numbers: ok");
