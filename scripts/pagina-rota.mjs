// El marco del fichín de la landing: la página rota (dos láminas de Flow, de
// compu y de celular, en la carpeta «landing» de los personajes; no van al
// repo). El verde del agujero pasa a transparente (por ahí se ve el video), el
// negro de la hoja pasa a ser exactamente el de la página (así el borde de la
// imagen no se nota) y se recorta el negro que sobra alrededor del agujero.
// Escribe public/en-vivo/pagina-rota{,-m}.webp e imprime la proporción de cada
// una (va en components/rd/arcade.tsx).
// node scripts/pagina-rota.mjs "C:/Users/feder/OneDrive/Escritorio/personajes/landing"
import path from "node:path";
import sharp from "sharp";

const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la carpeta de las láminas");
const OUT = path.join(import.meta.dirname, "..", "public", "en-vivo");
const INK = [11, 11, 12];
/** Cuánto negro se deja alrededor del agujero (de su lado más largo). */
const MARGIN = 0.035;

async function frame(file, out) {
  const { data, info } = await sharp(path.join(SRC, file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    const k = i * 4;
    const r = data[k], g = data[k + 1], b = data[k + 2];
    // El agujero: en estas láminas no hay ningún verde de verdad, así que lo que
    // tiene bastante más verde que rojo y azul es fondo (también el verde oscuro
    // y con textura de la de celular), con el borde suave. A todo lo demás se le
    // saca el tinte verde (el papel quedaba con un filo verdoso).
    const over = g - Math.max(r, b);
    const a = Math.max(0, Math.min(1, (40 - over) / 25));
    if (over > 0) data[k + 1] = Math.max(r, b);
    data[k + 3] = Math.round(a * 255);
    // La hoja: lo casi negro, al negro de la página (con un borde de mezcla para no cortar el trazo)
    const top = Math.max(data[k], data[k + 1], data[k + 2]);
    if (a > 0.98 && top < 56) {
      const t = top < 40 ? 1 : (56 - top) / 16;
      for (let c = 0; c < 3; c++) data[k + c] = Math.round(data[k + c] + (INK[c] - data[k + c]) * t);
    }
    // Lo que no es hoja lisa (el agujero y el papel roto) marca hasta dónde recortar
    const flat = a > 0.98 && Math.abs(data[k] - INK[0]) + Math.abs(data[k + 1] - INK[1]) + Math.abs(data[k + 2] - INK[2]) < 6;
    if (!flat) {
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * MARGIN);
  const left = Math.max(0, x0 - pad), top = Math.max(0, y0 - pad);
  const cw = Math.min(w, x1 + pad + 1) - left, ch = Math.min(h, y1 + pad + 1) - top;
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract({ left, top, width: cw, height: ch }).webp({ quality: 86, alphaQuality: 90, effort: 6 }).toFile(path.join(OUT, out));
  const meta = await sharp(path.join(OUT, out)).metadata();
  console.log(out, `${cw}x${ch}`, `aspect ${cw}/${ch} = ${(cw / ch).toFixed(3)}`, `${Math.round((meta.size ?? 0) / 1024)} KB`);
}

await frame("pagina rota compu.jpg", "pagina-rota.webp");
await frame("pagina rota celular.jpg", "pagina-rota-m.webp");
