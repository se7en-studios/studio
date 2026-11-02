// La palabra SE7EN del pie de /consola: foto de Flow de las letras en 3D sobre
// verde croma. Saca el fondo (scripts/croma.mjs), recorta la palabra y la guarda
// sin fondo en public/consola/marca.webp; la proporción va a data/marca.ts.
// (Las letras se tocan por la profundidad del 3D: va entera y se anima entera.)
//
//   node scripts/marca.mjs <foto.jpg>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { keyed } from "./croma.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la foto de la palabra");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
/** Ancho de la palabra, en px: el pie la muestra a ~1000 px como mucho, con densidad 2. */
const WIDTH = 2000;

const { w, h, data } = await keyed(SRC, ["green"]);
// Sin tinte verde en toda la palabra (las caras de arriba reflejan el fondo), y el recorte
// por lo opaco y no verdoso: así no entra la franja de esas caras.
for (let i = 0; i < w * h; i++) {
  const k = Math.max(data[i * 4], data[i * 4 + 2]) * 1.04;
  if (data[i * 4 + 1] > k) data[i * 4 + 1] = k;
}
const { data: raw } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
let x0 = w, y0 = h, x1 = 0, y1 = 0;
for (let i = 0; i < w * h; i++) {
  if (data[i * 4 + 3] < 240 || raw[i * 3 + 1] > Math.max(raw[i * 3], raw[i * 3 + 2]) * 1.15) continue;
  const x = i % w, y = (i / w) | 0;
  if (x < x0) x0 = x;
  if (x > x1) x1 = x;
  if (y < y0) y0 = y;
  if (y > y1) y1 = y;
}
const width = x1 - x0 + 1, height = y1 - y0 + 1;
const out = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .extract({ left: x0, top: y0, width, height })
  .resize(WIDTH)
  .webp({ quality: 86, alphaQuality: 92 })
  .toFile(path.join(ROOT, "public/consola/marca.webp"));
fs.writeFileSync(
  path.join(ROOT, "data/marca.ts"),
  `// Generado por scripts/marca.mjs: no editar a mano.\n// La palabra SE7EN en 3D (foto de Flow), sin fondo.\nexport const marca = { src: "/consola/marca.webp", w: ${out.width}, h: ${out.height} };\n`,
);
console.log(out.width, out.height);
