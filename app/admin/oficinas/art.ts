// Arte de «En vivo»: isométrico 2:1 con baldosas de 64×32, paredes altas en el
// borde del edificio, medias paredes entre salas, muebles en volumen con
// contorno y muñecos de cabeza grande. Todo dibujado en código: nada de sprites
// ni baldosas de otros productos. Se dibuja en coordenadas del mundo; el motor
// (engine.ts) pone la escala y decide el orden.
import type { Decor, Facing, Furni, MapModel, MapRoom, Period, Who } from "@/lib/admin/oficinas-shared";
import { plantStage } from "@/lib/admin/oficinas-shared";

export const HW = 32;
export const HH = 16;
/** Alturas en px del mundo. */
export const TALL = 118;
export const WALL = 36;
export const RAIL = 10;
const SLAB = 12;
const TH = 0.16; // espesor de pared, en baldosas

export type View = { ox: number; oy: number; width: number; height: number };
export function viewOf(m: MapModel): View {
  const pad = 48;
  return { ox: m.H * HW + pad, oy: TALL + pad, width: (m.W + m.H) * HW + pad * 2, height: (m.W + m.H) * HH + TALL + SLAB + pad * 2 };
}

// --- Pincel -----------------------------------------------------------------

let g: CanvasRenderingContext2D;
let V: View = { ox: 0, oy: 0, width: 0, height: 0 };
let F = 0;
export function begin(ctx: CanvasRenderingContext2D, view: View) {
  g = ctx;
  V = view;
  F = 0;
}
/** Apagado de lo que se dibuja a continuación (0 = encendido, 1 = apagado). */
export function setFade(f: number) {
  F = f;
}
export type XY = [number, number];
export const P = (x: number, y: number, z = 0): XY => [V.ox + (x - y) * HW, V.oy + (x + y) * HH - z];

// --- Color: paleta cerrada y apagado por luminancia ---------------------------

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
const c = (h: string) => (h[0] === "#" ? fadeHex(h, F) : h);
const dark = (h: string, k: number) => mix(h, "#000000", k);
const lite = (h: string, k: number) => mix(h, "#ffffff", k);
const OUT = "rgba(28,20,30,0.55)";
const OUT_SOFT = "rgba(28,20,30,0.28)";

export function hash(x: number, y: number) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// --- Primitivas -------------------------------------------------------------

function poly(pts: XY[], fill: string | null, stroke: string | null = null, lw = 1) {
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
function ellipse(cx: number, cy: number, rx: number, ry: number, fill: string, stroke: string | null = null) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
}
function rrect(x: number, y: number, w: number, h: number, r: number, fill: string, stroke: string | null = null) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
}

/** Caja isométrica: (x, y) es la esquina de atrás en baldosas; z y h en px. */
function box(x: number, y: number, z: number, w: number, d: number, h: number, base: string, o: { top?: string; left?: string; right?: string; line?: string | null } = {}) {
  const st = o.line === undefined ? OUT : o.line;
  poly([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)], c(o.left ?? base), st);
  poly([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)], c(o.right ?? dark(base, 0.2)), st);
  poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], c(o.top ?? lite(base, 0.12)), st);
}

/** Punto sobre una cara vertical: la que mira a +y (plano y = plane) o a +x (plano x = plane). */
const onFace = (face: Facing, plane: number, start: number, u: number, z: number): XY =>
  face === "y" ? P(start + u, plane, z) : P(plane, start + u, z);
function faceRect(face: Facing, plane: number, start: number, u0: number, u1: number, z0: number, z1: number, fill: string, stroke: string | null = null) {
  poly([onFace(face, plane, start, u0, z1), onFace(face, plane, start, u1, z1), onFace(face, plane, start, u1, z0), onFace(face, plane, start, u0, z0)], fill, stroke);
}

// --- Piso ---------------------------------------------------------------------

export type Material = "hall" | "reception" | "wood" | "carpetFranco" | "carpetFederico" | "parquet" | "gallery" | "kitchen" | "storage";

const FLOOR: Record<Material, [string, string]> = {
  hall: ["#aaa49b", "#a39d94"],
  reception: ["#e2d9c9", "#d8cfbf"],
  wood: ["#c8935f", "#c08a57"],
  carpetFranco: ["#b9ab7a", "#b3a574"],
  carpetFederico: ["#5d5d6b", "#585866"],
  parquet: ["#7b5236", "#734c31"],
  gallery: ["#4a4652", "#45414d"],
  kitchen: ["#e6e1d7", "#3c3b44"],
  storage: ["#8e8981", "#89847c"],
};

export function floorTile(x: number, y: number, mat: Material, runner = false) {
  const [a, b] = FLOOR[mat];
  const pts: XY[] = [P(x, y), P(x + 1, y), P(x + 1, y + 1), P(x, y + 1)];
  if (mat === "kitchen") {
    for (let i = 0; i < 4; i++) {
      const u = (i % 2) / 2, v = Math.floor(i / 2) / 2;
      poly([P(x + u, y + v), P(x + u + 0.5, y + v), P(x + u + 0.5, y + v + 0.5), P(x + u, y + v + 0.5)], c((i === 0 || i === 3) ? a : b));
    }
  } else {
    poly(pts, c((x + y) % 2 ? a : b));
  }
  if (mat === "wood" || mat === "parquet") {
    const seam = c(dark(a, 0.14));
    for (const v of [1 / 3, 2 / 3]) {
      if (mat === "wood") line(P(x, y + v), P(x + 1, y + v), seam, 0.8);
      else line(P(x + v, y), P(x + v, y + 1), seam, 0.8);
    }
    const j = hash(x, y) * 0.8 + 0.1;
    if (mat === "wood") line(P(x + j, y), P(x + j, y + 1 / 3), seam, 0.8);
  }
  if (mat === "carpetFranco" || mat === "carpetFederico") {
    for (let i = 0; i < 3; i++) {
      const u = hash(x * 3 + i, y), v = hash(x, y * 5 + i);
      const p = P(x + u, y + v);
      g.fillStyle = c(lite(a, 0.08));
      g.fillRect(p[0], p[1], 1.5, 1);
    }
  }
  if (runner) {
    poly([P(x + 0.18, y), P(x + 0.82, y), P(x + 0.82, y + 1), P(x + 0.18, y + 1)], c("#7a2a31"));
    line(P(x + 0.18, y), P(x + 0.18, y + 1), c("#c9a24a"), 1);
    line(P(x + 0.82, y), P(x + 0.82, y + 1), c("#c9a24a"), 1);
  }
  // Filo claro en los bordes de atrás de cada baldosa, como un piso encerado
  line(P(x, y + 1), P(x, y), c(lite(a, 0.16)), 0.8);
  line(P(x, y), P(x + 1, y), c(lite(a, 0.1)), 0.8);
}

