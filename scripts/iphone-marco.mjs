// Arma el marco de iPhone de las tarjetas de /consola a partir de la foto de
// Flow (teléfono de frente, pantalla en verde croma, fondo magenta): saca los
// dos colores (scripts/croma.mjs), recorta el teléfono y mide dónde queda la
// pantalla, para poner la captura del sitio detrás.
//
//   node scripts/iphone-marco.mjs "C:/Users/feder/OneDrive/Escritorio/stickers-casos/iphone/marco-a.jpg"
//
// Escribe public/projects/devices/iphone-marco.webp y data/iphone-marco.ts.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { keyed } from "./croma.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la foto del iPhone");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
/** Ancho del marco, en px: en la tarjeta se ve a ~230 px como mucho, con densidad 2. */
const WIDTH = 520;

const { data: raw, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: ch } = info;
const img = await keyed(SRC, ["magenta", "green"]);

// El teléfono: todo lo que no es transparente. La pantalla: el verde puro de la foto original.
let px0 = w, py0 = h, px1 = 0, py1 = 0, sx0 = w, sy0 = h, sx1 = 0, sy1 = 0;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (img.data[i * 4 + 3] > 200) {
      if (x < px0) px0 = x;
      if (x > px1) px1 = x;
      if (y < py0) py0 = y;
      if (y > py1) py1 = y;
    }
    const r = raw[i * ch], g = raw[i * ch + 1], b = raw[i * ch + 2];
    if (g > 170 && Math.max(r, b) < g * 0.3) {
      if (x < sx0) sx0 = x;
      if (x > sx1) sx1 = x;
      if (y < sy0) sy0 = y;
      if (y > sy1) sy1 = y;
    }
  }
}
const pw = px1 - px0 + 1, ph = py1 - py0 + 1;
const pct = (v, total) => +((v / total) * 100).toFixed(3);
const screen = {
  x: pct(sx0 - px0, pw),
  y: pct(sy0 - py0, ph),
  w: pct(sx1 - sx0 + 1, pw),
  h: pct(sy1 - sy0 + 1, ph),
};

const outH = Math.round((WIDTH * ph) / pw);
await sharp(img.data, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: px0, top: py0, width: pw, height: ph })
  .resize(WIDTH, outH)
  .webp({ quality: 86, alphaQuality: 95 })
  .toFile(path.join(ROOT, "public/projects/devices/iphone-marco.webp"));

fs.writeFileSync(
  path.join(ROOT, "data/iphone-marco.ts"),
  `// Generado por scripts/iphone-marco.mjs: no editar a mano.\n// Marco de iPhone (foto de Flow) y dónde cae la pantalla, en % del marco.\nexport const iphoneMarco = {\n  src: "/projects/devices/iphone-marco.webp",\n  w: ${WIDTH},\n  h: ${outH},\n  screen: ${JSON.stringify(screen).replace(/"(\w+)":/g, "$1: ")},\n};\n`,
);
console.log({ pw, ph, screen });
