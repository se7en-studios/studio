// Verifica las cuentas de Mantenimiento, Salud de los sitios y Clientes: node scripts/check-maintenance.mjs
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

const m = await import("../lib/admin/maintenance-shared.ts");
const h = await import("../lib/admin/site-health-shared.ts");
const cl = await import("../lib/admin/client-shared.ts");
const { morningDigest } = await import("../lib/admin/digest.ts");

const today = "2026-10-14";
const plan = (over) => ({
  project_slug: "muzzaga", amount: 150, currency: "USD", billing_day: 10, includes: "", hours_included: 4, active: true,
  start_date: "2026-10-01", billing_from: "2026-10-01", owner: "ambos", domain_expires_on: null, updated_at: null, updated_by: null, ...over,
});

// --- MRR: abonos activos normalizados a USD con la cotización ---------------------
assert.equal(m.mrr([], 1000), 0);
assert.equal(m.mrr([plan(), plan({ project_slug: "b", currency: "ARS", amount: 100_000 }), plan({ project_slug: "c", active: false })], 1000), 250);
assert.equal(m.mrr([plan({ currency: "ARS", amount: 100_000 })], 0), 0); // sin cotización no inventa dólares

// --- Cobros a generar: idempotente, desde el inicio o la reactivación, sin pausados ----
let due = m.dueCharges([plan()], new Set(), today);
assert.deepEqual(due, [{ project_slug: "muzzaga", period: "2026-10", due_on: "2026-10-10", amount: 150, currency: "USD", owner: "ambos" }]);
assert.deepEqual(m.dueCharges([plan()], new Set(["muzzaga|2026-10"]), today), []); // ya generado: nada
assert.deepEqual(m.dueCharges([plan({ active: false })], new Set(), today), []); // pausado: nada
assert.deepEqual(m.dueCharges([plan({ start_date: "2026-11-01" })], new Set(), today), []); // empieza el mes que viene
// Plan cargado en agosto: agosto, septiembre y octubre (salvo el ya generado).
due = m.dueCharges([plan({ start_date: "2026-08-01", billing_from: "2026-08-01", billing_day: 5 })], new Set(["muzzaga|2026-09"]), today);
assert.deepEqual(due.map((d) => d.period), ["2026-08", "2026-10"]);
assert.equal(due[0].due_on, "2026-08-05");
// Inicio viejo pero dado de alta hoy: sólo desde el alta, no un año de pendientes.
assert.deepEqual(m.dueCharges([plan({ start_date: "2025-01-01", billing_from: "2026-10-14" })], new Set(), today).map((d) => d.period), ["2026-10"]);
// Tope de meses hacia atrás.
assert.equal(m.dueCharges([plan({ start_date: "2025-01-01", billing_from: "2025-01-01" })], new Set(), today).length, 3);

// --- Estado del cobro del mes ----------------------------------------------------------
assert.equal(m.chargeState(null, today), "sin_generar");
assert.equal(m.chargeState({ status: "pagado", occurred_on: "2026-10-01" }, today), "cobrado");
assert.equal(m.chargeState({ status: "pendiente", occurred_on: "2026-10-20" }, today), "pendiente");
assert.equal(m.chargeState({ status: "pendiente", occurred_on: "2026-10-10" }, today), "vencido");

// --- Horas usadas vs incluidas del mes ----------------------------------------------------
const req = (over) => ({ project_slug: "muzzaga", minutes: 60, done_at: null, status: "nuevo", ...over });
const reqs = [
  req({ minutes: 90, done_at: "2026-10-03T15:00:00Z", status: "hecho" }), // hecho este mes
  req({ minutes: 120 }), // abierto: cuenta en el mes actual
  req({ minutes: 600, done_at: "2026-09-28T15:00:00Z", status: "hecho" }), // hecho el mes pasado
  req({ project_slug: "otro", minutes: 30 }),
];
assert.equal(m.minutesInMonth(reqs, "muzzaga", "2026-10", today), 210);
assert.equal(m.minutesInMonth(reqs, "muzzaga", "2026-09", today), 600);
assert.deepEqual(m.hoursUsage(plan(), "muzzaga", reqs, today), { used: 3.5, included: 4, over: false });
assert.deepEqual(m.hoursUsage(plan({ hours_included: 3 }), "muzzaga", reqs, today), { used: 3.5, included: 3, over: true });
assert.deepEqual(m.hoursUsage(null, "muzzaga", reqs, today), { used: 3.5, included: null, over: false });

// --- Pedidos abiertos por proyecto -----------------------------------------------------------
assert.deepEqual([...m.openBySlug(reqs)], [["muzzaga", 1], ["otro", 1]]);
assert.equal(m.durationLabel(0), "—");
assert.equal(m.durationLabel(45), "45 min");
assert.equal(m.durationLabel(90), "1 h 30 min");
assert.equal(m.durationLabel(120), "2 h");

// --- Validación de planes y pedidos ---------------------------------------------------------
assert.equal(m.cleanPlan({ amount: 0, currency: "USD", start_date: today }).ok, false);
assert.equal(m.cleanPlan({ amount: 10, currency: "USD", billing_day: 31, start_date: today }).ok, false);
const okPlan = m.cleanPlan({ amount: "150", currency: "ARS", billing_day: "5", hours_included: "", start_date: today, owner: "x" });
assert.equal(okPlan.ok, true);
assert.deepEqual([okPlan.value.amount, okPlan.value.billing_day, okPlan.value.hours_included, okPlan.value.owner], [150, 5, null, "ambos"]);
assert.equal(m.cleanRequest({ title: " " , project_slug: "muzzaga" }, true).ok, false);
assert.equal(m.cleanRequest({ title: "Cambiar foto", project_slug: "Mal Slug" }, true).ok, false);
assert.equal(m.cleanRequest({ status: "cualquiera" }, false).ok, false);
assert.deepEqual(m.cleanRequest({ minutes: "30.4" }, false), { ok: true, value: { minutes: 30 } });

