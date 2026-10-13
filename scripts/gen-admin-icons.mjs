// Genera los íconos de la app instalable del panel (public/admin/icon-*.png) desde
// el símbolo vectorial de la marca: fondo oscuro y el símbolo naranja al centro.
//   node scripts/gen-admin-icons.mjs "<ruta a simbolo.svg>"
// Los íconos «maskable» llevan el símbolo más chico: Android recorta los bordes.
import { mkdirSync, readFileSync } from "node:fs";
import sharp from "sharp";

const [svgPath] = process.argv.slice(2);
if (!svgPath) {
  console.error('Uso: node scripts/gen-admin-icons.mjs "<ruta a simbolo.svg>"');
  process.exit(1);
}

const BG = "#0a0a0b";
const symbol = readFileSync(svgPath);
mkdirSync("public/admin", { recursive: true });

async function icon(size, fill, file) {
  const inner = Math.round(size * fill);
  const glyph = await sharp(symbol, { density: 384 }).resize(inner, inner, { fit: "contain", background: "#0000" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: glyph, gravity: "center" }])
    .png()
    .toFile(`public/admin/${file}`);
  console.log(file, `${size}x${size}`);
}

await icon(192, 0.62, "icon-192.png");
await icon(512, 0.62, "icon-512.png");
await icon(512, 0.46, "icon-maskable-512.png");
await icon(180, 0.62, "apple-touch-icon.png");
