// El sobre lacrado del botón de mail de /consola: foto de Flow sobre magenta,
// recortada sin fondo en public/consola/sobre.webp.
//
//   node scripts/sobre.mjs <sobre.jpg>
import { createRequire } from "node:module";
import path from "node:path";
import { keyed } from "./croma.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la foto del sobre");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");

const img = await keyed(SRC, ["magenta"]);
let x0 = img.w, y0 = img.h, x1 = 0, y1 = 0;
for (let i = 0; i < img.w * img.h; i++) {
  if (img.data[i * 4 + 3] < 128) continue;
  const x = i % img.w, y = (i / img.w) | 0;
  if (x < x0) x0 = x;
  if (x > x1) x1 = x;
  if (y < y0) y0 = y;
  if (y > y1) y1 = y;
}
await sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } })
  .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
  .resize(240)
  .webp({ quality: 85, alphaQuality: 90 })
  .toFile(path.join(ROOT, "public/consola/sobre.webp"));
console.log("listo");
