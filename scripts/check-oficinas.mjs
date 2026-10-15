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
  // Cada sala lleva su marca: el felpudo afuera de la puerta (sin tapar el paso) y el cartel en una pared entera, adentro.
  for (const r of m.rooms.filter((x) => x.kind === "project")) {
    const mats = m.furni.filter((f) => f.k === "doormat" && f.room === r.id);
    assert.equal(mats.length, 1, `${r.id}: un felpudo`);
    assert.deepEqual([mats[0].x, mats[0].y, mats[0].solid], [r.outside.x, r.outside.y, false], `${r.id}: el felpudo va afuera de la puerta`);
    assert.equal(m.furni.filter((f) => f.k === "tvstand" && f.room === r.id).length, 1, `${r.id}: una tele`);
    // El cartel va sólo en las de la izquierda (en las de la derecha, la tele ocupa su pared)
    const signs = m.decor.filter((d) => d.k === "brand" && d.room === r.id);
    assert.equal(signs.length, r.column === "left" ? 1 : 0, `${r.id}: carteles`);
    for (const s of signs) {
      for (let y = s.y; y < s.y + s.len; y++) {
        assert.notEqual(m.edgeL[y][s.x], "none", `${r.id}: el cartel cuelga de una pared`);
        assert.equal(S.hasDoor(m, s.x, y, "L"), false, `${r.id}: el cartel no tapa la puerta`);
        assert.equal(S.roomAt(m, s.x, y)?.id, r.id, `${r.id}: el cartel queda adentro`);
      }
    }
  }
  // Las paredes no se atraviesan: entre dos salas de proyecto vecinas no hay paso directo.
  const left = m.rooms.filter((r) => r.column === "left");
  if (left.length > 1) {
    const a = left[0];
    assert.equal(S.canStep(m, a.x + 1, a.y + a.d - 1, a.x + 1, a.y + a.d), false, "pared entre salas");
  }
}

// Cartel LED: sólo la hora, la marca y los nombres de los proyectos (se ve de afuera).
{
  const now = Date.parse("2026-10-14T17:32:00Z"); // 14:32 en Buenos Aires
  const projects = [
    { name: "Apex «Pro»", accent: "#ff0000", events: [{ id: "1", createdAt: "2026-10-14T15:00:00Z", actor: "franco", text: "secreto", projectSlug: "a" }] },
    { name: "Bo", accent: "#00ff00", events: [] },
  ];
  const msgs = S.ledMessages(projects, now);
  assert.deepEqual(msgs.map((m) => m.map((p) => p.text).join("")), ["14:32", "SE7EN STUDIO", 'APEX "PRO"', "BO"]);
  assert.equal(msgs[2][0].color, "#ff0000", "cada nombre en el color de su proyecto");
  assert.ok(!JSON.stringify(msgs).includes("SECRETO"), "nada de movimientos ni mensajes");
  assert.deepEqual(S.ledMessages(projects).map((m) => m[0].text), ["SE7EN STUDIO", 'APEX "PRO"', "BO"], "sin hora en la landing");
}

// Muñecos en pixel art: cada mapa tiene el ancho que le toca y cada combinación entra en la grilla.
{
  const SP = await import("../lib/oficinas/sprites.ts");
  for (const m of SP.SPRITE_MAPS) m.rows.forEach((r, i) => assert.equal(r.length, m.width, `${m.name}, fila ${i}`));
  const look = { style: "federico", hair: "#000000", hair2: "#111111", skin: "#222222", skin2: "#333333", main: "#444444", shade: "#555555", collar: "#666666", tie: "#777777", pants: "#888888", shoes: "#999999" };
  for (const style of ["federico", "franco", "cap", "long", "bun", "afro", "buzz"])
    for (const back of [false, true])
      for (const pose of [{ walk: 0 }, { walk: 1 }, { wave: 0 }, { wave: 1 }, { phone: true }, { sit: true, type: 1 }, { blink: true }]) {
        const m = SP.composeSprite({ ...look, style, glasses: true, beard: true, phones: "#aaaaaa", pack: "#bbbbbb", stripes: "#cccccc", badge: true }, { back, walk: 0, wave: null, phone: false, sit: false, type: null, blink: false, ...pose });
        assert.equal(m.length, SP.SPRITE_H);
        assert.ok(m.every((row) => row.length === SP.SPRITE_W), `${style} ${back} ${JSON.stringify(pose)}`);
        assert.ok(m.flat().filter(Boolean).length > 150, `${style}: el muñeco tiene cuerpo`);
      }
  for (const f of [0, 1, "sleep"]) assert.ok(SP.catSprite(f).every((row) => row.length === SP.CAT_W), `gato ${f}`);
}

console.log("oficinas OK");