/** El espesor del piso del edificio, en los dos bordes de adelante. */
export function slab(m: MapModel, matAt: (x: number, y: number) => Material) {
  for (let x = 0; x < m.W; x++) {
    const base = FLOOR[matAt(x, m.H - 1)][0];
    poly([P(x, m.H, 0), P(x + 1, m.H, 0), P(x + 1, m.H, -SLAB), P(x, m.H, -SLAB)], dark(base, 0.42), OUT_SOFT);
  }
  for (let y = 0; y < m.H; y++) {
    const base = FLOOR[matAt(m.W - 1, y)][0];
    poly([P(m.W, y, 0), P(m.W, y + 1, 0), P(m.W, y + 1, -SLAB), P(m.W, y, -SLAB)], dark(base, 0.55), OUT_SOFT);
  }
}

/** Lo que va pintado en el piso según el tema: la cancha de pádel y la colchoneta. */
export function decal(f: Furni, accent: string) {
  const { x, y, w, d } = f;
  if (f.k === "court") {
    poly([P(x + 0.05, y + 0.05), P(x + w - 0.05, y + 0.05), P(x + w - 0.05, y + d - 0.05), P(x + 0.05, y + d - 0.05)], c("#2f6fb3"), OUT_SOFT);
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
    // La red, en el medio de la cancha
    poly([P(x + w / 2, y + 0.12, 9), P(x + w / 2, y + d - 0.12, 9), P(x + w / 2, y + d - 0.12, 0), P(x + w / 2, y + 0.12, 0)], "rgba(18,18,24,0.4)");
    line(P(x + w / 2, y + 0.12, 9), P(x + w / 2, y + d - 0.12, 9), L, 1.4);
  } else if (f.k === "yogamat") {
    poly([P(x + 0.18, y + 0.05), P(x + 0.82, y + 0.05), P(x + 0.82, y + d - 0.05), P(x + 0.18, y + d - 0.05)], c(accent), OUT_SOFT);
    line(P(x + 0.18, y + 0.3), P(x + 0.82, y + 0.3), c(dark(accent, 0.25)), 1);
  }
}

export function rug(f: Furni, color: string, edge: string) {
  const { x, y, w, d } = f;
  poly([P(x + 0.08, y + 0.08), P(x + w - 0.08, y + 0.08), P(x + w - 0.08, y + d - 0.08), P(x + 0.08, y + d - 0.08)], c(edge));
  poly([P(x + 0.18, y + 0.18), P(x + w - 0.18, y + 0.18), P(x + w - 0.18, y + d - 0.18), P(x + 0.18, y + d - 0.18)], c(color));
  const cx = x + w / 2, cy = y + d / 2;
  poly([P(cx - 0.4, cy), P(cx, cy - 0.3), P(cx + 0.4, cy), P(cx, cy + 0.3)], c(mix(color, edge, 0.45)));
}

// --- Paredes ----------------------------------------------------------------------

export type WallStyle = { face: string; cap: string; stripe?: string };
/** Un tramo de pared en el borde de atrás de la baldosa (x, y). */
export function wallSegment(side: "L" | "R", x: number, y: number, kind: "rail" | "wall" | "tall", s: WallStyle, door: boolean) {
  const h = kind === "tall" ? TALL : kind === "wall" ? WALL : RAIL;
  const face = s.face, top = s.cap;
  // L: pared en el plano x = x (cara que mira a +x). R: en el plano y = y (cara que mira a +y).
  const seg = (a: number, b: number, z0: number, z1: number) => {
    if (side === "L") box(x - TH, y + a, z0, TH, b - a, z1 - z0, face, { right: face, left: dark(face, 0.25), top });
    else box(x + a, y - TH, z0, b - a, TH, z1 - z0, face, { left: face, right: dark(face, 0.25), top });
  };
  if (!door) {
    seg(0, 1, 0, h);
    const fc: Facing = side === "L" ? "x" : "y";
    const start = side === "L" ? y : x;
    if (kind !== "rail") faceRect(fc, side === "L" ? x : y, start, 0, 1, 0, 4, c(dark(face, 0.35)));
    if (s.stripe && kind === "wall") faceRect(fc, side === "L" ? x : y, start, 0, 1, h - 6, h - 3, c(s.stripe));
    return;
  }
  // Puerta: dos jambas y el hueco libre en el medio
  const post = kind === "rail" ? 18 : h + 4;
  seg(0, 0.14, 0, post);
  seg(0.86, 1, 0, post);
}

