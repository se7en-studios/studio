// Verifica cómo se arman y se eligen las plantillas del primer mensaje:
// node scripts/check-prospect-templates.mjs
import assert from "node:assert/strict";
import "./ts-hook.mjs";

const { renderTemplate, unknownVariables, templateVars, pickTemplate, DEFAULT_TEMPLATES } = await import("../lib/admin/prospect-template-shared.ts");

const lead = { name: "Impacto Padel Club", city: "Cipolletti", category: "Club de Pádel & Deporte" };
const vars = templateVars(lead, "Franco");
assert.deepEqual(vars, { nombre: "Impacto Padel Club", ciudad: "Cipolletti", rubro: "club de pádel y deporte", yo: "Franco", dias: "unos" });
// «hace {dias} días»: con el dato, el número; sin él (o con 1), «unos».
assert.equal(renderTemplate("hace {dias} días", templateVars(lead, "Franco", 4)), "hace 4 días");
assert.equal(renderTemplate("hace {dias} días", templateVars(lead, "Franco", null)), "hace unos días");
assert.equal(renderTemplate("hace {dias} días", templateVars(lead, "Franco", 1)), "hace unos días");

// Se reemplaza todo lo conocido; lo desconocido queda a la vista.
assert.equal(renderTemplate("Hola {nombre}, soy {yo} de {ciudad}. {nombre}!", vars), "Hola Impacto Padel Club, soy Franco de Cipolletti. Impacto Padel Club!");
assert.equal(renderTemplate("Hola {nombr}", vars), "Hola {nombr}");
assert.deepEqual(unknownVariables("{nombre} {nombr} {x} {x}"), ["nombr", "x"]);
assert.deepEqual(unknownVariables("sin variables"), []);

// Las sugeridas no dejan llaves sin reemplazar y no cuelan números inventados.
for (const t of DEFAULT_TEMPLATES) {
  assert.deepEqual(unknownVariables(t.body), [], t.name);
  assert.ok(!/\{/.test(renderTemplate(t.body, vars)), t.name);
  assert.ok(!/\$\s?\d/.test(t.body), `${t.name}: sin montos`);
}

// Elegir: sólo activas, sin repetir la última, y siempre devuelve algo mientras haya una activa.
const a = { id: "a", name: "A", body: "a", active: true, kind: "primero" };
const b = { id: "b", name: "B", body: "b", active: true, kind: "primero" };
const off = { id: "c", name: "C", body: "c", active: false, kind: "primero" };
const f1 = { id: "f1", name: "F1", body: "f", active: true, kind: "seguimiento" };
assert.equal(pickTemplate([], null), null);
assert.equal(pickTemplate([off], null), null);
assert.equal(pickTemplate([a, off], "a")?.id, "a"); // una sola activa: no hay otra opción
for (const r of [0, 0.3, 0.99]) {
  assert.equal(pickTemplate([a, b, off], "a", "primero", () => r)?.id, "b");
  assert.equal(pickTemplate([a, b, off], "b", "primero", () => r)?.id, "a");
}
assert.deepEqual(new Set([0, 0.4, 0.8].map((r) => pickTemplate([a, b], null, "primero", () => r)?.id)), new Set(["a", "b"]));

// Cada tipo elige sólo entre las suyas.
assert.equal(pickTemplate([a, b, f1], null, "seguimiento")?.id, "f1");
assert.equal(pickTemplate([a, b], null, "seguimiento"), null);
assert.ok(pickTemplate([a, f1], null, "primero")?.id === "a");
// Las sugeridas traen de los dos tipos.
assert.ok(DEFAULT_TEMPLATES.some((t) => t.kind === "primero") && DEFAULT_TEMPLATES.some((t) => t.kind === "seguimiento"));

console.log("plantillas de prospectos: ok");
