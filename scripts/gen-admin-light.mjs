// Genera app/admin/admin-light.css: el tema claro del panel para las clases de
// color fijas (bg-white/…, border-white/…, text-red-400, …). Los fondos y textos
// que usan tokens (--panel, --foreground, …) se cambian en globals.css; esto cubre
// lo que está escrito a mano en los componentes.
//
//   node scripts/gen-admin-light.mjs           escribe el archivo
//   node scripts/gen-admin-light.mjs --check   falla si el archivo está desactualizado
//
// Al agregar un color fijo nuevo (por ejemplo bg-white/[0.09] o text-amber-300 en
// otra variante), volver a correrlo. Lo mejor es usar los tokens y no hace falta.
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app/admin", "lib/admin"];
const OUT = "app/admin/admin-light.css";
const TINT = "11, 11, 12"; // la tinta de la landing: el equivalente claro del blanco translúcido

// Texto con color de estado: el tono 300/400 es para fondo oscuro; en claro, uno más profundo.
const TEXT = {
  "red-300": "#b91c1c",
  "red-400": "#dc2626",
  "amber-300": "#92400e",
  "emerald-300": "#047857",
  "emerald-400": "#059669",
  "violet-300": "#6d28d9",
  "sky-300": "#0369a1",
  "teal-300": "#0f766e",
  "indigo-300": "#4338ca",
  "zinc-400": "#52525b",
};

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx|ts)$/.test(name)) files.push(path);
  }
};
ROOTS.forEach(walk);

// Los colores de texto salen de TEXT: uno nuevo ahí ya entra solo en la búsqueda.
const TOKEN = new RegExp(
  String.raw`(?<![\w:-])(?:(?:hover|focus):)?(?:(?:bg|border|ring)-white\/(?:\[[\d.]+\]|\d+)|from-white\/(?:\[[\d.]+\]|\d+)|bg-black\/(?:20|40)|text-(?:${Object.keys(TEXT).join("|")}))|\[color-scheme:dark\]`,
  "g",
);

const tokens = new Set();
for (const file of files) for (const m of readFileSync(file, "utf8").matchAll(TOKEN)) tokens.add(m[0]);

const alpha = (raw) => {
  const n = Number(raw.replace(/[[\]]/g, ""));
  return n >= 1 ? n / 100 : n; // «10» es 10%, «[0.06]» es 6%
};
const round = (n) => Math.round(n * 1000) / 1000;
const esc = (s) => s.replace(/[^a-zA-Z0-9_-]/g, (c) => `\\${c}`);

function rule(token) {
  const [, variant, body] = /^(?:(hover|focus):)?(.*)$/.exec(token);
  const selector = `.admin-app[data-theme="light"] .${esc(token)}${variant ? `:${variant}` : ""}`;
  let decl;
  let m;
  if (token === "[color-scheme:dark]") decl = "color-scheme: light";
  else if ((m = /^bg-white\/(.+)$/.exec(body))) decl = `background-color: rgba(${TINT}, ${round(alpha(m[1]) * 1.1)})`;
  else if ((m = /^border-white\/(.+)$/.exec(body))) decl = `border-color: rgba(${TINT}, ${round(alpha(m[1]) * 1.3)})`;
  else if ((m = /^ring-white\/(.+)$/.exec(body))) decl = `--tw-ring-color: rgba(${TINT}, ${round(alpha(m[1]) * 1.3)})`;
  else if ((m = /^from-white\/(.+)$/.exec(body))) decl = `--tw-gradient-from: rgba(${TINT}, ${round(alpha(m[1]))})`;
  else if ((m = /^bg-black\/(.+)$/.exec(body))) decl = `background-color: rgba(${TINT}, ${round(alpha(m[1]) * 0.25)})`;
  else if ((m = /^text-(.+)$/.exec(body))) decl = `color: ${TEXT[m[1]]}`;
  return `${selector} { ${decl}; }`;
}

const css = [
  "/* GENERADO por scripts/gen-admin-light.mjs: no editar a mano. */",
  "/* Tema claro del panel para las clases de color fijas de los componentes. */",
  ...[...tokens].sort().map(rule),
  "",
].join("\n");

if (process.argv.includes("--check")) {
  const current = (() => {
    try {
      return readFileSync(OUT, "utf8").replace(/\r\n/g, "\n");
    } catch {
      return "";
    }
  })();
  if (current !== css) {
    console.error(`${OUT} está desactualizado: correr node scripts/gen-admin-light.mjs`);
    process.exit(1);
  }
  console.log(`${OUT} al día (${tokens.size} clases)`);
} else {
  writeFileSync(OUT, css);
  console.log(`${OUT}: ${tokens.size} clases`);
}
