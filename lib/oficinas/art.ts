// Arte de «En vivo»: isométrico 2:1 con baldosas de 64×32, en clave de dibujo
// animado: contorno grueso de tinta, colores planos con una sombra y la paleta
// del estudio (carbón, azul noche, violeta eléctrico y blanco). Los colores de
// cada marca van sólo en su sala. Arquitectura abierta: sin techos, paredes
// altas sólo en el borde del edificio y medias paredes cortadas entre salas.
// La arquitectura (pisos, paredes, carteles) está dibujada en código; los
// muebles y los personajes son las ilustraciones de Federico hechas en Flow
// (muebles.ts, personajes.ts), con los dibujados en código de respaldo. Se
// dibuja en coordenadas del mundo; el motor (engine.ts) pone la escala y decide
// el orden. Los muñecos de respaldo y el gato están en toon.ts.
import type { Area, Decor, Facing, Furni, MapModel, MapRoom, Period } from "@/lib/admin/oficinas-shared";
import { plantStage } from "@/lib/admin/oficinas-shared";
import { CAT_BOX, TOON_BOX, drawCat, drawToon, toonLook, type ActorLook, type ToonPose } from "./toon";
import { SHEETS } from "./personajes";
import { MUEBLES } from "./muebles";

export type { ActorLook };
export const HW = 32;
export const HH = 16;
/** Alturas en px del mundo. */
export const TALL = 118;
export const WALL = 36;
export const RAIL = 12;
const SLAB = 14;
const TH = 0.18; // espesor de pared, en baldosas

export type View = { ox: number; oy: number; width: number; height: number };
export function viewOf(m: MapModel): View {
  const pad = 48;
  return { ox: m.H * HW + pad, oy: TALL + pad, width: (m.W + m.H) * HW + pad * 2, height: (m.W + m.H) * HH + TALL + SLAB + pad * 2 };
}

/**
 * La paleta de la marca, la misma de la landing (rd.css): tinta, papel, grises
 * y el naranja de señal. Los demás colores (verde, amarillo, cian…) son de cada
 * marca y van sólo en su sala; el verde de las plantas, en el jardín.
 */
export const PAL = {
  ink: "#0b0b0c",
  ink2: "#151517",
  ink3: "#1e1e21",
  char: "#26262a",
  char2: "#303035",
  char3: "#3d3d43",
  grey: "#5d5952",
  grey2: "#8d8982",
  grey3: "#b9b4ab",
  paper: "#f2eee6",
  paper2: "#e6e0d4",
  white: "#fbfaf7",
  signal: "#ff4d2e",
  signal2: "#ff6a4f",
  signal3: "#ffb199",
  deep: "#c4381c",
  wood: "#c8925c",
} as const;
/** El naranja del logo de se7en. */
const SIGNAL = PAL.signal;

// --- Pincel -----------------------------------------------------------------

let g: CanvasRenderingContext2D;
let V: View = { ox: 0, oy: 0, width: 0, height: 0 };
let F = 0;
let T = 0;
let TC = "#070a20";
export function begin(ctx: CanvasRenderingContext2D, view: View) {
  g = ctx;
  V = view;
  F = 0;
  T = 0;
}
/** Apagado de lo que se dibuja a continuación (0 = encendido, 1 = apagado). */
export function setFade(f: number) {
  F = f;
}
/**
 * La luz de la hora: cuánto se tiñe lo que viene (0 = nada) y de qué color. A
 * la noche el hall queda en penumbra y las salas, prendidas. Va horneado en los
 * colores: no hay una capa de oscuridad que repintar en cada cuadro.
 */
export function setTint(t: number, color = TC) {
  T = t;
  TC = color;
}
export type XY = [number, number];
/** Cuánto se sube lo que se dibuja arriba de un mueble ilustrado (su tapa no está a la altura de la del dibujado en código). */
let ZL = 0;
export const P = (x: number, y: number, z = 0): XY => [V.ox + (x - y) * HW, V.oy + (x + y) * HH - z - ZL];

// --- Color: paleta cerrada, apagado por luminancia y la luz de la hora --------

const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hex = (r: number, gg: number, b: number) =>
  "#" + [r, gg, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export function mix(a: string, b: string, t: number) {
  const A = rgb(a), B = rgb(b);
  return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
const fcache = new Map<string, string>();
/** Mezcla hacia gris y oscurece hasta 40 %: así «se apaga» una sala. */
export function fadeHex(h: string, f: number) {
  if (f <= 0.001) return h;
  const q = Math.round(f * 20) / 20, k = h + q;
  let v = fcache.get(k);
  if (!v) {
    const [r, gg, b] = rgb(h), l = 0.3 * r + 0.59 * gg + 0.11 * b;
    const m = (cc: number) => (cc * (1 - q) + l * q) * (1 - 0.4 * q);
    v = hex(m(r), m(gg), m(b));
    fcache.set(k, v);
  }
  return v;
}
const tcache = new Map<string, string>();
const c = (h: string) => {
  if (h[0] !== "#") return h;
  const v = fadeHex(h, F);
  if (T <= 0.001) return v;
  const k = `${v}${TC}${T}`;
  let w = tcache.get(k);
  if (!w) tcache.set(k, (w = mix(v, TC, T)));
  return w;
};
const dark = (h: string, k: number) => mix(h, "#000000", k);
const lite = (h: string, k: number) => mix(h, "#ffffff", k);
// Trazo fino de tinta, como en los fondos de un dibujo animado
const OUT = "rgba(11,11,12,0.88)";
const OUT_SOFT = "rgba(11,11,12,0.45)";
const LW = 1.05;

export function hash(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// --- Primitivas -------------------------------------------------------------

function poly(pts: XY[], fill: string | null, stroke: string | null = null, lw = LW) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.lineJoin = "round";
    g.stroke();
  }
}
function line(a: XY, b: XY, color: string, lw = 1) {
  g.beginPath();
  g.moveTo(a[0], a[1]);
  g.lineTo(b[0], b[1]);
  g.strokeStyle = color;
  g.lineWidth = lw;
  g.stroke();
}
function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, stroke: string | null = null, lw = LW) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }
}

/** Caja isométrica: (x, y) es la esquina de atrás en baldosas; z y h en px. Cada cara con su contorno de tinta. */
function box(x: number, y: number, z: number, w: number, d: number, h: number, base: string, o: { top?: string; left?: string; right?: string; line?: string | null } = {}) {
  const st = o.line === undefined ? OUT : o.line;
  poly([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)], c(o.left ?? base), st);
  poly([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)], c(o.right ?? dark(base, 0.26)), st);
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], c(o.top ?? lite(base, 0.16)), st);
}
/** Un cilindro parado (patas, macetas, el bidón): un óvalo arriba y el costado. */
function cyl(cx: number, cy: number, z: number, r: number, h: number, side: string, top: string) {
  const [x, y] = P(cx, cy, z);
  g.beginPath();
  g.moveTo(x - r, y - h);
  g.lineTo(x - r, y);
  g.ellipse(x, y, r, r / 2, 0, Math.PI, 0, true);
  g.lineTo(x + r, y - h);
  g.closePath();
  g.fillStyle = c(side);
  g.fill();
  g.strokeStyle = OUT;
  g.lineWidth = LW;
  g.stroke();
  ellipse(x, y - h, r, r / 2, c(top), OUT);
}

// --- Imágenes: capturas de los sitios y texturas de marca ------------------------

type Img = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
/** Largo de una baldosa medido sobre la pared o el piso, en px del mundo. */
const TILE = Math.hypot(HW, HH);
const sizeOf = (s: Img): [number, number] =>
  s instanceof HTMLImageElement ? [s.naturalWidth, s.naturalHeight] : s instanceof HTMLVideoElement ? [s.videoWidth, s.videoHeight] : [s.width, s.height];
const fadedCache = new WeakMap<Img, Map<number, HTMLCanvasElement | null>>();
/** La misma imagen apagada con la cuenta de fadeHex. Se arma una vez por escalón de 5 %. */
function faded(src: Img, f: number): Img {
  const q = Math.round(f * 20) / 20;
  if (q <= 0) return src;
  let byQ = fadedCache.get(src);
  if (!byQ) fadedCache.set(src, (byQ = new Map()));
  let out = byQ.get(q);
  if (out === undefined) {
    out = null;
    try {
      const [w, h] = sizeOf(src);
      const cv = document.createElement("canvas");
      cv.width = w;
      cv.height = h;
      const t = cv.getContext("2d") as CanvasRenderingContext2D;
      t.drawImage(src, 0, 0);
      const data = t.getImageData(0, 0, w, h), px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2];
        for (let k = 0; k < 3; k++) px[i + k] = (px[i + k] * (1 - q) + l * q) * (1 - 0.4 * q);
      }
      t.putImageData(data, 0, 0);
      out = cv;
    } catch {
      // Una imagen de otro origen no se deja leer: va sin apagar.
    }
    byQ.set(q, out);
  }
  return out ?? src;
}
/**
 * Una imagen sobre un paralelogramo del mundo: `a` es la esquina de arriba a la
 * izquierda tal como se lee, `b` la de arriba a la derecha y `d` la de abajo a
 * la izquierda. Con `aspect` (ancho/alto real) recorta al centro en vez de
 * deformar; con `top`, una imagen alta se muestra desde esa altura (en px de la imagen).
 */
export function quadImage(src: Img, a: XY, b: XY, d: XY, aspect?: number, top?: number) {
  const [w, h] = sizeOf(src);
  if (!w || !h) return;
  let sx = 0, sy = 0, sw = w, sh = h;
  if (aspect) {
    if (w / h > aspect) { sw = h * aspect; sx = (w - sw) / 2; }
    else { sh = w / aspect; sy = top === undefined ? (h - sh) / 2 : Math.max(0, Math.min(h - sh, top)); }
  }
  g.save();
  g.imageSmoothingQuality = "high";
  g.transform((b[0] - a[0]) / sw, (b[1] - a[1]) / sw, (d[0] - a[0]) / sh, (d[1] - a[1]) / sh, a[0], a[1]);
  g.drawImage(faded(src, F), sx, sy, sw, sh, 0, 0, sw, sh);
  g.restore();
}
/** Una imagen colgada en una pared, derecha para el que mira (en la pared L el +u va hacia la izquierda). */
function wallImage(dc: Decor, src: Img, u0: number, u1: number, z0: number, z1: number, fit = true) {
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = (dc.side === "L" ? dc.x : dc.y) + 0.015, start = dc.side === "L" ? dc.y : dc.x;
  const at = (u: number, z: number) => onFace(fc, plane, start, u, z);
  const [l, r] = dc.side === "L" ? [u1, u0] : [u0, u1];
  quadImage(src, at(l, z1), at(r, z1), at(l, z0), fit ? ((u1 - u0) * TILE) / (z1 - z0) : undefined);
}

/** `tagline`: la frase entera del sitio; `highlight`, su remate. */
export type Brand = { family: string; weight: number; uppercase: boolean; highlight: string; tagline?: string };
/** El logo completo y el ícono de la marca, ya cargados (null mientras tanto o si no hay). */
export type BrandImages = { logo: HTMLImageElement | null; mark: HTMLImageElement | null };
/**
 * Lo propio de cada sala: la captura del sitio (`site`: la de arriba, la que se
 * ve desde afuera; `page`: la página entera de la captura automática), el ícono
 * de la marca (cuando cargan) y las texturas horneadas.
 */
export type RoomArt = BrandImages & {
  site: HTMLImageElement | HTMLCanvasElement | null;
  page: HTMLImageElement | null;
  rug: HTMLCanvasElement;
  mat: HTMLCanvasElement;
  poster: HTMLCanvasElement;
  court: HTMLCanvasElement;
};
/** Lo del estudio: el logo de se7en (cuando carga) y la frase de la recepción, horneada con la letra del sitio. */
export type StudioArt = { logo: HTMLImageElement | null; slogan: HTMLCanvasElement | null; slides: string[] };

const TEX = 96; // px de textura por baldosa: alcanza para el zoom más cercano en pantallas retina
const BRAND_FALLBACK = "ui-sans-serif, system-ui, sans-serif";
const lumOf = (h: string) => {
  const [r, gg, b] = rgb(h);
  return 0.3 * r + 0.59 * gg + 0.11 * b;
};
function texture(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement("canvas");
  cv.width = Math.round(w);
  cv.height = Math.round(h);
  return [cv, cv.getContext("2d") as CanvasRenderingContext2D];
}
/**
 * Escribe `text` centrado en (cx, cy) lo más grande que entre en maxW × maxH,
 * medido por la tinta. Varios renglones van con el mismo cuerpo.
 */
function wordmark(t: CanvasRenderingContext2D, text: string | string[], font: (px: number) => string, cx: number, cy: number, maxW: number, maxH: number, color: string) {
  const lines = typeof text === "string" ? [text] : text;
  const lh = maxH / lines.length;
  t.font = font(100);
  let k = Infinity;
  for (const s of lines) {
    const m = t.measureText(s);
    k = Math.min(k, maxW / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight || 1), (lh * (lines.length > 1 ? 0.8 : 1)) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 1));
  }
  t.font = font(100 * k);
  t.textAlign = "left";
  t.textBaseline = "alphabetic";
  t.fillStyle = color;
  // Los renglones se alinean por la altura de las mayúsculas, no por su tinta (si no, «g» y «p» los desparejan).
  const cap = t.measureText("H").actualBoundingBoxAscent;
  lines.forEach((s, i) => {
    const m = t.measureText(s);
    const y = lines.length > 1 ? cy + (i - (lines.length - 1) / 2) * lh + cap / 2 : cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2;
    t.fillText(s, cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2, y);
  });
}
/** Una imagen centrada en (cx, cy), lo más grande que entre en maxW × maxH sin deformarse. */
function fitImage(t: CanvasRenderingContext2D, img: Img, cx: number, cy: number, maxW: number, maxH: number) {
  const [w, h] = sizeOf(img);
  const k = Math.min(maxW / w, maxH / h);
  t.imageSmoothingQuality = "high";
  t.drawImage(img, cx - (w * k) / 2, cy - (h * k) / 2, w * k, h * k);
}
/**
 * La firma de la marca en una caja: el logo si hay; si no, el ícono con el
 * nombre al lado; si no, el nombre solo (a 0.62 del alto, como una línea de texto).
 */
function lockup(t: CanvasRenderingContext2D, imgs: BrandImages, text: string, font: (px: number) => string, cx: number, cy: number, maxW: number, maxH: number, color: string) {
  if (imgs.logo) return fitImage(t, imgs.logo, cx, cy, maxW, maxH);
  if (!imgs.mark) return wordmark(t, text, font, cx, cy, maxW, maxH * 0.62, color);
  const [iw, ih] = sizeOf(imgs.mark);
  const mh = maxH * 0.86, mw = (iw / ih) * mh, gap = mh * 0.24;
  t.font = font(100);
  const m = t.measureText(text);
  const k = Math.min((maxW - mw - gap) / (m.actualBoundingBoxLeft + m.actualBoundingBoxRight || 1), (maxH * 0.5) / (m.actualBoundingBoxAscent + m.actualBoundingBoxDescent || 1));
  const tw = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * k;
  const x0 = cx - (mw + gap + tw) / 2;
  fitImage(t, imgs.mark, x0 + mw / 2, cy, mw, mh);
  wordmark(t, text, font, x0 + mw + gap + tw / 2, cy, tw, maxH * 0.5, color);
}
/** Un nombre largo en dos renglones parejos: «Apex / Performance», «Poné La / Pava». */
function twoLines(s: string): string | string[] {
  const sp = [...s.matchAll(/ /g)].map((m) => m.index as number);
  if (s.length < 10 || !sp.length) return s;
  const cut = sp.reduce((a, b) => (Math.abs(b - s.length / 2) < Math.abs(a - s.length / 2) ? b : a));
  return [s.slice(0, cut), s.slice(cut + 1)];
}

