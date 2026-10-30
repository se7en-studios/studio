/**
 * Notificación automática a IndexNow (Bing, Copilot, DuckDuckGo, Yandex, etc.).
 *
 *   node scripts/indexnow.mjs
 *   node scripts/indexnow.mjs --all
 *
 * Envía las URLs que cambiaron según git diff (o todas con --all) al endpoint de IndexNow.
 * Bing alimenta directamente a ChatGPT Search y Copilot.
 */
import { readdirSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const HOST = "www.se7en.com.ar";
const KEY_FILE = readdirSync("public").find((f) => f.endsWith(".txt") && f !== "llms.txt");

if (!KEY_FILE) {
  console.error("No se encontró archivo de clave de IndexNow en public/*.txt");
  process.exit(1);
}

const KEY = readFileSync(`public/${KEY_FILE}`, "utf8").trim();
const KEY_LOCATION = `https://${HOST}/${KEY_FILE}`;

const ALL_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/en`,
  `https://${HOST}/work`,
  `https://${HOST}/services`,
  `https://${HOST}/pricing`,
  `https://${HOST}/vs`,
  `https://${HOST}/start`,
  `https://${HOST}/tech`,
  `https://${HOST}/blog`,
  `https://${HOST}/audit`,
  `https://${HOST}/cotizador`,
  `https://${HOST}/para`,
  `https://${HOST}/para/inmobiliarias`,
  `https://${HOST}/para/gastronomia`,
  `https://${HOST}/para/marcas-de-ropa`,
  `https://${HOST}/para/profesionales`,
  `https://${HOST}/para/salud-estetica`,
  `https://${HOST}/calculadora-comisiones`,
  `https://${HOST}/ciudades`,
  `https://${HOST}/ciudades/neuquen`,
  `https://${HOST}/ciudades/catriel`,
  `https://${HOST}/ciudades/san-rafael`,
  `https://${HOST}/ciudades/mendoza`,
  `https://${HOST}/testimonials`,
  `https://${HOST}/kickoff`,
  `https://${HOST}/vs/se7en-vs-wordpress-woocommerce`,
  `https://${HOST}/vs/se7en-vs-tiendanube-shopify`,
  `https://${HOST}/vs/se7en-vs-agencia-tradicional`,
  `https://${HOST}/vs/se7en-vs-freelancer`,
  `https://${HOST}/vs/se7en-vs-webflow-framer`,
  `https://${HOST}/vs/se7en-vs-pedidosya-rappi-marketplaces`,
  `https://${HOST}/vs/se7en-vs-bubble-nocode`,
  `https://${HOST}/vs/se7en-vs-equipo-in-house`,
  `https://${HOST}/blog/cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina`,
  `https://${HOST}/blog/como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya`,
  `https://${HOST}/blog/por-que-mi-tienda-online-carga-lento-en-celular-y-como-bajarla-a-menos-de-1-segundo`,
  `https://${HOST}/blog/como-integrar-mercadopago-y-stripe-en-una-web-o-saas-en-argentina`,
  `https://${HOST}/blog/cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar`,
  `https://${HOST}/blog/como-hacer-que-chatgpt-y-perplexity-recomienden-tu-empresa-llms-txt`,
  `https://${HOST}/blog/sistema-de-turnos-y-reservas-online-con-sena-por-mercadopago-y-whatsapp`,
  `https://${HOST}/blog/que-es-se7en-studio-estudio-de-software-y-producto-digital`,
  `https://${HOST}/blog/de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress`,
  `https://${HOST}/blog/arquitectura-sin-comisiones-como-construimos-takefyy`,
  `https://${HOST}/blog/guia-definitiva-core-web-vitals-100-para-fundadores`,
];

async function submitIndexNow(urls) {
  if (urls.length === 0) {
    console.log("IndexNow: no hay URLs modificadas para notificar.");
    return;
  }

  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  };

  console.log(`IndexNow: notificando ${urls.length} URLs a api.indexnow.org...`);

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });

    if (res.ok || res.status === 200 || res.status === 202) {
      console.log(`IndexNow OK: ${res.status} ${res.statusText}`);
      urls.forEach((u) => console.log(`  ✓ ${u}`));
    } else {
      const text = await res.text();
      console.warn(`IndexNow response ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("IndexNow error al conectar:", err.message);
  }
}

const sendAll = process.argv.includes("--all");

if (sendAll) {
  await submitIndexNow(ALL_URLS);
} else {
  // Solo enviar URLs que cambiaron según git diff contra HEAD~1 o en el staging
  try {
    const diff = execSync("git diff --name-only HEAD~1", { encoding: "utf8" });
    const changed = new Set();
    for (const line of diff.split("\n").map((l) => l.trim())) {
      if (!line) continue;
      if (line.includes("blog")) {
        changed.add(`https://${HOST}/blog`);
      }
      if (line.includes("comparisons") || line.includes("/vs")) {
        changed.add(`https://${HOST}/vs`);
      }
      if (line.includes("pricing")) {
        changed.add(`https://${HOST}/pricing`);
      }
      if (line.includes("services")) {
        changed.add(`https://${HOST}/services`);
      }
      if (line.includes("app/(landing)") || line.includes("components/rd/")) {
        changed.add(`https://${HOST}/`);
      }
      if (line.includes("app/(site)/en/")) {
        changed.add(`https://${HOST}/en`);
      }
    }

    const toSubmit = changed.size > 0 ? Array.from(changed) : ALL_URLS.slice(0, 5);
    await submitIndexNow(toSubmit);
  } catch {
    // Si no es un repo con commits previos en CI, enviar rutas principales
    await submitIndexNow(ALL_URLS.slice(0, 10));
  }
}
