// Verifica el mapa de «En vivo»: apagado, días, semilla de visitas, novedades,
// la sala más apagada y que se llegue caminando a todas las salas.
// node scripts/check-oficinas.mjs
import assert from "node:assert/strict";

const S = await import("../lib/admin/oficinas-shared.ts");

// Apagado: en curso empieza al tercer día y se apaga al mes; el archivo, más lento.
assert.equal(S.fadeOf(0), 0);
assert.equal(S.fadeOf(2), 0);
assert.equal(S.fadeOf(16), 0.5);
assert.equal(S.fadeOf(30), 1);
assert.equal(S.fadeOf(90), 1);
assert.equal(S.fadeOf(null), 1);
assert.equal(S.fadeOf(14, "archive"), 0);
assert.equal(S.fadeOf(90, "archive"), 1);
assert.equal(S.zoneOf("mantenimiento"), "active");
assert.equal(S.zoneOf("entregado"), "archive");

// Días calendario en Argentina: pasar la medianoche cuenta 1, nunca −1.
const at = "2026-10-13T02:30:00Z"; // 12/10 23:30 en Buenos Aires
assert.equal(S.daysSince(at, Date.parse("2026-10-13T03:30:00Z")), 1); // 13/10 00:30
assert.equal(S.daysSince("2026-10-13T12:00:00Z", Date.parse("2026-10-13T20:00:00Z")), 0);
assert.equal(S.daysSince("2026-10-14T12:00:00Z", Date.parse("2026-10-13T20:00:00Z")), 0);
assert.equal(S.daysSince(null, Date.now()), null);
assert.equal(S.daysLabel(null), "nunca");
assert.equal(S.daysLabel(1), "hace 1 día");

// Semilla: la fila de visitas manda; si no hay, la más nueva entre lectura y cambio propio.
assert.equal(S.resolveVisit("2026-10-01T00:00:00Z", "2026-10-10T00:00:00Z", null), "2026-10-01T00:00:00Z");
assert.equal(S.resolveVisit(null, "2026-10-10T00:00:00Z", "2026-10-05T00:00:00Z"), "2026-10-10T00:00:00Z");
assert.equal(S.resolveVisit(null, null, "2026-10-05T00:00:00Z"), "2026-10-05T00:00:00Z");
assert.equal(S.resolveVisit(null, null, null), null);

// Novedades: sólo lo del otro, después de mi visita.
const events = [
  { id: "1", createdAt: "2026-10-10T10:00:00Z", actor: "franco", text: "a", projectSlug: "x" },
  { id: "2", createdAt: "2026-10-08T10:00:00Z", actor: "franco", text: "b", projectSlug: "x" },
  { id: "3", createdAt: "2026-10-11T10:00:00Z", actor: "federico", text: "c", projectSlug: "x" },
];
const nowMs = Date.parse("2026-10-12T00:00:00Z");
assert.equal(S.newSince(events, "federico", "2026-10-09T00:00:00Z", nowMs), 1);
assert.equal(S.newSince(events, "federico", null, nowMs), 2);
assert.equal(S.newSince(events, "franco", "2026-10-09T00:00:00Z", nowMs), 1);

// La sala más apagada: null sin proyectos; empate por nombre.
assert.equal(S.salaMasApagada([], () => null, nowMs), null);
const two = [{ slug: "b", name: "Beta", status: "mantenimiento" }, { slug: "a", name: "Alfa", status: "mantenimiento" }];
assert.equal(S.salaMasApagada(two, () => null, nowMs)?.slug, "a");
assert.equal(S.salaMasApagada(two, (s) => (s === "a" ? "2026-10-11T12:00:00Z" : null), nowMs)?.slug, "b");

// El tema de cada sala, con los datos reales de los casos de la web.
const themes = [
  ["Muzzaga Pádel", "Club de Pádel / Reservas Online", "Canchas de pádel en Catriel. Pádel de verdad.", "padel"],
  ["Poné La Pava", "E-commerce / Experiencia de Marca", "El ritual del mate es tuyo.", "mate"],
  ["Apex Performance", "Plataforma para Entrenadores", "Programación seria, no plantillas.", "gym"],
  ["Pravilo", "Entrenamiento y Movilidad", "Explorá tu cuerpo a otro nivel.", "yoga"],
  ["Altum Sci", "Inmobiliaria / Sitio Corporativo", "Tu inversión, en el corazón de la Patagonia.", "inmobiliaria"],
  ["Sentinel", "Tecnología Climática y Datos Satelitales", "Detectamos incendios en minutos, no en horas.", "clima"],
  ["iPhone Vita", "E-commerce / Tecnología", "Tu próxima tecnología.", "phones"],
  ["Takefyy", "Plataforma Digital", "Tu carta digital. Tus pedidos sin apps.", "carta"],
  ["Barbería Centro", "Landing", "", "studio"],
];
for (const [name, category, tagline, theme] of themes) assert.equal(S.themeOf({ name, category, tagline }), theme, name);

// Se llega caminando a todas las salas (y a cada oficina), con cualquier cantidad de proyectos y con todos los temas.
const statuses = ["mantenimiento", "desarrollo", "entregado", "diseno", "pausado", "entregado", "revision", "mantenimiento", "descubrimiento"];
for (const n of [0, 1, 4, 5, 8, 9, 18]) {
  const projects = Array.from({ length: n }, (_, i) => ({ slug: `p${i}`, status: statuses[i % statuses.length], theme: themes[i % themes.length][3] }));
  const m = S.buildMap(projects);
  assert.equal(m.rooms.filter((r) => r.kind === "project").length, n, `salas para ${n}`);
  for (const r of m.rooms) {
    const path = S.findPath(m, m.start, r.inside);
    assert.ok(path, `${n} proyectos: no se llega a ${r.id}`);
    assert.equal(S.roomAt(m, r.inside.x, r.inside.y)?.id, r.id, `${r.id}: la entrada queda adentro`);
    assert.equal(S.roomAt(m, r.outside.x, r.outside.y), null, `${r.id}: la salida queda en el pasillo`);
  }
  // Las paredes no se atraviesan: entre dos salas de proyecto vecinas no hay paso directo.
  const left = m.rooms.filter((r) => r.column === "left");
  if (left.length > 1) {
    const a = left[0];
    assert.equal(S.canStep(m, a.x + 1, a.y + a.d - 1, a.x + 1, a.y + a.d), false, "pared entre salas");
  }
}

console.log("oficinas OK");