/**
 * Las texturas con la marca del proyecto: su logo (o su nombre en su tipografía)
 * y su color. `posterAspect` es ancho/alto del cartel (la pared alta y la media
 * no miden lo mismo). Se vuelven a hornear cuando bajan la tipografía y los logos.
 */
export function bakeBrand(name: string, accent: string, brand: Brand | null, posterAspect: number, imgs: BrandImages): Omit<RoomArt, "site" | "page" | "logo" | "mark"> {
  const family = brand?.family ?? BRAND_FALLBACK;
  // Las marcas de trazo fino (Outfit 300) no se leen chiquitas: mínimo 500.
  const font = (px: number) => `${Math.max(brand?.weight ?? 700, 500)} ${px}px ${family}`;
  const text = brand?.uppercase ? name.toUpperCase() : name;
  const ink = lumOf(accent) < 80 ? lite(accent, 0.45) : accent;
  const deep = mix(accent, "#14121c", 0.82);
  const cream = "#f5f3ff";

  // Alfombra de 3×2: guarda del color de la marca, contorno de tinta y el logo al medio
  const [rug, r] = texture(3 * TEX, 2 * TEX);
  const e = 0.07 * TEX;
  r.fillStyle = PAL.ink;
  r.beginPath();
  r.roundRect(e - 3, e - 3, 3 * TEX - 2 * e + 6, 2 * TEX - 2 * e + 6, 0.08 * TEX);
  r.fill();
  r.fillStyle = accent;
  r.beginPath();
  r.roundRect(e, e, 3 * TEX - 2 * e, 2 * TEX - 2 * e, 0.06 * TEX);
  r.fill();
  r.fillStyle = deep;
  r.beginPath();
  r.roundRect(0.18 * TEX, 0.18 * TEX, 2.64 * TEX, 1.64 * TEX, 0.04 * TEX);
  r.fill();
  r.strokeStyle = "rgba(245,243,255,0.3)";
  r.lineWidth = 2;
  r.setLineDash([7, 6]);
  r.strokeRect(0.26 * TEX, 0.26 * TEX, 2.48 * TEX, 1.48 * TEX);
  r.setLineDash([]);
  lockup(r, imgs, text, font, 1.5 * TEX, TEX, 2.25 * TEX, TEX, ink);

  // Felpudo: oscuro con la guarda del color de la marca y el ícono (o el nombre)
  const [mat, t] = texture(0.84 * TEX * 1.4, 0.64 * TEX * 1.4);
  const mw = mat.width, mh = mat.height;
  t.fillStyle = PAL.ink;
  t.beginPath();
  t.roundRect(0, 0, mw, mh, 9);
  t.fill();
  t.fillStyle = accent;
  t.beginPath();
  t.roundRect(3, 3, mw - 6, mh - 6, 7);
  t.fill();
  t.fillStyle = deep;
  t.beginPath();
  t.roundRect(9, 9, mw - 18, mh - 18, 4);
  t.fill();
  if (imgs.mark) fitImage(t, imgs.mark, mw / 2, mh / 2, mw * 0.6, mh * 0.6);
  else wordmark(t, twoLines(text), font, mw / 2, mh / 2, mw * 0.74, mh * 0.48, ink);

  // Cartel de pared: el logo y, abajo, el remate de la frase de la marca
  const ph = 120, pw = ph * posterAspect;
  const [poster, p] = texture(pw, ph);
  p.fillStyle = deep;
  p.fillRect(0, 0, pw, ph);
  p.strokeStyle = accent;
  p.lineWidth = 4;
  p.strokeRect(7, 7, pw - 14, ph - 14);
  const hl = brand?.highlight ?? "";
  const [lw, lh] = imgs.logo ? sizeOf(imgs.logo) : [0, 1];
  if (imgs.logo && lw / lh < 1.4) {
    // Un logo redondo o cuadrado (un sello) queda chico centrado: va grande a la
    // izquierda y la frase entera al lado (el sello ya dice el nombre)
    const phrase = brand?.tagline || hl;
    fitImage(p, imgs.logo, ph * 0.56, ph / 2, ph * 0.74, ph * 0.74);
    wordmark(p, phrase ? twoLines(phrase) : text, font, (ph * 0.98 + pw - 14) / 2, ph / 2, pw - ph * 0.98 - 22, ph * 0.5, phrase ? cream : ink);
  } else if (hl) {
    lockup(p, imgs, text, font, pw / 2, ph * 0.42, pw * 0.8, ph * 0.5, ink);
    wordmark(p, hl, font, pw / 2, ph * 0.8, pw * 0.6, ph * 0.11, cream);
  } else lockup(p, imgs, text, font, pw / 2, ph / 2, pw * 0.8, ph * 0.66, ink);

  // El logo pintado en la cancha (sólo lo usa el pádel)
  const [court, k] = texture(1.4 * TEX, 0.9 * TEX);
  k.globalAlpha = 0.85;
  if (imgs.logo) fitImage(k, imgs.logo, court.width / 2, court.height / 2, court.width * 0.94, court.height * 0.9);
  else wordmark(k, twoLines(text), font, court.width / 2, court.height / 2, court.width * 0.94, court.height * 0.62, "#f4f1ea");

  return { rug, mat, poster, court };
}

/**
 * La frase de la recepción, pintada en la pared: «Dos fundadores. / Cero
 * intermediarios.», como el título de Fundadores en la landing. `family`: la
 * letra del sitio (Archivo); sin ella, la del sistema.
 */
export function bakeSlogan(family: string | null, aspect: number): HTMLCanvasElement {
  const [cv, t] = texture(1200, 1200 / aspect);
  const font = (px: number) => `800 ${px}px ${family ?? BRAND_FALLBACK}`;
  const lines: [string, string | null][] = [["Dos fundadores.", null], ["Cero", " intermediarios."]];
  t.font = font(100);
  const wid = Math.max(...lines.map(([a, b]) => t.measureText(a + (b ?? "")).width));
  const px = Math.min((cv.width * 0.92 * 100) / wid, cv.height * 0.4);
  t.font = font(px);
  t.textBaseline = "middle";
  lines.forEach(([a, b], i) => {
    const y = cv.height * (i ? 0.72 : 0.3);
    const w = t.measureText(a + (b ?? "")).width;
    let x = (cv.width - w) / 2;
    // Contorno de tinta y el relleno: «Cero» en violeta, el resto en blanco
    for (const [s, col] of (b ? [[a, PAL.signal2], [b, PAL.white]] : [[a, PAL.white]]) as [string, string][]) {
      t.lineJoin = "round";
      t.lineWidth = px * 0.16;
      t.strokeStyle = PAL.ink;
      t.strokeText(s, x, y);
      t.fillStyle = col;
      t.fillText(s, x, y);
      x += t.measureText(s).width;
    }
  });
  return cv;
}

/** Punto sobre una cara vertical: la que mira a +y (plano y = plane) o a +x (plano x = plane). */
const onFace = (face: Facing, plane: number, start: number, u: number, z: number): XY =>
  face === "y" ? P(start + u, plane, z) : P(plane, start + u, z);
function faceRect(face: Facing, plane: number, start: number, u0: number, u1: number, z0: number, z1: number, fill: string, stroke: string | null = null) {
  poly([onFace(face, plane, start, u0, z1), onFace(face, plane, start, u1, z1), onFace(face, plane, start, u1, z0), onFace(face, plane, start, u0, z0)], fill, stroke);
}

// --- Piso ---------------------------------------------------------------------

export type Material = "hall" | "reception" | "dev" | "design" | "meeting" | "lounge" | "wood" | "parquet" | "gallery" | "kitchen" | "storage" | "grass";

// Pisos claros y paredes oscuras, como en un dibujo animado: se lee todo de un vistazo.
const FLOOR: Record<Material, [string, string]> = {
  hall: ["#ddd6ca", "#d6cfc2"],
  reception: ["#ece6da", "#e5dfd2"],
  dev: ["#46464c", "#424248"],
  design: ["#d9b88d", "#d2b186"],
  meeting: ["#d2cdc5", "#ccc7bf"],
  lounge: ["#34343a", "#313137"],
  wood: ["#d4b990", "#cdb289"],
  parquet: ["#9a7350", "#936d4b"],
  gallery: ["#cfc8bc", "#c9c2b6"],
  kitchen: ["#f2eee6", "#2c2c30"],
  storage: ["#bdb7ad", "#b7b1a7"],
  grass: ["#3f6b3a", "#3c6737"],
};
const PLANKS = new Set<Material>(["wood", "parquet", "design"]);
const CARPET = new Set<Material>(["dev", "lounge"]);

/** `runner`: «axis» marca el eje de circulación (las flechitas van hacia el ala de proyectos); «gallery», la alfombra del Archivo. */
export function floorTile(x: number, y: number, mat: Material, runner: "axis" | "gallery" | null = null) {
  const [a, b] = FLOOR[mat];
  if (mat === "kitchen") {
    for (let i = 0; i < 4; i++) {
      const u = (i % 2) / 2, v = Math.floor(i / 2) / 2;
      poly([P(x + u, y + v), P(x + u + 0.5, y + v), P(x + u + 0.5, y + v + 0.5), P(x + u, y + v + 0.5)], c(i === 0 || i === 3 ? a : b));
    }
  } else poly([P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)], c((x + y) % 2 ? a : b));
  if (mat === "grass") {
    // El pasto: unas matitas más claras y más oscuras, sin juntas
    for (let i = 0; i < 5; i++) {
      const p = P(x + hash(x * 5 + i, y), y + hash(x, y * 3 + i));
      g.fillStyle = c(i % 2 ? "#4f8045" : "#335a30");
      g.fillRect(p[0], p[1] - 1.5, 1.2, 2.5);
    }
    return;
  }
  if (PLANKS.has(mat)) {
    const seam = c(dark(a, 0.16));
    for (const v of [1 / 3, 2 / 3]) {
      if (mat === "parquet") line(P(x + v, y), P(x + v, y + 1), seam, 0.7);
      else line(P(x, y + v), P(x + 1, y + v), seam, 0.7);
    }
    const j = hash(x, y) * 0.8 + 0.1;
    if (mat !== "parquet") line(P(x + j, y), P(x + j, y + 1 / 3), seam, 0.7);
  }
  if (CARPET.has(mat)) {
    g.fillStyle = c(lite(a, 0.08));
    for (let i = 0; i < 4; i++) {
      const p = P(x + hash(x * 3 + i, y), y + hash(x, y * 5 + i));
      g.fillRect(p[0], p[1], 1.6, 1);
    }
  }
  if (runner === "axis") {
    // El eje: una franja de tinta con los bordes naranjas y flechitas hacia el ala de proyectos
    poly([P(x + 0.26, y), P(x + 0.74, y), P(x + 0.74, y + 1), P(x + 0.26, y + 1)], c(PAL.ink3));
    line(P(x + 0.26, y), P(x + 0.26, y + 1), c(PAL.signal), 1.3);
    line(P(x + 0.74, y), P(x + 0.74, y + 1), c(PAL.signal), 1.3);
    poly([P(x + 0.38, y + 0.32), P(x + 0.5, y + 0.6), P(x + 0.62, y + 0.32), P(x + 0.5, y + 0.46)], c(PAL.signal));
  } else if (runner === "gallery") {
    poly([P(x + 0.18, y), P(x + 0.82, y), P(x + 0.82, y + 1), P(x + 0.18, y + 1)], c(PAL.ink3));
    line(P(x + 0.18, y), P(x + 0.18, y + 1), c(PAL.signal3), 1);
    line(P(x + 0.82, y), P(x + 0.82, y + 1), c(PAL.signal3), 1);
  }
  // Las juntas: una línea fina en los bordes de atrás de cada baldosa
  const j = c(dark(a, 0.18));
  line(P(x, y + 1), P(x, y), j, 0.7);
  line(P(x, y), P(x + 1, y), j, 0.7);
}

/** El borde de tierra del jardín (adelante y a la derecha) donde ya no hay nada. */
export function earth(x: number, y: number, front: boolean, right: boolean) {
  if (front) poly([P(x, y + 1, 0), P(x + 1, y + 1, 0), P(x + 1, y + 1, -SLAB), P(x, y + 1, -SLAB)], c("#3b2a1d"), OUT_SOFT);
  if (right) poly([P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x + 1, y + 1, -SLAB), P(x + 1, y, -SLAB)], c("#2b1f15"), OUT_SOFT);
}

/**
 * El espesor del piso de cada sector, en los bordes que dan al jardín: como el
 * edificio no es un rectángulo, se mira baldosa por baldosa.
 */
export function slab(m: MapModel, matAt: (x: number, y: number) => Material) {
  const built = (x: number, y: number) => x >= 0 && y >= 0 && x < m.W && y < m.H && m.region[y][x] !== "out";
  for (let y = 0; y < m.H; y++)
    for (let x = 0; x < m.W; x++) {
      if (!built(x, y)) continue;
      const base = FLOOR[matAt(x, y)][0];
      if (!built(x, y + 1)) {
        poly([P(x, y + 1, 0), P(x + 1, y + 1, 0), P(x + 1, y + 1, -SLAB), P(x, y + 1, -SLAB)], c(PAL.char2), OUT);
        line(P(x, y + 1, -1), P(x + 1, y + 1, -1), c(dark(base, 0.25)), 1.4);
      }
      if (!built(x + 1, y)) {
        poly([P(x + 1, y, 0), P(x + 1, y + 1, 0), P(x + 1, y + 1, -SLAB), P(x + 1, y, -SLAB)], c(PAL.ink3), OUT);
        line(P(x + 1, y, -1), P(x + 1, y + 1, -1), c(dark(base, 0.25)), 1.4);
      }
    }
}

