// Verifica las cuentas y reglas de ventas: pipeline, pronóstico, tasa de cierre,
// pedidos para retomar, reconocer a quien vuelve a escribir y reuniones.
// node scripts/check-sales.mjs
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

const m = await import("../lib/admin/metrics.ts");
const s = await import("../lib/admin/sales-shared.ts");

const lead = (over) => ({
  id: "x", status: "nuevo", value: null, budget: "", email: "", phone: "", name: "Ana",
  created_at: "2026-10-01T12:00:00Z", updated_at: "2026-10-01T12:00:00Z", lost_at: null, lost_reason: null, meeting_at: null, ...over,
});

// Pipeline: sólo contactados y con propuesta; monto acordado antes que el rango.
const leads = [
  lead({ status: "nuevo", value: 1000 }),
  lead({ status: "contactado", value: 2000 }),
  lead({ status: "propuesta", budget: "USD 1.500 – 3.000" }), // 2250 por el rango
  lead({ status: "ganado", value: 5000 }),
  lead({ status: "perdido", value: 9000 }),
  lead({ status: "perdido", value: 100 }),
];
assert.equal(m.pipelineValue(leads), 4250);
// Ponderado: 1000·0,1 + 2000·0,25 + 2250·0,5; ganados y perdidos no suman.
assert.equal(m.weightedPipeline(leads), 100 + 500 + 1125);
// Tasa de cierre: ganados / (ganados + perdidos).
assert.equal(m.winRate(leads), 1 / 3);
assert.equal(m.winRate([lead({ status: "nuevo" })]), null);
assert.equal(m.pipelineValue([]), 0);
// computeMetrics usa las mismas funciones.
const metrics = m.computeMetrics(leads, null, null, 1, Date.parse("2026-10-10"));
assert.equal(metrics.pipelineValue, 4250);
assert.equal(metrics.winRate, 1 / 3);

// Para retomar: perdido hace más de 60 días, salvo «no era cliente».
const now = Date.parse("2026-10-14T12:00:00Z");
const old = "2026-07-01T12:00:00Z";
assert.equal(s.toRetake(lead({ status: "perdido", lost_at: old, lost_reason: "precio" }), now), true);
assert.equal(s.toRetake(lead({ status: "perdido", lost_at: old, lost_reason: "no_cliente" }), now), false);
assert.equal(s.toRetake(lead({ status: "perdido", lost_at: "2026-10-01T12:00:00Z" }), now), false);
assert.equal(s.toRetake(lead({ status: "propuesta", lost_at: old }), now), false);
// Sin lost_at (falta crm-v3.sql) usa el último cambio.
assert.equal(s.toRetake(lead({ status: "perdido", updated_at: old }), now), true);
assert.equal(s.isLostReason("precio"), true);
assert.equal(s.isLostReason("cualquiera"), false);
assert.equal(s.lostReasonLabel("otro_proveedor"), "Eligió a otro");
assert.equal(s.lostReasonLabel(null), "");

// Teléfonos: el mismo número escrito de distintas formas.
assert.equal(s.phoneKey("+54 9 299 412-3456"), "2994123456");
assert.equal(s.phoneKey("0299 4123456"), "2994123456");
assert.equal(s.phoneKey("123"), null);
assert.equal(s.cleanPublicPhone(" 299 412-3456 "), "299 412-3456");
for (const bad of ["abc", "123", "299 412 3456 ext 2", "1".repeat(25), 42, null]) assert.equal(s.cleanPublicPhone(bad), "", String(bad));

// Contacto en texto libre (kickoff).
assert.deepEqual(s.contactFrom("Franco Gómez · +54 9 299 123-4567"), { email: "", phone: "+54 9 299 123-4567", rest: "Franco Gómez" });
assert.deepEqual(s.contactFrom("Ana <Ana@Mail.com>"), { email: "ana@mail.com", phone: "", rest: "Ana" });
assert.deepEqual(s.contactFrom("Juan, juan_p@x.io, 2994123456"), { email: "juan_p@x.io", phone: "2994123456", rest: "Juan" });
assert.deepEqual(s.contactFrom("Sólo un nombre"), { email: "", phone: "", rest: "Sólo un nombre" });

// El pedido que corresponde: email (sin importar mayúsculas) o teléfono; mejor uno no perdido y el más reciente.
const pool = [
  lead({ id: "a", email: "ana@x.com", status: "perdido", created_at: "2026-10-05T00:00:00Z" }),
  lead({ id: "b", email: "ANA@x.com", status: "contactado", created_at: "2026-09-01T00:00:00Z" }),
  lead({ id: "c", phone: "+54 9 299 412-3456", status: "ganado", created_at: "2026-08-01T00:00:00Z" }),
  lead({ id: "d", email: "otro@x.com", status: "nuevo", created_at: "2026-10-10T00:00:00Z" }),
];
assert.equal(s.findMatch(pool, { email: "ana@x.com" })?.id, "b");
assert.equal(s.findMatch(pool, { phone: "2994123456" })?.id, "c");
assert.equal(s.findMatch(pool, { email: "nadie@x.com", phone: "123" }), null);
assert.equal(s.findMatch(pool, {}), null);
assert.equal(s.findMatch([pool[0]], { email: "ana@x.com" })?.id, "a"); // sólo perdido: igual lo usa

// Reuniones: fecha posible (hasta 90 días, una hora de gracia hacia atrás).
assert.equal(s.parseMeeting("2026-10-15T14:00:00-03:00", now), "2026-10-15T17:00:00.000Z");
assert.equal(s.parseMeeting("2026-10-14T11:30:00Z", now), "2026-10-14T11:30:00.000Z");
for (const bad of ["2026-10-14T10:00:00Z", "2027-06-01T10:00:00Z", "mañana", "", 123, null]) assert.equal(s.parseMeeting(bad, now), null, String(bad));
const meetings = s.upcomingMeetings(
  [
    lead({ id: "p", meeting_at: "2026-10-20T13:00:00Z" }),
    lead({ id: "q", meeting_at: "2026-10-10T13:00:00Z" }), // pasada
    lead({ id: "r", meeting_at: "2026-10-15T13:00:00Z" }),
    lead({ id: "s" }),
  ],
  now,
);
assert.deepEqual(meetings.map((x) => x.lead_id), ["r", "p"]);
assert.match(s.meetingLabel("2026-10-15T17:00:00Z"), /14:00/);

console.log("check-sales: ok");
