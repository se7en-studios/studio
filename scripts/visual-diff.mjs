/**
 * Cuánto cambió un sitio entre dos capturas, para la alarma visual de la tarea
 * de capturas (scripts/capturar-sitios.mjs). Puro y sin dependencias: se prueba
 * con scripts/check-visual.mjs.
 *
 * Cada captura se achica a una grilla de GRID_W columnas (una celda ≈ 20 px de
 * la página): así no cuentan el antialiasing ni un texto que cambió de largo,
 * pero sí una sección que desaparece, una imagen que no carga o un diseño roto.
 * Una grilla es { w, h, data } con data en RGB (w * h * 3 bytes).
 */

export const GRID_W = 64;
/** Diferencia media de color (0-255) a partir de la que una celda cuenta como cambiada. */
export const CELL_DIFF = 25;
/** Filas por franja: cada franja busca dónde quedó en la captura anterior. */
const BAND = 8;
/** Hasta cuántas filas (≈ 20 px cada una) puede haberse corrido una franja. */
const MAX_SHIFT = 10;
// Calibrado el 15/10/2026 con los 8 sitios: dos capturas del mismo sitio en la
// misma máquina dan 0-7 %; cualquier par de sitios distintos, 49 % o más; con un
// tercio de la página sin imágenes, 21-86 %. El umbral de la alarma está en
// lib/admin/site-health-shared.ts (VISUAL_CHANGE).

const diff = (a, i, b, j) =>
  (Math.abs(a[i] - b[j]) + Math.abs(a[i + 1] - b[j + 1]) + Math.abs(a[i + 2] - b[j + 2])) / 3;

/** El color más común de la grilla (el fondo), cuantizado de a 16. */
function background(grid) {
  const counts = new Map();
  for (let i = 0; i < grid.w * grid.h * 3; i += 3) {
    const key = ((grid.data[i] >> 4) << 8) | ((grid.data[i + 1] >> 4) << 4) | (grid.data[i + 2] >> 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best = 0, max = -1;
  for (const [k, n] of counts) if (n > max) [best, max] = [k, n];
  return [((best >> 8) << 4) + 8, (((best >> 4) & 15) << 4) + 8, ((best & 15) << 4) + 8];
}

/**
 * Cuánto cambió el contenido de la página (0 a 1). Cada franja de la nueva se
 * compara con la anterior corrida hasta `maxShift` filas para arriba o para
 * abajo, y se queda con la mejor: una sección que creció empuja todo lo de
 * abajo, y eso no es «se ve distinto». Lo cambiado se mide contra las celdas
 * con contenido (las que no son del color de fondo), no contra la página
 * entera: en un sitio oscuro y despojado casi todo es fondo, y si se mide
 * contra todo, una página completamente distinta parecería cambiar poco. Lo
 * que la nueva tiene de más o de menos cuenta como cambiado.
 */
export function compareGrids(prev, next, { cellDiff = CELL_DIFF, maxShift = MAX_SHIFT } = {}) {
  if (prev.w !== next.w) throw new Error("Las grillas tienen que tener el mismo ancho.");
  const w = next.w;
  const bgPrev = background(prev), bgNext = background(next);
  const content = (g, bg, y) => {
    let n = 0;
    for (let x = 0; x < w; x++) if (diff(g.data, (y * w + x) * 3, bg, 0) > cellDiff) n++;
    return n;
  };
  let changed = 0, contentPrev = 0, contentNext = 0;
  for (let y = 0; y < prev.h; y++) contentPrev += content(prev, bgPrev, y);
  for (let y = 0; y < next.h; y++) contentNext += content(next, bgNext, y);
  for (let y0 = 0; y0 < next.h; y0 += BAND) {
    const rows = Math.min(BAND, next.h - y0);
    let best = Infinity;
    for (let k = -maxShift; k <= maxShift && best > 0; k++) {
      if (y0 + k < 0 || y0 + k + rows > prev.h) continue;
      let n = 0;
      for (let y = 0; y < rows && n < best; y++)
        for (let x = 0; x < w; x++)
          if (diff(next.data, ((y0 + y) * w + x) * 3, prev.data, ((y0 + k + y) * w + x) * 3) > cellDiff) n++;
      best = Math.min(best, n);
    }
    // Sin dónde compararla (más allá de la anterior): cuenta su contenido.
    if (best === Infinity) {
      best = 0;
      for (let y = 0; y < rows; y++) best += content(next, bgNext, y0 + y);
    }
    changed += best;
  }
  // Si la nueva es más corta, el contenido que falta también cambió.
  for (let y = next.h; y < prev.h; y++) changed += content(prev, bgPrev, y);
  // Una página casi vacía no divide por casi nada: el contenido cuenta como mínimo el 10 % de la página.
  const base = Math.max(contentPrev, contentNext, 0.1 * w * Math.max(prev.h, next.h));
  return Math.min(1, changed / base);
}

/** La parte de la grilla que es del mismo color que el más común (0 a 1). */
export function sameColorShare(grid) {
  const counts = new Map();
  const n = grid.w * grid.h;
  // Colores cuantizados de a 16 para que el ruido de la compresión no los separe.
  for (let i = 0; i < n * 3; i += 3) {
    const key = ((grid.data[i] >> 4) << 8) | ((grid.data[i + 1] >> 4) << 4) | (grid.data[i + 2] >> 4);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return n ? Math.max(...counts.values()) / n : 1;
}

/** Casi toda la página de un solo color: no cargó, o quedó en blanco. */
export const BLANK_SHARE = 0.97;
export const isBlank = (grid) => sameColorShare(grid) >= BLANK_SHARE;