/** Lo que va pintado en el piso según el tema: la cancha de pádel, la colchoneta y el felpudo de la puerta. */
export function decal(f: Furni, accent: string, art: RoomArt | null) {
  const { x, y, w, d } = f;
  if (f.k === "doormat") {
    // Se lee de frente: el texto corre a lo largo de la puerta (hacia -y) y mira al pasillo.
    poly([P(x + 0.16, y + 0.06), P(x + 0.84, y + 0.06), P(x + 0.84, y + 0.94), P(x + 0.16, y + 0.94)], "rgba(6,4,16,0.3)");
    if (art) quadImage(art.mat, P(x + 0.18, y + 0.92), P(x + 0.18, y + 0.08), P(x + 0.82, y + 0.92));
    else poly([P(x + 0.18, y + 0.08), P(x + 0.82, y + 0.08), P(x + 0.82, y + 0.92), P(x + 0.18, y + 0.92)], c(accent), OUT);
    return;
  }
  if (f.k === "court") {
    poly([P(x + 0.05, y + 0.05), P(x + w - 0.05, y + 0.05), P(x + w - 0.05, y + d - 0.05), P(x + 0.05, y + d - 0.05)], c("#2f6fb3"), OUT);
    const L = c("#f4f1ea");
    const segs: [XY, XY][] = [
      [P(x + 0.2, y + 0.2), P(x + w - 0.2, y + 0.2)],
      [P(x + w - 0.2, y + 0.2), P(x + w - 0.2, y + d - 0.2)],
      [P(x + w - 0.2, y + d - 0.2), P(x + 0.2, y + d - 0.2)],
      [P(x + 0.2, y + d - 0.2), P(x + 0.2, y + 0.2)],
      [P(x + w * 0.25, y + d / 2), P(x + w * 0.75, y + d / 2)],
      [P(x + w * 0.25, y + 0.2), P(x + w * 0.25, y + d - 0.2)],
      [P(x + w * 0.75, y + 0.2), P(x + w * 0.75, y + d - 0.2)],
    ];
    for (const [a, b] of segs) line(a, b, L, 1.2);
    // El nombre del club pintado en la mitad de atrás, como en las canchas de verdad
    if (art) quadImage(art.court, P(x + 0.32, y + 0.25), P(x + w / 2 - 0.28, y + 0.25), P(x + 0.32, y + d - 0.85), (w / 2 - 0.6) / (d - 1.1));
    // La red, en el medio de la cancha
    poly([P(x + w / 2, y + 0.12, 9), P(x + w / 2, y + d - 0.12, 9), P(x + w / 2, y + d - 0.12, 0), P(x + w / 2, y + 0.12, 0)], "rgba(18,18,24,0.4)");
    line(P(x + w / 2, y + 0.12, 9), P(x + w / 2, y + d - 0.12, 9), L, 1.4);
  } else if (f.k === "pond") {
    // Un estanque chico en el jardín, con su borde de piedras
    poly([P(x + 0.1, y + 0.2), P(x + w - 0.2, y + 0.1), P(x + w - 0.1, y + d - 0.2), P(x + 0.2, y + d - 0.1)], c("#8d8982"), OUT);
    poly([P(x + 0.25, y + 0.32), P(x + w - 0.32, y + 0.25), P(x + w - 0.25, y + d - 0.32), P(x + 0.32, y + d - 0.25)], c("#3f7ea6"));
    poly([P(x + 0.5, y + 0.55), P(x + 1, y + 0.45), P(x + 1.1, y + 0.6), P(x + 0.6, y + 0.7)], c("#7fb4d4"));
  } else if (f.k === "yogamat") {
    poly([P(x + 0.18, y + 0.05), P(x + 0.82, y + 0.05), P(x + 0.82, y + d - 0.05), P(x + 0.18, y + d - 0.05)], c(accent), OUT);
    line(P(x + 0.18, y + 0.3), P(x + 0.82, y + 0.3), c(dark(accent, 0.25)), 1);
  }
}

/** La alfombra de una sala de proyecto, con la marca horneada (ver bakeBrand). */
export function brandRug(f: Furni, tex: HTMLCanvasElement) {
  const { x, y, w, d } = f;
  poly([P(x + 0.1, y + 0.12), P(x + w - 0.04, y + 0.12), P(x + w - 0.04, y + d - 0.02), P(x + 0.1, y + d - 0.02)], "rgba(6,4,16,0.25)");
  quadImage(tex, P(x, y), P(x + w, y), P(x, y + d));
}

/** Una alfombra de las salas del estudio: borde, centro y un rombo. */
export function rug(f: Furni, color: string, edge: string) {
  const { x, y, w, d } = f;
  poly([P(x + 0.08, y + 0.08), P(x + w - 0.08, y + 0.08), P(x + w - 0.08, y + d - 0.08), P(x + 0.08, y + d - 0.08)], c(edge), OUT);
  poly([P(x + 0.2, y + 0.2), P(x + w - 0.2, y + 0.2), P(x + w - 0.2, y + d - 0.2), P(x + 0.2, y + d - 0.2)], c(color));
  const cx = x + w / 2, cy = y + d / 2;
  poly([P(cx - 0.45, cy), P(cx, cy - 0.32), P(cx + 0.45, cy), P(cx, cy + 0.32)], c(mix(color, edge, 0.5)));
}

// --- Paredes ----------------------------------------------------------------------

export type WallStyle = { face: string; cap: string; stripe?: string };
/** Alto del vidrio de Reuniones. */
const GLASS = 52;
/**
 * Un tramo de pared en el borde de atrás de la baldosa (x, y). Arriba, el corte
 * de la pared en tinta; las altas llevan además el filo naranja. El vidrio es
 * un marco fino con el panel casi transparente: se ve todo lo de adentro.
 */
export function wallSegment(side: "L" | "R", x: number, y: number, kind: "rail" | "wall" | "tall" | "glass", s: WallStyle, door: boolean) {
  const fc: Facing = side === "L" ? "x" : "y";
  const start = side === "L" ? y : x;
  const plane = side === "L" ? x : y;
  if (kind === "glass") {
    const post = (u: number) => {
      if (side === "L") box(x - 0.05, y + u, 0, 0.05, 0.06, GLASS, PAL.ink3, { line: null });
      else box(x + u, y - 0.05, 0, 0.06, 0.05, GLASS, PAL.ink3, { line: null });
    };
    if (door) {
      post(0);
      post(0.94);
      return;
    }
    faceRect(fc, plane - 0.01, start, 0, 1, 2, GLASS, "rgba(196,224,236,0.22)");
    faceRect(fc, plane - 0.01, start, 0.08, 0.5, GLASS - 22, GLASS - 6, "rgba(255,255,255,0.18)");
    faceRect(fc, plane - 0.01, start, 0, 1, 0, 3, c(PAL.ink3));
    faceRect(fc, plane - 0.01, start, 0, 1, GLASS - 2, GLASS, c(PAL.ink3));
    post(0);
    return;
  }
  const h = kind === "tall" ? TALL : kind === "wall" ? WALL : RAIL;
  const face = s.face, top = s.cap;
  // L: pared en el plano x = x (cara que mira a +x). R: en el plano y = y (cara que mira a +y).
  const seg = (a: number, b: number, z0: number, z1: number) => {
    if (side === "L") box(x - TH, y + a, z0, TH, b - a, z1 - z0, face, { right: face, left: dark(face, 0.3), top });
    else box(x + a, y - TH, z0, b - a, TH, z1 - z0, face, { left: face, right: dark(face, 0.3), top });
  };
  if (!door) {
    seg(0, 1, 0, h);
    if (kind !== "rail") faceRect(fc, plane, start, 0, 1, 0, 5, c(dark(face, 0.35)));
    if (kind === "tall") faceRect(fc, plane, start, 0, 1, h - 6, h - 4, c(PAL.signal));
    if (s.stripe && kind === "wall") faceRect(fc, plane, start, 0, 1, h - 7, h - 3.5, c(s.stripe));
    return;
  }
  // Puerta: dos jambas y el hueco libre en el medio
  const post = kind === "rail" ? 20 : h + 4;
  seg(0, 0.14, 0, post);
  seg(0.86, 1, 0, post);
}

/** ¿Este cartel va en una pared alta (el borde de atrás de un sector)? */
const onTall = (dc: Decor) => dc.tall ?? ((dc.side === "L" && dc.x === 0) || (dc.side === "R" && dc.y === 0));

/** Lo que va colgado en una pared (ventana, pizarrón, tele…). Se recorta al tramo que se está dibujando. */
export function decor(dc: Decor, accent: string, period: Period, art: RoomArt | null = null, studio: StudioArt | null = null) {
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = dc.side === "L" ? dc.x + 0.01 : dc.y + 0.01;
  const start = dc.side === "L" ? dc.y : dc.x;
  const R = (u0: number, u1: number, z0: number, z1: number, fill: string, stroke: string | null = null) => faceRect(fc, plane, start, u0, u1, z0, z1, c(fill), stroke);
  const L = dc.len;
  const { z0, z1 } = kindZ(dc);
  switch (dc.k) {
    case "window": {
      const sky = SKY[period];
      const city = CITY[period];
      for (let i = 0; i < L; i++) {
        R(i + 0.1, i + 0.9, 42, 102, PAL.paper, OUT);
        R(i + 0.17, i + 0.83, 48, 96, sky);
        // La ciudad de afuera: edificios de alturas distintas y, de noche, las ventanas prendidas
        let u = i + 0.17;
        for (let k = 0; u < i + 0.83; k++) {
          const seed = hash(dc.x * 7 + dc.y * 13 + i, k);
          const w = Math.min(0.1 + seed * 0.14, i + 0.83 - u);
          const h = 8 + hash(k, dc.x + dc.y * 3 + i) * 22;
          R(u, u + w, 48, 48 + h, k % 2 ? city.far : city.near);
          for (let fy = 51; fy < 46 + h; fy += 4)
            for (let fx = u + 0.025; fx < u + w - 0.035; fx += 0.05)
              if (hash(Math.round(fx * 97), fy + k * 31) < city.lit) R(fx, fx + 0.022, fy, fy + 1.6, hash(fy, k) > 0.7 ? "#ffd27a" : PAL.signal3);
          u += w;
        }
        if (period === "noche") for (let s = 0; s < 3; s++) R(i + 0.25 + hash(i, s) * 0.5, i + 0.27 + hash(i, s) * 0.5, 84 + hash(s, i) * 10, 85.4 + hash(s, i) * 10, "#ffffff");
        R(i + 0.17, i + 0.83, 70, 72.5, PAL.paper);
        R(i + 0.485, i + 0.515, 48, 96, PAL.paper);
        R(i + 0.06, i + 0.94, 39, 43, PAL.char3, OUT);
      }
      break;
    }
    case "ticker":
      R(0.08, L - 0.08, 30, 57, PAL.char2, OUT);
      R(0.14, L - 0.14, 32, 55, "#100f16");
      break;
    case "studiologo":
      // El logo de se7en, de verdad (public/logo.png), en una placa oscura
      R(0.1, L - 0.1, 86, 113, PAL.ink, OUT);
      if (studio?.logo) wallImage(dc, studio.logo, 0.22, L - 0.22, 89, 110);
      else {
        R(0.4, 0.8, 90, 106, SIGNAL);
        R(1, L - 0.4, 94, 102, PAL.white);
      }
      break;
    case "slogan":
      if (studio?.slogan) wallImage(dc, studio.slogan, 0.2, L - 0.2, SLOGAN_Z[0], SLOGAN_Z[1], false);
      break;
    case "poster":
      R(0.2, 0.8, z0, z1, PAL.ink, OUT);
      R(0.26, 0.74, z0 + 3, z1 - 3, dark(accent, 0.1));
      R(0.33, 0.67, z1 - 10, z1 - 8, PAL.white);
      R(0.33, 0.56, z0 + 8, z0 + 10, mix(accent, PAL.white, 0.4));
      break;
    case "brand": {
      // El cartel con el nombre del proyecto en su letra
      const [b0, b1] = brandZ(dc);
      R(0.08, L - 0.08, b0 - 3, b1 + 3, PAL.ink, OUT);
      if (art) wallImage(dc, art.poster, 0.12, L - 0.12, b0, b1);
      else R(0.12, L - 0.12, b0, b1, dark(accent, 0.1));
      break;
    }
    case "plaque":
      R(0.3, 0.7, 16, 26, "#c9a24a", OUT);
      R(0.35, 0.65, 18, 24, "#e8c14e");
      R(0.4, 0.6, 21, 22, "#9c7a2f");
      break;
    case "whiteboard":
      // Pizarrón con post-its de colores (sin palabras: nada que inventar)
      R(0.1, L - 0.1, z0, z1, PAL.grey, OUT);
      R(0.14, L - 0.14, z0 + 2, z1 - 2, PAL.white);
      ["#fde68a", PAL.signal3, PAL.white, "#fde68a", PAL.signal2, PAL.paper2, PAL.signal3].forEach((col, i) => {
        const u = 0.28 + i * ((L - 0.56) / 7);
        const zz = z0 + 6 + (i % 2) * 7 + (z1 - z0 - 24) * 0.3;
        R(u, u + 0.2, zz, zz + 6.5, col, OUT_SOFT);
      });
      R(0.24, 0.24 + (L - 0.5) * 0.6, z0 + 4, z0 + 5, PAL.signal);
      break;
    case "moodboard":
      R(0.1, L - 0.1, z0, z1, "#6e5135", OUT);
      R(0.14, L - 0.14, z0 + 2, z1 - 2, "#a98258");
      [PAL.signal, PAL.deep, PAL.signal3, PAL.char, PAL.white, PAL.signal2, PAL.grey3].forEach((col, i) => {
        const u = 0.22 + (i % 4) * ((L - 0.4) / 4.3);
        const zz = z0 + 5 + Math.floor(i / 4) * ((z1 - z0) * 0.45);
        if (u + 0.24 < L - 0.12) R(u, u + 0.24, zz, zz + (z1 - z0) * 0.32, col, OUT_SOFT);
      });
      break;
    case "swatches":
      // Las muestras de color del área de diseño: la paleta del estudio en tiras
      R(0.12, L - 0.12, z0 - 4, z1 + 4, PAL.white, OUT);
      [PAL.ink, PAL.char3, PAL.grey2, PAL.paper2, PAL.deep, PAL.signal, PAL.signal3].forEach((col, i) => {
        const zz = z0 - 1 + i * ((z1 - z0 + 2) / 7);
        R(0.2, L - 0.2, zz, zz + (z1 - z0) / 7 - 1, col);
      });
      break;
    case "archboard": {
      // La pizarra de la arquitectura: cajas, flechas y la base de datos
      R(0.08, L - 0.08, z0, z1, PAL.grey, OUT);
      R(0.12, L - 0.12, z0 + 2, z1 - 2, PAL.white);
      const bx = (u: number, zz: number, col: string) => {
        R(u, u + 0.34, zz, zz + 9, col, OUT);
        R(u + 0.05, u + 0.29, zz + 5.5, zz + 6.5, PAL.white);
      };
      bx(0.3, z1 - 16, PAL.signal);
      bx(L - 0.66, z1 - 16, PAL.grey);
      bx(L / 2 - 0.17, z0 + 7, PAL.deep);
      R(0.64, L - 0.66, z1 - 11.5, z1 - 10.5, PAL.ink);
      R(L / 2 - 0.01, L / 2 + 0.01, z0 + 16, z1 - 16, PAL.ink);
      R(L - 0.5, L - 0.3, z0 + 6, z0 + 14, PAL.char3, OUT_SOFT);
      R(L - 0.5, L - 0.3, z0 + 13, z0 + 15, PAL.signal3);
      break;
    }
    case "tv":
      R(0.2, L - 0.2, 6, 33, "#0f0f13", OUT);
      break;
    case "codewall":
    case "slides":
    case "mapscreen": {
      // Pantallas grandes de pared: el marco acá; lo que muestran, el motor (encima de todo)
      const [s0, s1] = screenZ(dc);
      R(0.06, L - 0.06, s0 - 4, s1 + 4, PAL.ink, OUT);
      R(0.12, L - 0.12, s0, s1, "#0d0c14");
      if (dc.k === "slides") R(L / 2 - 0.12, L / 2 + 0.12, s0 - 9, s0 - 4, PAL.char3, OUT);
      break;
    }
    case "rackets": {
      for (const u of [0.16, 0.56]) {
        R(u, u + 0.28, z0 + 9, z1, "#1f2a44", OUT);
        R(u + 0.04, u + 0.24, z0 + 12, z1 - 3, accent);
        R(u + 0.11, u + 0.17, z0, z0 + 9, "#2b2b33");
      }
      break;
    }
    case "plan": {
      R(0.12, L - 0.12, z0, z1, PAL.grey, OUT);
      R(0.16, L - 0.16, z0 + 2, z1 - 2, PAL.white);
      for (let i = 0; i < 4; i++) {
        R(0.22, 0.3, z0 + 5 + i * 4.5, z0 + 7 + i * 4.5, accent);
        R(0.36, 0.5 + hash(i, 3) * 0.32, z0 + 5.5 + i * 4.5, z0 + 6.5 + i * 4.5, PAL.char3);
      }
      break;
    }
    case "blueprint": {
      R(0.12, L - 0.12, z0, z1, "#e9e4da", OUT);
      R(0.16, L - 0.16, z0 + 2, z1 - 2, "#2b5a9e");
      for (const u of [0.32, 0.5, 0.68]) R(u, u + 0.01, z0 + 2, z1 - 2, "#4a78bb");
      R(0.3, 0.46, z0 + 4, z1 - 6, "#dbe8f7");
      R(0.33, 0.43, z0 + 5, z1 - 8, "#2b5a9e");
      R(0.52, 0.72, z0 + 4, z0 + 12, "#dbe8f7");
      R(0.55, 0.69, z0 + 5, z0 + 11, "#2b5a9e");
      break;
    }
    case "menuboard": {
      R(0.12, L - 0.12, z0, z1, "#6b4a33", OUT);
      R(0.16, L - 0.16, z0 + 2, z1 - 2, "#1f3b30");
      R(0.24, 0.76, z1 - 7, z1 - 5, accent);
      for (let i = 0; i < 3; i++) R(0.24, 0.5 + hash(i, 7) * 0.26, z0 + 5 + i * 4, z0 + 6 + i * 4, "#e9e4da");
      break;
    }
  }
}
const kindZ = (dc: Decor) => (onTall(dc) ? { z0: 50, z1: 90 } : { z0: 8, z1: 32 });
/** El cartel de marca: arriba de la lámpara en la pared alta del edificio, o a lo alto de una media pared. */
const brandZ = (dc: Decor): [number, number] => (onTall(dc) ? [56, 92] : [7, 31]);
/** Dónde va la imagen de una pantalla grande de pared. */
const screenZ = (dc: Decor): [number, number] => (dc.k === "slides" ? [46, 94] : dc.k === "codewall" ? [52, 96] : [kindZ(dc).z0 + 2, kindZ(dc).z1 - 2]);
/** Ancho/alto del cartel de marca colgado en `dc`, para hornearlo sin recortes. */
export const posterAspect = (dc: Decor) => ((dc.len - 0.24) * TILE) / (brandZ(dc)[1] - brandZ(dc)[0]);
/** Dónde va la frase de la recepción y su ancho/alto. */
const SLOGAN_Z = [62, 81] as const;
export const sloganAspect = (dc: Decor) => ((dc.len - 0.4) * TILE) / (SLOGAN_Z[1] - SLOGAN_Z[0]);

