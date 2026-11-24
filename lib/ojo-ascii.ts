// El ojo que se abre al espacio: arte ASCII calculado con fórmulas, sin
// imágenes ni video. Es el port de eye_space.py (NumPy + pygame) a TypeScript:
// mismas fórmulas, tiempos, colores y rampa. Lo único agregado es el logo de
// se7en, que llega desde el fondo del espacio y queda como imagen final.
//
// Acá no hay DOM: `frame(t)` llena, para cada celda de la grilla, el índice del
// carácter y su color. Dibujarlo es cosa de components/consola/ojo-ascii.tsx.

/** Caracteres ordenados de menos a más «tinta». */
export const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
/** Segundos que dura una vuelta. */
export const DURATION = 16;
/** El cuadro fijo para quien pide menos movimiento: el logo ya llegó y el fundido no empezó. */
export const STILL_T = 14.6;

const N = RAMP.length;
const N_STARS = 150;
/** El logo viaja del fondo a su lugar entre estos dos instantes. */
const LOGO_FROM = 10.5;
const LOGO_TO = 13.5;
/** Dónde queda el logo: centrado, debajo del planeta (v va de -1 arriba a 1 abajo). */
const LOGO_CY = 0.72;
const LOGO_MAX_W = 1.7;
/** Brillo de una celda cubierta entera por el logo. */
const LOGO_LUM = 0.96;
/** El planeta está centrado acá; también es el punto de fuga del que sale el logo. */
const PLANET_CY = 0.03;

const CH = { dot: RAMP.indexOf("."), plus: RAMP.indexOf("+"), dash: RAMP.indexOf("-"), bar: RAMP.indexOf("|"), star: RAMP.indexOf("*") };

// ---------------------------------------------------------------------------
// Utilidades matemáticas
// ---------------------------------------------------------------------------

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Smoothstep: 0 antes de a, 1 después de b. */
function smooth(a: number, b: number, x: number) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}

// El original mezcla precisiones sin querer: la piel y la nebulosa se calculan
// en float32, y el iris y las bandas del planeta en float64. El hash amplifica
// el redondeo (multiplica por 43758), así que para que salga la misma textura
// hay que imitar cada una: `hash32` redondea con fround, `hash64` no.
const f32 = Math.fround;
const K1 = f32(127.1);
const K2 = f32(311.7);
const K3 = f32(43758.5453);

function hash32(ix: number, iy: number) {
  const h = f32(f32(Math.sin(f32(f32(ix * K1) + f32(iy * K2)))) * K3);
  return h - Math.floor(h);
}

