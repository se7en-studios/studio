// Arma las láminas de los personajes de «En vivo» a partir de las imágenes
// sueltas (fondo verde, una pose por archivo): saca el verde, recorta cada
// figura, la escala para que todos midan lo mismo parados, la apoya por los
// pies y las junta en una tira por personaje (public/en-vivo/personajes/*.webp).
// Las caminatas, el saludo con la charla y los dueños sentados tipeando salen
// de láminas de 8 cuadros (dos filas de cuatro) que se cortan solas. El
// parpadeo se dibuja acá, sobre la pose parada y sobre la sentada.
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
// `sets`: las láminas de ocho cuadros (dos filas de cuatro), con el nombre de cada cuadro:
//   - las caminatas, que se igualan en altura con la pose parada que les corresponde (`like`) y se apoyan bajo la cabeza;
//   - el saludo y la charla, y parado con el celular, que se apoyan en los pies (`blink`: el
//     parpadeo, sobre el primer cuadro);
//   - los dueños sentados tipeando (`bust`): de la cintura para arriba, con el teclado; se apoyan en la cintura.
const WALK = (file, like, base) => ({ file, like, names: Array.from({ length: 8 }, (_, i) => `${base}${i}`), anchor: "head" });
const WAVE_TALK = { file: "saludo y charla", like: "idle", names: ["wave0", "wave1", "wave2", "wave3", "talk0", "talk1", "talk2", "talk3"], anchor: "feet" };
const IDLE_PHONE = { file: "parado y celular", like: "idle", names: ["idle0", "idle1", "idle2", "idle3", "phone0", "phone1", "phone2", "phone3"], anchor: "feet", blink: "idleb" };
const BACK = { file: "espaldas quieto", like: "back", names: ["backidle0", "backidle1", "backidle2", "backidle3", "backtalk0", "backtalk1", "backtalk2", "backtalk3"], anchor: "feet" };
// El gato del estudio: sin pose parada de referencia; `tall`: cuánto mide sentado (el quinto cuadro), en px de la lámina
const CAT = { file: "gato", tall: 72, names: ["walk0", "walk1", "walk2", "walk3", "sit", "lick", "sleep", "stretch"], anchor: "feet" };
const SEATED = { file: "sentado tipeando", bust: true, names: ["type0", "type1", "type2", "type3", "think", "sip", "stretch", "doze"] };
const POSES = {
  federico: {
    dir: "Federico",
    frames: { idle: "parado", back: "de espaldas (1)", sit: "sentado" },
    sets: [WALK("caminata frente", "idle", "walk"), WALK("caminata espaldas", "back", "walkb"), WAVE_TALK, IDLE_PHONE, BACK, SEATED],
  },
  franco: {
    dir: "Franco",
    frames: { idle: "parado", back: "de espaldas", sit: "sentado" },
    sets: [WALK("caminata frente", "idle", "walk"), WALK("caminata espaldas", "back", "walkb"), WAVE_TALK, IDLE_PHONE, BACK, SEATED],
  },
  guia: {
    dir: "GUIDE",
    frames: { idle: "parado", back: "de espaldas" },
    sets: [WALK("caminata frente", "idle", "walk"), WALK("caminata espaldas", "back", "walkb"), WAVE_TALK, IDLE_PHONE, BACK],
  },
  visita: {
    dir: "visitante",
    frames: { idle: "parado", back: "de espaldas (1)", think0: "pensando (1)", think1: "pensando (2)" },
    sets: [WALK("caminata frente", "idle", "walk"), WALK("caminata espaldas", "back", "walkb"), WAVE_TALK, IDLE_PHONE, BACK],
  },
  gato: { dir: "gato", frames: {}, sets: [CAT] },
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

/** Corta una lámina de ocho cuadros en sus figuras, en orden de lectura (filas de arriba abajo, cada una de izquierda a derecha). */
async function cycle(file, anchor = "head") {
  const img = await keyedImage(file);
  const { data, w, h } = img;
  const on = (x, y) => data[(y * w + x) * 4 + 3] > 120;
  const rows = new Array(h).fill(0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) rows[y]++;
  const frames = [];
  for (const [y0, y1] of runs(rows, 6, 60, 2)) {
    const cols = new Array(w).fill(0);
    for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (on(x, y)) cols[x]++;
    const segs = runs(cols, 8, 25, 1);
    // Si un cuadro quedó partido (el teclado suelto de las manos), se juntan los pedazos más cercanos
    while (segs.length > 4) {
      let best = 0;
      for (let i = 1; i < segs.length - 1; i++) if (segs[i + 1][0] - segs[i][1] < segs[best + 1][0] - segs[best][1]) best = i;
      segs.splice(best, 2, [segs[best][0], segs[best + 1][1]]);
    }
    for (const [x0, x1] of segs) frames.push({ ...img, ...figure(img, x0, y0, x1, y1) });
  }
  if (frames.length !== 8) throw new Error(`${file}: salieron ${frames.length} figuras, no 8`);
  if (anchor === "head") {
    // Caminando, los pies se abren y se cierran: el centro entre los dos va y
    // viene. El cuerpo avanza parejo, así que cada cuadro se apoya bajo la
    // cabeza, corrido lo que en promedio la cabeza va adelante de los pies
    const lead = frames.reduce((t, f) => t + (f.head - f.feet), 0) / frames.length;
    for (const f of frames) f.feet = f.head - lead;
  }
  return frames;
}

/**
 * Sentado de la cintura para arriba: el borde de abajo del torso (las columnas
 * de la izquierda, donde está el cuerpo; el teclado y las manos van a la
 * derecha y más abajo) y su centro. Ahí se apoya, contra el borde de atrás del
 * escritorio.
 */
function waist(f) {
  const { data, w } = f;
  const { x0, y0, x1 } = f.box;
  const xs = x0 + Math.round((x1 - x0) * 0.42);
  // La ropa, no el teclado ni el contorno: lo claro
  const cloth = (x, y) => {
    const i = (y * w + x) * 4;
    return data[i + 3] > 120 && 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2] > 110;
  };
  let wy = y0;
  for (let x = x0; x <= xs; x++)
    for (let y = f.box.y1; y > wy; y--)
      if (cloth(x, y)) {
        wy = y;
        break;
      }
  let sx = 0, n = 0;
  for (let x = x0; x <= xs; x++)
    if (cloth(x, wy - 3)) {
      sx += x;
      n++;
    }
  // El contorno de abajo, un poco más
  return { y: wy + 2, x: n ? sx / n : (x0 + xs) / 2 };
}