/** Pantallas dibujadas en una pared: el motor les pone contenido por arriba de todo. */
export function decorScreen(dc: Decor): { quad: XY[]; kind: ScreenKind } | null {
  const KIND: Record<string, ScreenKind> = { tv: "review", mapscreen: "map", codewall: "ci", slides: "slides" };
  const kind = KIND[dc.k];
  if (!kind) return null;
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = dc.side === "L" ? dc.x + 0.02 : dc.y + 0.02;
  const start = dc.side === "L" ? dc.y : dc.x;
  const [u0, u1, z0, z1] = dc.k === "tv" ? [0.28, dc.len - 0.28, 9, 30] : [0.12, dc.len - 0.12, ...screenZ(dc)];
  // Las de la pared L se leen al derecho: la esquina de arriba a la izquierda es la del fondo
  const quad: XY[] = dc.side === "L"
    ? [onFace(fc, plane, start, u1, z1), onFace(fc, plane, start, u0, z1), onFace(fc, plane, start, u0, z0), onFace(fc, plane, start, u1, z0)]
    : [onFace(fc, plane, start, u0, z1), onFace(fc, plane, start, u1, z1), onFace(fc, plane, start, u1, z0), onFace(fc, plane, start, u0, z0)];
  return { quad, kind };
}
/** El cartel LED de la recepción, en coordenadas del mundo. */
export function tickerQuad(dc: Decor): XY[] {
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = (dc.side === "L" ? dc.x : dc.y) + 0.01, start = dc.side === "L" ? dc.y : dc.x;
  return [onFace(fc, plane, start, 0.16, 54), onFace(fc, plane, start, dc.len - 0.16, 54), onFace(fc, plane, start, dc.len - 0.16, 34), onFace(fc, plane, start, 0.16, 34)];
}

export const SKY: Record<Period, string> = { manana: "#f0b39a", dia: "#9cc7ef", tarde: "#e07a5a", noche: "#0e1220" };
/** Los edificios de afuera según la hora, y qué parte de sus ventanas está prendida. */
const CITY: Record<Period, { near: string; far: string; lit: number }> = {
  manana: { near: "#8a6e66", far: "#a58a7f", lit: 0.04 },
  dia: { near: "#6f86a8", far: "#8ea2bf", lit: 0 },
  tarde: { near: "#5a3a3a", far: "#734a44", lit: 0.2 },
  noche: { near: "#14161f", far: "#1c1f2b", lit: 0.42 },
};

// --- Muebles --------------------------------------------------------------------

/** «status»: la compu de cada sala, con los días sin entrar y las novedades. «live»: la tele con el sitio. «ci», «slides», «arcade»: las pantallas del estudio. */
export type ScreenKind = "code" | "review" | "map" | "site" | "status" | "live" | "ci" | "slides" | "arcade";
/** Pantallas, luces y LEDs que el motor vuelve a pintar arriba de todo. */
export type Glow =
  | { t: "screen"; quad: XY[]; kind: ScreenKind; accent: string; room: string | null }
  | { t: "lamp"; at: XY; room: string | null }
  | { t: "led"; at: XY; i: number; room: string | null }
  | { t: "steam"; at: XY; room: string | null }
  | { t: "bubble"; at: XY; room: string | null };

export type FurniCtx = { accent: string; status: string; covered: boolean; kind: string; area?: Area; glows: Glow[] };

const WOOD = "#a77d57";
/** Las tapas de madera de escritorios y mesas, y sus cantos. */
const DESK = { top: PAL.wood, left: "#b07c4a", right: "#94653c" };
const METAL = PAL.char2;
const TOP = PAL.wood; // la madera de escritorios y mesas
const LEG = PAL.char3;
const SEAT = PAL.ink3;

function sheet(x: number, y: number, w: number, d: number, h: number) {
  box(x + 0.04, y + 0.04, 0, w - 0.08, d - 0.08, h, "#efebe3", { top: "#f7f4ee", right: "#d3cec4" });
  line(P(x + w * 0.3, y + d, h), P(x + w * 0.35, y + d, 2), c("#d3cec4"));
  line(P(x + w * 0.7, y + d, h), P(x + w * 0.66, y + d, 2), c("#d3cec4"));
}

function monitor(fx: number, fy: number, face: Facing, kind: ScreenKind, ctx: FurniCtx, room: string | null, z = 27) {
  // fx, fy: centro del monitor sobre el escritorio. La compu de la sala es más
  // grande: en su pantalla se leen los días sin entrar.
  const [hw, h, sw, sh] = kind === "status" ? [0.5, 30, 0.45, 26] : [0.36, 22, 0.31, 19];
  if (face === "x") {
    box(fx - 0.06, fy - hw, z, 0.1, hw * 2, h, PAL.char);
    box(fx - 0.12, fy - 0.08, z - 3, 0.16, 0.16, 3, METAL);
    const quad = [P(fx + 0.04, fy - sw, z + sh), P(fx + 0.04, fy + sw, z + sh), P(fx + 0.04, fy + sw, z + 3), P(fx + 0.04, fy - sw, z + 3)] as XY[];
    poly(quad, c("#0b0b10"));
    if (!ctx.covered) ctx.glows.push({ t: "screen", quad, kind, accent: ctx.accent, room });
  } else {
    box(fx - hw, fy - 0.06, z, hw * 2, 0.1, h, PAL.char);
    box(fx - 0.08, fy - 0.12, z - 3, 0.16, 0.16, 3, METAL);
    const quad = [P(fx - sw, fy + 0.04, z + sh), P(fx + sw, fy + 0.04, z + sh), P(fx + sw, fy + 0.04, z + 3), P(fx - sw, fy + 0.04, z + 3)] as XY[];
    poly(quad, c("#0b0b10"));
    if (!ctx.covered) ctx.glows.push({ t: "screen", quad, kind, accent: ctx.accent, room });
  }
}
/** Una taza con el vapor del café. */
function mug(x: number, y: number, z: number, col: string, ctx: FurniCtx, room: string | null) {
  cyl(x, y, z, 2.6, 5, col, dark(col, 0.45));
  ctx.glows.push({ t: "steam", at: P(x, y, z + 7), room });
}

// --- Los muebles ilustrados -----------------------------------------------------
// Las ilustraciones de Flow (public/en-vivo/muebles.webp, ver scripts/muebles.mjs).
// Cada una se para en sus baldosas, del tamaño que entra sin pasarse de su
// altura, y se espeja si en el dibujo mira para el otro lado. La luz de la hora
// y el apagado de la sala se le aplican una vez por combinación y quedan
// guardados. Mientras baja la lámina, o si no baja, van los dibujados en código.

/**
 * Cómo va cada mueble: qué ilustración (si hay varias, una por lugar), hacia
 * dónde mira en el dibujo (`face`: el frente hacia +x o hacia +y; "free": da
 * igual, se espeja al azar), qué parte del ancho de sus baldosas ocupa (`fill`)
 * y su altura máxima en px del mundo (`z`). `top`: la altura de la tapa del
 * dibujado en código, para subir lo que lleva arriba hasta la tapa ilustrada.
 */
type Spec = { name: string | string[]; face: Facing | "free"; fill: number; z: number; top?: number; glow?: "lamp" | "bubble" | "steam" };
const SPRITES: Partial<Record<string, Spec>> = {
  desk: { name: "desk2", face: "x", fill: 0.97, z: 30, top: 28 },
  desk2: { name: "desk2", face: "x", fill: 0.97, z: 30, top: 28 },
  chair: { name: "chair", face: "y", fill: 0.6, z: 46 },
  chairBoss: { name: "chairBoss", face: "y", fill: 0.66, z: 54 },
  stool: { name: "stool", face: "free", fill: 0.42, z: 26 },
  plant: { name: ["plant", "snake", "monstera", "bamboo"], face: "free", fill: 0.62, z: 54 },
  shelf: { name: "shelf", face: "y", fill: 0.78, z: 64 },
  rack: { name: "rack", face: "y", fill: 0.7, z: 64 },
  sofa: { name: "sofa", face: "x", fill: 0.96, z: 32 },
  lamp: { name: "lamp", face: "free", fill: 0.4, z: 70, glow: "lamp" },
  table: { name: "table", face: "x", fill: 0.86, z: 26, top: 25 },
  drafting: { name: "drafting", face: "free", fill: 0.8, z: 42 },
  counter: { name: "counter", face: "x", fill: 0.98, z: 36, top: 30 },
  cooler: { name: "cooler", face: "x", fill: 0.5, z: 54, glow: "bubble" },
  bench: { name: "bench", face: "y", fill: 0.92, z: 30 },
  pedestal: { name: "plinth", face: "free", fill: 0.56, z: 30, top: 30 },
  tvstand: { name: "tvcabinet", face: "x", fill: 0.94, z: 16, top: 12 },
  vitrine: { name: "vitrine", face: "x", fill: 0.7, z: 60 },
  kitchen: { name: "kitchen", face: "x", fill: 0.98, z: 38 },
  fridge: { name: "fridge", face: "x", fill: 0.66, z: 66 },
  beanbag: { name: "beanbag", face: "free", fill: 0.62, z: 26 },
  easel: { name: "easel", face: "y", fill: 0.62, z: 64 },
  meettable: { name: "meettable", face: "x", fill: 0.98, z: 30 },
  coffeebar: { name: "coffeebar", face: "x", fill: 0.82, z: 46, glow: "steam" },
  lowtable: { name: "lowtable", face: "x", fill: 0.9, z: 18 },
  dumbbells: { name: "dumbbells", face: "x", fill: 0.82, z: 24 },
  cabinet: { name: "cabinet", face: "y", fill: 0.62, z: 50 },
  espresso: { name: "espresso", face: "y", fill: 0.82, z: 46, glow: "steam" },
  balls: { name: "balls", face: "free", fill: 0.74, z: 26 },
  matetable: { name: "matetable", face: "free", fill: 0.66, z: 36 },
  squatrack: { name: "squatrack", face: "x", fill: 0.9, z: 46 },
  yogaprops: { name: "yogaprops", face: "free", fill: 0.72, z: 18 },
  maquette: { name: "maquette", face: "free", fill: 0.76, z: 46 },
  globe: { name: "globe", face: "free", fill: 0.5, z: 48 },
  cafetable: { name: "cafetable", face: "free", fill: 0.62, z: 32 },
  tree: { name: ["tree", "tree2"], face: "free", fill: 1.05, z: 74 },
  bush: { name: ["bush", "bush2"], face: "free", fill: 0.95, z: 28 },
  boxes: { name: "boxes", face: "free", fill: 0.8, z: 40 },
};

let atlas: HTMLImageElement | "loading" | "error" | null = null;
/** La lámina de los muebles: se pide una vez, cuando se arma el motor. `onLoad`: para volver a hornear lo quieto. */
export function loadFurniture(onLoad: () => void) {
  if (atlas) return;
  atlas = "loading";
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    atlas = img;
    onLoad();
  };
  img.onerror = () => (atlas = "error");
  img.src = MUEBLES.src;
}

/** Dónde queda el dibujo de un mueble ilustrado, en px del mundo, y a qué altura su tapa. */
type Placed = { name: string; x: number; y: number; w: number; h: number; cx: number; cy: number; mirror: boolean; top: number };
function place(f: Furni, sp: Spec): Placed | null {
  // Los escritorios de tres baldosas, el largo
  const name = f.k === "desk" && Math.max(f.w, f.d) >= 3 ? "desk3" : Array.isArray(sp.name) ? sp.name[Math.floor(hash(f.x * 5 + 1, f.y * 3 + 7) * sp.name.length)] : sp.name;
  const fr = MUEBLES.frames[name];
  if (!fr) return null;
  const [, , sw, sh] = fr;
  const L = P(f.x, f.y + f.d)[0], R = P(f.x + f.w, f.y)[0];
  const [cx, cy] = P(f.x + f.w / 2, f.y + f.d / 2);
  // Del ancho de sus baldosas, sin pasarse de alto (lo que el dibujo tiene arriba de su base)
  let s = (sp.fill * (R - L)) / sw;
  const zi = sh - sw / 2;
  if (zi > 1 && zi * s > sp.z) s = sp.z / zi;
  const W = sw * s, H = sh * s, bottom = cy + W / 4;
  const mirror = sp.face === "free" ? hash(f.x * 7 + 3, f.y * 11 + 5) > 0.5 : sp.face !== f.face;
  return { name, x: cx - W / 2, y: bottom - H, w: W, h: H, cx, cy, mirror, top: H - W / 2 };
}