/** Lo que va colgado en una pared (ventana, pizarrón, tele…). Se recorta al tramo que se está dibujando. */
export function decor(dc: Decor, accent: string, period: Period) {
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = dc.side === "L" ? dc.x + 0.01 : dc.y + 0.01;
  const start = dc.side === "L" ? dc.y : dc.x;
  const R = (u0: number, u1: number, z0: number, z1: number, fill: string, stroke: string | null = null) => faceRect(fc, plane, start, u0, u1, z0, z1, c(fill), stroke);
  const L = dc.len;
  switch (dc.k) {
    case "window": {
      const sky = SKY[period];
      for (let i = 0; i < L; i++) {
        R(i + 0.12, i + 0.88, 44, 100, "#f3ede3", OUT_SOFT);
        R(i + 0.18, i + 0.82, 50, 94, sky);
        R(i + 0.18, i + 0.82, 70, 72, "#f3ede3");
        R(i + 0.49, i + 0.51, 50, 94, "#f3ede3");
        R(i + 0.24, i + 0.34, 78, 90, lite(sky, period === "noche" ? 0.15 : 0.35));
        if (period === "noche") R(i + 0.62, i + 0.64, 86, 88, "#ffffff");
        R(i + 0.08, i + 0.92, 42, 45, "#d9cfbf", OUT_SOFT);
      }
      break;
    }
    case "ticker":
      R(0.1, L - 0.1, 58, 90, "#3a3640", OUT_SOFT);
      R(0.16, L - 0.16, 62, 86, "#121216");
      break;
    case "logo":
      R(0.2, 0.8, 52, 88, "#efe8dc", OUT_SOFT);
      R(0.26, 0.74, 56, 84, "#16161b");
      R(0.34, 0.66, 74, 78, "#ff4d2e");
      R(0.55, 0.66, 60, 76, "#ff4d2e");
      break;
    case "poster":
      R(0.22, 0.78, kindZ(dc).z0, kindZ(dc).z1, "#1f1e26", OUT_SOFT);
      R(0.27, 0.73, kindZ(dc).z0 + 3, kindZ(dc).z1 - 3, dark(accent, 0.1));
      R(0.33, 0.67, kindZ(dc).z1 - 10, kindZ(dc).z1 - 8, "#f2ede4");
      break;
    case "frame":
      R(0.15, 0.85, 9, 31, "#c9a24a", OUT_SOFT);
      R(0.2, 0.8, 12, 28, "#f2ede4");
      R(0.2, 0.8, 24, 28, accent);
      R(0.26, 0.5, 14, 22, dark(accent, 0.25));
      R(0.56, 0.74, 19, 20, "#9a948a");
      R(0.56, 0.7, 16, 17, "#9a948a");
      break;
    case "plaque":
      R(0.3, 0.7, 16, 26, "#c9a24a", OUT_SOFT);
      R(0.35, 0.65, 18, 24, "#e8c14e");
      R(0.4, 0.6, 21, 22, "#9c7a2f");
      break;
    case "whiteboard":
      R(0.1, L - 0.1, 8, 32, "#8f8b95", OUT_SOFT);
      R(0.14, L - 0.14, 10, 30, "#f4f1ea");
      ["#f2d14b", "#f28fb1", "#7fd6e8", accent, "#9be08a", "#f2d14b"].forEach((col, i) => {
        const u = 0.3 + i * ((L - 0.6) / 6);
        R(u, u + 0.18, 18 + (i % 2) * 5, 24 + (i % 2) * 5, col);
      });
      break;
    case "moodboard":
      R(0.1, L - 0.1, 8, 32, "#8a6a42", OUT_SOFT);
      R(0.14, L - 0.14, 10, 30, "#b8925c");
      [accent, dark(accent, 0.4), lite(accent, 0.5), "#2a2830", "#f2ede4"].forEach((col, i) => {
        const u = 0.25 + i * 0.3;
        if (u + 0.22 < L - 0.15) R(u, u + 0.22, 14, 24, col);
      });
      break;
    case "tv":
      R(0.2, L - 0.2, 6, 33, "#0f0f13", OUT);
      break;
    case "rackets": {
      const { z0, z1 } = kindZ(dc);
      for (const u of [0.16, 0.56]) {
        R(u, u + 0.28, z0 + 9, z1, "#1f2a44", OUT_SOFT);
        R(u + 0.04, u + 0.24, z0 + 12, z1 - 3, accent);
        R(u + 0.11, u + 0.17, z0, z0 + 9, "#2b2b33");
      }
      break;
    }
    case "plan": {
      const { z0, z1 } = kindZ(dc);
      R(0.12, L - 0.12, z0, z1, "#8f8b95", OUT_SOFT);
      R(0.16, L - 0.16, z0 + 2, z1 - 2, "#f4f1ea");
      for (let i = 0; i < 4; i++) {
        R(0.22, 0.3, z0 + 5 + i * 4.5, z0 + 7 + i * 4.5, accent);
        R(0.36, 0.5 + hash(i, 3) * 0.32, z0 + 5.5 + i * 4.5, z0 + 6.5 + i * 4.5, "#3a3a44");
      }
      break;
    }
    case "blueprint": {
      const { z0, z1 } = kindZ(dc);
      R(0.12, L - 0.12, z0, z1, "#e9e4da", OUT_SOFT);
      R(0.16, L - 0.16, z0 + 2, z1 - 2, "#2b5a9e");
      for (const u of [0.32, 0.5, 0.68]) R(u, u + 0.01, z0 + 2, z1 - 2, "#4a78bb");
      R(0.3, 0.46, z0 + 4, z1 - 6, "#dbe8f7");
      R(0.33, 0.43, z0 + 5, z1 - 8, "#2b5a9e");
      R(0.52, 0.72, z0 + 4, z0 + 12, "#dbe8f7");
      R(0.55, 0.69, z0 + 5, z0 + 11, "#2b5a9e");
      break;
    }
    case "mapscreen": {
      const { z0, z1 } = kindZ(dc);
      R(0.1, L - 0.1, z0, z1, "#141418", OUT);
      break;
    }
    case "menuboard": {
      const { z0, z1 } = kindZ(dc);
      R(0.12, L - 0.12, z0, z1, "#6b4a33", OUT_SOFT);
      R(0.16, L - 0.16, z0 + 2, z1 - 2, "#1f3b30");
      R(0.24, 0.76, z1 - 7, z1 - 5, accent);
      for (let i = 0; i < 3; i++) R(0.24, 0.5 + hash(i, 7) * 0.26, z0 + 5 + i * 4, z0 + 6 + i * 4, "#e9e4da");
      break;
    }
  }
}
const kindZ = (dc: Decor) => (dc.side === "L" && dc.x === 0 ? { z0: 50, z1: 90 } : { z0: 8, z1: 32 });

/** Pantallas dibujadas en una pared: el motor les pone contenido por arriba de la oscuridad. */
export function decorScreen(dc: Decor): { quad: XY[]; kind: ScreenKind } | null {
  if (dc.k !== "tv" && dc.k !== "mapscreen") return null;
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = dc.side === "L" ? dc.x + 0.02 : dc.y + 0.02;
  const start = dc.side === "L" ? dc.y : dc.x;
  const [u0, u1, z0, z1] = dc.k === "tv" ? [0.28, dc.len - 0.28, 9, 30] : [0.16, dc.len - 0.16, kindZ(dc).z0 + 2, kindZ(dc).z1 - 2];
  const quad: XY[] = [onFace(fc, plane, start, u0, z1), onFace(fc, plane, start, u1, z1), onFace(fc, plane, start, u1, z0), onFace(fc, plane, start, u0, z0)];
  return { quad, kind: dc.k === "tv" ? "review" : "map" };
}
/** El cartel LED de la recepción, en coordenadas del mundo. */
export function tickerQuad(dc: Decor): XY[] {
  const fc: Facing = dc.side === "L" ? "x" : "y";
  const plane = (dc.side === "L" ? dc.x : dc.y) + 0.01, start = dc.side === "L" ? dc.y : dc.x;
  return [onFace(fc, plane, start, 0.16, 86), onFace(fc, plane, start, dc.len - 0.16, 86), onFace(fc, plane, start, dc.len - 0.16, 62), onFace(fc, plane, start, 0.16, 62)];
}

