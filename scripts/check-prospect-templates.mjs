// Verifica cómo se arman y se eligen las plantillas del primer mensaje:
// node scripts/check-prospect-templates.mjs
import assert from "node:assert/strict";
import "./ts-hook.mjs";

const { renderTemplate, unknownVariables, templateVars, pickTemplate, DEFAULT_TEMPLATES } = await import("../lib/admin/prospect-template-shared.ts");

const lead = { name: "Impacto Padel Club", city: "Cipolletti", category: "Club de Pádel & Deporte" };
const vars = templateVars(lead, "Franco");
assert.deepEqual(vars, { nombre: "Impacto Padel Club", ciudad: "Cipolletti", rubro: "club de pádel y deporte", yo: "Franco" });

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
const a = { id: "a", name: "A", body: "a", active: true };
const b = { id: "b", name: "B", body: "b", active: true };
const off = { id: "c", name: "C", body: "c", active: false };
assert.equal(pickTemplate([], null), null);
assert.equal(pickTemplate([off], null), null);
assert.equal(pickTemplate([a, off], "a")?.id, "a"); // una sola activa: no hay otra opción
for (const r of [0, 0.3, 0.99]) {
  assert.equal(pickTemplate([a, b, off], "a", () => r)?.id, "b");
  assert.equal(pickTemplate([a, b, off], "b", () => r)?.id, "a");
}
assert.deepEqual(new Set([0, 0.4, 0.8].map((r) => pickTemplate([a, b], null, () => r)?.id)), new Set(["a", "b"]));

console.log("plantillas de prospectos: ok");
