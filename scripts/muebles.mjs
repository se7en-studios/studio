// Arma la lámina de los muebles de «En vivo» a partir de las ilustraciones de
// Flow (fondo verde, dos filas de cuatro objetos por imagen): saca el verde,
// separa cada objeto, lo recorta y los junta todos en una sola imagen
// (public/en-vivo/muebles.webp). Las medidas de cada uno van a
// lib/oficinas/muebles.ts. Cómo se paran en el piso y hacia dónde miran lo
// decide el motor (lib/oficinas/art.ts).
//
//   node scripts/muebles.mjs "C:/Users/feder/OneDrive/Escritorio/personajes/muebles"
//
// Usa sharp (viene con Next). Las imágenes originales no van al repo.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la carpeta de los muebles");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
const OUT_IMG = path.join(ROOT, "public/en-vivo/muebles.webp");
const OUT_TS = path.join(ROOT, "lib/oficinas/muebles.ts");
/**
 * Lo más ancho o alto que queda cada mueble, en px: lo que ocupa en el mapa
 * con densidad 2 (los largos ocupan varias baldosas; los de una, una).
 */
const LONG = new Set(["counter", "kitchen", "meettable", "sofa", "bench", "desk3", "desk2", "tvcabinet", "lowtable", "table", "squatrack"]);
const maxOf = (name) => (LONG.has(name) ? 300 : name.startsWith("tree") ? 170 : 140);
const PAD = 2;

// Qué objeto es cada uno: la imagen y su lugar (en orden de lectura, fila de arriba y después la de abajo).
// null: no se usa.
const SHEETS = {
  "sillas y livianos": ["chair", "chairBoss", "stool", "plant", "lamp", null, "beanbag", "bench"],
  "recepcion y cocina": [null, "cooler", "coffeebar", "lowtable", null, "fridge", null, "table"],
  rubros: ["vitrine", "balls", "dumbbells", "squatrack", "espresso", "globe", "maquette", "cafetable"],
  oficina: ["matetable", "yogaprops", "cabinet", "shelf", "rack", "boxes", "easel", "drafting"],
  jardin: ["tree", "tree2", "bush", "bush2", "snake", "monstera", null, "bamboo"],
  largos: ["counter", null, null, "kitchen", "meettable", "sofa", null, "tvcabinet"],
  escritorios: ["desk3", "desk2", null, "plinth"],
  deploy: ["deploy", null, "catbed", "catbowl"],
};

// Objetos que se tocan en la imagen: un punto adentro de cada uno.
const SEEDS = { largos: [[[740, 110], [930, 140]]] };

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function find(name) {
  const f = fs.readdirSync(SRC).find((x) => norm(path.parse(x).name) === norm(name));
  if (!f) throw new Error(`No está ${name}`);
  return path.join(SRC, f);
}

/**
 * Saca el fondo verde. No alcanza con «domina el verde»: las hojas y los
 * árboles también son verdes. El fondo es verde casi puro (el rojo y el azul
 * son menos de un quinto del verde); el follaje tiene bastante más de los
 * otros dos. Entre medio, el borde suave. En el borde, lo que queda verdoso
 * del fondo se apaga.
 */
async function keyed(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const m = g > 30 ? Math.max(r, b) / g : 1;
    const a = Math.max(0, Math.min(1, (m - 0.2) / 0.16));
    if (a < 1 && g > Math.max(r, b)) data[i * 4 + 1] = Math.max(r, b) + (g - Math.max(r, b)) * a * 0.6;
    data[i * 4 + 3] = Math.round(a * 255);
  }
  return { data, w, h };
}

/**
 * Los objetos de la imagen: manchas conectadas, en orden de lectura. Las
 * manchitas sueltas (una hoja, la pata de un banco) se suman a la mancha grande
 * más cercana. `seeds`: si dos objetos se tocan, un punto adentro de cada uno;
 * lo que comparten se reparte según a cuál llega antes caminando por adentro.
 */
function objects(img, want, seeds = []) {
  const { data, w, h } = img;
  const on = (i) => data[i * 4 + 3] > 120;
  const lab = new Int32Array(w * h).fill(-1);
  const comps = [];
  const nb = (c) => {
    const x = c % w, y = (c / w) | 0;
    return [x + 1 < w ? c + 1 : -1, x > 0 ? c - 1 : -1, y + 1 < h ? c + w : -1, y > 0 ? c - w : -1];
  };
  for (let i = 0; i < w * h; i++) {
    if (lab[i] >= 0 || !on(i)) continue;
    const id = comps.length, px = [];
    const st = [i];
    lab[i] = id;
    while (st.length) {
      const c = st.pop();
      px.push(c);
      for (const j of nb(c)) if (j >= 0 && lab[j] < 0 && on(j)) { lab[j] = id; st.push(j); }
    }
    comps.push(px);
  }
  // Los que se tocan: se reparten desde las semillas, a la vez (el que llega primero se queda con el píxel)
  let groups = comps.map((px) => [px]);
  for (const pair of seeds) {
    const ids = pair.map(([x, y]) => lab[y * w + x]);
    if (ids[0] < 0 || ids[0] !== ids[1]) continue;
    const owner = new Int32Array(w * h).fill(-1);
    let q = pair.map(([x, y], k) => { owner[y * w + x] = k; return y * w + x; });
    while (q.length) {
      const n = [];
      for (const c of q) for (const j of nb(c)) if (j >= 0 && lab[j] === ids[0] && owner[j] < 0) { owner[j] = owner[c]; n.push(j); }
      q = n;
    }
    const halves = [[], []];
    for (const c of comps[ids[0]]) halves[owner[c] < 0 ? 0 : owner[c]].push(c);
    groups[ids[0]] = [halves[0]];
    groups.push([halves[1]]);
  }
  const boxOf = (g) => {
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1, n = 0;
    for (const px of g) for (const c of px) { const x = c % w, y = (c / w) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; n++; }
    return { x0, y0, x1, y1, n, g };
  };
  let boxes = groups.map(boxOf).filter((b) => b.n > 0).sort((a, b) => b.n - a.n);
  const main = boxes.slice(0, want), rest = boxes.slice(want);
  // Las sueltas, a la grande más cercana (si está cerca)
  for (const r of rest) {
    const cx = (r.x0 + r.x1) / 2, cy = (r.y0 + r.y1) / 2;
    let best = null, bd = Infinity;
    for (const m of main) {
      const dx = Math.max(m.x0 - cx, 0, cx - m.x1), dy = Math.max(m.y0 - cy, 0, cy - m.y1);
      const d = Math.hypot(dx, dy);
      if (d < bd) { bd = d; best = m; }
    }
    if (best && bd < 30) Object.assign(best, { x0: Math.min(best.x0, r.x0), y0: Math.min(best.y0, r.y0), x1: Math.max(best.x1, r.x1), y1: Math.max(best.y1, r.y1), g: [...best.g, ...r.g] });
  }
  // Dos filas: arriba las que tienen el centro en la mitad de arriba
  const row = (b) => ((b.y0 + b.y1) / 2 < h / 2 ? 0 : 1);
  return main.sort((a, b) => row(a) - row(b) || a.x0 - b.x0);
}