export const SKY: Record<Period, string> = { manana: "#f3b48d", dia: "#93cbf3", tarde: "#ea8c62", noche: "#1a2346" };

// --- Muebles --------------------------------------------------------------------

/** Pantallas, luces y LEDs que el motor vuelve a pintar arriba de la oscuridad. */
export type ScreenKind = "code" | "design" | "review" | "notes" | "site" | "map";
export type Glow =
  | { t: "screen"; quad: XY[]; kind: ScreenKind; accent: string; room: string | null }
  | { t: "lamp"; at: XY; room: string | null }
  | { t: "led"; at: XY; i: number; room: string | null }
  | { t: "steam"; at: XY; room: string | null };

export type FurniCtx = { accent: string; status: string; covered: boolean; kind: string; glows: Glow[] };

const WOOD = "#b98a5c";
const METAL = "#2d2c35";

function sheet(x: number, y: number, w: number, d: number, h: number) {
  box(x + 0.04, y + 0.04, 0, w - 0.08, d - 0.08, h, "#e9e3d7", { top: "#f3eee5", right: "#cfc8ba" });
  line(P(x + w * 0.3, y + d, h), P(x + w * 0.35, y + d, 2), c("#cfc8ba"));
  line(P(x + w * 0.7, y + d, h), P(x + w * 0.66, y + d, 2), c("#cfc8ba"));
}

function monitor(fx: number, fy: number, face: Facing, kind: ScreenKind, ctx: FurniCtx, room: string | null, z = 27) {
  // fx, fy: centro del monitor sobre el escritorio
  if (face === "x") {
    box(fx - 0.06, fy - 0.36, z, 0.1, 0.72, 22, "#24232b");
    box(fx - 0.12, fy - 0.08, z - 3, 0.16, 0.16, 3, METAL);
    const quad = [P(fx + 0.04, fy - 0.31, z + 19), P(fx + 0.04, fy + 0.31, z + 19), P(fx + 0.04, fy + 0.31, z + 3), P(fx + 0.04, fy - 0.31, z + 3)] as XY[];
    poly(quad, c("#0b0b10"));
    if (!ctx.covered) ctx.glows.push({ t: "screen", quad, kind, accent: ctx.accent, room });
  } else {
    box(fx - 0.36, fy - 0.06, z, 0.72, 0.1, 22, "#24232b");
    box(fx - 0.08, fy - 0.12, z - 3, 0.16, 0.16, 3, METAL);
    const quad = [P(fx - 0.31, fy + 0.04, z + 19), P(fx + 0.31, fy + 0.04, z + 19), P(fx + 0.31, fy + 0.04, z + 3), P(fx - 0.31, fy + 0.04, z + 3)] as XY[];
    poly(quad, c("#0b0b10"));
    if (!ctx.covered) ctx.glows.push({ t: "screen", quad, kind, accent: ctx.accent, room });
  }
}

