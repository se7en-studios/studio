// Recorta los stickers de los casos (el fondo de las tarjetas de /consola) a
// partir de las láminas de Flow: fotos de objetos recortados sobre magenta (o
// verde) croma, dos filas de cuatro por lámina y dos láminas por caso
// (<slug>-a.jpg y <slug>-b.jpg). Saca el fondo (scripts/croma.mjs), separa cada objeto y lo
// guarda en public/projects/stickers/v2/<slug>-NN.webp; las medidas van a
// data/stickers.ts.
//
//   node scripts/stickers.mjs "C:/Users/feder/OneDrive/Escritorio/stickers-casos"
//
// Usa sharp (viene con Next). Las láminas originales (2K) no van al repo.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { keyOf, keyed } from "./croma.mjs";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la carpeta de las láminas");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
// La carpeta lleva versión: si se rehacen los stickers con el mismo nombre, Next serviría los viejos de su caché.
const OUT_DIR = path.join(ROOT, "public/projects/stickers/v2");
const OUT_TS = path.join(ROOT, "data/stickers.ts");
/** Lado más largo de cada sticker, en px: en la tarjeta se ven a ~160 px con densidad 2. */
const MAX = 360;
const PAD = 4;

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
  // Un objeto hecho de partes sueltas (las dos correas de levantamiento) es una
  // sola pieza: se juntan las manchas que quedan a menos de NEAR px.
  const NEAR = Math.round(w * 0.005);
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length && !merged; j++) {
        const a = out[i], b = out[j];
        if (a.x0 - NEAR > b.x1 || b.x0 - NEAR > a.x1 || a.y0 - NEAR > b.y1 || b.y0 - NEAR > a.y1) continue;
        out[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1), n: a.n + b.n };
        out.splice(j, 1);
        merged = true;
      }
    }
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
  const file = path.join(SRC, f);
  const img = await keyed(file, [await keyOf(file)]);
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
    list.push({ src: `/projects/stickers/v2/${name}`, w: ow, h: oh });
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