// --- Salud de los sitios: alertas ---------------------------------------------------------
const check = (over) => ({
  project_slug: "a", checked_at: "2026-10-14T09:30:00Z", url: "https://a.com", ok: true, status_code: 200, ms: 1200,
  ssl_expires_on: "2027-01-01", domain_expires_on: "2027-06-01", error: "", ...over,
});
assert.deepEqual(h.siteAlerts([check()], today), []);
assert.deepEqual(h.siteAlerts([check({ ok: false, status_code: 503 })], today), [{ slug: "a", kind: "caido" }]);
assert.deepEqual(h.siteAlerts([check({ ms: 6000 })], today), [{ slug: "a", kind: "lento" }]);
assert.deepEqual(h.siteAlerts([check({ ok: false, ms: 9000 })], today), [{ slug: "a", kind: "caido" }]); // caído no suma «lento»
assert.deepEqual(h.siteAlerts([check({ ssl_expires_on: "2026-11-03" })], today), [{ slug: "a", kind: "ssl", days: 20 }]);
assert.deepEqual(h.siteAlerts([check({ ssl_expires_on: "2026-11-04" })], today), []); // 21 días: todavía no
assert.deepEqual(h.siteAlerts([check({ domain_expires_on: "2026-11-12" })], today), [{ slug: "a", kind: "dominio", days: 29 }]);
assert.deepEqual(h.siteAlerts([check({ domain_expires_on: "2026-10-10" })], today), [{ slug: "a", kind: "dominio", days: -4 }]); // vencido
// Dominio a mano: sólo si el chequeo no lo trajo, y también para sitios sin chequeo.
assert.deepEqual(h.siteAlerts([check({ domain_expires_on: null })], today, new Map([["a", "2026-10-20"]])), [{ slug: "a", kind: "dominio", days: 6 }]);
assert.deepEqual(h.siteAlerts([check()], today, new Map([["a", "2026-10-20"]])), []);
assert.deepEqual(h.siteAlerts([], today, new Map([["b", "2026-10-20"]])), [{ slug: "b", kind: "dominio", days: 6 }]);
// Alarma visual: responde pero se ve roto
assert.deepEqual(h.siteAlerts([check({ visual_change: 0.62 })], today), [{ slug: "a", kind: "visual", pct: 62 }]);
assert.deepEqual(h.siteAlerts([check({ visual_change: 0.29 })], today), []); // por debajo del umbral
assert.deepEqual(h.siteAlerts([check({ visual_change: null })], today), []); // sin captura anterior
assert.deepEqual(h.siteAlerts([check({ blank: true, visual_change: 0.1 })], today), [{ slug: "a", kind: "visual", pct: 100 }]);
assert.deepEqual(h.siteAlerts([check({ ok: false, blank: true, visual_change: 0.9 })], today), [{ slug: "a", kind: "caido" }]); // caído ya lo dice
assert.equal(h.visualDetail(62), "cambió el 62 % desde ayer");
assert.equal(h.visualDetail(100), "quedó en blanco");
const latest = h.latestBySlug([check({ checked_at: "2026-10-12T09:00:00Z", ok: false }), check(), check({ project_slug: "b" })]);
assert.equal(latest.get("a").ok, true);
assert.equal(latest.size, 2);
assert.equal(h.healthLabel(undefined), "Sin chequeo");
assert.equal(h.healthLabel(check({ ok: false, status_code: 503 })), "Caído (503)");
assert.equal(h.healthLabel(check({ ms: 1250 })), "OK · 1,3 s");

// --- Resumen de las 9: alertas de sitios sin nombres -----------------------------------------
const base = { posts: [], today, overdueTasks: 0, dueTodayTasks: 0, newLeads: 0 };
const digest = morningDigest({
  ...base,
  siteAlerts: [
    { slug: "muzzaga", kind: "caido" },
    { slug: "altum", kind: "caido" },
    { slug: "x", kind: "lento" },
    { slug: "y", kind: "ssl", days: 5 },
    { slug: "z", kind: "dominio", days: 10 },
  ],
});
assert.equal(digest.message, ["• 2 sitios caídos", "• 1 sitio lento", "• SSL por vencer en 1 sitio", "• Dominio por vencer en 1 sitio"].join("\n"));
assert.ok(!/muzzaga|altum/.test(digest.message), "el aviso no lleva nombres de clientes");
assert.equal(morningDigest({ ...base, siteAlerts: [] }), null);

// --- Clientes ---------------------------------------------------------------------------------
assert.equal(cl.cleanClient({ name: "  " }, true).ok, false);
assert.equal(cl.cleanClient({ email: "no-es-mail" }, false).ok, false);
assert.equal(cl.cleanClient({ cuit: "20-123" }, false).ok, false);
assert.deepEqual(cl.cleanClient({ cuit: "20123456789", email: " Hola@Muzzaga.COM " }, false), { ok: true, value: { email: "hola@muzzaga.com", cuit: "20-12345678-9" } });
assert.equal(cl.cleanClient({ iva: "inventado" }, false).ok, false);

console.log("check-maintenance: ok");
