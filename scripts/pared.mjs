// Arma las piezas de «la pared» de /consola: capturas reales de funciones de
// cada caso (secciones de los sitios en vivo y pantallas de la galería del
// repo), recortadas y livianas. Escribe public/consola/pared/v2/*.webp y data/pared.ts.
//
//   node scripts/pared.mjs <carpeta con las capturas de las secciones>
//
// Las capturas salen de los sitios en vivo con Playwright (1280 px de ancho,
// densidad 1,5): <slug>-NN.jpg. No van al repo.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");
const SRC = process.argv[2];
if (!SRC) throw new Error("Falta la carpeta de las capturas");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "..");
// Con versión: si se rehacen piezas con el mismo nombre, Next serviría las viejas de su caché.
const OUT = path.join(ROOT, "public/consola/pared/v2");
/** Ancho de cada pieza, en px: en la pared se ven a ~360 px con densidad 2. */
const WIDTH = 720;

/**
 * Qué pieza sale de qué captura: [archivo, caso, nombre de capa, qué muestra, recorte].
 * El recorte (en px de la captura) saca la barra del sitio de las capturas de pantalla completa.
 * Un archivo que empieza con «/» sale de public/.
 */
const PIECES = [
  ["takefyy-09.jpg", "takefyy", "Takefyy_Panel", "Ventas del día, en vivo", { top: 96 }],
  ["takefyy-02.jpg", "takefyy", "Takefyy_Carta", "Carta con adicionales y pedido a WhatsApp", { top: 96 }],
  ["takefyy-04.jpg", "takefyy", "Takefyy_Locales", "Locales que ya venden con Takefyy", { top: 96 }],
  ["pone-la-pava-02.jpg", "pone-la-pava", "PoneLaPava_Categorias", "Comprá por categoría", { top: 110 }],
  ["pone-la-pava-01.jpg", "pone-la-pava", "PoneLaPava_Destacados", "Lo más elegido, con stock real", { top: 110 }],
  ["pone-la-pava-08.jpg", "pone-la-pava", "PoneLaPava_Reseñas", "Reseñas de Google en la tienda", { top: 110 }],
  ["sentinel-01.jpg", "sentinel", "Sentinel_Mapa", "Mapa de focos en tiempo real"],
  ["sentinel-02.jpg", "sentinel", "Sentinel_Aviso", "Detecta, verifica y avisa"],
  ["sentinel-03.jpg", "sentinel", "Sentinel_Satelites", "El planeta mirado desde el espacio"],
  // Apex con el rediseño de nov. 2026, sacado con los capturadores del propio repo de Apex
  // (tools/capturas-coach y tools/capturas-atleta: la app real con un Firebase falso y datos de muestra).
  ["apex-coach-dashboard.png", "apex-ai", "Apex_Dashboard", "Dashboard del entrenador: adherencia y alertas"],
  ["apex-coach-bloque.png", "apex-ai", "Apex_Bloque", "Periodización por semanas"],
  ["apex-coach-rutina.png", "apex-ai", "Apex_Rutina", "La rutina de cada atleta, día por día"],
  ["apex-atleta-hoy.png", "apex-ai", "Apex_Hoy", "El entrenamiento del día, en el celular"],
  ["apex-atleta-discos.png", "apex-ai", "Apex_Discos", "Cargá los discos y la app suma el peso"],
  ["apex-atleta-progresion.png", "apex-ai", "Apex_Progresion", "Progresión por ejercicio"],
  ["altum-sci-03.jpg", "altum-sci", "Altum_Tasador", "Configurá y tasá tu activo"],
  ["altum-sci-02.jpg", "altum-sci", "Altum_Lotes", "Lotes con renta y entorno"],
  ["pravilo-05.jpg", "pravilo", "Pravilo_Sesion", "Reservá tu sesión"],
  ["pravilo-03.jpg", "pravilo", "Pravilo_Estudio", "El estudio en acción"],
  ["muzzaga-03.jpg", "muzzaga", "Muzzaga_Herramientas", "Herramientas para jugar mejor"],
  ["muzzaga-01.jpg", "muzzaga", "Muzzaga_Torneos", "Torneos con inscripción online"],
  ["muzzaga-00.jpg", "muzzaga", "Muzzaga_Turnos", "Turnos de cancha las 24 h"],
  ["iphone-vita-00.jpg", "iphone-vita", "iPhoneVita_Producto", "Ficha de producto premium"],
  ["/projects/devices/iphone-vita-mobile-2026-10.jpg", "iphone-vita", "iPhoneVita_Catalogo", "Catálogo en el celular"],
];

fs.mkdirSync(OUT, { recursive: true });
const list = [];
for (const [file, slug, layer, caption, crop] of PIECES) {
  const src = file.startsWith("/") ? path.join(ROOT, "public", file) : path.join(SRC, file);
  const m = await sharp(src).metadata();
  const top = crop?.top ?? 0;
  const name = `${layer.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.webp`;
  const out = await sharp(src)
    .extract({ left: 0, top, width: m.width, height: m.height - top })
    .resize(Math.min(WIDTH, m.width))
    .webp({ quality: 74 })
    .toFile(path.join(OUT, name));
  list.push({ src: `/consola/pared/v2/${name}`, w: out.width, h: out.height, slug, layer, caption });
}
fs.writeFileSync(
  path.join(ROOT, "data/pared.ts"),
  `// Generado por scripts/pared.mjs: no editar a mano.\n// Piezas de la pared de /consola: funciones reales de cada caso.\nexport type PiezaPared = { src: string; w: number; h: number; slug: string; layer: string; caption: string };\n\nexport const pared: PiezaPared[] = ${JSON.stringify(list, null, 2)};\n`,
);
console.log(list.length, "piezas");