export function furni(f: Furni, ctx: FurniCtx) {
  const { x, y, w, d, face } = f;
  const acc = ctx.accent;
  switch (f.k) {
    case "desk":
    case "desk2": {
      for (const [lx, ly] of [[x + 0.08, y + 0.08], [x + w - 0.16, y + 0.08], [x + 0.08, y + d - 0.16], [x + w - 0.16, y + d - 0.16]]) box(lx, ly, 0, 0.08, 0.08, 24, "#3a3842");
      box(x + 0.04, y + 0.04, 24, w - 0.08, d - 0.08, 4, WOOD);
      if (ctx.covered) { sheet(x, y, w, d, 34); break; }
      const kinds: Record<string, ScreenKind> = { descubrimiento: "notes", diseno: "design", desarrollo: "code", revision: "review", mantenimiento: "site", pausado: "code", entregado: "site" };
      const screenKind = kinds[ctx.status] ?? "code";
      if (ctx.kind === "office") {
        // El monitor mira al que está sentado: de este lado se ve la espalda.
        box(x + w / 2 - 0.7, y + 0.3, 28, 0.62, 0.1, 20, "#2a2931");
        box(x + w / 2 + 0.35, y + 0.35, 28, 0.32, 0.22, 2, "#f2ede4");
        box(x + w - 0.45, y + 0.55, 28, 0.12, 0.12, 6, "#ece6da");
      } else if (face === "x") {
        monitor(x + 0.3, y + d / 2, "x", f.k === "desk2" ? "code" : screenKind, ctx, f.room);
        box(x + 0.45, y + d / 2 - 0.3, 28, 0.16, 0.6, 1.5, "#3a3a44");
        box(x + 0.35, y + 0.2, 28, 0.12, 0.12, 6, "#ece6da");
      } else {
        if (f.k === "desk2") {
          monitor(x + w / 2 - 0.45, y + 0.3, "y", "code", ctx, f.room);
          monitor(x + w / 2 + 0.45, y + 0.3, "y", "code", ctx, f.room);
        } else monitor(x + w / 2, y + 0.3, "y", screenKind, ctx, f.room);
        box(x + w / 2 - 0.3, y + 0.45, 28, 0.6, 0.16, 1.5, "#3a3a44");
        box(x + w - 0.3, y + 0.35, 28, 0.12, 0.12, 6, "#ece6da");
      }
      break;
    }
    case "chair":
    case "chairBoss": {
      box(x + 0.28, y + 0.28, 0, 0.44, 0.44, 2, "#1c1c22", { line: OUT_SOFT });
      box(x + 0.46, y + 0.46, 2, 0.08, 0.08, 10, "#1c1c22", { line: null });
      if (f.k === "chairBoss") box(x + 0.22, y + 0.16, 14, 0.56, 0.1, 22, "#2f2f3a");
      box(x + 0.22, y + 0.22, 12, 0.56, 0.56, 4, "#3a3a46");
      if (ctx.covered) { sheet(x + 0.1, y + 0.1, 0.8, 0.8, 26); break; }
      if (f.k === "chair") {
        if (face === "x") box(x + 0.72, y + 0.22, 16, 0.1, 0.56, 16, "#2f2f3a");
        else box(x + 0.22, y + 0.72, 16, 0.56, 0.1, 16, "#2f2f3a");
      }
      break;
    }
    case "stool":
      box(x + 0.46, y + 0.46, 0, 0.08, 0.08, 14, "#2a2830", { line: null });
      box(x + 0.32, y + 0.32, 14, 0.36, 0.36, 3, "#3a3a46");
      break;
    case "plant":
      plant(x, y, acc);
      break;
    case "shelf": {
      if (face === "y") {
        box(x + 0.08, y + 0.1, 0, 0.84, 0.38, 58, "#8a5d3c");
        books("y", y + 0.48, x + 0.12, 0.76);
      } else {
        box(x + 0.1, y + 0.08, 0, 0.38, 0.84, 58, "#8a5d3c");
        books("x", x + 0.48, y + 0.12, 0.76);
      }
      break;
    }
    case "rack": {
      box(x + 0.16, y + 0.12, 0, 0.68, 0.46, 60, "#1f1f26");
      for (let i = 0; i < 6; i++) {
        const z = 8 + i * 8;
        faceRect("y", y + 0.585, x + 0.16, 0.06, 0.62, z, z + 5, c("#2d2d36"));
        ctx.glows.push({ t: "led", at: onFace("y", y + 0.59, x + 0.16, 0.54, z + 2.5), i: i + Math.round(x * 7 + y * 3), room: f.room });
      }
      break;
    }
    case "sofa": {
      const col = ctx.kind === "reception" ? "#2f2e37" : "#3f6f69";
      if (ctx.covered) { sheet(x, y, w, d, 30); break; }
      if (face === "y") {
        box(x + 0.05, y + 0.12, 10, w - 0.1, 0.24, 18, col);
        box(x + 0.05, y + 0.12, 0, w - 0.1, d - 0.24, 12, col);
        for (let i = 0; i < w; i++) box(x + i + 0.1, y + 0.36, 12, 0.8, d - 0.5, 4, lite(col, 0.12));
        box(x + 0.05, y + 0.12, 12, 0.14, d - 0.24, 8, dark(col, 0.1));
        box(x + w - 0.19, y + 0.12, 12, 0.14, d - 0.24, 8, dark(col, 0.1));
      } else {
        box(x + 0.12, y + 0.05, 10, 0.24, d - 0.1, 18, col);
        box(x + 0.12, y + 0.05, 0, w - 0.24, d - 0.1, 12, col);
        for (let i = 0; i < d; i++) box(x + 0.36, y + i + 0.1, 12, w - 0.5, 0.8, 4, lite(col, 0.12));
        box(x + 0.12, y + 0.05, 12, w - 0.24, 0.14, 8, dark(col, 0.1));
        box(x + 0.12, y + d - 0.19, 12, w - 0.24, 0.14, 8, dark(col, 0.1));
      }
      break;
    }
    case "lamp": {
      // Lámpara de pie: base, caño y pantalla que se abre hacia abajo
      box(x + 0.36, y + 0.36, 0, 0.28, 0.28, 3, "#2a2830");
      box(x + 0.46, y + 0.46, 3, 0.08, 0.08, 38, "#3a3842");
      const [cx, cy] = P(x + 0.5, y + 0.5, 41);
      poly([[cx - 6, cy - 9], [cx + 6, cy - 9], [cx + 10, cy + 2], [cx - 10, cy + 2]], c("#f3dcae"), OUT);
      ellipse(cx, cy + 2, 10, 3, c("#d9bf8c"), OUT_SOFT);
      ctx.glows.push({ t: "lamp", at: [cx, cy + 3], room: f.room });
      break;
    }
    case "table":
      box(x + w / 2 - 0.05, y + d / 2 - 0.05, 0, 0.1, 0.1, 22, "#2a2830", { line: null });
      box(x + 0.12, y + 0.12, 22, w - 0.24, d - 0.24, 3, "#ddd2bf");
      if (ctx.status === "descubrimiento") {
        box(x + 0.25, y + 0.25, 25, 0.18, 0.18, 1, "#f2d14b", { line: null });
        box(x + 0.5, y + 0.4, 25, 0.18, 0.18, 1, "#f28fb1", { line: null });
      } else {
        box(x + 0.3, y + 0.3, 25, 0.12, 0.12, 6, "#ece6da");
      }
      break;
    case "drafting":
      box(x + 0.15, y + 0.2, 0, 0.08, 0.08, 22, "#2a2830", { line: null });
      box(x + 0.77, y + 0.2, 0, 0.08, 0.08, 22, "#2a2830", { line: null });
      box(x + 0.1, y + 0.15, 22, 0.8, 0.6, 3, "#e8dfcc");
      box(x + 0.2, y + 0.25, 25, 0.5, 0.35, 0.5, "#ffffff", { line: null });
      box(x + 0.3, y + 0.35, 25.5, 0.3, 0.06, 0.5, acc, { line: null });
      break;
    case "counter": {
      box(x, y + 0.15, 0, w, 0.7, 30, "#24232b", { top: "#e9e2d6" });
      faceRect("y", y + 0.85, x, 0.2, w - 0.2, 6, 8, c("#ff4d2e"));
      box(x + w / 2 - 0.4, y + 0.3, 30, 0.6, 0.08, 16, "#2a2931");
      box(x + w - 0.5, y + 0.4, 30, 0.14, 0.14, 4, "#e8c14e");
      break;
    }
    case "cooler":
      box(x + 0.3, y + 0.3, 0, 0.4, 0.4, 32, "#e9e4da");
      box(x + 0.34, y + 0.34, 32, 0.32, 0.32, 16, "#8cc3ef", { top: "#b6dcff", right: "#6fa9d6" });
      faceRect("y", y + 0.705, x + 0.3, 0.16, 0.24, 20, 23, c("#c9473a"));
      break;
    case "bench":
      box(x + 0.1, y + 0.32, 0, 0.06, 0.06, 12, "#2a2830", { line: null });
      box(x + w - 0.16, y + 0.32, 0, 0.06, 0.06, 12, "#2a2830", { line: null });
      box(x + 0.05, y + 0.25, 12, w - 0.1, 0.5, 4, "#8a5d3c");
      break;
    case "pedestal":
      box(x + 0.25, y + 0.25, 0, 0.5, 0.5, 30, "#e2dbcf");
      monitor(x + 0.5, y + 0.45, "y", "site", ctx, f.room, 30);
      break;
    case "vitrine":
      box(x + 0.15, y + 0.15, 0, 0.7, 0.55, 8, "#2a2830");
      box(x + 0.38, y + 0.35, 8, 0.24, 0.2, 6, "#c9a24a");
      box(x + 0.44, y + 0.4, 14, 0.12, 0.1, 10, "#e8c14e");
      box(x + 0.35, y + 0.33, 24, 0.3, 0.24, 7, "#f2cf5c", { top: "#ffe08a" });
      box(x + 0.15, y + 0.15, 8, 0.7, 0.55, 44, "#9fd0ee", { line: OUT_SOFT, top: "rgba(200,230,247,0.35)", left: "rgba(160,210,240,0.18)", right: "rgba(120,180,220,0.22)" });
      break;
    case "kitchen":
      box(x, y + 0.1, 0, w, 0.6, 28, "#ddd6ca", { top: "#9a948a" });
      for (let i = 1; i < w; i++) faceRect("y", y + 0.7, x, i - 0.01, i + 0.01, 4, 26, c("#b9b2a6"));
      box(x + 1.15, y + 0.15, 28, 0.4, 0.34, 18, "#2c2b33");
      ctx.glows.push({ t: "led", at: onFace("y", y + 0.49, x + 1.15, 0.3, 40), i: -1, room: f.room });
      ctx.glows.push({ t: "steam", at: P(x + 1.35, y + 0.32, 47), room: f.room });
      break;
    case "fridge":
      box(x + 0.15, y + 0.15, 0, 0.7, 0.6, 62, "#e9e4da", { top: "#f5f1ea" });
      faceRect("y", y + 0.755, x + 0.15, 0.55, 0.6, 30, 44, c("#9a948a"));
      faceRect("y", y + 0.755, x + 0.15, 0.1, 0.2, 48, 52, c("#ff4d2e"));
      break;
    // --- Piezas del centro, según el tema del proyecto ---
    case "balls": {
      // Canasto de pelotas de pádel y dos paletas apoyadas
      box(x + 0.28, y + 0.3, 0, 0.44, 0.4, 14, "#c9c4bb", { top: "#3a3a40" });
      const [bx, by] = P(x + 0.5, y + 0.5, 14);
      for (const [dx, dy] of [[-5, -1], [0, -3], [5, -1], [-2, 1], [3, 1]]) ellipse(bx + dx, by + dy, 2.8, 2.6, c("#d4ec3e"), OUT_SOFT);
      for (const [px, flip] of [[x + 0.12, 1], [x + 0.88, -1]] as [number, number][]) {
        const [hx, hy] = P(px, y + 0.8, 0);
        line([hx, hy], [hx + 4 * flip, hy - 13], c("#2b2b33"), 2);
        ellipse(hx + 6 * flip, hy - 20, 6, 8, c(acc), OUT);
        ellipse(hx + 6 * flip, hy - 20, 3.4, 5.2, c("#1f1f26"));
      }
      break;
    }
    case "matetable": {
      // La pava con vapor y un mate con bombilla
      box(x + 0.45, y + 0.45, 0, 0.1, 0.1, 22, "#2a2830", { line: null });
      box(x + 0.15, y + 0.15, 22, 0.7, 0.7, 3, "#c79a63");
      box(x + 0.2, y + 0.3, 25, 0.26, 0.26, 10, "#cfd3d8", { top: "#e6e9ec" });
      box(x + 0.3, y + 0.4, 35, 0.06, 0.06, 3, "#2a2830", { line: null });
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
      box(x + 0.1, y + 0.3, 0, w - 0.2, 0.3, 3, "#2a2830");
      for (const px of [x + 0.15, x + w - 0.3]) box(px, y + 0.38, 3, 0.14, 0.14, 56, "#3a3a44");
      box(x - 0.05, y + 0.43, 44, w + 0.1, 0.04, 2, "#c9ccd2", { line: null });
      for (const px of [x + 0.02, x + w - 0.02]) {
        const [dx, dy] = P(px, y + 0.45, 45);
        ellipse(dx, dy, 3.5, 9, c(acc), OUT);
        ellipse(dx, dy, 1.4, 3, c("#1c1c22"));
      }
      const [fx, fy] = P(x + w - 0.45, y + 0.85, 0);
      for (let i = 0; i < 3; i++) ellipse(fx, fy - i * 3, 7, 3.4, c(i % 2 ? "#2a2830" : "#3a3a44"), OUT_SOFT);
      break;
    }
    case "yogaprops": {
      // Pesa rusa y rodillo de espuma
      const [kx, ky] = P(x + 0.35, y + 0.4, 0);
      ellipse(kx, ky - 6, 6, 6, c("#26252d"), OUT);
      g.beginPath();
      g.arc(kx, ky - 12, 3.6, Math.PI, 0);
      g.strokeStyle = c("#26252d");
      g.lineWidth = 2.2;
      g.stroke();
      g.lineCap = "round";
      line(P(x + 0.72, y + 0.2, 5), P(x + 0.72, y + 0.85, 5), c(acc), 9);
      line(P(x + 0.72, y + 0.2, 5), P(x + 0.72, y + 0.85, 5), c(lite(acc, 0.25)), 3);
      g.lineCap = "butt";
      break;
    }
    case "maquette": {
      // Maqueta de un edificio sobre un pedestal
      box(x + 0.1, y + 0.1, 0, 0.8, 0.8, 22, "#e2dbcf");
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
      box(x + 0.35, y + 0.35, 0, 0.3, 0.3, 4, "#2a2830");
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
      box(x + 0.1, y + 0.2, 0, 0.8, 0.6, 24, "#f2efe8", { right: "#d9d4ca" });
      for (let i = 0; i < 3; i++) {
        const px = x + 0.2 + i * 0.22;
        box(px, y + 0.45, 24, 0.13, 0.04, 17, "#1c1c22");
        const quad: XY[] = [P(px + 0.015, y + 0.495, 39), P(px + 0.115, y + 0.495, 39), P(px + 0.115, y + 0.495, 26), P(px + 0.015, y + 0.495, 26)];
        poly(quad, c("#0b0b10"));
        ctx.glows.push({ t: "screen", quad, kind: "site", accent: acc, room: f.room });
      }
      break;
    }
    case "cafetable": {
      // Mesa con un café y el QR de la carta
      box(x + 0.45, y + 0.45, 0, 0.1, 0.1, 22, "#2a2830", { line: null });
      box(x + 0.12, y + 0.12, 22, 0.76, 0.76, 3, "#d8cdb9");
      box(x + 0.25, y + 0.5, 25, 0.16, 0.16, 6, "#f4f1ea");
      box(x + 0.55, y + 0.25, 25, 0.24, 0.05, 13, "#f4f1ea");
      for (const [u0, z0] of [[0.03, 28], [0.14, 33], [0.07, 31.5], [0.16, 28.5], [0.04, 34]]) faceRect("y", y + 0.305, x + 0.55, u0, u0 + 0.05, z0, z0 + 2.5, c("#16161b"));
      break;
    }
    case "boxes":
      for (let i = 0; i < w; i++) {
        box(x + i + 0.1, y + 0.15, 0, 0.8, 0.7, 20, "#b08a5a");
        box(x + i + 0.2, y + 0.25, 20, 0.6, 0.5, 16, "#c49c68");
      }
      break;
  }
}

