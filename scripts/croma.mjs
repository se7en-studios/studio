// Croma para las imágenes de Flow (stickers de los casos y el marco del
// iPhone): saca el verde (#00FF00) y/o el magenta (#FF00FF) de fondo.
//
// Sólo se borra el fondo que toca los bordes de la imagen, más el croma puro
// que quede encerrado en un hueco (el asa de una pava, la pantalla del
// teléfono): así una hoja, la yerba o un pino no se borran aunque se
// parezcan al fondo. En el contorno, el tinte del fondo se apaga.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const clamp = (v) => Math.max(0, Math.min(1, v));

const KEYS = {
  green: {
    /** 0 = fondo puro, 1 = cualquier otra cosa. */
    solid: (r, g, b) => clamp(((g > 30 ? Math.max(r, b) / g : 1) - 0.25) / 0.2),
    pure: (r, g, b) => g > 170 && Math.max(r, b) < g * 0.22,
    /** Cuánto del color de fondo hay que sacarle al píxel del contorno. */
    despill: (d, i) => {
      const e = d[i + 1] - Math.max(d[i], d[i + 2]);
      if (e > 0) d[i + 1] -= e;
    },
  },
  magenta: {
    solid: (r, g, b) => {
      const k = Math.min(r, b);
      return clamp(((k > 30 ? g / k : 1) - 0.3) / 0.25);
    },
    pure: (r, g, b) => r > 170 && b > 170 && g < Math.min(r, b) * 0.25,
    despill: (d, i) => {
      const e = Math.min(d[i], d[i + 2]) - d[i + 1];
      if (e > 0) {
        d[i] -= e;
        d[i + 2] -= e;
      }
    },
  },
};

/** El color de fondo de una lámina, por la esquina de arriba a la izquierda. */
export async function keyOf(file) {
  const { data } = await sharp(file).extract({ left: 2, top: 2, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return data[1] > data[0] ? "green" : "magenta";
}

/** Devuelve los píxeles RGBA con el fondo transparente. */
export async function keyed(file, keys) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const ks = keys.map((k) => KEYS[k]);
  const solid = (i) => Math.min(...ks.map((k) => k.solid(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])));
  const bg = new Uint8Array(w * h);
  const stack = [];
  const push = (i) => {
    if (bg[i] || solid(i) >= 0.98) return;
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
  for (let i = 0; i < w * h; i++) {
    if (ks.some((k) => k.pure(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]))) push(i);
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
    const a = solid(i);
    for (const k of ks) k.despill(data, i * 4);
    data[i * 4 + 3] = Math.round(a * 255);
  }
  return { data, w, h };
}