/** Los que tienen vidrio (se ve el fondo a través) o un borde verdoso, sin nada verde de verdad. */
const GLASS = new Set(["deploy", "vitrine", "catbed", "catbowl"]);

const parts = [];
for (const [sheet, names] of Object.entries(SHEETS)) {
  const img = await keyed(find(sheet));
  const objs = objects(img, names.length, SEEDS[sheet]);
  if (objs.length !== names.length) throw new Error(`${sheet}: salieron ${objs.length} objetos, no ${names.length}`);
  for (let i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    const { x0, y0, x1, y1, g } = objs[i];
    const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
    const k = Math.min(1, maxOf(names[i]) / Math.max(cw, ch));
    // Sólo sus píxeles (en la caja puede asomar el vecino), con el borde suave de alrededor
    const buf = Buffer.alloc(cw * ch * 4);
    const mine = new Uint8Array(cw * ch);
    for (const px of g) for (const c of px) mine[(((c / img.w) | 0) - y0) * cw + ((c % img.w) - x0)] = 1;
    for (let y = 0; y < ch; y++)
      for (let x = 0; x < cw; x++) {
        let near = mine[y * cw + x];
        for (let d = 1; d <= 2 && !near; d++) near = (x >= d && mine[y * cw + x - d]) || (x + d < cw && mine[y * cw + x + d]) || (y >= d && mine[(y - d) * cw + x]) || (y + d < ch && mine[(y + d) * cw + x]) ? 1 : 0;
        if (!near) continue;
        img.data.copy(buf, (y * cw + x) * 4, ((y0 + y) * img.w + x0 + x) * 4, ((y0 + y) * img.w + x0 + x) * 4 + 4);
      }
    // Los de vidrio dejan ver el verde del fondo (y a otros les queda en el borde): ahí el verde se saca y el vidrio queda más transparente
    if (GLASS.has(names[i]))
      for (let p = 0; p < buf.length; p += 4) {
        const m = Math.max(buf[p], buf[p + 2]), over = buf[p + 1] - m;
        if (!buf[p + 3] || over <= 6) continue;
        buf[p + 1] = m + over * 0.1;
        buf[p + 3] = Math.round(buf[p + 3] * Math.max(0.35, 1 - over / 90));
      }
    const out = await sharp(buf, { raw: { width: cw, height: ch, channels: 4 } })
      .resize(Math.max(1, Math.round(cw * k)), Math.max(1, Math.round(ch * k)), { kernel: "lanczos3" })
      .png()
      .toBuffer({ resolveWithObject: true });
    parts.push({ name: names[i], buf: out.data, w: out.info.width, h: out.info.height });
  }
}

// Todos en una imagen, en estantes de hasta 2048 px de ancho
const WMAX = 2048;
let x = 0, y = 0, rowH = 0;
const frames = {};
const comps = [];
for (const p of [...parts].sort((a, b) => b.h - a.h)) {
  if (x + p.w + PAD * 2 > WMAX) {
    x = 0;
    y += rowH;
    rowH = 0;
  }
  comps.push({ input: p.buf, left: x + PAD, top: y + PAD });
  frames[p.name] = [x + PAD, y + PAD, p.w, p.h];
  x += p.w + PAD * 2;
  rowH = Math.max(rowH, p.h + PAD * 2);
}
const H = y + rowH;
await sharp({ create: { width: WMAX, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(comps)
  .webp({ quality: 76, alphaQuality: 80, effort: 6 })
  .toFile(OUT_IMG);
const sorted = Object.fromEntries(Object.keys(frames).sort().map((k) => [k, frames[k]]));
const ts = `// Generado por scripts/muebles.mjs: no editar a mano.
// Cada mueble: [x, y, ancho, alto] dentro de la lámina, en px.
export const MUEBLES = {
  src: "/en-vivo/muebles.webp?v=${Date.now().toString(36)}",
  frames: ${JSON.stringify(sorted, null, 2).replace(/\n/g, "\n  ")} as Record<string, [number, number, number, number]>,
};
`;
fs.writeFileSync(OUT_TS, ts);
console.log(Object.keys(frames).length, "muebles", `${WMAX}x${H}`, `${(fs.statSync(OUT_IMG).size / 1024).toFixed(0)} KB`);
