// Verifica la alarma visual (scripts/visual-diff.mjs): node scripts/check-visual.mjs
import assert from "node:assert/strict";
import { BLANK_SHARE, compareGrids, GRID_W, isBlank, sameColorShare } from "./visual-diff.mjs";

const W = GRID_W;
/** Una «página» de h filas: cada fila tiene un color distinto (como secciones con contenido). */
function page(h, color = (y) => [(y * 37) % 256, (y * 91) % 256, (y * 53) % 256]) {
  const data = new Uint8Array(W * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < W; x++) data.set(color(y, x), (y * W + x) * 3);
  return { w: W, h, data };
}
const plain = (h, rgb) => page(h, () => rgb);

// Igual: 0
const a = page(300);
assert.equal(compareGrids(a, page(300)), 0);

// Un poco de ruido (compresión, antialiasing) no cuenta
const noisy = page(300, (y) => [(y * 37) % 256, (y * 91) % 256, (y * 53) % 256].map((v) => Math.max(0, v - 12)));
assert.equal(compareGrids(a, noisy), 0);

// Una sección de 40 filas que crece y empuja todo lo de abajo: sólo cuenta lo nuevo
const pushed = page(300, (y) => (y < 100 ? [(y * 37) % 256, (y * 91) % 256, (y * 53) % 256] : y < 110 ? [255, 0, 255] : [((y - 10) * 37) % 256, ((y - 10) * 91) % 256, ((y - 10) * 53) % 256]));
assert.ok(compareGrids(a, pushed) < 0.1, `empujada: ${compareGrids(a, pushed)}`);

// La mitad de la página distinta: ~0,5
// (contenido nuevo: cada celda con su color, como una foto o un bloque de texto distinto)
const rnd = (x, y, k) => ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663) ^ Math.imul(k + 1, 83492791)) >>> 0) % 256;
const half = page(300, (y, x) => (y < 150 ? [(y * 37) % 256, (y * 91) % 256, (y * 53) % 256] : [rnd(x, y, 0), rnd(x, y, 1), rnd(x, y, 2)]));
const h = compareGrids(a, half);
assert.ok(h > 0.4 && h < 0.6, `mitad: ${h}`);

// Recortada: de 300 filas a 30, falta casi todo
assert.ok(compareGrids(a, page(30)) > 0.85);
// Más larga: lo que sobra también cambió
const longer = compareGrids(page(150), a);
assert.ok(longer > 0.45 && longer < 0.55, `más larga: ${longer}`);

// En blanco
assert.equal(sameColorShare(plain(300, [255, 255, 255])), 1);
assert.ok(isBlank(plain(300, [255, 255, 255])));
assert.ok(isBlank(plain(300, [12, 14, 20]))); // también una página toda oscura
assert.ok(!isBlank(a));
// Una página oscura con contenido (como un sitio con fondo negro) no es «en blanco»
const dark = page(300, (y, x) => (y % 10 < 7 ? [10, 10, 12] : [(x * 5) % 256, 200, 90]));
assert.ok(sameColorShare(dark) < BLANK_SHARE);
assert.ok(!isBlank(dark));

assert.throws(() => compareGrids(a, { w: 32, h: 10, data: new Uint8Array(32 * 10 * 3) }));

console.log("check-visual: ok");
