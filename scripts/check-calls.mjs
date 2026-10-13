// Verifica los links de Meet, el aviso de llamada y la lectura de una llamada entrante:
// node scripts/check-calls.mjs
import assert from "node:assert/strict";

const { parseMeetLink, callNotice, incomingCall, MEET_NEW, MAX_RING_AGE_S } = await import("../lib/admin/calls.ts");

const ROOM = "https://meet.google.com/abc-defg-hij";

// Formas en que se pega una sala: todas terminan en el mismo link limpio.
for (const ok of [
  "https://meet.google.com/abc-defg-hij",
  "  https://meet.google.com/abc-defg-hij  ",
  "meet.google.com/abc-defg-hij",
  "http://meet.google.com/abc-defg-hij",
  "https://meet.google.com/abc-defg-hij?authuser=0&hs=179",
  "https://meet.google.com/abc-defg-hij/",
  "https://MEET.google.com/ABC-DEFG-HIJ",
  "abc-defg-hij",
  "ABC-DEFG-HIJ",
]) {
  assert.equal(parseMeetLink(ok), ROOM, ok);
}
assert.equal(parseMeetLink("https://meet.google.com/lookup/se7en-franco"), "https://meet.google.com/lookup/se7en-franco");

// Lo que no es una sala de Meet no pasa: el link viaja en un aviso a otra persona.
for (const bad of [
  "",
  null,
  undefined,
  "hola",
  "https://meet.google.com/new", // no es una sala todavía
  "https://meet.google.com/",
  "https://meet.google.com/abc-defg-hi", // código corto
  "https://meet.google.com/abc-defg-hijk", // código largo
  "https://meet.google.com.evil.com/abc-defg-hij",
  "https://evil.com/meet.google.com/abc-defg-hij",
  "https://zoom.us/j/123456789",
  "javascript:alert(1)",
  "https://meet.google.com/abc-defg-hij otra cosa",
  "https://user@meet.google.com.evil.com/abc-defg-hij",
]) {
  assert.equal(parseMeetLink(bad), null, String(bad));
}
assert.equal(MEET_NEW, "https://meet.google.com/new");

// El aviso: dice quién llama, a quién, abre la sala y no lleva datos de clientes.
const n = callNotice({ id: "franco", name: "Franco" }, "federico", ROOM);
assert.equal(n.title, "Franco te está llamando");
assert.equal(n.url, ROOM);
assert.deepEqual(n.tags, ["llamada", "de-franco", "para-federico"]);
assert.match(n.message, /Meet/);

// Llamada entrante: llega como mensaje de ntfy y se lee con las etiquetas, la sala y la hora.
const now = 1_800_000_000;
const msg = (over = {}) => ({ event: "message", tags: n.tags, click: ROOM, time: now - 3, ...over });
assert.deepEqual(incomingCall(msg(), "federico", now), { from: "franco", link: ROOM });
assert.equal(incomingCall(msg(), "franco", now), null); // no es para él: el que llama no suena
assert.equal(incomingCall(msg({ event: "open" }), "federico", now), null); // eventos de la conexión
assert.equal(incomingCall(msg({ event: "keepalive" }), "federico", now), null);
assert.equal(incomingCall(msg({ tags: ["pedido"] }), "federico", now), null); // otros avisos del panel
assert.equal(incomingCall(msg({ tags: ["llamada", "para-federico"] }), "federico", now), null); // sin quién llama
assert.equal(incomingCall(msg({ tags: ["llamada", "de-pepito", "para-federico"] }), "federico", now), null);
assert.equal(incomingCall(msg({ tags: ["llamada", "de-federico", "para-federico"] }), "federico", now), null); // a sí mismo
assert.equal(incomingCall(msg({ click: "https://evil.com/abc-defg-hij" }), "federico", now), null); // sala falsa
assert.equal(incomingCall(msg({ click: undefined }), "federico", now), null);
assert.equal(incomingCall(msg({ time: now - MAX_RING_AGE_S - 1 }), "federico", now), null); // vieja
assert.deepEqual(incomingCall(msg({ time: now - MAX_RING_AGE_S }), "federico", now), { from: "franco", link: ROOM });
for (const junk of [null, undefined, "x", 3, [], { tags: "llamada" }]) assert.equal(incomingCall(junk, "federico", now), null);

console.log("calls OK");
