// Carga el calendario de contenido de Instagram en Supabase (tabla content_posts +
// archivos en el bucket `panel`). Se puede correr de nuevo: actualiza textos y
// archivos sin tocar el "publicado" que ya se tildó en el panel.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-content.mjs "<carpeta subidas>" [--dry]
//
// Cada subcarpeta se llama NN_AAAA-MM-DD_dia_tipo_titulo y trae LEEME.txt,
// caption.txt (opcional) y los archivos a subir.
import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "panel";
const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp4": "video/mp4", ".txt": "text/plain" };
const SKIP = new Set(["LEEME.txt", "caption.txt"]);

const [dir, flag] = process.argv.slice(2);
if (!dir) {
  console.error('Uso: node scripts/seed-content.mjs "<carpeta subidas>" [--dry]');
  process.exit(1);
}
const dry = flag === "--dry";

/** LEEME.txt: línea 1 título, línea 2 fecha; 📌 fija; "·" son consejos; el resto son los pasos. */
function parseReadme(text) {
  const [title, , ...rest] = text.split(/\r?\n/).map((l) => l.trim());
  const lines = rest.filter(Boolean);
  return {
    title,
    pinned: lines.some((l) => l.startsWith("📌")),
    tips: lines.filter((l) => l.startsWith("·")).map((l) => l.slice(1).trim()),
    steps: lines.filter((l) => !l.startsWith("📌") && !l.startsWith("·")).join("\n"),
  };
}

// Orden de subida: el video antes que la portada, el resto por nombre (01, 02, …).
const rank = (name) => (name.startsWith("video") ? 0 : 1);
const byUploadOrder = (a, b) => rank(a) - rank(b) || a.localeCompare(b, "en", { numeric: true });

async function readPost(folder) {
  const m = /^\d+_(\d{4}-\d{2}-\d{2})_[a-zé]+_([a-z]+)_/.exec(folder);
  if (!m) throw new Error(`Nombre de carpeta inesperado: ${folder}`);
  const [, post_date, kind] = m;
  const path = join(dir, folder);
  const names = (await readdir(path)).filter((n) => !SKIP.has(n)).sort(byUploadOrder);
  const files = await Promise.all(
    names.map(async (name) => ({
      name,
      local: join(path, name),
      size: (await stat(join(path, name))).size,
      mime: MIME[extname(name).toLowerCase()] ?? "application/octet-stream",
    })),
  );
  const caption = await readFile(join(path, "caption.txt"), "utf8").catch(() => "");
  const readme = parseReadme(await readFile(join(path, "LEEME.txt"), "utf8"));
  return { id: `${post_date}-${kind}`, post_date, kind, caption: caption.trim(), ...readme, files };
}

const folders = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
const posts = [];
for (const f of folders) posts.push(await readPost(f));

if (dry) {
  for (const p of posts) console.log(p.id, `${p.files.length} archivos`, p.pinned ? "(fijar)" : "", "-", p.title);
  console.log(`\n${posts.length} posts, ${(posts.flatMap((p) => p.files).reduce((n, f) => n + f.size, 0) / 1048576).toFixed(0)} MB`);
  process.exit(0);
}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

for (const p of posts) {
  const stored = [];
  for (const f of p.files) {
    const path = `contenido-ig/${p.id}/${f.name}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, await readFile(f.local), { contentType: f.mime, upsert: true });
    if (error) throw new Error(`${path}: ${error.message}`);
    stored.push({ path, name: f.name, size: f.size, mime: f.mime });
  }
  // upsert sólo con estas columnas: done_at y done_by quedan como estaban.
  const { error } = await supabase.from("content_posts").upsert({
    id: p.id,
    post_date: p.post_date,
    kind: p.kind,
    title: p.title,
    pinned: p.pinned,
    steps: p.steps,
    tips: p.tips,
    caption: p.caption,
    files: stored,
  });
  if (error) throw new Error(`${p.id}: ${error.message}`);
  console.log("ok", p.id, basename(p.title));
}
console.log(`\n${posts.length} posts cargados.`);
