/**
 * Captura automática de los sitios de cada proyecto, para la tele de las salas
 * de «En vivo» (/admin/oficinas).
 *
 * Lo corre .github/workflows/capturas.yml todas las mañanas. Pide la lista de
 * sitios al panel, abre cada uno con Chrome, baja por la página (para que
 * carguen las imágenes y las animaciones de entrada), saca la página entera a
 * 640 de ancho y la sube al panel. De paso guarda la salud de cada sitio: si
 * respondió, el código HTTP, cuánto tardó en cargar, cuándo vence el SSL y
 * cuándo vence el dominio (por RDAP; los .ar no siempre responden y se cargan
 * a mano en el plan de mantenimiento). En GitHub se identifica con el token OIDC
 * de la tarea (no hace falta ningún secreto). También se puede correr a mano:
 *
 *   PANEL_URL=https://se7enstudio.vercel.app CRON_SECRET=… node scripts/capturar-sitios.mjs
 *   node scripts/capturar-sitios.mjs --local     (los casos de data/projects.ts, a .capturas/, sin subir)
 *
 * Usa CHROME_PATH o el Chrome que cachea Puppeteer
 * (`npx puppeteer browsers install chrome`).
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const LOCAL = process.argv.includes("--local");
const PANEL = (process.env.PANEL_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.CRON_SECRET ?? "";
const OUT = ".capturas";
/** Ventana como la de una notebook; la imagen sale a la mitad (640 de ancho). */
const VIEW = { width: 1280, height: 800 };
const SCALE = 0.5;
/** Hasta dónde se baja: una landing larga entra entera y la imagen no pasa de ~1 MB. */
const MAX_HEIGHT = 7000;

function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = join(homedir(), ".cache", "puppeteer", "chrome");
  if (!existsSync(root)) return null;
  for (const dir of readdirSync(root)) {
    for (const bin of [join(root, dir, "chrome-win64", "chrome.exe"), join(root, dir, "chrome-linux64", "chrome")]) {
      if (existsSync(bin)) return bin;
    }
  }
  return null;
}

async function listSites() {
  if (LOCAL) {
    const { projects } = await import("../data/projects.ts");
    return projects.filter((p) => p.url).map((p) => ({ slug: p.slug, url: p.url }));
  }
  if (!PANEL) throw new Error("Falta PANEL_URL (o correr con --local).");
  const res = await fetch(`${PANEL}/api/cron/capturas`, { headers: { Authorization: await authorization() } });
  if (!res.ok) throw new Error(`El panel no dio la lista (${res.status}): ${await res.text()}`);
  return (await res.json()).sites;
}

/**
 * Con CRON_SECRET, ése. En GitHub Actions (permissions: id-token: write), un
 * token OIDC nuevo por pedido: vencen a los pocos minutos.
 */
async function authorization() {
  if (SECRET) return `Bearer ${SECRET}`;
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL, token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !token) throw new Error("Falta CRON_SECRET (o correrlo en GitHub Actions con permissions: id-token: write).");
  const res = await fetch(`${url}&audience=se7en-capturas`, { headers: { Authorization: `bearer ${token}` } });
  if (!res.ok) throw new Error(`GitHub no dio el token de la tarea (${res.status}).`);
  return `Bearer ${(await res.json()).value}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * La página entera, de a una pantalla: cada tramo se saca cuando ya está a la
 * vista (las secciones que aparecen al hacer scroll, si no, salen en blanco) y
 * después se pegan en una sola imagen. El menú fijo y los botones flotantes
 * salen sólo en el primer tramo.
 */
async function capture(browser, url, check) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ ...VIEW, deviceScaleFactor: 1 });
    const started = Date.now();
    const res = await page.goto(url, { waitUntil: "networkidle2", timeout: 45_000 });
    check.status_code = res?.status() ?? null;
    check.ok = Boolean(res) && res.status() < 400;
    // Hasta el evento load de la navegación (sin la espera de red quieta de networkidle2).
    check.ms = Math.round(await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.duration ?? 0)) || Date.now() - started;
    const validTo = res?.securityDetails()?.validTo();
    if (validTo) check.ssl_expires_on = new Date(validTo * 1000).toISOString().slice(0, 10);
    await sleep(2500);
    const height = Math.min(await page.evaluate(() => document.documentElement.scrollHeight), MAX_HEIGHT);
    const tops = [];
    for (let y = 0; y < height; y += VIEW.height) tops.push(Math.min(y, height - VIEW.height));
    const parts = [];
    for (const [i, top] of tops.entries()) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, top));
      await sleep(i === 0 ? 400 : 900);
      // Antes de cada tramo: hay menús que se vuelven fijos recién al bajar
      if (i > 0)
        await page.evaluate(() => {
          for (const el of document.querySelectorAll("body *")) {
            const pos = getComputedStyle(el).position;
            if (pos === "fixed" || pos === "sticky") el.style.visibility = "hidden";
          }
        });
      const png = await page.screenshot({ type: "png", clip: { x: 0, y: Math.max(0, top), width: VIEW.width, height: Math.min(VIEW.height, height), scale: SCALE } });
      parts.push({ top: Math.max(0, top), data: Buffer.from(png).toString("base64") });
    }
    // Pegar los tramos en un canvas de una página en blanco y sacar un JPG
    const sheet = await browser.newPage();
    try {
      const b64 = await sheet.evaluate(
        async (parts, w, h, scale) => {
          const cv = document.createElement("canvas");
          cv.width = Math.round(w * scale);
          cv.height = Math.round(h * scale);
          const g = cv.getContext("2d");
          for (const p of parts) {
            const img = new Image();
            img.src = `data:image/png;base64,${p.data}`;
            await img.decode();
            g.drawImage(img, 0, Math.round(p.top * scale));
          }
          return cv.toDataURL("image/jpeg", 0.72).split(",")[1];
        },
        parts,
        VIEW.width,
        height,
        SCALE,
      );
      return { jpeg: Buffer.from(b64, "base64"), width: Math.round(VIEW.width * SCALE), height: Math.round(height * SCALE) };
    } finally {
      await sheet.close();
    }
  } finally {
    await page.close();
  }
}

const domains = new Map();

/** Vencimiento del dominio por RDAP (YYYY-MM-DD), o null si no se puede saber. */
async function domainExpiry(url) {
  const parts = new URL(url).hostname.replace(/^www\./, "").split(".");
  // ponytail: dominio registrable a ojo (.com.ar, .gob.ar…); una lista de sufijos públicos si hace falta más.
  const n = parts.length > 2 && /^(com|net|org|gob|gov|edu|co|tur)$/.test(parts.at(-2)) ? 3 : 2;
  const domain = parts.slice(-n).join(".");
  // Subdominios de plataformas: el dominio no es del cliente.
  if (/^(vercel\.app|netlify\.app|github\.io|pages\.dev)$/.test(domain)) return null;
  if (!domains.has(domain)) {
    domains.set(
      domain,
      fetch(`https://rdap.org/domain/${domain}`, { headers: { Accept: "application/rdap+json" }, signal: AbortSignal.timeout(10_000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => j?.events?.find((e) => e.eventAction === "expiration")?.eventDate?.slice(0, 10) ?? null)
        .catch(() => null),
    );
  }
  return domains.get(domain);
}

