// Verifica cómo se validan los prospectos que se cargan desde el panel:
// node scripts/check-prospect-leads.mjs
import assert from "node:assert/strict";
import "./ts-hook.mjs";

const { cleanProspect, orderedCities, orderedCategories, DEFAULT_BUDGET_USD } = await import("../lib/admin/prospect-lead-shared.ts");

const ok = { name: "  Club Los Alerces ", city: "Allen", phone: "+54 9 299 507-7931" };

// Lo mínimo alcanza; el resto toma valores por defecto y se limpia.
const lead = cleanProspect(ok);
assert.equal(lead.name, "Club Los Alerces");
assert.equal(lead.city, "Allen");
assert.equal(lead.website_status, "Sin sitio web propio");
assert.equal(lead.estimated_budget_usd, DEFAULT_BUDGET_USD);
assert.equal(lead.current_site, "");

// Obligatorios: nombre, ciudad y un teléfono usable para WhatsApp.
assert.throws(() => cleanProspect({ ...ok, name: "  " }), /nombre/);
assert.throws(() => cleanProspect({ ...ok, city: "" }), /ciudad/);
assert.throws(() => cleanProspect({ ...ok, phone: "" }), /teléfono/);
assert.throws(() => cleanProspect({ ...ok, phone: "12345" }), /teléfono/);
assert.throws(() => cleanProspect({ ...ok, phone: "abc 1234 5678" }), /teléfono/);

// La web: sin protocolo se completa; sólo http/https.
assert.equal(cleanProspect({ ...ok, current_site: "clubalerces.com.ar" }).current_site, "https://clubalerces.com.ar");
assert.equal(cleanProspect({ ...ok, current_site: "http://a.com" }).current_site, "http://a.com");
assert.throws(() => cleanProspect({ ...ok, current_site: "javascript:alert(1)" }), /web/);
assert.throws(() => cleanProspect({ ...ok, current_site: "algo raro" }), /web/);

// Estado de la web y monto.
assert.throws(() => cleanProspect({ ...ok, website_status: "inventado" }), /web/);
assert.equal(cleanProspect({ ...ok, estimated_budget_usd: "1500.4" }).estimated_budget_usd, 1500);
assert.equal(cleanProspect({ ...ok, estimated_budget_usd: "" }).estimated_budget_usd, DEFAULT_BUDGET_USD);
assert.throws(() => cleanProspect({ ...ok, estimated_budget_usd: -5 }), /monto/);
assert.throws(() => cleanProspect({ ...ok, estimated_budget_usd: "mucho" }), /monto/);

// Largos: se recortan, no rompen.
assert.equal(cleanProspect({ ...ok, pain_point: "x".repeat(900) }).pain_point.length, 500);

// Filtros: las ciudades conocidas primero, las nuevas después y sin repetir.
assert.deepEqual(orderedCities(["Allen", "Catriel", "Allen", "Mendoza", "Cinco Saltos"]), ["Catriel", "Mendoza", "Allen", "Cinco Saltos"]);
assert.deepEqual(orderedCategories(["Panadería", "Inmobiliaria", "", "Panadería"]), ["Inmobiliaria", "Panadería"]);

console.log("prospectos propios: ok");
