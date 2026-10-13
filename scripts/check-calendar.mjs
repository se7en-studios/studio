// Verifica las fechas y la clasificación por proyecto del calendario:
// node scripts/check-calendar.mjs
import assert from "node:assert/strict";

const { addMonths, monthGrid, projectOfTitle, groupByDay, dayNumber } = await import("../lib/admin/calendar-shared.ts");

// Grilla del mes: lunes a domingo, semanas completas.
const oct = monthGrid("2026-10");
assert.equal(oct.length, 35);
assert.equal(oct[0], "2026-09-28"); // lunes
assert.equal(oct.at(-1), "2026-11-01"); // domingo
assert.equal(monthGrid("2027-02").length, 28); // arranca lunes y termina domingo
assert.equal(monthGrid("2026-02")[0], "2026-01-26"); // arranca domingo: 6 días del mes anterior
assert.equal(monthGrid("2026-11")[0], "2026-10-26");
assert.equal(addMonths("2026-12", 1), "2027-01");
assert.equal(addMonths("2026-01", -1), "2025-12");
assert.equal(dayNumber("2026-10-09"), 9);

// Un post se clasifica por el proyecto que nombra su título.
const projects = [
  { slug: "takefyy", name: "Takefyy" }, { slug: "pone-la-pava", name: "Poné La Pava" },
  { slug: "sentinel", name: "Sentinel" }, { slug: "apex-ai", name: "Apex Performance" },
  { slug: "altum-sci", name: "Altum Sci" }, { slug: "pravilo", name: "Pravilo" },
  { slug: "muzzaga", name: "Muzzaga Pádel" }, { slug: "iphone-vita", name: "iPhone Vita" },
];
const expected = [
  ["Caso: Takefyy", "takefyy"], ["Reel: la web de Takefyy", "takefyy"],
  ["Caso: Poné La Pava", "pone-la-pava"], ["Reel: la web de Poné La Pava", "pone-la-pava"],
  ["Caso: Sentinel", "sentinel"], ["Caso: Apex Performance", "apex-ai"], ["Reel: la web de Apex", "apex-ai"],
  ["Caso: Altum Inmobiliaria", "altum-sci"], ["Reel: la web de Altum", "altum-sci"],
  ["Caso: Pravilo", "pravilo"], ["Caso: Muzzaga Padel", "muzzaga"], ["Reel: la web de Muzzaga Pádel", "muzzaga"],
  ["Caso: iPhone Vita", "iphone-vita"], ["Reel: la web de iPhone Vita", "iphone-vita"],
  // Sin proyecto: no se debe adivinar uno.
  ["Reel: ¿Agencia, freelancer o Se7en?", null], ["Reel: ¿Tu negocio solo existe en Instagram?", null],
  ["Historias: encuesta", null], ["Armar las 6 destacadas", null], ["Foto de perfil, nombre, bio y contacto", null],
  ["Reel: ¿Qué incluye tu web?", null], ["Reel: 4 cosas que hacemos muy bien", null],
  ["Carrusel: 7 preguntas antes de contratar una web", null], ["Reel: De una idea a tu web en vivo", null],
];
for (const [title, slug] of expected) assert.equal(projectOfTitle(title, projects), slug, title);

const byDay = groupByDay([{ date: "2026-10-13" }, { date: "2026-10-13" }, { date: "2026-10-14" }]);
assert.equal(byDay.get("2026-10-13")?.length, 2);

console.log("calendar OK");
