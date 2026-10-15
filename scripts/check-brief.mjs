// Verifica la prioridad de los pedidos y el valor de cada rango de presupuesto:
// node scripts/check-brief.mjs
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

const b = await import("../lib/admin/brief.ts");
const m = await import("../lib/admin/metrics.ts");

// Presupuesto: los rangos de los dos formularios del sitio (contacto y /start).
const budgets = {
  // components/sections/contact.tsx
  "Menos de USD 1.500": 900,
  "USD 1.500 – 3.000": 2250,
  "USD 3.000 – 6.000": 4500,
  "Más de USD 6.000": 9000,
  "Todavía no sé": 0,
  // app/(site)/start/start-client.tsx
  "< $1.500 USD": 900,
  "$1.500 – $3.000 USD": 2250,
  "$3.000 – $6.000 USD": 4500,
  "$6.000+ USD": 9000,
  "A definir según alcance": 0,
  // Por defecto de la API y de la reserva de llamada.
  "A definir": 0,
  "Llamada inicial": 0,
  "": 0,
  // Cargados a mano.
  "2000": 2000,
  "USD 2.500": 2500,
};
for (const [text, value] of Object.entries(budgets)) assert.equal(b.budgetValue(text), value, text);

// Prioridad. El bug: «Normal (2 a 4 semanas)», el plazo por defecto de /start,
// contaba como urgente por «semana» y casi todo salía «alta».
const p = (budget, timeline) => b.priority({ budget, timeline });
assert.equal(p("$1.500 – $3.000 USD", "Normal (2 a 4 semanas)"), "media"); // lo que manda /start sin tocar nada
assert.equal(p("$1.500 – $3.000 USD", "Urgente (menos de 2 semanas — Sprint Exprés)"), "alta");
assert.equal(p("$1.500 – $3.000 USD", "Flexible (1 a 2 meses)"), "media");
assert.equal(p("< $1.500 USD", "Normal (2 a 4 semanas)"), "baja");
assert.equal(p("< $1.500 USD", "Urgente (menos de 2 semanas — Sprint Exprés)"), "media");
assert.equal(p("$3.000 – $6.000 USD", "Flexible (1 a 2 meses)"), "alta");
assert.equal(p("$6.000+ USD", "Flexible"), "alta");
assert.equal(p("Menos de USD 1.500", "Flexible"), "baja");
assert.equal(p("A definir", "Flexible"), "baja");

// Qué cuenta como apuro y qué no.
for (const urgent of ["Urgente", "ASAP", "Lo necesito ya", "Ya!", "Para esta semana", "En 2 semanas", "menos de una semana", "En un mes", "1 mes", "Cuanto antes", "Express"])
  assert.equal(p("", urgent), "media", urgent);
for (const calm of ["Normal (2 a 4 semanas)", "Flexible (1 a 2 meses)", "Flexible", "3 a 6 semanas", "En 3 meses", "Martes 5 de mayo — 10:00", "Playa en enero", "Sin apuro", ""])
  assert.equal(p("", calm), "baja", calm);

// Ganado este mes: la fecha de cierre manda; sin ella, el último cambio.
const lead = (over) => ({ status: "ganado", value: 1000, budget: "", created_at: "2026-08-01T15:00:00Z", updated_at: "2026-10-10T15:00:00Z", ...over });
assert.equal(m.wonAt(lead({ won_at: "2026-09-20T15:00:00Z" })), "2026-09-20T15:00:00Z");
assert.equal(m.wonAt(lead({})), "2026-10-10T15:00:00Z"); // sin crm-v2.sql
assert.equal(m.wonAt(lead({ won_at: null })), "2026-10-10T15:00:00Z");
const leads = [
  lead({ won_at: "2026-09-20T15:00:00Z" }), // ganado en septiembre, editado en octubre: no es de octubre
  lead({ won_at: "2026-10-02T15:00:00Z", value: 2500 }),
  lead({ status: "propuesta", won_at: null, value: 9999 }),
  lead({ value: null, budget: "USD 1.500 – 3.000" }), // sin won_at: cae al último cambio (octubre)
];
assert.equal(m.wonInMonth(leads, "2026-10"), 4750);
assert.equal(m.wonInMonth(leads, "2026-09"), 1000);
// 23 h del 31/10 en Buenos Aires (02 h UTC del 1/11) es octubre.
assert.equal(m.wonInMonth([lead({ won_at: "2026-11-01T02:00:00Z" })], "2026-10"), 1000);

console.log("brief OK");