function books(face: Facing, plane: number, start: number, len: number) {
  const colors = ["#c9473a", "#4a8fd6", "#e9c46a", "#56a088", "#e6e0d4", "#ff4d2e", "#7a5bb5"];
  for (const [z0, z1] of [[6, 20], [24, 38], [42, 54]]) {
    let u = 0.04, i = Math.floor(hash(Math.round(plane * 10), z0) * 7);
    while (u < len - 0.08) {
      const bw = 0.07 + hash(Math.round(u * 100), z0) * 0.06;
      faceRect(face, plane, start, u, Math.min(len - 0.04, u + bw), z0, z1 - hash(i, z0) * 4, c(colors[i++ % colors.length]));
      u += bw + 0.015;
    }
  }
}

function plant(x: number, y: number, accent: string) {
  const st = plantStage(F);
  box(x + 0.32, y + 0.32, 0, 0.36, 0.36, 14, "#b5653f", { top: "#3b2a20" });
  const [cx, cy] = P(x + 0.5, y + 0.5, 14);
  if (st === 0) {
    for (const [dx, dy, r, col] of [[-7, -6, 7, "#2f7a43"], [6, -7, 7, "#2f7a43"], [0, -14, 8, "#3f8f4f"], [-4, -20, 6, "#4a9d55"], [5, -19, 6, "#5bb36a"]] as [number, number, number, string][])
      ellipse(cx + dx, cy + dy, r, r * 0.9, c(col), OUT_SOFT);
    ellipse(cx + 3, cy - 22, 2.2, 2.2, c(lite(accent, 0.25)));
  } else if (st === 1) {
    for (const [dx, dy, r, col] of [[-8, -3, 6, "#6b7a3a"], [8, -3, 6, "#6b7a3a"], [0, -10, 7, "#7f8c45"], [-3, -15, 5, "#8a964f"]] as [number, number, number, string][])
      ellipse(cx + dx, cy + dy, r, r * 0.8, c(col), OUT_SOFT);
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
        g.fillStyle = "rgba(160,152,140,0.55)";
        g.fillRect(p[0], p[1], 1.5, 1);
      }
  if (f > 0.72) {
    const [cx, cy] = P(r.x + 0.02, r.y + 0.02, r.column === "left" || r.x === 0 ? 100 : WALL - 2);
    g.strokeStyle = "rgba(220,214,204,0.55)";
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

// --- Muñecos ------------------------------------------------------------------------

export type Dir = "SE" | "SW" | "NE" | "NW";
type Look = { hair: string; hair2: string; skin: string; skin2: string; main: string; shade: string; collar: string; tie: string | null; pants: string; shoes: string };
export const LOOKS: Record<Who, Look> = {
  // Federico: pelo castaño con flequillo de costado, camisa blanca y corbata negra.
  federico: { hair: "#3d2718", hair2: "#6b4630", skin: "#e8bb93", skin2: "#cf9a73", main: "#f1efea", shade: "#cfcbc2", collar: "#ffffff", tie: "#17171c", pants: "#25252d", shoes: "#121216" },
  // Franco: pelo negro texturado con flequillo recto, sweater beige y cuello blanco.
  franco: { hair: "#151517", hair2: "#34343d", skin: "#d6a07a", skin2: "#b9815c", main: "#cdbd83", shade: "#ae9f66", collar: "#f7f4ec", tie: null, pants: "#2d3039", shoes: "#121216" },
};
const LINE = "rgba(32,20,26,0.92)";

/** Dibuja a `who` parado en (sx, sy) (los pies). `phase` 0–1 es el paso; null = quieto. */
export function avatar(who: Who, sx: number, sy: number, dir: Dir, phase: number | null, sitting = false, blink = false) {
  const L = LOOKS[who];
  const mirror = dir === "SW" || dir === "NW";
  const back = dir === "NE" || dir === "NW";
  const s = phase === null ? 0 : Math.sin(phase * Math.PI * 2);
  const bob = phase === null ? 0 : -Math.abs(s) * 1.2;
  g.save();
  g.translate(Math.round(sx), Math.round(sy));
  if (mirror) g.scale(-1, 1);
  if (!sitting) ellipse(0, 0, 13, 5.5, "rgba(0,0,0,0.26)");
  const by = (sitting ? 11 : 0) + bob;
  if (!sitting) {
    rrect(-7 - s * 2, -19, 6, 17, 2, L.pants, LINE);
    rrect(-8 - s * 2, -4 + (s > 0 ? -1 : 0), 8, 4, 2, L.shoes, LINE);
    rrect(1 + s * 2, -19, 6, 17, 2, L.pants, LINE);
    rrect(1 + s * 2, -4 + (s < 0 ? -1 : 0), 8, 4, 2, L.shoes, LINE);
  }
  // brazo de atrás, torso, brazo de adelante
  rrect(-13, -34 + by + s * 1.5, 5, 15, 2.5, L.shade, LINE);
  ellipse(-10.5, -18.5 + by + s * 1.5, 2.6, 2.6, L.skin2, LINE);
  rrect(-9, -36 + by, 18, 19, 5, L.main, LINE);
  if (!back) {
    if (L.tie) {
      poly([[-3, -36 + by], [1, -36 + by], [-1, -32 + by]], L.collar, LINE, 0.8);
      poly([[2, -36 + by], [6, -36 + by], [4, -32 + by]], L.collar, LINE, 0.8);
      poly([[0.6, -34.5 + by], [3, -34.5 + by], [3.4, -23 + by], [1.8, -20 + by], [0.2, -23 + by]], L.tie);
    } else {
      poly([[-4, -36.5 + by], [1, -36.5 + by], [-1.5, -32 + by]], L.collar, LINE, 0.8);
      poly([[2, -36.5 + by], [7, -36.5 + by], [4.5, -32 + by]], L.collar, LINE, 0.8);
      g.fillStyle = L.shade;
      g.fillRect(-8.5, -20 + by, 17, 2.5);
    }
  } else if (!L.tie) {
    g.fillStyle = L.collar;
    g.fillRect(-5, -36 + by, 11, 2);
  }
  rrect(8, -34 + by - s * 1.5, 5, 15, 2.5, L.main, LINE);
  ellipse(10.5, -18.5 + by - s * 1.5, 2.6, 2.6, L.skin, LINE);
  // cabeza
  g.fillStyle = L.skin2;
  g.fillRect(-2.5, -39 + by, 6, 4);
  rrect(-10.5, -60 + by, 22, 22, 8, L.skin, LINE);
  if (!back) {
    ellipse(-10, -48 + by, 2.4, 3.4, L.skin2, LINE);
    if (blink) {
      g.fillStyle = "#2a1d1a";
      g.fillRect(1, -49 + by, 3, 1);
      g.fillRect(6.5, -49 + by, 3, 1);
    } else {
      rrect(1.5, -51 + by, 2.4, 3.6, 1, "#2a1d1a");
      rrect(7, -51 + by, 2.4, 3.6, 1, "#2a1d1a");
      g.fillStyle = "#ffffff";
      g.fillRect(2.3, -50.6 + by, 0.9, 0.9);
      g.fillRect(7.8, -50.6 + by, 0.9, 0.9);
    }
    g.fillStyle = L.skin2;
    g.fillRect(9.5, -47 + by, 1.5, 2);
    g.beginPath();
    g.arc(5, -45 + by, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokeStyle = "#9a5442";
    g.lineWidth = 1;
    g.stroke();
  } else {
    ellipse(10.5, -48 + by, 2.4, 3.4, L.skin2, LINE);
  }
  hair(who, back, by);
  g.restore();
}

function hair(who: Who, back: boolean, by: number) {
  const L = LOOKS[who];
  if (who === "federico") {
    if (back) {
      rrect(-11, -62 + by, 23, 18, 8, L.hair, LINE);
      poly([[-6, -60 + by], [4, -61 + by], [0, -56 + by]], L.hair2);
      return;
    }
    g.beginPath();
    g.moveTo(-11.5, -45 + by);
    g.lineTo(-11.5, -55 + by);
    g.quadraticCurveTo(-11.5, -63 + by, -3, -63 + by);
    g.lineTo(5, -63 + by);
    g.quadraticCurveTo(12.5, -63 + by, 12.5, -55 + by);
    g.lineTo(12, -52 + by);
    g.lineTo(7, -52.5 + by);
    g.lineTo(2, -54 + by);
    g.lineTo(-3, -52 + by);
    g.lineTo(-7, -50 + by);
    g.lineTo(-8.5, -45 + by);
    g.closePath();
    g.fillStyle = L.hair;
    g.fill();
    g.strokeStyle = LINE;
    g.lineWidth = 1;
    g.stroke();
    poly([[-5, -61 + by], [5, -61.5 + by], [9, -58 + by], [2, -58 + by]], L.hair2);
    return;
  }
  // Franco
  if (back) {
    rrect(-11.5, -62 + by, 24, 15, 7, L.hair, LINE);
    g.fillStyle = L.hair2;
    g.fillRect(-10, -48 + by, 21, 3);
  } else {
    rrect(-11.5, -62 + by, 24, 12, 6, L.hair, LINE);
    g.fillStyle = L.hair;
    g.fillRect(-10, -53 + by, 22, 4.5);
    g.strokeStyle = LINE;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-10, -48.5 + by);
    g.lineTo(12, -48.5 + by);
    g.stroke();
    g.fillStyle = L.hair2;
    g.fillRect(-11.5, -52 + by, 2.5, 5);
  }
  for (const [dx, dy] of [[-8, -61], [-3, -62.5], [2, -62.5], [7, -61]]) ellipse(dx, dy + by, 3.2, 2.6, L.hair, null);
  for (const [dx, dy] of [[-5, -60], [1, -61], [6, -59]]) {
    g.fillStyle = L.hair2;
    g.fillRect(dx, dy + by, 1.5, 1);
  }
}

// --- Carteles (en pantalla, no en el mundo) ---------------------------------------

export type SignSpec = { name: string; sub?: string; badge?: number; fade: number; accent: string; gold?: boolean; warm?: boolean };
/** Dibuja un cartel con la base centrada en (x, y) en px de pantalla. Devuelve su caja para tocarlo. */
export function sign(ctx: CanvasRenderingContext2D, font: string, sx: number, sy: number, s: SignSpec) {
  ctx.font = `8px ${font}`;
  const nameW = Math.ceil(ctx.measureText(s.name).width);
  const subW = s.sub ? Math.ceil(ctx.measureText(s.sub).width) : 0;
  const w = Math.max(nameW, subW) + 14, h = s.sub ? 27 : 17;
  const x = Math.round(sx - w / 2), y = Math.round(sy - h);
  ctx.globalAlpha = 1 - s.fade * 0.35;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x + 2, y + 2, w, h);
  ctx.fillStyle = "#17161d";
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 3);
  ctx.fill();
  ctx.fillStyle = s.gold ? "#c9a24a" : fadeHex(s.accent, s.fade * 0.6);
  ctx.fillRect(x, y, w, 2);
  ctx.textBaseline = "top";
  ctx.fillStyle = "#f1ede6";
  ctx.fillText(s.name, x + 7, y + 5);
  if (s.sub) {
    ctx.fillStyle = s.warm ? "#ffb199" : "#a39e95";
    ctx.fillText(s.sub, x + 7, y + 15);
  }
  ctx.globalAlpha = 1;
  if (s.badge) {
    const t = String(s.badge), bw = Math.ceil(ctx.measureText(t).width) + 9;
    const bx = x + w - bw + 4, byy = y - 6;
    ctx.fillStyle = "#ff4d2e";
    ctx.beginPath();
    ctx.roundRect(bx, byy, bw, 13, 6);
    ctx.fill();
    ctx.fillStyle = "#16161b";
    ctx.fillText(t, bx + 5, byy + 3);
  }
  return { x, y: y - 6, w, h: h + 6 };
}
