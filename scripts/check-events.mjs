// Verifica los tipos del Registro de cambios: node scripts/check-events.mjs
// Los eventos viejos anotados como «proyecto» se reconocen por el texto (las
// mismas reglas que supabase/panel-v3.sql) y lo del proyecto queda como está.
import assert from "node:assert/strict";

const E = await import("../lib/admin/event-shared.ts");

const cases = {
  finanzas: [
    "cargó un costo: Supabase",
    "cargó un ingreso: Mantenimiento",
    "editó un ingreso: Otros",
    "borró un costo: claude",
    "marcó como pagado: Vercel",
    "marcó como cobrado: Cuota 2",
    "agregó la herramienta Claude",
    "actualizó la herramienta Vercel",
    "quitó la herramienta Figma",
    "registró un cobro de USD 500 (Seña)",
    "editó un cobro",
    "borró un cobro de USD 300 del 5 oct",
  ],
  cuentas: [
    "guardó la cuenta Gmail en Cuentas",
    "guardó la cuenta Instagram · @se7enstudio.ar en Cuentas",
    "editó Vercel en Cuentas",
    "cambió la clave de Supabase en Cuentas",
    "abrió la clave de Gmail en Cuentas",
    "borró la cuenta Figma de Cuentas",
    "borró las notas de Gmail en Cuentas",
  ],
  contenido: ["publicó «Lanzamiento Apex» en Instagram", "desmarcó «Carrusel» en Instagram"],
  llamadas: ["llamó a Franco por Meet"],
  seguridad: [
    "descargó una copia de seguridad",
    "descargó una copia de seguridad cifrada",
    "entró al panel",
    "no pudo entrar al panel (contraseña incorrecta)",
    "no pudo entrar al panel (código incorrecto)",
    "cerró todas las sesiones del panel",
  ],
  proyecto: [
    "pasó el proyecto a Mantenimiento",
    "creó el proyecto",
    "creó el proyecto desde el pedido de Ana",
    "borró el proyecto «Cuentas claras en Instagram»",
    "actualizó etapa, monto",
    "editó nombre, sitio",
  ],
};
for (const [kind, texts] of Object.entries(cases))
  for (const text of texts) assert.equal(E.kindOf("proyecto", text), kind, text);

// Sólo los «proyecto» pueden ser otra cosa: un pedido o una tarea no se reclasifican.
assert.equal(E.kindOf("pedido", "cargó un costo: algo"), "pedido");
assert.equal(E.kindOf("tarea", "llamó a Franco por Meet"), "tarea");
assert.equal(E.kindOf("finanzas", "creó el proyecto"), "finanzas");

// Los tipos de antes siguen siendo válidos, y todos los nuevos tienen nombre propio.
for (const k of E.LEGACY_KINDS) assert.ok(E.EVENT_KINDS.includes(k), k);
assert.equal(new Set(E.EVENT_KINDS).size, 9);

console.log("events OK");