async function sendCheck(slug, check) {
  const res = await fetch(`${PANEL}/api/cron/capturas?${new URLSearchParams({ slug })}`, {
    method: "POST",
    headers: { Authorization: await authorization(), "Content-Type": "application/json" },
    body: JSON.stringify(check),
  });
  if (!res.ok) throw new Error(`no se guardó el chequeo (${res.status}): ${await res.text()}`);
}

async function upload(slug, shot) {
  const q = new URLSearchParams({ slug, w: String(shot.width), h: String(shot.height) });
  const res = await fetch(`${PANEL}/api/cron/capturas?${q}`, {
    method: "POST",
    headers: { Authorization: await authorization(), "Content-Type": "image/jpeg" },
    body: shot.jpeg,
  });
  if (!res.ok) throw new Error(`no se subió (${res.status}): ${await res.text()}`);
}

const executablePath = findChrome();
if (!executablePath) {
  console.error("No se encontró Chrome. Correr `npx puppeteer browsers install chrome` o exportar CHROME_PATH.");
  process.exit(1);
}
const sites = await listSites();
if (LOCAL) mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--lang=es-AR", "--hide-scrollbars"] });
let failed = 0;
for (const { slug, url } of sites) {
  const check = { ok: false, status_code: null, ms: null, ssl_expires_on: null, domain_expires_on: await domainExpiry(url), error: "" };
  try {
    const shot = await capture(browser, url, check);
    if (LOCAL) writeFileSync(join(OUT, `${slug}.jpg`), shot.jpeg);
    else await upload(slug, shot);
    console.log(`✓ ${slug}  ${shot.width}×${shot.height}  ${Math.round(shot.jpeg.length / 1024)} KB`);
  } catch (e) {
    failed++;
    if (!check.error) check.error = String(e instanceof Error ? e.message : e).slice(0, 300);
    console.error(`✗ ${slug} (${url}): ${e instanceof Error ? e.message : e}`);
  }
  // El chequeo se guarda aunque la captura haya fallado: justamente ahí importa.
  const health = `${check.ok ? "OK" : "CAÍDO"} ${check.status_code ?? "-"} ${check.ms ?? "-"} ms · SSL ${check.ssl_expires_on ?? "?"} · dominio ${check.domain_expires_on ?? "?"}`;
  if (LOCAL) console.log(`  ${health}`);
  else
    await sendCheck(slug, check).then(
      () => console.log(`  ${health}`),
      (e) => {
        failed++;
        console.error(`  ✗ salud de ${slug}: ${e instanceof Error ? e.message : e}`);
      },
    );
}
await browser.close();
console.log(`${sites.length - failed} de ${sites.length} sitios capturados${LOCAL ? ` en ${OUT}/` : ""}.`);
// Si falló alguno, la tarea queda en rojo (las que salieron ya están subidas).
if (failed) process.exit(1);