/** La ilustración con la luz de la hora y el apagado de ahora, guardada por combinación. */
const tinted = new Map<string, HTMLCanvasElement>();
function spriteCanvas(name: string): HTMLCanvasElement | null {
  if (!(atlas instanceof HTMLImageElement)) return null;
  const q = Math.round(F * 20) / 20, t = T > 0.001 ? Math.round(T * 100) / 100 : 0;
  const key = `${name}|${q}|${t ? TC + t : ""}`;
  let cv = tinted.get(key);
  if (cv) return cv;
  const [fx, fy, w, h] = MUEBLES.frames[name];
  cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const out = cv.getContext("2d") as CanvasRenderingContext2D;
  if (!q && !t) out.drawImage(atlas, fx, fy, w, h, 0, 0, w, h);
  else {
    // Los mismos cálculos que c(): hacia gris y más oscuro si la sala se apaga, y el color de la hora
    // (en un lienzo aparte: el que se copia en cada cuadro nunca se lee)
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tc = tmp.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    tc.drawImage(atlas, fx, fy, w, h, 0, 0, w, h);
    const img = tc.getImageData(0, 0, w, h), px = img.data;
    const [tr, tg, tb] = rgb(TC);
    for (let i = 0; i < px.length; i += 4) {
      if (!px[i + 3]) continue;
      let r = px[i], gg = px[i + 1], b = px[i + 2];
      if (q) {
        const l = 0.3 * r + 0.59 * gg + 0.11 * b, k = 1 - 0.4 * q;
        r = (r * (1 - q) + l * q) * k;
        gg = (gg * (1 - q) + l * q) * k;
        b = (b * (1 - q) + l * q) * k;
      }
      if (t) {
        r += (tr - r) * t;
        gg += (tg - gg) * t;
        b += (tb - b) * t;
      }
      px[i] = r;
      px[i + 1] = gg;
      px[i + 2] = b;
    }
    tc.putImageData(img, 0, 0);
    out.drawImage(tmp, 0, 0);
  }
  if (tinted.size > 600) tinted.clear();
  tinted.set(key, cv);
  return cv;
}

function drawSprite(p: Placed, cv: HTMLCanvasElement) {
  // La sombra en el piso, del ancho del mueble
  const hw = p.w * 0.44, hh = hw / 2;
  g.beginPath();
  g.moveTo(p.cx - hw, p.cy);
  g.lineTo(p.cx, p.cy - hh);
  g.lineTo(p.cx + hw, p.cy);
  g.lineTo(p.cx, p.cy + hh);
  g.closePath();
  g.fillStyle = "rgba(11,11,12,0.16)";
  g.fill();
  if (p.mirror) {
    g.save();
    g.translate(p.cx, 0);
    g.scale(-1, 1);
    g.drawImage(cv, -p.w / 2, p.y, p.w, p.h);
    g.restore();
  } else g.drawImage(cv, p.x, p.y, p.w, p.h);
}

/** El mueble ilustrado, si hay: con su luz, su vapor o sus burbujas, y lo que lleva arriba. false: va el dibujado en código. */
function furniSprite(f: Furni, ctx: FurniCtx): boolean {
  const sp = SPRITES[f.k];
  if (!sp || ctx.covered || !(atlas instanceof HTMLImageElement)) return false;
  // Las plantas de las salas que se apagan se marchitan: ésas siguen en código
  if (f.k === "plant" && plantStage(F) > 0) return false;
  // Las cajas van de a una por baldosa
  const parts = f.k === "boxes" ? Array.from({ length: f.w }, (_, i) => ({ ...f, x: f.x + i, w: 1 })) : [f];
  for (const part of parts) {
    const p = place(part, sp);
    const cv = p && spriteCanvas(p.name);
    if (!p || !cv) return false;
    drawSprite(p, cv);
    // Lo que se prende, donde está en el dibujo (lo de la izquierda pasa a la derecha si se espeja)
    const at = (u: number, v: number): XY => [p.mirror ? p.cx + (p.cx - (p.x + u * p.w)) : p.x + u * p.w, p.y + v * p.h];
    if (sp.glow === "lamp") ctx.glows.push({ t: "lamp", at: at(0.5, 0.27), room: f.room });
    else if (sp.glow === "bubble") ctx.glows.push({ t: "bubble", at: at(0.5, 0.22), room: f.room });
    else if (sp.glow === "steam") ctx.glows.push({ t: "steam", at: at(0.3, 0.06), room: f.room });
    // Lo que lleva arriba (monitores, la tele, las tazas), subido hasta la tapa ilustrada
    if (sp.top !== undefined) {
      ZL = p.top - sp.top;
      try {
        furniCode(f, ctx, false);
      } finally {
        ZL = 0;
      }
    }
  }
  return true;
}

/** Hasta dónde llega el dibujo de un mueble ilustrado, en px del mundo (null: no tiene). */
export function furniReach(f: Furni): { x0: number; y0: number; x1: number; y1: number } | null {
  const sp = SPRITES[f.k];
  if (!sp) return null;
  const parts = f.k === "boxes" ? Array.from({ length: f.w }, (_, i) => ({ ...f, x: f.x + i, w: 1 })) : [f];
  let b: { x0: number; y0: number; x1: number; y1: number } | null = null;
  for (const part of parts) {
    const p = place(part, sp);
    if (!p) continue;
    // Lo que lleva arriba sube con la tapa: hasta 50 px más
    const up = sp.top !== undefined ? Math.max(0, p.top - sp.top) + 50 : 0;
    const r = { x0: p.x - 2, x1: p.x + p.w + 2, y0: p.y - 2 - up, y1: p.y + p.h + 2 };
    b = b ? { x0: Math.min(b.x0, r.x0), y0: Math.min(b.y0, r.y0), x1: Math.max(b.x1, r.x1), y1: Math.max(b.y1, r.y1) } : r;
  }
  return b;
}

export function furni(f: Furni, ctx: FurniCtx) {
  if (!furniSprite(f, ctx)) furniCode(f, ctx);
}

/**
 * Un mueble dibujado en código. `base`: con su cuerpo; sin él, sólo lo que
 * lleva arriba (los monitores, la tele, las tazas), para ponerlo sobre el
 * mueble ilustrado.
 */
