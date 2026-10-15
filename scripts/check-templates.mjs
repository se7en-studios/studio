// Verifica las plantillas de respuesta y los links de WhatsApp y mail:
// node scripts/check-templates.mjs
import assert from "node:assert/strict";

const t = await import("../lib/admin/templates.ts");

// Número de WhatsApp: con o sin 0, con espacios y guiones, y con código de país.
assert.equal(t.waNumber("2994 12-3456"), "5492994123456");
assert.equal(t.waNumber("02994123456"), "5492994123456");
assert.equal(t.waNumber("+54 9 299 412-3456"), "5492994123456");
assert.equal(t.waNumber("54 299 412 3456"), "5492994123456"); // sin el 9
assert.equal(t.waNumber("(299) 412-3456"), "5492994123456");
// Lo que no se puede normalizar con seguridad no arma un chat.
for (const bad of ["", null, undefined, "123", "abc", "29941234567890"]) assert.equal(t.waNumber(bad), null, String(bad));

assert.equal(t.waLink("2994123456", "Hola ñandú"), "https://wa.me/5492994123456?text=Hola%20%C3%B1and%C3%BA");
assert.equal(t.waLink("", "x"), null);
// Una sola función arma todos los links de WhatsApp del panel: sin texto abre el chat solo.
assert.equal(t.waLink("2994123456"), "https://wa.me/5492994123456");
assert.equal(t.waLink("+54 9 299 412-3456", ""), "https://wa.me/5492994123456");
// Del exterior, sólo con «+» y código de país.
assert.equal(t.waNumber("+1 (555) 123-4567"), "15551234567");
assert.equal(t.waNumber("+34 612 345 678"), "34612345678");
assert.equal(t.waNumber("1 555 123 4567 89"), null);
assert.equal(t.mailLink("a@b.com", "Tu proyecto", "Hola\nchau"), "mailto:a@b.com?subject=Tu%20proyecto&body=Hola%0Achau");

// Variables: primer nombre y proyecto, con texto neutro si faltan.
assert.deepEqual(t.leadVars({ name: "  María Laura Pérez ", project_type: " Tienda online " }), { nombre: "María", proyecto: "Tienda online" });
assert.deepEqual(t.leadVars({ name: "Juan" }), { nombre: "Juan", proyecto: "tu proyecto" });
assert.deepEqual(t.leadVars({ name: "", project_type: "" }), { nombre: "hola", proyecto: "tu proyecto" });

// Ninguna plantilla deja llaves sin completar, y todas se firman.
const vars = t.leadVars({ name: "Ana Gómez", project_type: "Web" });
for (const tpl of t.TEMPLATES) {
  for (const text of [t.fill(tpl.subject, vars), t.fill(tpl.body, vars)]) assert.ok(!/[{}]/.test(text), `${tpl.id}: ${text}`);
  assert.match(tpl.body, /Se7en Studio$/);
}
assert.match(t.fill(t.TEMPLATES[0].body, vars), /^Hola Ana! Gracias por escribirnos\./);

// Cada etapa tiene una plantilla sugerida que existe.
for (const status of ["nuevo", "contactado", "propuesta", "ganado", "perdido"]) {
  assert.ok(t.TEMPLATES.some((x) => x.id === t.suggestedTemplate(status)), status);
}
assert.equal(t.suggestedTemplate("nuevo"), "primera");
assert.equal(t.suggestedTemplate("propuesta"), "seguimiento");

console.log("templates OK");
