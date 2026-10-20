// Arma las láminas de los personajes de «En vivo» a partir de las imágenes
// sueltas (fondo verde, una pose por archivo): saca el verde, recorta cada
// figura, la escala para que todos midan lo mismo parados, la apoya por los
// pies y las junta en una tira por personaje (public/en-vivo/personajes/*.webp).
// Las medidas de cada cuadro van a lib/oficinas/personajes.ts.
//
//   node scripts/personajes.mjs "C:/Users/feder/OneDrive/Escritorio/personajes"
//
// Usa sharp (viene con Next). Las imágenes originales no van al repo.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la carpeta de los personajes");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const OUT_IMG = path.join(ROOT, "public/en-vivo/personajes");
const OUT_TS = path.join(ROOT, "lib/oficinas/personajes.ts");
/** Alto de la figura parada en la lámina, en px: alcanza para el zoom más cercano con densidad 2. */
const HEIGHT = 192;
const PAD = 2;

// Qué archivo es cada pose. El nombre de la carpeta y del archivo, sin tildes ni mayúsculas.
const POSES = {
  federico: {
    dir: "Federico",
    frames: { idle: "parado", walk0: "caminando (1)", walk1: "caminando (2)", walk2: "caminando (3)", walk3: "caminando (4)", back: "de espaldas (1)", sit: "sentado", wave0: "saludando", phone0: "celular (1)", phone1: "celular (2)", talk0: "hablando (1)", talk1: "hablando (2)", talk2: "hablando (3)", talk3: "hablando (4)" },
  },
  franco: {
    dir: "Franco",
    frames: { idle: "parado", walk0: "caminando", back: "de espaldas", sit: "sentado", wave0: "saludando", phone0: "celular (1)", phone1: "celular (2)", talk0: "hablando (1)", talk1: "hablando (2)" },
  },
  guia: {
    dir: "GUIDE",
    frames: { idle: "parado", walk0: "caminando", back: "de espaldas", wave0: "saludando (1)", wave1: "saludando (2)", phone0: "con el celular (1)", phone1: "con el celular (2)", phone2: "con el celular (3)", talk0: "conversando (1)", talk1: "conversando (2)", talk2: "conversando (3)", talk3: "conversando (4)" },
  },
  visita: {
    dir: "visitante",
    frames: { idle: "parado", walk0: "caminando (1)", walk1: "caminando (2)", back: "de espaldas (1)", wave0: "saludando (1)", wave1: "saludando (2)", phone0: "con el celular (1)", phone1: "con el celular (2)", phone2: "con el celular (3)", think0: "pensando (1)", think1: "pensando (2)", talk0: "asombrado (1)", talk1: "asombrado (2)" },
  },
};

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function find(dir, name) {
  const files = fs.readdirSync(path.join(SRC, dir));
  const f = files.find((x) => norm(path.parse(x).name) === norm(name));
  if (!f) throw new Error(`No está ${dir}/${name}`);
  return path.join(SRC, dir, f);
}

/** Saca el fondo verde: transparente donde domina el verde, borde suave y sin halo verde. */
async function keyed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const k = g - Math.max(r, b);
    let a = 255;
    if (k > 70) a = 0;
    else if (k > 22) a = Math.round(255 * (1 - (k - 22) / 48));
    if (k > 0) data[i * 4 + 1] = Math.max(r, b) + Math.min(k, 6); // sin el halo verde
    data[i * 4 + 3] = a;
    if (a > 40) {
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  // Los pies: el centro de lo que hay en el 4 % de abajo de la figura
  const band = Math.max(4, Math.round((y1 - y0) * 0.04));
  let sx = 0, n = 0;
  for (let y = y1 - band; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (data[(y * w + x) * 4 + 3] > 120) {
        sx += x;
        n++;
      }
  return { data, w, h, box: { x0, y0, x1, y1 }, feet: n ? sx / n : (x0 + x1) / 2 };
}

const meta = {};
for (const [who, def] of Object.entries(POSES)) {
  const raw = {};
  for (const [pose, name] of Object.entries(def.frames)) raw[pose] = await keyed(find(def.dir, name));
  // Todos a la misma escala: la de la figura parada
  const k = HEIGHT / (raw.idle.box.y1 - raw.idle.box.y0 + 1);
  const parts = [];
  for (const [pose, r] of Object.entries(raw)) {
    const { x0, y0, x1, y1 } = r.box;
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const img = await sharp(r.data, { raw: { width: r.w, height: r.h, channels: 4 } })
      .extract({ left: x0, top: y0, width: cw, height: ch })
      .resize(Math.max(1, Math.round(cw * k)), Math.max(1, Math.round(ch * k)), { kernel: "lanczos3" })
      .png()
      .toBuffer({ resolveWithObject: true });
    parts.push({ pose, buf: img.data, w: img.info.width, h: img.info.height, ax: (r.feet - x0) * k, ay: ch * k });
  }
  // Una tira: cada cuadro con su caja y su punto de apoyo (los pies)
  let x = 0;
  const frames = {};
  const H = Math.max(...parts.map((p) => p.h)) + PAD * 2;
  const comps = [];
  for (const p of parts) {
    comps.push({ input: p.buf, left: x + PAD, top: PAD + (H - PAD * 2 - p.h) });
    frames[p.pose] = [x + PAD, PAD + (H - PAD * 2 - p.h), p.w, p.h, +p.ax.toFixed(1), +p.ay.toFixed(1)];
    x += p.w + PAD * 2;
  }
  fs.mkdirSync(OUT_IMG, { recursive: true });
  const out = path.join(OUT_IMG, `${who}.webp`);
  await sharp({ create: { width: x, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comps)
    .webp({ quality: 88, alphaQuality: 100, effort: 6 })
    .toFile(out);
  meta[who] = { src: `/en-vivo/personajes/${who}.webp?v=${Date.now().toString(36)}`, height: HEIGHT, frames };
  console.log(who, Object.keys(frames).length, "cuadros", `${x}x${H}`, `${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

const ts = `// Generado por scripts/personajes.mjs: no editar a mano.
// Cada cuadro: [x, y, ancho, alto, pies x, pies y] dentro de la lámina, en px.
export type SheetFrame = [number, number, number, number, number, number];
export type Sheet = { src: string; height: number; frames: Record<string, SheetFrame> };
export const SHEETS: Record<"federico" | "franco" | "guia" | "visita", Sheet> = ${JSON.stringify(meta, null, 2)};
`;
fs.writeFileSync(OUT_TS, ts);
console.log("ok", path.relative(ROOT, OUT_TS));