function furniCode(f: Furni, ctx: FurniCtx, base = true) {
  const { x, y, w, d, face } = f;
  const acc = ctx.accent;
  switch (f.k) {
    case "desk":
    case "desk2": {
      if (base) {
        for (const [lx, ly] of [[x + 0.08, y + 0.08], [x + w - 0.16, y + 0.08], [x + 0.08, y + d - 0.16], [x + w - 0.16, y + d - 0.16]]) box(lx, ly, 0, 0.08, 0.08, 24, LEG);
        box(x + 0.04, y + 0.04, 24, w - 0.08, d - 0.08, 4, TOP, { left: DESK.left, right: DESK.right });
      }
      if (ctx.covered) { sheet(x, y, w, d, 34); break; }
      if (ctx.kind === "office" && ctx.area === "dev") {
        // El escritorio de Franco: el monitor en su brazo, la notebook con el
        // sticker del estudio (se ve la tapa), el pato de goma para depurar y el café
        box(x + 0.32, y + 0.22, 28, 0.86, 0.1, 24, PAL.char);
        box(x + 0.7, y + 0.3, 28, 0.08, 0.08, 4, METAL);
        box(x + 1.2, y + 0.35, 28, 0.62, 0.42, 1.5, PAL.grey);
        box(x + 1.2, y + 0.7, 29.5, 0.62, 0.05, 16, "#cfccc6", { left: "#bdbab3" });
        const [sx, sy] = P(x + 1.51, y + 0.75, 38);
        for (const r of [3.4, 2.4, 1.4]) {
          g.beginPath();
          g.ellipse(sx, sy, r, r * 1.1, 0, Math.PI * 0.55, Math.PI * 1.45);
          g.strokeStyle = SIGNAL;
          g.lineWidth = 0.8;
          g.stroke();
        }
        const [dx, dy] = P(x + 2.35, y + 0.55, 28);
        ellipse(dx, dy - 3, 3.4, 2.8, c("#ffd84d"), OUT, 1);
        ellipse(dx + 2.4, dy - 6.6, 2.2, 2.2, c("#ffd84d"), OUT, 1);
        ellipse(dx + 4.2, dy - 6.2, 1.4, 0.7, c("#ff8a3d"), null);
        mug(x + 2.7, y + 0.35, 28, PAL.signal, ctx, f.room);
      } else if (ctx.kind === "office") {
        // El de Federico: el monitor grande (se ve la espalda), la tableta con el lápiz y los lápices de colores
        box(x + 0.25, y + 0.25, 28, 1.3, 0.12, 30, "#dedad3", { top: "#efece6" });
        box(x + 0.8, y + 0.37, 28, 0.2, 0.16, 6, PAL.grey2);
        const [lx, ly] = P(x + 0.9, y + 0.37, 46);
        ellipse(lx, ly, 3.2, 3.6, c(PAL.signal), null);
        box(x + 1.75, y + 0.35, 28, 0.62, 0.4, 1.4, PAL.char);
        box(x + 1.82, y + 0.42, 29.4, 0.48, 0.26, 0.2, PAL.grey, { line: null });
        line(P(x + 2, y + 0.5, 30.5), P(x + 2.35, y + 0.6, 31.5), c(PAL.white), 1.2);
        cyl(x + 2.75, y + 0.4, 28, 2.4, 6, PAL.signal, PAL.deep);
        for (const [i, col] of [PAL.signal, "#ffd84d", PAL.ink3, PAL.signal3].entries()) {
          const [px, py] = P(x + 2.75, y + 0.4, 34);
          line([px - 1.5 + i, py], [px - 2.2 + i * 1.5, py - 6], c(col), 1.3);
        }
      } else if (face === "x") {
        monitor(x + 0.3, y + d / 2, "x", f.k === "desk2" ? "code" : "status", ctx, f.room);
        box(x + 0.45, y + d / 2 - 0.3, 28, 0.16, 0.6, 1.5, PAL.char3);
        mug(x + 0.42, y + 0.25, 28, PAL.white, ctx, f.room);
      } else {
        if (f.k === "desk2") {
          monitor(x + w / 2 - 0.45, y + 0.3, "y", "code", ctx, f.room);
          monitor(x + w / 2 + 0.45, y + 0.3, "y", "code", ctx, f.room);
        } else monitor(x + w / 2, y + 0.3, "y", "status", ctx, f.room);
        box(x + w / 2 - 0.3, y + 0.45, 28, 0.6, 0.16, 1.5, PAL.char3);
        mug(x + w - 0.24, y + 0.42, 28, PAL.white, ctx, f.room);
      }
      break;
    }
    case "chair":
    case "chairBoss": {
      cyl(x + 0.5, y + 0.5, 0, 6, 2, PAL.char, PAL.char2);
      box(x + 0.46, y + 0.46, 2, 0.08, 0.08, 10, PAL.char, { line: null });
      const col = f.k === "chairBoss" ? PAL.deep : SEAT;
      if (f.k === "chairBoss") box(x + 0.22, y + 0.14, 14, 0.56, 0.12, 24, col);
      box(x + 0.2, y + 0.2, 12, 0.6, 0.6, 4.5, col);
      if (ctx.covered) { sheet(x + 0.1, y + 0.1, 0.8, 0.8, 26); break; }
      if (f.k === "chair") {
        if (face === "x") box(x + 0.72, y + 0.2, 16, 0.1, 0.6, 16, col);
        else box(x + 0.2, y + 0.72, 16, 0.6, 0.1, 16, col);
      }
      break;
    }
    case "stool":
      box(x + 0.46, y + 0.46, 0, 0.08, 0.08, 14, PAL.char3, { line: null });
      cyl(x + 0.5, y + 0.5, 14, 6.4, 3, SEAT, PAL.signal2);
      break;
    case "plant":
      plant(x, y, acc);
      break;
    case "shelf": {
      if (face === "y") {
        box(x + 0.08, y + 0.1, 0, 0.84, 0.38, 58, PAL.char3);
        books("y", y + 0.48, x + 0.12, 0.76);
      } else {
        box(x + 0.1, y + 0.08, 0, 0.38, 0.84, 58, PAL.char3);
        books("x", x + 0.48, y + 0.12, 0.76);
      }
      break;
    }
    case "rack": {
      box(x + 0.16, y + 0.12, 0, 0.68, 0.46, 62, PAL.char);
      for (let i = 0; i < 6; i++) {
        const z = 8 + i * 8.5;
        faceRect("y", y + 0.585, x + 0.16, 0.06, 0.62, z, z + 5.5, c(PAL.char3), OUT_SOFT);
        ctx.glows.push({ t: "led", at: onFace("y", y + 0.59, x + 0.16, 0.54, z + 2.7), i: i + Math.round(x * 7 + y * 3), room: f.room });
      }
      faceRect("y", y + 0.585, x + 0.16, 0.06, 0.62, 58, 60, c(PAL.signal));
      break;
    }
    case "sofa": {
      const col = ctx.kind === "lounge" ? PAL.signal : ctx.kind === "reception" ? PAL.char3 : PAL.char2;
      const cush = ctx.kind === "reception" ? PAL.signal : lite(col, 0.14);
      if (ctx.covered) { sheet(x, y, w, d, 30); break; }
      if (face === "y") {
        box(x + 0.05, y + 0.1, 10, w - 0.1, 0.26, 20, col);
        box(x + 0.05, y + 0.1, 0, w - 0.1, d - 0.2, 12, col);
        for (let i = 0; i < w; i++) box(x + i + 0.12, y + 0.36, 12, 0.76, d - 0.52, 4.5, cush);
        box(x + 0.05, y + 0.1, 12, 0.16, d - 0.2, 9, dark(col, 0.12));
        box(x + w - 0.21, y + 0.1, 12, 0.16, d - 0.2, 9, dark(col, 0.12));
      } else {
        box(x + 0.1, y + 0.05, 10, 0.26, d - 0.1, 20, col);
        box(x + 0.1, y + 0.05, 0, w - 0.2, d - 0.1, 12, col);
        for (let i = 0; i < d; i++) box(x + 0.36, y + i + 0.12, 12, w - 0.52, 0.76, 4.5, cush);
        box(x + 0.1, y + 0.05, 12, w - 0.2, 0.16, 9, dark(col, 0.12));
        box(x + 0.1, y + d - 0.21, 12, w - 0.2, 0.16, 9, dark(col, 0.12));
      }
      break;
    }
    case "lamp": {
      // Lámpara de pie: base, caño y la pantalla violeta
      cyl(x + 0.5, y + 0.5, 0, 6, 2.5, PAL.char, PAL.char2);
      box(x + 0.46, y + 0.46, 3, 0.08, 0.08, 38, PAL.char3, { line: null });
      const [cx, cy] = P(x + 0.5, y + 0.5, 41);
      poly([[cx - 6, cy - 9], [cx + 6, cy - 9], [cx + 10, cy + 2], [cx - 10, cy + 2]], c(PAL.paper), OUT);
      ellipse(cx, cy + 2, 10, 3, c("#fff4d6"), OUT);
      ctx.glows.push({ t: "lamp", at: [cx, cy + 3], room: f.room });
      break;
    }
    case "table":
      if (base) {
        box(x + w / 2 - 0.05, y + d / 2 - 0.05, 0, 0.1, 0.1, 22, LEG, { line: null });
        box(x + 0.12, y + 0.12, 22, w - 0.24, d - 0.24, 3, TOP);
      }
      if (ctx.status === "descubrimiento") {
        box(x + 0.25, y + 0.25, 25, 0.18, 0.18, 1, "#fde68a", { line: null });
        box(x + 0.5, y + 0.4, 25, 0.18, 0.18, 1, "#fbcfe8", { line: null });
      } else mug(x + 0.36, y + 0.36, 25, PAL.white, ctx, f.room);
      break;
    case "drafting":
      box(x + 0.15, y + 0.2, 0, 0.08, 0.08, 22, LEG, { line: null });
      box(x + 0.77, y + 0.2, 0, 0.08, 0.08, 22, LEG, { line: null });
      box(x + 0.1, y + 0.15, 22, 0.8, 0.6, 3, TOP);
      box(x + 0.2, y + 0.25, 25, 0.5, 0.35, 0.5, "#ffffff", { line: null });
      box(x + 0.3, y + 0.35, 25.5, 0.3, 0.06, 0.5, acc, { line: null });
      break;
    case "counter": {
      // El mostrador de la recepción: frente oscuro con la línea violeta, tapa clara
      if (base) {
        box(x, y + 0.15, 0, w, 0.7, 30, PAL.char2, { top: TOP });
        faceRect("y", y + 0.85, x, 0.15, w - 0.15, 8, 11, c(PAL.signal));
        faceRect("y", y + 0.85, x, 0.15, w - 0.15, 13, 14, c(PAL.signal3));
      }
      box(x + w / 2 - 0.4, y + 0.3, 30, 0.6, 0.08, 16, PAL.char);
      box(x + w - 0.55, y + 0.4, 30, 0.2, 0.2, 2, "#d4af37");
      cyl(x + w - 0.45, y + 0.5, 32, 2.4, 2.4, "#e6c65a", "#f3dc84");
      mug(x + 0.45, y + 0.45, 30, PAL.signal, ctx, f.room);
      break;
    }
    case "cooler":
      box(x + 0.3, y + 0.3, 0, 0.4, 0.4, 32, PAL.paper);
      box(x + 0.34, y + 0.34, 32, 0.32, 0.32, 16, "#9cc8f2", { top: "#c5e2ff", right: "#77a8d8" });
      faceRect("y", y + 0.705, x + 0.3, 0.16, 0.24, 20, 23, c(PAL.signal));
      // Las burbujas que suben por el bidón (las anima el motor)
      ctx.glows.push({ t: "bubble", at: P(x + 0.5, y + 0.67, 33), room: f.room });
      break;
    case "bench":
      box(x + 0.1, y + 0.32, 0, 0.06, 0.06, 12, LEG, { line: null });
      box(x + w - 0.16, y + 0.32, 0, 0.06, 0.06, 12, LEG, { line: null });
      box(x + 0.05, y + 0.25, 12, w - 0.1, 0.5, 4, PAL.wood);
      break;
    case "pedestal":
      if (base) box(x + 0.25, y + 0.25, 0, 0.5, 0.5, 30, PAL.paper);
      monitor(x + 0.5, y + 0.45, "y", "site", ctx, f.room, 30);
      break;
    case "tvstand": {
      // Mueble bajo con una tele grande: el motor le pone el sitio (la
      // grabación si estás en la sala; si no, la captura). Pantalla 16:11.
      const wd = face === "y" ? w : d;
      const at = (u: number, v: number, z: number) => (face === "y" ? P(x + u, y + v, z) : P(x + v, y + u, z));
      const bx = (u: number, v: number, z: number, lu: number, lv: number, h: number, col: string, o?: { top?: string }) =>
        face === "y" ? box(x + u, y + v, z, lu, lv, h, col, o) : box(x + v, y + u, z, lv, lu, h, col, o);
      if (base) {
        bx(0.12, 0.18, 0, wd - 0.24, 0.5, 12, PAL.char2, { top: PAL.char3 });
        bx(0.2, 0.62, 3, wd * 0.4 - 0.2, 0.06, 6, PAL.char);
        bx(wd * 0.6, 0.62, 3, wd * 0.4 - 0.2, 0.06, 6, PAL.char);
      }
      bx(wd / 2 - 0.22, 0.3, 12, 0.44, 0.16, 2, METAL);
      bx(wd / 2 - 0.04, 0.34, 14, 0.08, 0.06, 3, METAL);
      bx(0.06, 0.32, 16, wd - 0.12, 0.08, 46, "#121119");
      const quad: XY[] = [at(0.12, 0.405, 60), at(wd - 0.12, 0.405, 60), at(wd - 0.12, 0.405, 18), at(0.12, 0.405, 18)];
      poly(quad, c("#08080b"));
      ctx.glows.push({ t: "screen", quad, kind: "live", accent: acc, room: f.room });
      break;
    }
    case "vitrine":
      box(x + 0.15, y + 0.15, 0, 0.7, 0.55, 8, PAL.char2);
      box(x + 0.38, y + 0.35, 8, 0.24, 0.2, 6, "#c9a24a");
      box(x + 0.44, y + 0.4, 14, 0.12, 0.1, 10, "#e8c14e");
      box(x + 0.35, y + 0.33, 24, 0.3, 0.24, 7, "#f2cf5c", { top: "#ffe08a" });
      box(x + 0.15, y + 0.15, 8, 0.7, 0.55, 44, "#9fd0ee", { line: OUT_SOFT, top: "rgba(200,230,247,0.35)", left: "rgba(160,210,240,0.18)", right: "rgba(120,180,220,0.22)" });
      break;
    case "kitchen":
      box(x, y + 0.1, 0, w, 0.6, 28, PAL.paper, { top: PAL.grey2 });
      for (let i = 1; i < w; i++) faceRect("y", y + 0.7, x, i - 0.01, i + 0.01, 4, 26, c("#c4bfb5"));
      box(x + 1.15, y + 0.15, 28, 0.4, 0.34, 18, PAL.char2);
      ctx.glows.push({ t: "led", at: onFace("y", y + 0.49, x + 1.15, 0.3, 40), i: -1, room: f.room });
      ctx.glows.push({ t: "steam", at: P(x + 1.35, y + 0.32, 47), room: f.room });
      break;
    case "fridge":
      box(x + 0.15, y + 0.15, 0, 0.7, 0.6, 62, PAL.paper, { top: PAL.white });
      faceRect("y", y + 0.755, x + 0.15, 0.55, 0.6, 30, 44, c(PAL.grey2));
      faceRect("y", y + 0.755, x + 0.15, 0.1, 0.2, 48, 52, c(PAL.signal));
      break;
    // --- Las salas del estudio ---
    case "beanbag": {
      // Un puf: una gota aplastada con su costura
      const [bx, by] = P(x + 0.5, y + 0.5, 0);
      const col = ctx.kind === "lounge" ? (hash(x, y) > 0.5 ? PAL.signal2 : PAL.char3) : PAL.grey;
      g.beginPath();
      g.moveTo(bx - 15, by - 2);
      g.quadraticCurveTo(bx - 16, by - 17, bx - 2, by - 21);
      g.quadraticCurveTo(bx + 13, by - 20, bx + 15, by - 4);
      g.quadraticCurveTo(bx + 14, by + 6, bx, by + 6);
      g.quadraticCurveTo(bx - 14, by + 6, bx - 15, by - 2);
      g.fillStyle = c(col);
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = LW;
      g.stroke();
      ellipse(bx + 1, by - 9, 9, 5, c(lite(col, 0.18)), null);
      g.beginPath();
      g.moveTo(bx - 9, by - 13);
      g.quadraticCurveTo(bx - 1, by - 7, bx + 8, by - 14);
      g.strokeStyle = c(dark(col, 0.3));
      g.lineWidth = 1;
      g.stroke();
      break;
    }
    case "deploy": {
      // El botón de deploy del área de desarrollo: un pedestal con el botón violeta gigante y su tapa
      box(x + 0.25, y + 0.25, 0, 0.5, 0.5, 24, PAL.char2, { top: PAL.char3 });
      faceRect("y", y + 0.75, x + 0.25, 0.08, 0.42, 9, 15, c("#ffd84d"));
      for (let i = 0; i < 4; i++) faceRect("y", y + 0.755, x + 0.25, 0.1 + i * 0.09, 0.14 + i * 0.09, 9, 15, c(PAL.ink));
      cyl(x + 0.5, y + 0.5, 24, 7, 3, PAL.deep, PAL.signal);
      const [kx, ky] = P(x + 0.5, y + 0.5, 30);
      ellipse(kx - 2, ky - 1, 2.6, 1.2, c(PAL.signal3), null);
      poly([P(x + 0.28, y + 0.22, 27), P(x + 0.72, y + 0.22, 27), P(x + 0.72, y + 0.22, 41), P(x + 0.28, y + 0.22, 41)], "rgba(255,255,255,0.22)", OUT_SOFT);
      break;
    }
    case "easel": {
      // El atril con el boceto del logo del estudio (los anillos del orbe)
      const [a, b] = [P(x + 0.2, y + 0.65, 0), P(x + 0.8, y + 0.65, 0)];
      const [tx, ty] = P(x + 0.5, y + 0.5, 66);
      line(a, [tx, ty], c(WOOD), 2.6);
      line(b, [tx, ty], c(WOOD), 2.6);
      line(P(x + 0.5, y + 0.2, 0), [tx, ty], c(dark(WOOD, 0.2)), 2.2);
      box(x + 0.12, y + 0.56, 20, 0.76, 0.06, 2.5, WOOD);
      box(x + 0.16, y + 0.5, 23, 0.68, 0.05, 38, PAL.white, { left: "#fbfaff" });
      const [cx, cy] = P(x + 0.43, y + 0.56, 42);
      for (const [r, al] of [[11, 0.9], [8, 0.9], [5, 0.9], [2.4, 1]] as [number, number][]) {
        g.beginPath();
        g.ellipse(cx, cy, r * 0.62, r, -0.45, Math.PI * 0.5, Math.PI * 1.5);
        g.strokeStyle = `rgba(255,77,46,${al})`;
        g.lineWidth = 1.6;
        g.stroke();
      }
      ellipse(cx + 8, cy - 2.4, 1.6, 2.6, c(PAL.signal), null);
      line(P(x + 0.25, y + 0.56, 27), P(x + 0.6, y + 0.56, 27.5), c(PAL.grey2), 0.8);
      break;
    }
    case "meettable": {
      // La mesa larga de las reuniones, con la notebook abierta y una jarra de agua
      for (const [lx, ly] of [[x + 0.2, y + 0.4], [x + w - 0.3, y + 0.4]]) box(lx, ly, 0, 0.1, 0.2, 23, LEG);
      box(x + 0.06, y + 0.08, 23, w - 0.12, d - 0.16, 4, TOP, { left: DESK.left, right: DESK.right });
      box(x + 0.7, y + 0.3, 27, 0.5, 0.36, 1.4, PAL.grey);
      box(x + 0.7, y + 0.28, 28.4, 0.5, 0.05, 13, PAL.char, { left: PAL.char2 });
      for (const u of [1.7, 2.7]) box(x + u, y + 0.45, 27, 0.34, 0.24, 0.8, PAL.white);
      line(P(x + 1.75, y + 0.55, 28), P(x + 1.95, y + 0.6, 28), c(PAL.signal), 1);
      cyl(x + w - 0.5, y + 0.45, 27, 3, 10, "rgba(170,210,255,0.55)", "rgba(200,230,255,0.7)");
      break;
    }
    case "coffeebar": {
      // La barra del café: el mueble, la cafetera con su luz y dos tazas
      box(x + 0.08, y + 0.12, 0, 0.84, 0.66, 28, PAL.char2, { top: TOP });
      faceRect("y", y + 0.78, x + 0.08, 0.06, 0.78, 6, 8, c(PAL.signal));
      box(x + 0.2, y + 0.2, 28, 0.38, 0.32, 20, "#cfccc6", { top: "#ecebe6", right: "#a9a6a0" });
      faceRect("y", y + 0.52, x + 0.2, 0.08, 0.3, 31, 35, c(PAL.char));
      ctx.glows.push({ t: "steam", at: P(x + 0.4, y + 0.3, 50), room: f.room });
      ctx.glows.push({ t: "led", at: onFace("y", y + 0.525, x + 0.2, 0.31, 43), i: -1, room: f.room });
      mug(x + 0.72, y + 0.36, 28, PAL.white, ctx, f.room);
      mug(x + 0.72, y + 0.6, 28, PAL.signal, ctx, f.room);
      break;
    }
    case "arcade": {
      // Un fichín, como el de la landing: gabinete negro, marquesina violeta y la pantalla prendida
      box(x + 0.18, y + 0.14, 0, 0.64, 0.6, 34, PAL.char, { top: PAL.char2 });
      box(x + 0.16, y + 0.62, 34, 0.68, 0.16, 4, PAL.char2, { top: PAL.signal3 });
      for (const [u, col] of [[0.32, PAL.signal], [0.5, PAL.white], [0.62, PAL.signal3]] as [number, string][]) {
        const [bx, by] = P(x + u, y + 0.7, 38.5);
        ellipse(bx, by, 1.6, 0.9, c(col), OUT_SOFT, 0.8);
      }
      box(x + 0.18, y + 0.14, 38, 0.64, 0.42, 30, PAL.char);
      faceRect("y", y + 0.565, x + 0.18, 0, 0.64, 62, 68, c(PAL.signal));
      faceRect("y", y + 0.565, x + 0.18, 0.06, 0.58, 63.5, 66.5, c(PAL.signal3));
      const quad: XY[] = [P(x + 0.24, y + 0.57, 59), P(x + 0.76, y + 0.57, 59), P(x + 0.76, y + 0.57, 41), P(x + 0.24, y + 0.57, 41)];
      poly(quad, c("#08080b"));
      ctx.glows.push({ t: "screen", quad, kind: "arcade", accent: PAL.signal, room: f.room });
      faceRect("x", x + 0.82, y + 0.14, 0.05, 0.55, 6, 30, c(PAL.signal));
      break;
    }
    case "lowtable": {
      box(x + 0.12, y + 0.2, 0, 0.08, 0.6, 12, LEG);
      box(x + w - 0.2, y + 0.2, 0, 0.08, 0.6, 12, LEG);
      box(x + 0.08, y + 0.15, 12, w - 0.16, d - 0.3, 3.5, PAL.char3, { top: PAL.grey });
      box(x + 0.4, y + 0.35, 15.5, 0.5, 0.3, 1.5, PAL.signal2);
      box(x + 0.46, y + 0.38, 17, 0.42, 0.24, 1.2, PAL.white);
      mug(x + w - 0.5, y + 0.45, 15.5, PAL.signal, ctx, f.room);
      break;
    }
    // --- Al lado del rack, algo propio de cada proyecto ---
    case "dumbbells": {
      // Rack bajo con mancuernas de a pares
      box(x + 0.12, y + 0.22, 0, 0.76, 0.46, 16, PAL.char2);
      for (let i = 0; i < 3; i++) {
        for (const dy of [0.32, 0.56]) {
          const [cx, cy] = P(x + 0.24 + i * 0.26, y + dy, 18);
          ellipse(cx - 4, cy, 2.6, 3.2, c(i === 1 ? acc : PAL.char3), OUT_SOFT);
          ellipse(cx + 4, cy, 2.6, 3.2, c(i === 1 ? acc : PAL.char3), OUT_SOFT);
          line([cx - 3, cy], [cx + 3, cy], c("#c9ccd2"), 1.4);
        }
      }
      break;
    }
    case "cabinet": {
      // Archivero de tres cajones
      box(x + 0.2, y + 0.18, 0, 0.6, 0.5, 46, "#9aa0b4", { top: "#b8bdcc", right: "#7f8598" });
      for (let i = 0; i < 3; i++) {
        faceRect("y", y + 0.685, x + 0.2, 0.05, 0.55, 4 + i * 14, 5 + i * 14, c("#6f758a"));
        faceRect("y", y + 0.685, x + 0.2, 0.24, 0.36, 10 + i * 14, 12 + i * 14, c("#e2e5ee"));
      }
      faceRect("y", y + 0.685, x + 0.2, 0.08, 0.2, 38, 42, c(acc));
      break;
    }
    case "espresso": {
      // Mueble con la cafetera y dos tazas
      box(x + 0.1, y + 0.15, 0, 0.8, 0.6, 26, "#3a2f2a", { top: "#c9a26e" });
      box(x + 0.22, y + 0.2, 26, 0.36, 0.32, 18, "#c9ccd2", { top: "#e6e9ec", right: "#a9adb3" });
      faceRect("y", y + 0.52, x + 0.22, 0.08, 0.28, 30, 34, c(PAL.char2));
      ctx.glows.push({ t: "steam", at: P(x + 0.4, y + 0.3, 46), room: f.room });
      ctx.glows.push({ t: "led", at: onFace("y", y + 0.525, x + 0.22, 0.3, 40), i: -1, room: f.room });
      box(x + 0.66, y + 0.4, 26, 0.12, 0.12, 5, "#f4f1ea");
      box(x + 0.66, y + 0.58, 26, 0.12, 0.12, 5, acc);
      break;
    }
    // --- Piezas del centro, según el tema del proyecto ---
    case "balls": {
      // Canasto de pelotas de pádel y dos paletas apoyadas
      box(x + 0.28, y + 0.3, 0, 0.44, 0.4, 14, "#c9c4cf", { top: PAL.char3 });
      const [bx, by] = P(x + 0.5, y + 0.5, 14);
      for (const [dx, dy] of [[-5, -1], [0, -3], [5, -1], [-2, 1], [3, 1]]) ellipse(bx + dx, by + dy, 2.8, 2.6, c("#d4ec3e"), OUT_SOFT);
      for (const [px, flip] of [[x + 0.12, 1], [x + 0.88, -1]] as [number, number][]) {
        const [hx, hy] = P(px, y + 0.8, 0);
        line([hx, hy], [hx + 4 * flip, hy - 13], c(PAL.char2), 2);
        ellipse(hx + 6 * flip, hy - 20, 6, 8, c(acc), OUT);
        ellipse(hx + 6 * flip, hy - 20, 3.4, 5.2, c(PAL.char));
      }
      break;
    }
    case "matetable": {
      // La pava con vapor y un mate con bombilla
      box(x + 0.45, y + 0.45, 0, 0.1, 0.1, 22, LEG, { line: null });
      box(x + 0.15, y + 0.15, 22, 0.7, 0.7, 3, "#c79a63");
      box(x + 0.2, y + 0.3, 25, 0.26, 0.26, 10, "#cfd3d8", { top: "#e6e9ec" });
      box(x + 0.3, y + 0.4, 35, 0.06, 0.06, 3, PAL.char2, { line: null });
      const [sx, sy] = P(x + 0.46, y + 0.43, 31);
      line([sx, sy], [sx + 6, sy - 3], c("#cfd3d8"), 2.2);
      ctx.glows.push({ t: "steam", at: [sx + 6, sy - 5], room: f.room });
      const [mx, my] = P(x + 0.66, y + 0.62, 25);
      ellipse(mx, my - 4, 4.5, 5, c("#7a4a2a"), OUT);
      ellipse(mx, my - 8.5, 3.4, 1.4, c("#6f9a3a"));
      line([mx + 1, my - 8], [mx + 4, my - 15], c("#d8dade"), 1.4);
      break;
    }
    case "squatrack": {
      // Rack con la barra cargada y discos en el piso
      box(x + 0.1, y + 0.3, 0, w - 0.2, 0.3, 3, PAL.char2);
      for (const px of [x + 0.15, x + w - 0.3]) box(px, y + 0.38, 3, 0.14, 0.14, 56, PAL.char3);
      box(x - 0.05, y + 0.43, 44, w + 0.1, 0.04, 2, "#c9ccd2", { line: null });
      for (const px of [x + 0.02, x + w - 0.02]) {
        const [dx, dy] = P(px, y + 0.45, 45);
        ellipse(dx, dy, 3.5, 9, c(acc), OUT);
        ellipse(dx, dy, 1.4, 3, c(PAL.char));
      }
      const [fx, fy] = P(x + w - 0.45, y + 0.85, 0);
      for (let i = 0; i < 3; i++) ellipse(fx, fy - i * 3, 7, 3.4, c(i % 2 ? PAL.char2 : PAL.char3), OUT_SOFT);
      break;
    }
    case "yogaprops": {
      // Pesa rusa y rodillo de espuma
      const [kx, ky] = P(x + 0.35, y + 0.4, 0);
      ellipse(kx, ky - 6, 6, 6, c(PAL.char2), OUT);
      g.beginPath();
      g.arc(kx, ky - 12, 3.6, Math.PI, 0);
      g.strokeStyle = c(PAL.char2);
      g.lineWidth = 2.2;
      g.stroke();
      g.lineCap = "round";
      line(P(x + 0.72, y + 0.2, 5), P(x + 0.72, y + 0.85, 5), OUT, 11);
      line(P(x + 0.72, y + 0.2, 5), P(x + 0.72, y + 0.85, 5), c(acc), 9);
      line(P(x + 0.72, y + 0.2, 5), P(x + 0.72, y + 0.85, 5), c(lite(acc, 0.25)), 3);
      g.lineCap = "butt";
      break;
    }
    case "maquette": {
      // Maqueta de un edificio sobre un pedestal
      box(x + 0.1, y + 0.1, 0, 0.8, 0.8, 22, PAL.paper);
      box(x + 0.28, y + 0.3, 22, 0.3, 0.3, 26, "#f4f1ea", { right: "#cfc9bd" });
      box(x + 0.6, y + 0.45, 22, 0.2, 0.25, 14, "#e8e2d6", { right: "#cbc4b7" });
      for (let i = 0; i < 4; i++) faceRect("y", y + 0.6, x + 0.28, 0.05, 0.25, 26 + i * 5, 28 + i * 5, c("#7fb8e8"));
      const [t1x, t1y] = P(x + 0.22, y + 0.75, 22);
      ellipse(t1x, t1y - 3, 3, 3, c("#5bb36a"), OUT_SOFT);
      const [t2x, t2y] = P(x + 0.82, y + 0.22, 22);
      ellipse(t2x, t2y - 3, 2.5, 2.5, c("#4a9d55"), OUT_SOFT);
      break;
    }
    case "globe": {
      // Globo terráqueo con un foco de incendio que titila
      box(x + 0.35, y + 0.35, 0, 0.3, 0.3, 4, PAL.char2);
      box(x + 0.47, y + 0.47, 4, 0.06, 0.06, 26, "#c9a24a", { line: null });
      const [gx, gy] = P(x + 0.5, y + 0.5, 40);
      ellipse(gx, gy, 11, 11, c("#3d7fc4"), OUT);
      ellipse(gx - 3, gy - 3, 4, 3, c("#5bb36a"));
      ellipse(gx + 4, gy + 3, 3, 4, c("#5bb36a"));
      ellipse(gx + 2, gy - 6.5, 2, 1.5, c("#5bb36a"));
      g.beginPath();
      g.ellipse(gx, gy, 12.5, 12.5, 0, -Math.PI * 0.6, Math.PI * 0.6);
      g.strokeStyle = c("#c9a24a");
      g.lineWidth = 1.5;
      g.stroke();
      ctx.glows.push({ t: "led", at: [gx - 3, gy - 1], i: -2, room: f.room });
      break;
    }
    case "phonetable": {
      // Mesa de exhibición con tres celulares prendidos
      box(x + 0.1, y + 0.2, 0, 0.8, 0.6, 24, PAL.paper, { right: "#d4d0e2" });
      for (let i = 0; i < 3; i++) {
        const px = x + 0.2 + i * 0.22;
        box(px, y + 0.45, 24, 0.13, 0.04, 17, PAL.char);
        const quad: XY[] = [P(px + 0.015, y + 0.495, 39), P(px + 0.115, y + 0.495, 39), P(px + 0.115, y + 0.495, 26), P(px + 0.015, y + 0.495, 26)];
        poly(quad, c("#0b0b10"));
        ctx.glows.push({ t: "screen", quad, kind: "site", accent: acc, room: f.room });
      }
      break;
    }
    case "cafetable": {
      // Mesa con un café y el QR de la carta
      box(x + 0.45, y + 0.45, 0, 0.1, 0.1, 22, LEG, { line: null });
      box(x + 0.12, y + 0.12, 22, 0.76, 0.76, 3, "#d8cdb9");
      box(x + 0.25, y + 0.5, 25, 0.16, 0.16, 6, "#f4f1ea");
      box(x + 0.55, y + 0.25, 25, 0.24, 0.05, 13, "#f4f1ea");
      for (const [u0, z0] of [[0.03, 28], [0.14, 33], [0.07, 31.5], [0.16, 28.5], [0.04, 34]]) faceRect("y", y + 0.305, x + 0.55, u0, u0 + 0.05, z0, z0 + 2.5, c("#16161b"));
      break;
    }
    // --- El jardín entre los sectores ---
    case "tree": {
      // Un árbol de dibujo animado: tronco y la copa en tres bollos
      const [tx, ty] = P(x + 0.5, y + 0.5, 0);
      ellipse(tx, ty, 13, 5.5, "rgba(11,11,12,0.28)");
      g.beginPath();
      g.moveTo(tx - 3, ty);
      g.lineTo(tx - 2, ty - 26);
      g.lineTo(tx + 2, ty - 26);
      g.lineTo(tx + 3, ty);
      g.closePath();
      g.fillStyle = c("#6b4a2f");
      g.fill();
      g.strokeStyle = OUT;
      g.lineWidth = LW;
      g.stroke();
      const big = 0.85 + hash(x, y) * 0.3;
      for (const [dx, dy, r, col] of [[-8, -34, 11, "#2f6b3a"], [8, -36, 11, "#2f6b3a"], [0, -46, 13, "#3d8246"], [-3, -50, 6, "#4f9655"]] as [number, number, number, string][])
        ellipse(tx + dx * big, ty + dy * big, r * big, r * 0.9 * big, c(col), OUT);
      break;
    }
    case "bush": {
      const [bx, by] = P(x + 0.5, y + 0.5, 0);
      for (const [dx, dy, r, col] of [[-6, -6, 7, "#2f6b3a"], [6, -6, 7, "#2f6b3a"], [0, -11, 8, "#3d8246"]] as [number, number, number, string][])
        ellipse(bx + dx, by + dy, r, r * 0.85, c(col), OUT);
      if (hash(x, y) > 0.5) for (const [dx, dy] of [[-3, -12], [4, -8]]) ellipse(bx + dx, by + dy, 1.4, 1.4, c(PAL.signal3), null);
      break;
    }
    case "boxes":
      for (let i = 0; i < w; i++) {
        box(x + i + 0.1, y + 0.15, 0, 0.8, 0.7, 20, "#a98a62");
        box(x + i + 0.2, y + 0.25, 20, 0.6, 0.5, 16, "#bf9d6f");
      }
      break;
  }
}

