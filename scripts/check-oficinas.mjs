// Verifica el mapa de «En vivo»: apagado, días, semilla de visitas, novedades,
// la sala más apagada y que se llegue caminando a todas las salas.
// node scripts/check-oficinas.mjs
import assert from "node:assert/strict";
import { register } from "node:module";

// Importa el .ts directo (Node 22+); el hook deja resolver imports sin extensión.
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) {
        try { return await next(s, c); }
        catch (e) { if (s.startsWith(".")) return next(s + ".ts", c); throw e; }
      }`,
    ),
);

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
assert.equal(S.paceOf("mantenimiento"), "maintenance");
assert.equal(S.paceOf("desarrollo"), "active");
assert.equal(S.fadeOf(7, "maintenance"), 0);
assert.equal(S.fadeOf(24.5, "maintenance"), 0.5);
assert.equal(S.fadeOf(42, "maintenance"), 1);

// Días calendario en Argentina: pasar la medianoche cuenta 1, nunca −1.
const at = "2026-10-13T02:30:00Z"; // 12/10 23:30 en Buenos Aires
assert.equal(S.daysSince(at, Date.parse("2026-10-13T03:30:00Z")), 1); // 13/10 00:30
assert.equal(S.daysSince("2026-10-13T12:00:00Z", Date.parse("2026-10-13T20:00:00Z")), 0);
assert.equal(S.daysSince("2026-10-14T12:00:00Z", Date.parse("2026-10-13T20:00:00Z")), 0);
assert.equal(S.daysSince(null, Date.now()), null);
assert.equal(S.daysLabel(null), "nunca");
assert.equal(S.daysLabel(1), "hace 1 día");

// Semilla: la fila de visitas manda; si no hay, la más nueva entre lectura y cambio propio.
// Cuenta lo más nuevo: haber trabajado desde la ficha prende la sala aunque la última entrada sea vieja.
assert.equal(S.resolveVisit("2026-10-01T00:00:00Z", "2026-10-10T00:00:00Z", null), "2026-10-10T00:00:00Z");
assert.equal(S.resolveVisit("2026-10-12T00:00:00Z", "2026-10-10T00:00:00Z", "2026-10-11T00:00:00Z"), "2026-10-12T00:00:00Z");
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

// Las salas del estudio: recepción, las dos áreas (con el escritorio de cada socio), Reuniones y Chill-out.
{
  const m = S.buildMap([{ slug: "a", status: "mantenimiento" }, { slug: "b", status: "mantenimiento" }]);
  const kinds = m.rooms.map((r) => r.kind);
  for (const k of ["reception", "meeting", "lounge"]) assert.equal(kinds.filter((x) => x === k).length, 1, `una sala ${k}`);
  const offices = m.rooms.filter((r) => r.kind === "office");
  assert.deepEqual(offices.map((r) => [r.who, r.area]).sort(), [["federico", "design"], ["franco", "dev"]], "Franco en Desarrollo y Federico en Diseño");
  for (const r of offices) assert.ok(r.seat && S.roomAt(m, r.seat.x, r.seat.y)?.id === r.id, `${r.id}: el escritorio queda adentro`);
  assert.deepEqual(m.rooms.filter((r) => r.kind !== "project").map(S.studioRoomName), ["Recepción", "Desarrollo", "Diseño", "Reuniones", "Chill-out"]);
  // El Chill-out es abierto al eje; Reuniones tiene puerta
  const lounge = m.rooms.find((r) => r.kind === "lounge");
  for (let y = lounge.y; y < lounge.y + lounge.d; y++) assert.ok(S.canStep(m, lounge.x - 1, y, lounge.x, y) || !S.walkable(m, lounge.x, y), `Chill-out abierto en la fila ${y}`);
  const meet = m.rooms.find((r) => r.kind === "meeting");
  assert.equal(S.canStep(m, meet.x + meet.w, meet.y, meet.x + meet.w - 1, meet.y), false, "Reuniones: pared al eje fuera de la puerta");
  // El ala de proyectos empieza después del estudio y lleva su arco
  assert.ok(m.rooms.filter((r) => r.kind === "project").every((r) => r.y >= m.wingY), "los proyectos van en el ala");
  assert.equal(m.decor.filter((d) => d.k === "slogan" || d.k === "studiologo").length, 2, "el logo y la frase en la recepción");
}

// Los muñecos: cada socio con lo suyo, el guía con la remera del estudio y las visitas, siempre iguales a sí mismas.
{
  const T = await import("../lib/oficinas/toon.ts");
  const fe = T.toonLook("federico"), fr = T.toonLook("franco"), gu = T.toonLook("guia");
  assert.equal(fe.style, "federico");
  assert.ok(fe.tie && fe.collar && fe.grin, "Federico: camisa, corbata y la sonrisa");
  assert.equal(fr.style, "franco");
  assert.ok(fr.knit && fr.collar && !fr.tie, "Franco: sweater con el cuello de la camisa");
  assert.ok(gu.badge && gu.style === "cap", "el guía: gorra y credencial");
  const hex = /^#[0-9a-f]{6}$/i;
  for (let i = 0; i < 60; i++) {
    const id = `v:${((i * 2654435761) >>> 0).toString(16)}`;
    const v = T.toonLook(id);
    assert.equal(T.toonLook(id), v, "la misma visita, el mismo look");
    for (const k of ["hair", "skin", "main", "shade", "pants", "shoes"]) assert.match(v[k], hex, `${id}: ${k}`);
    // Nunca con el peinado ni la ropa de un socio: una visita no puede parecer Federico o Franco conectado
    assert.ok(["short", "side", "cap", "long", "bun", "afro", "buzz"].includes(v.style), `${id}: ${v.style}`);
    assert.ok(!v.tie && v.main !== fe.main && v.main !== fr.main, `${id}: ropa de un socio`);
  }
}

// Las láminas de los personajes: las poses que usa el motor, y cada cuadro adentro de su imagen.
{
  const { SHEETS } = await import("../lib/oficinas/personajes.ts");
  for (const [who, sh] of Object.entries(SHEETS)) {
    for (const pose of ["idle", "blink", "back", "phone0"]) assert.ok(sh.frames[pose], `${who}: falta ${pose}`);
    // Las caminatas: un ciclo de ocho cuadros de frente y otro de espaldas
    for (const base of ["walk", "walkb"]) assert.equal(Object.keys(sh.frames).filter((n) => new RegExp(`^${base}\\d$`).test(n)).length, 8, `${who}: ${base} de 8 cuadros`);
    if (who === "federico" || who === "franco") assert.ok(sh.frames.sit, `${who}: falta sentado`);
    // El saludo y la charla, de a cuatro cuadros; los dueños, sentados tipeando y sus pausas
    for (const base of ["wave", "talk", "idle", "phone"]) for (let i = 0; i < 4; i++) assert.ok(sh.frames[`${base}${i}`], `${who}: falta ${base}${i}`);
    if (who === "federico" || who === "franco") for (const pose of ["type0", "type1", "type2", "type3", "think", "sip", "stretch", "doze"]) assert.ok(sh.frames[pose], `${who}: falta ${pose}`);
    for (const [pose, [x, y, w, h, ax, ay]] of Object.entries(sh.frames)) {
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0, `${who}/${pose}: caja`);
      assert.ok(ax >= 0 && ax <= w && ay > 0 && ay <= h + 0.5, `${who}/${pose}: los pies adentro`);
    }
  }
}

// La lámina de los muebles: cada uno con su caja adentro de la imagen.
{
  const { MUEBLES } = await import("../lib/oficinas/muebles.ts");
  const names = Object.keys(MUEBLES.frames);
  assert.ok(names.length >= 40, "faltan muebles en la lámina");
  for (const [k, [x, y, w, h]] of Object.entries(MUEBLES.frames)) assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 2048, `mueble ${k}: caja`);
}

console.log("oficinas OK");
