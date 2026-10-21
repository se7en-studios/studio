// Arma las láminas de los personajes de «En vivo» a partir de las imágenes
// sueltas (fondo verde, una pose por archivo): saca el verde, recorta cada
// figura, la escala para que todos midan lo mismo parados, la apoya por los
// pies y las junta en una tira por personaje (public/en-vivo/personajes/*.webp).
// Las caminatas salen de una lámina de 8 cuadros (dos filas de cuatro) que se
// corta sola. El parpadeo se dibuja acá, sobre la pose parada.
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
// `cycles`: las láminas de caminata (de frente y de espaldas) y con qué pose parada se igualan.
const POSES = {
  federico: {
    dir: "Federico",
    frames: { idle: "parado", back: "de espaldas (1)", sit: "sentado", wave0: "saludando", phone0: "celular (1)", phone1: "celular (2)", talk0: "hablando (1)", talk1: "hablando (2)", talk2: "hablando (3)", talk3: "hablando (4)" },
    cycles: { walk: ["caminata frente", "idle"], walkb: ["caminata espaldas", "back"] },
  },
  franco: {
    dir: "Franco",
    frames: { idle: "parado", back: "de espaldas", sit: "sentado", wave0: "saludando", phone0: "celular (1)", phone1: "celular (2)", talk0: "hablando (1)", talk1: "hablando (2)" },
    cycles: { walk: ["caminata frente", "idle"], walkb: ["caminata espaldas", "back"] },
  },
  guia: {
    dir: "GUIDE",
    frames: { idle: "parado", back: "de espaldas", wave0: "saludando (1)", wave1: "saludando (2)", phone0: "con el celular (1)", phone1: "con el celular (2)", phone2: "con el celular (3)", talk0: "conversando (1)", talk1: "conversando (2)", talk2: "conversando (3)", talk3: "conversando (4)" },
    cycles: { walk: ["caminata frente", "idle"], walkb: ["caminata espaldas", "back"] },
  },
  visita: {
    dir: "visitante",
    frames: { idle: "parado", back: "de espaldas (1)", wave0: "saludando (1)", wave1: "saludando (2)", phone0: "con el celular (1)", phone1: "con el celular (2)", phone2: "con el celular (3)", think0: "pensando (1)", think1: "pensando (2)", talk0: "asombrado (1)", talk1: "asombrado (2)" },
    cycles: { walk: ["caminata frente", "idle"], walkb: ["caminata espaldas", "back"] },
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
async function keyedImage(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const k = g - Math.max(r, b);
    let a = 255;
    if (k > 70) a = 0;
    else if (k > 22) a = Math.round(255 * (1 - (k - 22) / 48));
    if (k > 0) data[i * 4 + 1] = Math.max(r, b) + Math.min(k, 6); // sin el halo verde
    data[i * 4 + 3] = a;
  }
  return { data, w, h };
}

/**
 * La caja de lo que hay dentro de [x0, x1] × [y0, y1] y dónde apoya: el centro
 * del 4 % de abajo. `head`: el centro de la cabeza (del 5 al 20 % de arriba).
 */
function figure(img, x0 = 0, y0 = 0, x1 = img.w - 1, y1 = img.h - 1) {
  const { data, w } = img;
  let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (data[(y * w + x) * 4 + 3] > 40) {
        if (x < bx0) bx0 = x;
        if (x > bx1) bx1 = x;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
  const band = Math.max(4, Math.round((by1 - by0) * 0.04));
  let sx = 0, n = 0;
  for (let y = by1 - band; y <= by1; y++)
    for (let x = bx0; x <= bx1; x++)
      if (data[(y * w + x) * 4 + 3] > 120) {
        sx += x;
        n++;
      }
  let hx = 0, hn = 0;
  for (let y = by0 + Math.round((by1 - by0) * 0.05); y <= by0 + Math.round((by1 - by0) * 0.2); y++)
    for (let x = bx0; x <= bx1; x++)
      if (data[(y * w + x) * 4 + 3] > 120) {
        hx += x;
        hn++;
      }
  return { box: { x0: bx0, y0: by0, x1: bx1, y1: by1 }, feet: n ? sx / n : (bx0 + bx1) / 2, head: hn ? hx / hn : (bx0 + bx1) / 2 };
}

async function keyed(file) {
  const img = await keyedImage(file);
  return { ...img, ...figure(img) };
}

/** Los tramos donde el perfil pasa de `thr`, uniendo huecos de menos de `gap`. */
function runs(prof, gap, minLen, thr) {
  const out = [];
  let s = -1, g = 0;
  for (let i = 0; i <= prof.length; i++) {
    const on = i < prof.length && prof[i] > thr;
    if (on) {
      if (s < 0) s = i;
      g = 0;
    } else if (s >= 0 && (++g >= gap || i === prof.length)) {
      const e = i - g;
      if (e - s + 1 >= minLen) out.push([s, e]);
      s = -1;
      g = 0;
    }
  }
  return out;
}

/** Corta una lámina de caminata en sus figuras, en orden de lectura (filas de arriba abajo, cada una de izquierda a derecha). */
async function cycle(file) {
  const img = await keyedImage(file);
  const { data, w, h } = img;
  const on = (x, y) => data[(y * w + x) * 4 + 3] > 120;
  const rows = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) rows[y]++;
  const frames = [];
  for (const [y0, y1] of runs(rows, 6, 60, 2)) {
    const cols = new Array(w).fill(0);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (on(x, y)) cols[x]++;
    for (const [x0, x1] of runs(cols, 8, 25, 1)) frames.push({ ...img, ...figure(img, x0, y0, x1, y1) });
  }
  // Caminando, los pies se abren y se cierran: el centro entre los dos va y
  // viene. El cuerpo avanza parejo, así que cada cuadro se apoya bajo la
  // cabeza, corrido lo que en promedio la cabeza va adelante de los pies
  const lead = frames.reduce((t, f) => t + (f.head - f.feet), 0) / frames.length;
  for (const f of frames) f.feet = f.head - lead;
  if (frames.length !== 8) throw new Error(`${file}: salieron ${frames.length} figuras, no 8`);
  return frames;
}

/**
 * El parpadeo: sobre la pose parada, tapa lo blanco de los ojos (con las
 * pupilas) del color de la piel de al lado y le traza el párpado. Busca los
 * ojos en el quinto de arriba de la figura: manchas blancas grandes y redondas.
 */
function blinkOf(r) {
  const { w } = r;
  const data = Buffer.from(r.data);
  const { x0, y0, x1, y1 } = r.box;
  const fh = y1 - y0 + 1;
  // Los ojos empiezan en el quinto de arriba; pueden bajar un poco más
  const hy1 = y0 + Math.round(fh * 0.2), hyMax = y0 + Math.round(fh * 0.35);
  const at = (x, y) => (y * w + x) * 4;
  const white = (x, y) => {
    const i = at(x, y);
    return data[i + 3] > 200 && data[i] > 225 && data[i + 1] > 225 && data[i + 2] > 225;
  };
  // Las manchas blancas de la cabeza
  const seen = new Uint8Array(w * (hyMax + 1));
  const blobs = [];
  for (let y = y0; y <= hyMax; y++)
    for (let x = x0; x <= x1; x++) {
      if (seen[y * w + x] || !white(x, y)) continue;
      const px = [];
      const st = [[x, y]];
      seen[y * w + x] = 1;
      while (st.length) {
        const [cx, cy] = st.pop();
        px.push([cx, cy]);
        for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]])
          if (nx >= x0 && nx <= x1 && ny >= y0 && ny <= hyMax && !seen[ny * w + nx] && white(nx, ny)) {
            seen[ny * w + nx] = 1;
            st.push([nx, ny]);
          }
      }
      let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
      for (const [px0, py0] of px) {
        bx0 = Math.min(bx0, px0);
        bx1 = Math.max(bx1, px0);
        by0 = Math.min(by0, py0);
        by1 = Math.max(by1, py0);
      }
      blobs.push({ px, x0: bx0, y0: by0, x1: bx1, y1: by1 });
    }
  const big = (e) => {
    const bw = e.x1 - e.x0 + 1, bh = e.y1 - e.y0 + 1;
    return e.y0 <= hy1 && e.px.length > fh * fh * 0.0008 && bw / bh > 0.4 && bw / bh < 2.6;
  };
  const eyes = blobs.filter(big).sort((a, b) => b.px.length - a.px.length).slice(0, 2);
  if (!eyes.length) return null;
  // Los pedacitos de blanco que la pupila separa del resto del ojo son del mismo ojo
  for (const e of eyes) {
    const m = Math.round((e.x1 - e.x0) * 0.1);
    for (const o of blobs)
      if (!eyes.includes(o) && o.x1 >= e.x0 - m && o.x0 <= e.x1 + m && o.y1 >= e.y0 - m && o.y0 <= e.y1 + m) {
        e.px.push(...o.px);
        Object.assign(e, { x0: Math.min(e.x0, o.x0), y0: Math.min(e.y0, o.y0), x1: Math.max(e.x1, o.x1), y1: Math.max(e.y1, o.y1) });
      }
  }
  const lw = Math.max(2, Math.round(fh * 0.006));
  for (const e of eyes) {
    // Lo blanco más lo que encierra (las pupilas): lo que no se alcanza desde el borde de la caja
    const bw = e.x1 - e.x0 + 3, bh = e.y1 - e.y0 + 3;
    const mine = new Uint8Array(bw * bh);
    for (const [px0, py0] of e.px) mine[(py0 - e.y0 + 1) * bw + (px0 - e.x0 + 1)] = 1;
    const out = new Uint8Array(bw * bh);
    const st = [[0, 0]];
    out[0] = 1;
    while (st.length) {
      const [cx, cy] = st.pop();
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]])
        if (nx >= 0 && ny >= 0 && nx < bw && ny < bh && !out[ny * bw + nx] && !mine[ny * bw + nx]) {
          out[ny * bw + nx] = 1;
          st.push([nx, ny]);
        }
    }
    // La piel: la mediana de lo que rodea al ojo por abajo y a los costados
    const eh = e.y1 - e.y0 + 1, ew = e.x1 - e.x0 + 1;
    const rs = [], gs = [], bs = [];
    for (let y = Math.round((e.y0 + e.y1) / 2); y <= Math.min(y1, e.y1 + eh * 0.5); y++)
      for (let x = Math.max(x0, e.x0 - Math.round(ew * 0.4)); x <= Math.min(x1, e.x1 + Math.round(ew * 0.4)); x++) {
        const lx = x - e.x0 + 1, ly = y - e.y0 + 1;
        if (lx >= 0 && ly >= 0 && lx < bw && ly < bh && !out[ly * bw + lx]) continue;
        const i = at(x, y);
        const R = data[i], G = data[i + 1], B = data[i + 2];
        const l = 0.3 * R + 0.59 * G + 0.11 * B, mx = Math.max(R, G, B), mn = Math.min(R, G, B);
        if (data[i + 3] < 220 || l < 120 || l > 240 || mx - mn < 18) continue;
        rs.push(R);
        gs.push(G);
        bs.push(B);
      }
    if (rs.length < 20) return null;
    const med = (v) => v.sort((a, b) => a - b)[v.length >> 1];
    const skin = [med(rs), med(gs), med(bs)];
    const cx = (e.x0 + e.x1) / 2, mid = e.y0 + eh * 0.55;
    // El borde suavizado del blanco (más claro que la piel) también se tapa
    const skinL = 0.3 * skin[0] + 0.59 * skin[1] + 0.11 * skin[2];
    const D = Math.max(2, Math.round(fh * 0.003));
    const inEye = (x, y) => {
      const lx = x - e.x0 + 1, ly = y - e.y0 + 1;
      return lx >= 0 && ly >= 0 && lx < bw && ly < bh && !out[ly * bw + lx];
    };
    const near = (x, y) => {
      for (let dy = -D; dy <= D; dy++) for (let dx = -D; dx <= D; dx++) if (inEye(x + dx, y + dy)) return true;
      return false;
    };
    for (let y = e.y0 - D; y <= e.y1 + D; y++)
      for (let x = e.x0 - D; x <= e.x1 + D; x++) {
        const i = at(x, y);
        if (!inEye(x, y)) {
          const l = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
          if (data[i + 3] < 200 || l < skinL + 12 || !near(x, y)) continue;
          data[i] = skin[0];
          data[i + 1] = skin[1];
          data[i + 2] = skin[2];
          continue;
        }
        // El párpado: una línea apenas curva hacia abajo, del grosor del contorno
        const u = (x - cx) / (ew / 2);
        const lid = mid + (1 - u * u) * eh * 0.08;
        const dark = Math.abs(y - lid) <= lw / 2;
        data[i] = dark ? 22 : skin[0];
        data[i + 1] = dark ? 18 : skin[1];
        data[i + 2] = dark ? 16 : skin[2];
        data[i + 3] = 255;
      }
  }
  return { ...r, data };
}

