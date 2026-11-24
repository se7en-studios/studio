"use client";

import { useEffect, useRef } from "react";
import { DURATION, OjoScene, RAMP, STILL_T, type LogoPixels } from "@/lib/ojo-ascii";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// El ojo que se abre al espacio, en caracteres: un ojo parpadea, la cámara
// entra por la pupila y al fondo, entre las estrellas, aparece el logo. Las
// fórmulas están en lib/ojo-ascii.ts; acá se arma la grilla según el ancho
// disponible y se dibuja en un canvas 2D con la mono del sitio (Chivo Mono).

/** El logo principal: símbolo + SE7EN. Se usa como máscara de brillo, no se pega encima. */
const LOGO = "/logo.png";
const STEP = 1000 / 30;
/** Ancho ideal de una celda (px de CSS) y límites de columnas: en celular las celdas se achican antes que perder detalle. */
const CELL = 8;
const MIN_COLS = 80;
const MAX_COLS = 130;
/** Una celda mide el doble de alto que de ancho, como una letra mono con su interlínea. */
const CELL_RATIO = 2;

const BLACK = 0xff000000;

export function CsOjo() {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = box.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d", { alpha: false });
    if (!el || !cv || !ctx) return;

    const family = getComputedStyle(cv).fontFamily;
    let scene: OjoScene | null = null;
    let logo: LogoPixels | null = null;
    // Cada carácter de la rampa se rasteriza una sola vez (cobertura 0–255 por
    // píxel); después cada cuadro es copiar y teñir píxeles, sin tocar texto.
    // Con fillText por celda un celular modesto no llegaba a 30 fps.
    let glyphs = new Uint8Array(0);
    let image: ImageData | null = null;
    let px = new Uint32Array(0);
    /** Lo último dibujado en cada celda: las vacías que siguen vacías no se tocan. */
    let shown = new Uint8Array(0);
    let cellW = 0;
    let cellH = 0;
    let raf = 0;
    let visible = false;
    let dead = false;
    let t = 0;
    let last = 0;
    let next = 0;

    const draw = () => {
      if (!scene || !image) return;
      const { cols, rows, idx, rgb } = scene;
      const stride = cv.width;
      const size = cellW * cellH;
      for (let r = 0, i = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++, i++) {
          const ch = idx[i];
          if (!ch && !shown[i]) continue;
          shown[i] = ch;
          const cr = rgb[i * 3];
          const cg = rgb[i * 3 + 1];
          const cb = rgb[i * 3 + 2];
          let g = ch * size;
          let o = r * cellH * stride + c * cellW;
          for (let y = 0; y < cellH; y++, o += stride) {
            for (let x = 0; x < cellW; x++) {
              const k = glyphs[g++];
              px[o + x] = k ? BLACK | (((cb * k) >> 8) << 16) | (((cg * k) >> 8) << 8) | ((cr * k) >> 8) : BLACK;
            }
          }
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const still = () => {
      scene?.frame(reduced ? STILL_T : t);
      draw();
    };

    // 30 cuadros por segundo con un reloj propio: `next` es cuándo toca el
    // próximo. Si el navegador viene atrasado se dibuja en cada vuelta, en vez
    // de saltear una de cada dos por llegar un milisegundo antes.
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now < next - 4) return;
      next = Math.max(next + STEP, now + STEP / 2);
      // Si la pestaña estuvo colgada, no se saltea media animación de golpe.
      t = (t + Math.min(now - last, 100) / 1000) % DURATION;
      last = now;
      scene?.frame(t);
      draw();
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const start = () => {
      if (raf || reduced || !visible || !scene) return;
      last = next = performance.now();
      raf = requestAnimationFrame(loop);
    };

    // La grilla sale del ancho disponible: las celdas no se estiran nunca, se
    // cambia cuántas entran. El alto lo decide el CSS (más alto en celular).
    // Cada celda mide un número entero de píxeles reales, así el canvas se
    // muestra a su tamaño exacto y las letras quedan nítidas.
    const layout = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const wanted = Math.max(MIN_COLS, Math.min(MAX_COLS, Math.round(w / CELL)));
      cellW = Math.max(2, Math.floor((w * dpr) / wanted));
      cellH = cellW * CELL_RATIO;
      const cols = Math.max(1, Math.floor((w * dpr) / cellW));
      const rows = Math.max(1, Math.floor((h * dpr) / cellH));
      cv.width = cols * cellW;
      cv.height = rows * cellH;
      cv.style.width = `${cv.width / dpr}px`;
      cv.style.height = `${cv.height / dpr}px`;

      // El tamaño de letra sale de lo que avanza de verdad un carácter de esta tipografía.
      const atlas = document.createElement("canvas");
      atlas.width = cellW * RAMP.length;
      atlas.height = cellH;
      const g = atlas.getContext("2d", { willReadFrequently: true });
      if (!g) return;
      g.font = `700 100px ${family}`;
      const advance = g.measureText("M").width / 100 || 0.6;
      g.font = `700 ${cellW / advance}px ${family}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#fff";
      for (let i = 0; i < RAMP.length; i++) {
        // Recortado a su celda: una M ancha no mancha al vecino.
        g.save();
        g.beginPath();
        g.rect(i * cellW, 0, cellW, cellH);
        g.clip();
        g.fillText(RAMP[i], (i + 0.5) * cellW, cellH / 2);
        g.restore();
      }
      const a = g.getImageData(0, 0, atlas.width, atlas.height).data;
      glyphs = new Uint8Array(RAMP.length * cellW * cellH);
      for (let i = 0; i < RAMP.length; i++) {
        for (let y = 0; y < cellH; y++) {
          for (let x = 0; x < cellW; x++) {
            glyphs[(i * cellH + y) * cellW + x] = a[(y * atlas.width + i * cellW + x) * 4 + 3];
          }
        }
      }

      image = ctx.createImageData(cv.width, cv.height);
      px = new Uint32Array(image.data.buffer);
      px.fill(BLACK);
      shown = new Uint8Array(cols * rows);
      scene = new OjoScene(cols, rows, cellW, cellH);
      scene.setLogo(logo);
      if (raf) return;
      still();
      start();
    };

    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (dead) return;
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext("2d");
      if (!g) return;
      g.drawImage(img, 0, 0);
      logo = g.getImageData(0, 0, c.width, c.height);
      scene?.setLogo(logo);
      if (!raf) still();
    };
    img.src = LOGO;

    // Las métricas se toman con la tipografía ya cargada; si falla, con la de reserva.
    let ready = false;
    const go = () => {
      ready = true;
      if (!dead) layout();
    };
    document.fonts.load(`700 16px ${family}`).then(go, go);
    const ro = new ResizeObserver(() => ready && layout());
    ro.observe(el);
    // Sólo corre mientras está en pantalla.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(el);

    return () => {
      dead = true;
      stop();
      ro.disconnect();
      io.disconnect();
      img.onload = null;
    };
  }, [reduced]);

  return (
    <div className="pt-28 md:pt-40">
      {/* En pantallas bajas se angosta para que entre entera sin scrollear. */}
      <div
        ref={box}
        className="mx-auto grid aspect-[4/5] w-full place-items-center overflow-hidden rounded-(--cs-radius) bg-black sm:aspect-[6/5] sm:max-w-[calc((100svh-9rem)*1.2)]"
      >
        <canvas
          ref={canvas}
          role="img"
          aria-label="Animación hecha con caracteres: un ojo se abre, la cámara entra por la pupila y, entre las estrellas, aparece el logo de Se7en."
          className="block font-mono"
        />
      </div>
      <p className="rd-label mt-4 text-center text-[10px] text-(--paper)/45">
        Sólo caracteres. Ni una imagen, ni un video.
      </p>
    </div>
  );
}