function books(face: Facing, plane: number, start: number, len: number) {
  const colors = [PAL.signal, PAL.white, PAL.grey, PAL.signal3, PAL.char3, PAL.deep, PAL.paper2];
  for (const [z0, z1] of [[6, 20], [24, 38], [42, 54]]) {
    let u = 0.04, i = Math.floor(hash(Math.round(plane * 10), z0) * 7);
    while (u < len - 0.08) {
      const bw = 0.07 + hash(Math.round(u * 100), z0) * 0.06;
      faceRect(face, plane, start, u, Math.min(len - 0.04, u + bw), z0, z1 - hash(i, z0) * 4, c(colors[i++ % colors.length]), OUT_SOFT);
      u += bw + 0.015;
    }
  }
}

function plant(x: number, y: number, accent: string) {
  const st = plantStage(F);
  // Maceta blanca con la franja violeta
  cyl(x + 0.5, y + 0.5, 0, 9, 14, PAL.paper, "#3b2a20");
  const [px, py] = P(x + 0.5, y + 0.5, 4);
  g.fillStyle = c(PAL.signal);
  g.fillRect(px - 9, py - 4, 18, 3);
  const [cx, cy] = P(x + 0.5, y + 0.5, 14);
  if (st === 0) {
    for (const [dx, dy, r, col] of [[-7, -6, 7.5, "#23805f"], [6, -7, 7.5, "#23805f"], [0, -14, 8.5, "#2f9672"], [-5, -21, 6.5, "#3aac83"], [5, -20, 6.5, "#46c193"]] as [number, number, number, string][])
      ellipse(cx + dx, cy + dy, r, r * 0.9, c(col), OUT);
    ellipse(cx + 3, cy - 23, 2.2, 2.2, c(lite(accent, 0.25)));
  } else if (st === 1) {
    for (const [dx, dy, r, col] of [[-8, -3, 6, "#6b7a3a"], [8, -3, 6, "#6b7a3a"], [0, -10, 7, "#7f8c45"], [-3, -15, 5, "#8a964f"]] as [number, number, number, string][])
      ellipse(cx + dx, cy + dy, r, r * 0.8, c(col), OUT);
  } else if (st === 2) {
    line([cx - 2, cy], [cx - 5, cy - 16], c("#6a4e2c"), 1.5);
    line([cx + 2, cy], [cx + 6, cy - 13], c("#6a4e2c"), 1.5);
    ellipse(cx - 5, cy - 16, 3.5, 2.5, c("#a07a44"));
    ellipse(cx + 6, cy - 13, 3, 2.2, c("#8a6a3a"));
  } else {
    line([cx, cy], [cx, cy - 18], c("#5a4430"), 1.5);
    line([cx, cy - 10], [cx + 4, cy - 14], c("#5a4430"), 1.2);
    const [fx, fy] = P(x + 0.85, y + 0.75);
    ellipse(fx, fy, 2.5, 1.2, c("#7a5a32"));
    ellipse(fx - 9, fy + 3, 2, 1, c("#8a6a3a"));
  }
}

/** Telarañas y polvo de las salas apagadas (van sobre el piso, en las esquinas de atrás). */
export function decay(r: MapRoom, f: number) {
  if (f < 0.5) return;
  for (let yy = r.y; yy < r.y + r.d; yy++)
    for (let xx = r.x; xx < r.x + r.w; xx++)
      if (hash(xx * 3, yy * 7) < (f - 0.5) * 0.9) {
        const p = P(xx + hash(xx, yy), yy + hash(yy, xx));
        g.fillStyle = "rgba(160,152,170,0.55)";
        g.fillRect(p[0], p[1], 1.5, 1);
      }
  if (f > 0.72) {
    const [cx, cy] = P(r.x + 0.02, r.y + 0.02, r.column === "left" || r.x === 0 ? 100 : WALL - 2);
    g.strokeStyle = "rgba(220,214,230,0.55)";
    g.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.15 + i * 0.17);
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18);
      g.stroke();
    }
    for (const rr of [7, 13]) {
      g.beginPath();
      g.arc(cx, cy, rr, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
  }
}

/**
 * Los charcos de luz de la noche, horneados en el piso: debajo de cada lámpara
 * del pasillo y saliendo por la puerta de cada sala prendida.
 */
export function lightPool(at: XY, r: number, alpha: number) {
  g.save();
  g.globalCompositeOperation = "lighter";
  for (const [k, a] of [[1, 0.35], [0.66, 0.35], [0.36, 0.3]] as [number, number][]) {
    g.beginPath();
    g.ellipse(at[0], at[1], r * k, (r * k) / 2, 0, 0, Math.PI * 2);
    g.fillStyle = `rgba(255,196,140,${alpha * a})`;
    g.fill();
  }
  g.restore();
}
export function lightSpill(pts: XY[], alpha: number) {
  g.save();
  g.globalCompositeOperation = "lighter";
  poly(pts, `rgba(255,214,170,${alpha})`);
  g.restore();
}