/** Recorta y escala un cuadro; `ax`/`ay`: los pies, ya escalados. */
async function part(pose, r, k) {
  const { x0, y0, x1, y1 } = r.box;
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const img = await sharp(r.data, { raw: { width: r.w, height: r.h, channels: 4 } })
    .extract({ left: x0, top: y0, width: cw, height: ch })
    .resize(Math.max(1, Math.round(cw * k)), Math.max(1, Math.round(ch * k)), { kernel: "lanczos3" })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { pose, buf: img.data, w: img.info.width, h: img.info.height, ax: (r.feet - x0) * k, ay: ch * k };
}

const meta = {};
for (const [who, def] of Object.entries(POSES)) {
  const raw = {};
  for (const [pose, name] of Object.entries(def.frames)) raw[pose] = await keyed(find(def.dir, name));
  // Todos a la misma escala: la de la figura parada
  const k = HEIGHT / (raw.idle.box.y1 - raw.idle.box.y0 + 1);
  const parts = [];
  for (const [pose, r] of Object.entries(raw)) parts.push(await part(pose, r, k));
  const blink = blinkOf(raw.idle);
  if (blink) parts.splice(1, 0, await part("blink", blink, k));
  else console.warn(who, "sin parpadeo: no encontré los ojos");
  // Las caminatas vienen de otra imagen, con otro tamaño: el cuadro más alto mide lo que la pose parada que les corresponde
  for (const [base, [name, like]] of Object.entries(def.cycles ?? {})) {
    const fr = await cycle(find(def.dir, name));
    const target = (raw[like].box.y1 - raw[like].box.y0 + 1) * k;
    const kc = target / Math.max(...fr.map((f) => f.box.y1 - f.box.y0 + 1));
    for (let i = 0; i < fr.length; i++) parts.push(await part(`${base}${i}`, fr[i], kc));
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
    .webp({ quality: 80, alphaQuality: 90, effort: 6 })
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
