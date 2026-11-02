// Recorta los stickers de los casos (el fondo de las tarjetas de /consola) a
// partir de las láminas de Flow: fotos de objetos con borde blanco troquelado
// sobre verde croma, dos filas de cuatro por lámina y dos láminas por caso
// (<slug>-a.jpg y <slug>-b.jpg). Saca el verde, separa cada sticker y lo
// guarda en public/projects/stickers/<slug>-NN.webp; las medidas van a
// data/stickers.ts.
//
//   node scripts/stickers.mjs "C:/Users/feder/OneDrive/Escritorio/stickers-casos"
//
// Usa sharp (viene con Next). Las láminas originales (2K) no van al repo.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la carpeta de las láminas");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const OUT_DIR = path.join(ROOT, "public/projects/stickers");
const OUT_TS = path.join(ROOT, "data/stickers.ts");
/** Lado más largo de cada sticker, en px: en la tarjeta se ven a ~160 px con densidad 2. */
const MAX = 360;
const PAD = 4;

/** Qué tan "fondo" es un píxel: 0 = verde croma puro, 1 = cualquier otra cosa. */
function solid(r, g, b) {
  const m = g > 30 ? Math.max(r, b) / g : 1;
  return Math.max(0, Math.min(1, (m - 0.25) / 0.2));
}

/**
 * Saca el verde. Sólo el que toca los bordes de la lámina: el borde blanco
 * del sticker encierra lo de adentro, así una hoja o la lechuga de una
 * hamburguesa no se borran aunque sean verdes. En el contorno, el verde que
 * queda se apaga.
 */
async function keyed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => {
    if (bg[i]) return;
    if (solid(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) >= 0.98) return;
    bg[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + w - 1);
  }
  // El verde que queda encerrado en un hueco (el asa de una pava, entre las
  // hélices de un dron) también es fondo: el croma puro arranca su propio
  // relleno. Una hoja de verdad tiene mucho más rojo y azul.
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    if (g > 170 && Math.max(r, b) < g * 0.22) push(i);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  for (let i = 0; i < w * h; i++) {
    if (!bg[i]) continue;
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const a = solid(r, g, b);
    if (g > Math.max(r, b)) data[i * 4 + 1] = Math.max(r, b);
    data[i * 4 + 3] = Math.round(a * 255);
  }
  return { data, w, h };
}

/** Los stickers: manchas conectadas grandes, en orden de lectura (fila de arriba y después la de abajo). */
function blobs({ data, w, h }) {
  const seen = new Uint8Array(w * h);
  const out = [];
  for (let s = 0; s < w * h; s++) {
    if (seen[s] || data[s * 4 + 3] < 128) continue;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
    const st = [s];
    seen[s] = 1;
    while (st.length) {
      const i = st.pop();
      const x = i % w, y = (i / w) | 0;
      n++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || seen[j] || data[j * 4 + 3] < 128) continue;
        seen[j] = 1;
        st.push(j);
      }
    }
    if (n > w * h * 0.004) out.push({ x0, y0, x1, y1, n });
  }
  const row = h / 2;
  return out.sort((a, b) => {
    const ra = (a.y0 + a.y1) / 2 > row, rb = (b.y0 + b.y1) / 2 > row;
    return ra === rb ? a.x0 - b.x0 : ra ? 1 : -1;
  });
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const sheets = fs.readdirSync(SRC).filter((f) => /^[a-z0-9-]+-[ab]\.(jpe?g|png)$/.test(f)).sort();
const manifest = {};
for (const f of sheets) {
  const slug = f.replace(/-[ab]\.\w+$/, "");
  const img = await keyed(path.join(SRC, f));
  const found = blobs(img);
  if (found.length !== 8) console.warn(`${f}: ${found.length} stickers (se esperaban 8)`);
  const full = sharp(img.data, { raw: { width: img.w, height: img.h, channels: 4 } });
  for (const bl of found) {
    const left = Math.max(0, bl.x0 - PAD), top = Math.max(0, bl.y0 - PAD);
    const width = Math.min(img.w, bl.x1 + PAD + 1) - left, height = Math.min(img.h, bl.y1 + PAD + 1) - top;
    const list = (manifest[slug] ??= []);
    const name = `${slug}-${String(list.length + 1).padStart(2, "0")}.webp`;
    const scale = Math.min(1, MAX / Math.max(width, height));
    const ow = Math.round(width * scale), oh = Math.round(height * scale);
    await full
      .clone()
      .extract({ left, top, width, height })
      .resize(ow, oh)
      .webp({ quality: 80, alphaQuality: 90 })
      .toFile(path.join(OUT_DIR, name));
    list.push({ src: `/projects/stickers/${name}`, w: ow, h: oh });
  }
  console.log(`${f}: ${found.length}`);
}

const body = Object.entries(manifest)
  .map(([slug, list]) => `  ${JSON.stringify(slug)}: [\n${list.map((s) => `    ${JSON.stringify(s).replace(/"(\w+)":/g, "$1: ")},`).join("\n")}\n  ],`)
  .join("\n");
fs.writeFileSync(
  OUT_TS,
  `// Generado por scripts/stickers.mjs: no editar a mano.\n// Stickers de fondo de las tarjetas de trabajos (/consola), por caso.\nexport type Sticker = { src: string; w: number; h: number };\n\nexport const stickers: Record<string, Sticker[]> = {\n${body}\n};\n`,
);
console.log("listo:", Object.values(manifest).flat().length, "stickers");