// --- Muñecos ------------------------------------------------------------------------
//
// Los personajes son las ilustraciones de Federico (scripts/personajes.mjs las
// pasa a una lámina por personaje): una pose por cuadro, mirando abajo a la
// derecha o de espaldas arriba a la derecha; las otras dos direcciones salen
// espejadas. Mientras baja la lámina no se dibuja nadie; si no baja, quedan
// los muñecos dibujados en código (toon.ts).

export type Dir = "SE" | "SW" | "NE" | "NW";
/** Hasta dónde llega lo que se mueve, desde los pies y en px del mundo (con la sombra, el paso y sentado): el motor rehace ese rectángulo en cada cuadro. */
export type Reach = { x: number; up: number; down: number };
/** Alto de la figura parada, en px del mundo. */
export const FIGURE_H = 82;
type SheetKey = keyof typeof SHEETS;
const SK = (k: SheetKey) => FIGURE_H / SHEETS[k].height;
// La caja que entra cualquier cuadro de cualquier personaje (espejado incluido)
const SPRITE_X = Math.max(
  ...(Object.keys(SHEETS) as SheetKey[]).flatMap((k) => Object.values(SHEETS[k].frames).map(([, , w, , ax]) => Math.max(ax, w - ax) * SK(k))),
);
const SPRITE_UP = Math.max(...(Object.keys(SHEETS) as SheetKey[]).flatMap((k) => Object.values(SHEETS[k].frames).map(([, , , , , ay]) => ay * SK(k))));
export const AVATAR_REACH: Reach = { x: Math.max(TOON_BOX.x1, SPRITE_X) + 3, up: Math.max(-TOON_BOX.y0, SPRITE_UP) + 12, down: TOON_BOX.y1 + 4 };
/** Las poses que entran en cada rectángulo: caminando y saludando son las más anchas. */
const REACH_POSES: Record<"walk" | "wave" | "still" | "sit", string[]> = { walk: ["walk", "back", "idle"], wave: ["wave", "talk", "idle", "back"], still: ["idle", "blink", "back", "phone", "talk", "think"], sit: ["sit", "idle"] };
const reachMemo = new Map<string, Reach>();
/**
 * El rectángulo que hay que rehacer alrededor de alguien según lo que está
 * haciendo: más chico que el de la pose más ancha, así cada cuadro rehace menos.
 */
export function reachOf(who: ActorLook, doing: "walk" | "wave" | "still" | "sit"): Reach {
  const k = sheetOf(who);
  if (!(sheets.get(k) instanceof HTMLImageElement)) return AVATAR_REACH;
  const key = `${k}|${doing}`;
  let r = reachMemo.get(key);
  if (!r) {
    const s = SK(k);
    const fr = Object.entries(SHEETS[k].frames).filter(([n]) => REACH_POSES[doing].some((b) => n === b || n.startsWith(b)));
    const x = Math.max(...fr.map(([, [, , w, , ax]]) => Math.max(ax, w - ax) * s));
    const up = Math.max(...fr.map(([, [, , , , , ay]]) => ay * s));
    reachMemo.set(key, (r = { x: Math.max(14, x) + 3, up: up + 4, down: 7 }));
  }
  return r;
}
export const CAT_REACH: Reach = { x: CAT_BOX.x1 + 1, up: -CAT_BOX.y0 + 1, down: CAT_BOX.y1 + 1 };

// Cada pose de cada muñeco se dibuja una vez en un lienzo chico a la escala de
// la pantalla y después sólo se copia. Si cambia la escala, se vuelven a armar.
const poses = new Map<string, HTMLCanvasElement>();
let poseScale = 0;
function cached(key: string, box: { x0: number; x1: number; y0: number; y1: number }, draw: (t: CanvasRenderingContext2D) => void) {
  const s = Math.max(0.5, Math.round(Math.abs(g.getTransform().a) * 4) / 4);
  if (s !== poseScale) {
    poses.clear();
    poseScale = s;
  }
  let cv = poses.get(key);
  if (!cv) {
    cv = document.createElement("canvas");
    cv.width = Math.max(1, Math.ceil((box.x1 - box.x0) * s));
    cv.height = Math.max(1, Math.ceil((box.y1 - box.y0) * s));
    // Sin willReadFrequently aunque se recoloree: un lienzo en la CPU se volvería a subir a la placa en cada cuadro
    const t = cv.getContext("2d") as CanvasRenderingContext2D;
    t.setTransform(s, 0, 0, s, -box.x0 * s, -box.y0 * s);
    draw(t);
    if (poses.size > 600) poses.clear();
    poses.set(key, cv);
  }
  g.drawImage(cv, box.x0, box.y0, box.x1 - box.x0, box.y1 - box.y0);
}

/** Las láminas: se piden una vez, todas juntas, cuando se arma el motor. */
const sheets = new Map<SheetKey, HTMLImageElement | "loading" | "error">();
export function loadSheets(onLoad: () => void) {
  for (const k of Object.keys(SHEETS) as SheetKey[]) {
    if (sheets.has(k)) continue;
    sheets.set(k, "loading");
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      sheets.set(k, img);
      onLoad();
    };
    img.onerror = () => sheets.set(k, "error");
    img.src = SHEETS[k].src;
  }
}
const sheetOf = (who: ActorLook): SheetKey => (who === "federico" || who === "franco" || who === "guia" ? who : "visita");
/** Los cuadros de una pose (`walk0`, `walk1`…), en orden. */
const framesOf = (k: SheetKey, base: string) => Object.keys(SHEETS[k].frames).filter((n) => n === base || new RegExp(`^${base}\\d$`).test(n));

/**
 * La campera de cada visita, de su color (sale del id): la ilustración es una
 * sola y así no son todas iguales. 0 = la original.
 */
const JACKETS: (number | "grey" | null)[] = [null, 190, 215, 355, 85, "grey", 160, 20];
function recolor(t: CanvasRenderingContext2D, hue: number | "grey") {
  const { width: w, height: h } = t.canvas;
  const img = t.getImageData(0, 0, w, h), px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const r = px[i] / 255, gg = px[i + 1] / 255, b = px[i + 2] / 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn;
    if (!d) continue;
    const s = d / mx;
    let hh = mx === r ? ((gg - b) / d) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
    // La campera mostaza: ni el pelo (más oscuro y más rojo), ni la piel (menos saturada)
    if (hh < 28 || hh > 52 || s < 0.42 || mx < 0.35) continue;
    // El gris, oscuro: una campera clara se confundiría con la camisa blanca de Federico
    const nh = hue === "grey" ? hh : hue, ns = hue === "grey" ? s * 0.12 : s, nv = hue === "grey" ? mx * 0.62 : mx;
    const c = nv * ns, x = c * (1 - Math.abs(((nh / 60) % 2) - 1)), m = nv - c;
    const [r2, g2, b2] = nh < 60 ? [c, x, 0] : nh < 120 ? [x, c, 0] : nh < 180 ? [0, c, x] : nh < 240 ? [0, x, c] : nh < 300 ? [x, 0, c] : [c, 0, x];
    px[i] = (r2 + m) * 255;
    px[i + 1] = (g2 + m) * 255;
    px[i + 2] = (b2 + m) * 255;
  }
  t.putImageData(img, 0, 0);
}
const jacketOf = (who: ActorLook) => {
  if (!who.startsWith("v:")) return null;
  let n = 0;
  for (let i = 0; i < who.length; i++) n = (Math.imul(n, 31) + who.charCodeAt(i)) | 0;
  return JACKETS[Math.abs(n) % JACKETS.length];
};

/** Los dueños del estudio: Federico y Franco. */
export const isOwner = (who: ActorLook) => who === "federico" || who === "franco";
/** Hasta dónde llega el aura de un dueño, desde los pies (el halo es más ancho que el muñeco). */
export const OWNER_REACH: Reach = { x: 40, up: 86, down: 11 };
/**
 * El aura de los dueños, atrás del muñeco: un halo naranja a la altura del
 * cuerpo y un anillo en el piso que late. No se tiñe con la luz de la hora: de
 * noche se ve más. `still`: sin el latido (movimiento reducido).
 */
export function ownerAura(sx: number, sy: number, ts: number, still: boolean, sitting = false) {
  g.save();
  g.translate(Math.round(sx), Math.round(sy));
  const cy = sitting ? -32 : -44;
  const halo = g.createRadialGradient(0, cy, 4, 0, cy, 38);
  halo.addColorStop(0, "rgba(255,106,79,0.36)");
  halo.addColorStop(0.55, "rgba(255,77,46,0.15)");
  halo.addColorStop(1, "rgba(255,77,46,0)");
  g.fillStyle = halo;
  g.beginPath();
  g.arc(0, cy, 38, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(0, 0.5, 15, 5.6, 0, 0, Math.PI * 2);
  g.fillStyle = "rgba(255,77,46,0.2)";
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = "rgba(255,77,46,0.95)";
  g.stroke();
  if (!still) {
    const k = (ts % 1800) / 1800;
    g.beginPath();
    g.ellipse(0, 0.5, 15 * (1 + k * 0.5), 5.6 * (1 + k * 0.5), 0, 0, Math.PI * 2);
    g.globalAlpha = 0.7 * (1 - k);
    g.stroke();
    g.globalAlpha = 1;
  }
  g.restore();
}

/**
 * Dibuja a `who` parado en (sx, sy) (los pies). `phase` 0–1 es el ciclo de
 * dos pasos; null = quieto. `blink`: parpadea (parado). `typing` 0–1:
 * sentado, tipeando. `wave` 0–1: saluda. `phone`: mira el celular. `talk`
 * 0–1: está hablando. `think`: se queda pensando.
 */
export function avatar(who: ActorLook, sx: number, sy: number, dir: Dir, phase: number | null, sitting = false, blink = false, typing: number | null = null, wave: number | null = null, phone = false, talk: number | null = null, think = false) {
  const mirror = dir === "SW" || dir === "NW";
  const back = dir === "NE" || dir === "NW";
  const k = sheetOf(who);
  const sheet = sheets.get(k);
  g.save();
  g.translate(Math.round(sx), Math.round(sy));
  if (mirror) g.scale(-1, 1);
  if (sheet instanceof HTMLImageElement) {
    // La pose de la lámina
    const step = phase === null ? null : Math.floor(phase * 4) % 4;
    const pick = (base: string, i: number) => {
      const fr = framesOf(k, base);
      return fr.length ? fr[i % fr.length] : "idle";
    };
    let name = "idle";
    let lift = 0;
    // Caminando: el ciclo de dos pasos, un cuadro por octavo de `phase`
    const walk = phase === null ? [] : framesOf(k, back ? "walkb" : "walk");
    if (back) {
      if (walk.length) name = walk[Math.floor((phase ?? 0) * walk.length) % walk.length];
      else {
        name = "back";
        if (step !== null && step % 2) lift = -1.2;
      }
    } else if (sitting) {
      name = SHEETS[k].frames.sit ? "sit" : "idle";
      if (typing !== null && typing >= 0.5) lift = -0.6;
    } else if (walk.length) name = walk[Math.floor((phase ?? 0) * walk.length) % walk.length];
    else if (wave !== null) name = pick("wave", Math.floor(wave * 8));
    else if (talk !== null) name = pick("talk", Math.floor(talk * 10));
    else if (phone) name = pick("phone", 0);
    else if (think) name = pick("think", 0);
    if (name === "idle" && blink && SHEETS[k].frames.blink) name = "blink";
    const [fx, fy, fw, fh, ax, ay] = SHEETS[k].frames[name];
    const s = SK(k);
    // Los dueños: un brillo naranja que sigue el contorno (va en la pose guardada: no cuesta en cada cuadro)
    const owner = isOwner(who), gm = owner ? 6 : 0;
    const box = { x0: -ax * s - 1 - gm, x1: (fw - ax) * s + 1 + gm, y0: -ay * s - 1 - gm, y1: 6 };
    const jacket = jacketOf(who);
    g.translate(0, lift);
    cached(`img|${k}|${name}|${jacket ?? "-"}${owner ? "|dueño" : ""}`, box, (t) => {
      t.beginPath();
      t.ellipse(0, 0, 13, 4.6, 0, 0, Math.PI * 2);
      t.fillStyle = "rgba(11,11,12,0.3)";
      t.fill();
      t.imageSmoothingQuality = "high";
      if (jacket === null) {
        if (owner) {
          // El blur no sigue la escala del lienzo: va en px de la pantalla
          const sc = Math.abs(t.getTransform().a);
          t.save();
          t.shadowColor = "rgba(255,77,46,0.95)";
          for (const blur of [6, 2.4]) {
            t.shadowBlur = blur * sc;
            t.drawImage(sheet, fx, fy, fw, fh, -ax * s, -ay * s, fw * s, fh * s);
          }
          t.restore();
        }
        t.drawImage(sheet, fx, fy, fw, fh, -ax * s, -ay * s, fw * s, fh * s);
        return;
      }
      // La campera se recolorea en un lienzo aparte, ya escalado (es chico: va
      // rápido), y se copia: el lienzo que se usa en cada cuadro nunca se lee
      const m = t.getTransform();
      const tmp = document.createElement("canvas");
      tmp.width = Math.max(1, Math.ceil(fw * s * m.a));
      tmp.height = Math.max(1, Math.ceil(fh * s * m.a));
      const tc = tmp.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
      tc.imageSmoothingQuality = "high";
      tc.drawImage(sheet, fx, fy, fw, fh, 0, 0, tmp.width, tmp.height);
      recolor(tc, jacket);
      t.drawImage(tmp, -ax * s, -ay * s, fw * s, fh * s);
    });
  } else if (sheet === "error" || sheet === undefined) {
    const pose: ToonPose = {
      back,
      // `phase` es el ciclo de dos pasos; el muñeco en código da cuatro pasitos por ciclo
      walk: phase === null ? null : Math.floor(phase * 8) % 4,
      sit: sitting,
      type: typing === null ? null : typing < 0.5 ? 0 : 1,
      wave: wave === null ? null : ((Math.floor(wave * 8) % 2) as 0 | 1),
      talk: talk === null ? null : ((Math.floor(talk * 6) % 2) as 0 | 1),
      phone,
      blink: blink && !back,
    };
    const key = `${who}|${+back}${pose.walk ?? "-"}${+sitting}${pose.type ?? "-"}${pose.wave ?? "-"}${pose.talk ?? "-"}${+phone}${+pose.blink}`;
    cached(key, TOON_BOX, (t) => drawToon(t, toonLook(who), pose));
  }
  g.restore();
}

/** El gato del estudio parado en (sx, sy). `phase` 0–1 es el paso (null = quieto); dormido, se hace un ovillo. */
export function studioCat(sx: number, sy: number, dir: Dir, phase: number | null, sleeping: boolean) {
  const frame: 0 | 1 | "sleep" | "sit" = sleeping ? "sleep" : phase === null ? "sit" : Math.floor(phase * 4) % 2 === 0 ? 1 : 0;
  g.save();
  g.translate(Math.round(sx), Math.round(sy));
  if (dir === "SW" || dir === "NW") g.scale(-1, 1);
  cached(`cat|${frame}`, CAT_BOX, (t) => drawCat(t, frame));
  g.restore();
}