function hash64(ix: number, iy: number) {
  const h = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Value noise 2D en [0, 1], sobre el hash que se le pase. */
function valueNoise(hash: (ix: number, iy: number) => number, x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  let fx = x - ix;
  let fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy);
  const b = hash(ix + 1, iy);
  const c = hash(ix, iy + 1);
  const d = hash(ix + 1, iy + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

const noise32 = (x: number, y: number) => valueNoise(hash32, f32(x), f32(y));
const noise64 = (x: number, y: number) => valueNoise(hash64, x, y);

/** Generador con semilla (mulberry32): las estrellas caen siempre en el mismo lugar. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let x = Math.imul(s ^ (s >>> 15), s | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Temblor de los caracteres: un entero de -2 a 2 por celda, que cambia con `tick`. */
function jitter(i: number, tick: number) {
  let x = (Math.imul(i + 1, 374761393) + Math.imul(tick + 1, 668265263)) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return ((x >>> 0) % 5) - 2;
}

// ---------------------------------------------------------------------------
// Escena
// ---------------------------------------------------------------------------

/** Los píxeles del logo (RGBA sin premultiplicar), como los da `getImageData`. */
export type LogoPixels = { width: number; height: number; data: Uint8ClampedArray };

export class OjoScene {
  readonly cols: number;
  readonly rows: number;
  /** Índice en RAMP de cada celda. */
  readonly idx: Uint8Array;
  /** Color de cada celda: tres bytes (r, g, b). */
  readonly rgb: Uint8ClampedArray;

  private readonly cellW: number;
  private readonly cellH: number;
  private readonly w: number;
  private readonly h: number;
  private readonly u: Float32Array;
  private readonly v: Float32Array;
  private readonly pupil: Float32Array;
  private readonly planet: Uint8Array;
  private readonly starX: Float64Array;
  private readonly starY: Float64Array;
  private readonly starZ: Float64Array;
  private readonly starPhase: Float64Array;

  private logo: LogoPixels | null = null;
  /** Cobertura del logo por celda (0 a 1) y su color, para el cuadro en curso. */
  private readonly logoA: Float32Array;
  private readonly logoRgb: Float32Array;
  /** Avance para el que está calculada la máscara (se recalcula sólo mientras el logo viaja). */
  private logoK = -1;

  /** `cellW` y `cellH` sólo importan por su proporción: fijan la forma de la grilla. */
  constructor(cols: number, rows: number, cellW: number, cellH: number) {
    this.cols = cols;
    this.rows = rows;
    this.cellW = cellW;
    this.cellH = cellH;
    this.w = cols * cellW;
    this.h = rows * cellH;
    const n = cols * rows;
    this.idx = new Uint8Array(n);
    this.rgb = new Uint8ClampedArray(n * 3);
    this.pupil = new Float32Array(n);
    this.planet = new Uint8Array(n);
    this.logoA = new Float32Array(n);
    this.logoRgb = new Float32Array(n * 3);

    // Centro de cada celda: v en [-1, 1], u corregido por la proporción.
    this.u = new Float32Array(n);
    this.v = new Float32Array(n);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        this.u[r * cols + c] = ((c + 0.5) * cellW - this.w / 2) / (this.h / 2);
        this.v[r * cols + c] = ((r + 0.5) * cellH - this.h / 2) / (this.h / 2);
      }
    }

    const rnd = seeded(7);
    const fill = (lo: number, hi: number) => Float64Array.from({ length: N_STARS }, () => lo + (hi - lo) * rnd());
    this.starX = fill(-1.6, 1.6);
    this.starY = fill(-1.2, 1.2);
    this.starZ = fill(0, 1);
    this.starPhase = fill(0, 2 * Math.PI);
  }

  setLogo(logo: LogoPixels | null) {
    this.logo = logo;
    this.logoK = -1;
  }

  // -- logo ---------------------------------------------------------------

  /**
   * El logo como máscara sobre la grilla: cada celda promedia los píxeles del
   * logo que le caen encima. `k` (0 a 1) es cuánto se acercó: nace chico en el
   * punto de fuga, detrás del planeta, y crece hasta su lugar.
   */
  private rasterLogo(k: number) {
    if (k === this.logoK) return;
    this.logoK = k;
    const { logo, logoA, logoRgb, cols, rows } = this;
    logoA.fill(0);
    if (!logo || k <= 0) return;
    logoRgb.fill(0);

    const scale = 0.3 + 0.7 * k;
    const wUv = Math.min(LOGO_MAX_W, (2 * this.w * 0.9) / this.h) * scale;
    const hUv = (wUv * logo.height) / logo.width;
    const cy = PLANET_CY + (LOGO_CY - PLANET_CY) * scale;
    // De coordenadas de escena a celdas.
    const half = this.h / 2;
    const wc = (wUv * half) / this.cellW;
    const hc = (hUv * half) / this.cellH;
    const x0 = (this.w / 2 - (wUv / 2) * half) / this.cellW;
    const y0 = ((cy - hUv / 2) * half + half) / this.cellH;
    /** Píxeles del logo que entran en una celda entera. */
    const area = (logo.width / wc) * (logo.height / hc);

    const colOf = new Int32Array(logo.width);
    for (let sx = 0; sx < logo.width; sx++) {
      const c = Math.floor(x0 + ((sx + 0.5) / logo.width) * wc);
      colOf[sx] = c >= 0 && c < cols ? c : -1;
    }
    const d = logo.data;
    for (let sy = 0; sy < logo.height; sy++) {
      const r = Math.floor(y0 + ((sy + 0.5) / logo.height) * hc);
      if (r < 0 || r >= rows) continue;
      let p = sy * logo.width * 4;
      for (let sx = 0; sx < logo.width; sx++, p += 4) {
        const a = d[p + 3];
        const c = colOf[sx];
        if (!a || c < 0) continue;
        const i = r * cols + c;
        logoA[i] += a;
        logoRgb[i * 3] += d[p] * a;
        logoRgb[i * 3 + 1] += d[p + 1] * a;
        logoRgb[i * 3 + 2] += d[p + 2] * a;
      }
    }
    for (let i = 0; i < logoA.length; i++) {
      const sum = logoA[i];
      if (!sum) continue;
      logoRgb[i * 3] /= sum * 255;
      logoRgb[i * 3 + 1] /= sum * 255;
      logoRgb[i * 3 + 2] /= sum * 255;
      // Un poco de contraste en el borde, para que las letras no queden lavadas.
      logoA[i] = smooth(0.08, 0.8, sum / (255 * area)) * k;
    }
  }

  // -- cuadro completo ----------------------------------------------------

  /** Calcula el instante `t` (segundos, de 0 a DURATION) sobre `idx` y `rgb`. */
  frame(t: number) {
    const { u: U, v: V, idx, rgb, pupil: P, planet: PL, logoA, logoRgb } = this;

    const blink = 1 - 0.92 * Math.exp(-(((t - 4.3) / 0.13) ** 2));
    const openness = smooth(0.4, 3.2, t) * blink;
    const zoom = 14 ** smooth(5, 9.5, t);
    const rp = 0.15 + 0.07 * smooth(4.8, 7, t);
    const still = 1 - smooth(4.4, 5.4, t);
    const gazeX = 0.07 * Math.sin(t * 1.1) * still;
    const gazeY = 0.02 * Math.sin(t * 1.7) * still;
    const amount = smooth(5.5, 8.5, t);
    const fade = smooth(0, 0.8, t) * (1 - smooth(DURATION - 0.9, DURATION, t));
    // Mientras el ojo todavía entra en pantalla.
    const hasEye = zoom * (rp - 0.02) < 1.9;
    const grow = smooth(9, 14.5, t);
    const radius = 0.44 * grow;
    const hasPlanet = radius > 0.01;
    const glintFade = 1 - smooth(1, 2.5, zoom);
    const tick = Math.floor(t * 12);

    const logoK = smooth(LOGO_FROM, LOGO_TO, t);
    this.rasterLogo(logoK);
    const hasLogo = logoK > 0 && this.logo !== null;

    const HALF_W = 1.15;
    const EDGE = 0.03;
    const RI = 0.36;

    for (let i = 0; i < idx.length; i++) {
      const u = U[i];
      const v = V[i];
      let lum = 0;
      let cr = 0;
      let cg = 0;
      let cb = 0;
      let pupil = 1;

      // ---- Ojo: piel, párpados, esclerótica e iris ----
      if (hasEye) {
        const x = u / zoom;
        const y = v / zoom;
        const base = clamp01(1 - (x / HALF_W) ** 2);
        const tilt = 0.05 * x;
        const dUp = y - (-0.52 * openness * base + tilt);
        const dLo = 0.34 * openness * base + tilt - y;
        const eyeMask = base > 0 ? smooth(0, EDGE, dUp) * smooth(0, EDGE, dLo) : 0;

        let skinLum = 0;
        let sr = 0;
        let sg = 0;
        let sb = 0;
        if (eyeMask < 1) {
          const tex = noise32(x * 6, y * 6);
          const fine = noise32(x * 26, y * 26);
          const creaseY = -0.52 * base + tilt - 0.15;
          const crease = Math.exp(-(((y - creaseY) / 0.035) ** 2)) * (0.4 + 0.6 * openness);
          const lashes = dUp < EDGE && Math.sin(x * 75 + dUp * 40) > 0.1 ? smooth(-0.11, 0, dUp) : 0;
          const lidLine = Math.exp(-((Math.min(dUp, dLo) / 0.03) ** 2));
          skinLum = 0.5 + 0.28 * tex + 0.14 * fine - 0.3 * crease - 0.45 * lashes - 0.35 * lidLine;
          skinLum *= 0.72 * (1 - (0.22 * (u * u + v * v)) / 2);
          const k = 0.9 + 0.2 * tex;
          sr = 0.62 * k;
          sg = 0.4 * k;
          sb = 0.29 * k;
        }

        let ballLum = 0;
        let br = 0;
        let bg = 0;
        let bb = 0;
        pupil = 0;
        if (eyeMask > 0) {
          // Esclerótica
          const side = clamp01(Math.abs(x) / HALF_W);
          const lidShadow = 0.4 * Math.exp(-Math.max(dUp, 0) / 0.08);
          ballLum = 0.88 - 0.45 * side * side - lidShadow;
          const s3 = side * side * side;
          br = 0.93 + (0.85 - 0.93) * s3;
          bg = 0.89 + (0.45 - 0.89) * s3;
          bb = 0.86 + (0.4 - 0.86) * s3;

          // Iris
          const ix = x - gazeX;
          const iy = y - gazeY;
          const r = Math.hypot(ix, iy);
          const irisMask = 1 - smooth(RI - 0.015, RI + 0.015, r);
          if (irisMask > 0) {
            const th = Math.atan2(iy, ix);
            const cs = Math.cos(th);
            const sn = Math.sin(th);
            const swirl = noise64(cs * 3 + r * 5, sn * 3 + t * 0.15);
            const fibers = 0.5 * noise64(cs * 9 + 20, sn * 9 + r * 8) + 0.5 * (0.5 + 0.5 * Math.sin(th * 38 + 5 * swirl));
            const collarette = Math.exp(-(((r - rp * 1.55) / 0.045) ** 2));
            const limbus = smooth(0.78 * RI, RI, r);
            const irisLum = (0.32 + 0.62 * fibers + 0.3 * collarette) * (1 - 0.75 * limbus);
            const ck = collarette * 0.8;
            let ir = 0.36 + (0.92 - 0.36) * fibers;
            let ig = 0.18 + (0.52 - 0.18) * fibers;
            let ib = 0.07 + (0.14 - 0.07) * fibers;
            ir += (1 - ir) * ck;
            ig += (0.78 - ig) * ck;
            ib += (0.32 - ib) * ck;
            ballLum += (irisLum - ballLum) * irisMask;
            br += (ir - br) * irisMask;
            bg += (ig - bg) * irisMask;
            bb += (ib - bb) * irisMask;
          }

          // Reflejo de luz en la córnea; desaparece al acercarse.
          const glint = Math.exp(-(((ix + 0.13) ** 2 + (iy + 0.13) ** 2) / 0.05 ** 2)) * glintFade;
          ballLum += glint * (1 - ballLum);
          br += (1 - br) * glint;
          bg += (1 - bg) * glint;
          bb += (1 - bb) * glint;

          pupil = (1 - smooth(rp - 0.012, rp + 0.012, r)) * eyeMask * (1 - glint);
        }

        lum = skinLum + (ballLum - skinLum) * eyeMask;
        cr = sr + (br - sr) * eyeMask;
        cg = sg + (bg - sg) * eyeMask;
        cb = sb + (bb - sb) * eyeMask;
      }

      // ---- Espacio: lo que se ve por la pupila ----
      let inPlanet = 0;
      if (pupil > 0) {
        const neb = noise32(u * 1.7 + 3, v * 1.7 + t * 0.05);
        let sLum = 0.06 * amount * smooth(0.55, 0.9, neb);
        let sr = 0.55;
        let sg = 0.35;
        let sb = 0.95;
        if (hasPlanet) {
          const dx = u / radius;
          const dy = (v - PLANET_CY) / radius;
          const d2 = dx * dx + dy * dy;
          if (d2 < 1) {
            inPlanet = 1;
            const nz = Math.sqrt(1 - d2);
            // Luz desde arriba a la izquierda.
            const lam = clamp01(-0.5 * dx - 0.52 * dy + 0.69 * nz);
            const lon = Math.atan2(dx, nz + 1e-6) + t * 0.35;
            const lat = Math.asin(dy < -1 ? -1 : dy > 1 ? 1 : dy);
            const bands = 0.5 + 0.5 * Math.sin(lat * 9 + 2.2 * noise64(lon * 2, lat * 4));
            sLum = 0.2 + 0.8 * lam * (0.55 + 0.45 * bands);
            sr = 1;
            sg = 0.3 + (0.72 - 0.3) * bands;
            sb = 0.6 + (0.84 - 0.6) * bands;
          } else {
            // Halo de atmósfera.
            const halo = 0.35 * Math.exp(-(Math.sqrt(d2) - 1) / 0.12) * grow;
            const hk = clamp01(halo * 3);
            sLum += halo;
            sr += (1 - sr) * hk;
            sg += (0.4 - sg) * hk;
            sb += (0.7 - sb) * hk;
          }
        }
        // El logo, más lejos que el planeta y más cerca que la nebulosa.
        if (hasLogo && !inPlanet) {
          const a = logoA[i];
          if (a > 0) {
            sLum += (LOGO_LUM - sLum) * a;
            sr += (logoRgb[i * 3] - sr) * a;
            sg += (logoRgb[i * 3 + 1] - sg) * a;
            sb += (logoRgb[i * 3 + 2] - sb) * a;
          }
        }
        lum = lum * (1 - pupil) + sLum * pupil;
        cr += (sr - cr) * pupil;
        cg += (sg - cg) * pupil;
        cb += (sb - cb) * pupil;
      }

      P[i] = pupil;
      PL[i] = inPlanet;

      lum = clamp01(lum) * fade;
      let ch = Math.trunc(lum ** 0.9 * (N - 1));
      // Temblor de caracteres: la imagen se siente «viva».
      if (ch > 1) ch += jitter(i, tick);
      idx[i] = ch < 0 ? 0 : ch > N - 1 ? N - 1 : ch;
      const shade = (0.55 + 0.45 * lum) * 255;
      rgb[i * 3] = Math.trunc(clamp01(cr) * shade);
      rgb[i * 3 + 1] = Math.trunc(clamp01(cg) * shade);
      rgb[i * 3 + 2] = Math.trunc(clamp01(cb) * shade);
    }

    this.stars(t, amount * fade, hasLogo);
  }

  /** Las estrellas van encima; las más brillantes llevan una cruz. */
  private stars(t: number, amount: number, hasLogo: boolean) {
    if (amount <= 0.01) return;
    const { cols, rows, idx, rgb, pupil, planet, logoA } = this;
    const put = (r: number, c: number, ch: number, b: number) => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      const i = r * cols + c;
      if (pupil[i] <= 0.6 || planet[i]) return;
      // No pisan el logo: pasan por detrás.
      if (hasLogo && logoA[i] > 0.3) return;
      idx[i] = ch;
      rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = Math.trunc(clamp01(b) * 255);
    };
    for (let s = 0; s < N_STARS; s++) {
      const z = ((((this.starZ[s] - 0.05 * t) % 1) + 1) % 1) * 0.9 + 0.1;
      const c = Math.trunc((((this.starX[s] / z) * 0.5 * this.h) / 2 + this.w / 2) / this.cellW);
      const r = Math.trunc((((this.starY[s] / z) * 0.5 * this.h) / 2 + this.h / 2) / this.cellH);
      const twinkle = 0.65 + 0.35 * Math.sin(t * 3 + this.starPhase[s]);
      const b = (1 - z) ** 1.3 * twinkle * amount * smooth(0.1, 0.25, z);
      if (b < 0.08) continue;
      if (b > 0.5) {
        put(r, c, CH.plus, 1);
        put(r, c - 1, CH.dash, b * 0.8);
        put(r, c + 1, CH.dash, b * 0.8);
        put(r - 1, c, CH.bar, b * 0.8);
        put(r + 1, c, CH.bar, b * 0.8);
        if (b > 0.75) {
          put(r, c - 2, CH.dash, b * 0.5);
          put(r, c + 2, CH.dash, b * 0.5);
        }
      } else if (b > 0.25) {
        put(r, c, CH.star, Math.min(1, b + 0.4));
      } else {
        put(r, c, CH.dot, Math.min(1, b + 0.45));
      }
    }
  }
}
