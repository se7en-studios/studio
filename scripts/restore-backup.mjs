/**
 * Restaura una copia de seguridad del panel (la de /admin/seguridad o la mensual
 * de GitHub Actions) en Supabase.
 *
 * Por defecto NO escribe nada: valida el archivo y muestra, tabla por tabla,
 * cuántas filas hay en la copia, cuántas ya existen en la base y cuántas son
 * nuevas. Con --aplicar hace upsert por clave primaria: agrega lo que falta y
 * pisa con la versión de la copia lo que existe. Nunca borra filas.
 *
 *   node --env-file=.env.local scripts/restore-backup.mjs copia.json
 *   RESPALDO_FRASE='la frase' node --env-file=.env.local scripts/restore-backup.mjs copia.cifrado.json
 *   node --env-file=.env.local scripts/restore-backup.mjs copia.json --tablas=leads,panel_tasks --aplicar
 *
 * Necesita SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY.
 * Sin ellas sólo valida el archivo. La frase va por variable de entorno y no como
 * argumento, para que no quede en el historial de la terminal.
 *
 * Antes de aplicar, conviene bajar una copia de cómo está la base ahora.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import { createClient } from "@supabase/supabase-js";

// Importa el .ts directo (Node 22+); el hook deja resolver imports sin extensión.
register(
  "data:text/javascript," +
    encodeURIComponent(
      `export async function resolve(s, c, next) {
        try { return await next(s, c); }
        catch (e) { if (s.startsWith(".")) return next(s + ".ts", c); throw e; }
      }`,
    ),
);

const { BACKUP_TABLES, decryptBackup, isEncryptedBackup } = await import("../lib/admin/backup-shared.ts");

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const APPLY = args.includes("--aplicar");
const only = args.find((a) => a.startsWith("--tablas="))?.slice(9).split(",").filter(Boolean);
const BATCH = 500;

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!file) fail("Falta el archivo: node scripts/restore-backup.mjs copia.json [--tablas=a,b] [--aplicar]");

// --- Leer y validar ----------------------------------------------------------
let backup;
try {
  let parsed = JSON.parse(readFileSync(file, "utf8"));
  if (isEncryptedBackup(parsed)) {
    const frase = process.env.RESPALDO_FRASE ?? "";
    if (!frase) fail("La copia está cifrada: pasá la frase en RESPALDO_FRASE.");
    parsed = JSON.parse(decryptBackup(parsed, frase));
  }
  backup = parsed;
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
try {
  assert.equal(backup.app, "se7en-panel", "no es una copia del panel");
  assert.ok(typeof backup.exported_at === "string", "falta la fecha de la copia");
  assert.ok(backup.tables && typeof backup.tables === "object", "faltan las tablas");
} catch (e) {
  fail(`Archivo inválido: ${e.message}`);
}
for (const t of only ?? []) if (!BACKUP_TABLES.includes(t)) fail(`No existe la tabla ${t} en la copia.`);

const tables = BACKUP_TABLES.filter((t) => !only || only.includes(t));
const usable = [];
console.log(`Copia del ${backup.exported_at}`);
for (const t of tables) {
  const dump = backup.tables[t];
  if (!dump) console.log(`  ${t}: no está en la copia`);
  else if (dump.missing) console.log(`  ${t}: la tabla no existía al copiar`);
  else if (dump.error) console.log(`  ${t}: no se pudo copiar (${dump.error})`);
  else if (!Array.isArray(dump.rows)) fail(`${t}: las filas no son una lista.`);
  else {
    if (dump.truncated) console.log(`  ⚠ ${t}: la copia está cortada (tenía más filas de las que se copiaron)`);
    usable.push([t, dump.rows]);
  }
}

// --- Comparar con la base y aplicar ---------------------------------------------
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  for (const [t, rows] of usable) console.log(`  ${t}: ${rows.length} filas`);
  console.log("\nArchivo válido. Sin SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY no se compara con la base.");
  process.exit(0);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function existing(t, rows) {
  const ids = rows.map((r) => r.id).filter(Boolean);
  if (ids.length !== rows.length) return null; // sin id: no se cuenta
  let n = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const { count, error } = await db.from(t).select("id", { count: "exact", head: true }).in("id", ids.slice(i, i + BATCH));
    if (error) throw new Error(`${t}: ${error.message}`);
    n += count ?? 0;
  }
  return n;
}

for (const [t, rows] of usable) {
  const there = await existing(t, rows).catch((e) => fail(e.message));
  const detail = there === null ? "" : ` (${there} ya están, ${rows.length - there} nuevas)`;
  if (!APPLY) {
    console.log(`  ${t}: ${rows.length} filas${detail}`);
    continue;
  }
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from(t).upsert(rows.slice(i, i + BATCH));
    if (error) fail(`${t}: ${error.message} (se aplicaron ${i} de ${rows.length})`);
  }
  console.log(`  ✓ ${t}: ${rows.length} filas aplicadas${detail}`);
}
console.log(APPLY ? "\nListo." : "\nPrueba sin cambios. Para escribir en la base, repetir con --aplicar.");