/** Dónde termina la camisa o el buzo y empieza el pantalón, en la pose parada: la primera fila, de la mitad para abajo, casi toda oscura. */
function beltOf(r) {
  const { data, w } = r;
  const { x0, y0, x1, y1 } = r.box;
  const H = y1 - y0 + 1;
  for (let y = y0 + Math.round(H * 0.38); y < y0 + Math.round(H * 0.78); y++) {
    let n = 0, dark = 0;
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue;
      n++;
      if (0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2] < 80) dark++;
    }
    if (n > 12 && dark / n > 0.6) return y;
  }
  return y0 + Math.round(H * 0.5);
}

/**
 * El parpadeo: sobre la pose parada, tapa lo blanco de los ojos (con las
 * pupilas) del color de la piel de al lado y le traza el párpado. Busca los
 * ojos en el quinto de arriba de la figura: manchas blancas grandes y redondas.
 */
function blinkOf(r, band = 0.2) {
  const { w } = r;
  const data = Buffer.from(r.data);
  const { x0, y0, x1, y1 } = r.box;
  const fh = y1 - y0 + 1;
  // Los ojos empiezan en la franja de arriba (`band`: un quinto parado; más abajo sentado, que no tiene piernas); pueden bajar un poco más
  const hy1 = y0 + Math.round(fh * band), hyMax = y0 + Math.round(fh * (band + 0.15));
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
  return { pose, buf: img.data, w: img.info.width, h: img.info.height, ax: (r.feet - x0) * k, ay: ((r.anchorY ?? y1 + 1) - y0) * k };
}

const meta = {};
for (const [who, def] of Object.entries(POSES)) {
  const raw = {};
  for (const [pose, name] of Object.entries(def.frames)) raw[pose] = await keyed(find(def.dir, name));
  // Todos a la misma escala: la de la figura parada
  const k = raw.idle ? HEIGHT / (raw.idle.box.y1 - raw.idle.box.y0 + 1) : 1;
  const parts = [];
  for (const [pose, r] of Object.entries(raw)) parts.push(await part(pose, r, k));
  const blink = raw.idle ? blinkOf(raw.idle) : null;
  if (blink) parts.splice(1, 0, await part("blink", blink, k));
  else if (raw.idle) console.warn(who, "sin parpadeo: no encontré los ojos");
  // Las láminas de ocho vienen de otra imagen, con otro tamaño
  const med = (v) => [...v].sort((a, b) => a - b)[v.length >> 1];
  for (const set of def.sets ?? []) {
    const fr = await cycle(find(def.dir, set.file), set.anchor);
    let kc;
    if (set.tall) kc = set.tall / (fr[4].box.y1 - fr[4].box.y0 + 1);
    else if (set.bust) {
      // Sentado: del pelo a la cintura mide lo que, parado, de la cabeza al cinturón
      const tall = (beltOf(raw.idle) - raw.idle.box.y0) * k;
      for (const f of fr) {
        const wz = waist(f);
        Object.assign(f, { feet: wz.x, anchorY: wz.y });
      }
      kc = tall / med(fr.slice(0, 4).map((f) => f.anchorY - f.box.y0));
    } else {
      // Parados: la mediana de las alturas (la mano en alto no cuenta) mide lo que la pose parada
      const target = (raw[set.like].box.y1 - raw[set.like].box.y0 + 1) * k;
      kc = target / med(fr.map((f) => f.box.y1 - f.box.y0 + 1));
    }
    for (let i = 0; i < fr.length; i++) parts.push(await part(set.names[i], fr[i], kc));
    if (set.blink) {
      const b = blinkOf(fr[0]);
      if (b) parts.push(await part(set.blink, b, kc));
      else console.warn(who, "sin parpadeo en", set.file);
    }
    if (set.bust) {
      // El parpadeo, sobre el primer cuadro tipeando
      const b = blinkOf(fr[0], 0.38);
      if (b) parts.push(await part("typeb", { ...b, feet: fr[0].feet, anchorY: fr[0].anchorY }, kc));
      else console.warn(who, "sin parpadeo sentado");
    }
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
export const SHEETS: Record<"federico" | "franco" | "guia" | "visita" | "gato", Sheet> = ${JSON.stringify(meta, null, 2)};
`;
fs.writeFileSync(OUT_TS, ts);
console.log("ok", path.relative(ROOT, OUT_TS));
