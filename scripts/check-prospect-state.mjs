// Verifica el seguimiento del radar de prospectos (sin respuesta y contactados de hoy):
// node scripts/check-prospect-state.mjs
import assert from "node:assert/strict";
import "./ts-hook.mjs";

const { COLD_DAYS, coldDays, contactedToday, lastContactAt, daysSinceContact, templateKindFor } = await import("../lib/admin/prospect-followup.ts");

const DAY = 86_400_000;
const now = Date.parse("2026-11-04T15:00:00-03:00");
const row = (over) => ({ lead_id: "x", status: "contactado", contacted_by: "franco", contacted_at: null, note: "", note_by: null, note_at: null, updated_by: null, updated_at: "", ...over });
const ago = (days) => new Date(now - days * DAY).toISOString();

// Última vez que se le escribió: el dato nuevo, o el primer contacto si falta.
assert.equal(lastContactAt(undefined), null);
assert.equal(lastContactAt(row({ contacted_at: ago(5) })), ago(5));
assert.equal(lastContactAt(row({ contacted_at: ago(5), last_contact_at: ago(1) })), ago(1));

// Para retomar: sólo «contactado», y recién al llegar al plazo.
assert.equal(coldDays(row({ contacted_at: ago(COLD_DAYS - 1) }), now), null);
assert.equal(coldDays(row({ contacted_at: ago(COLD_DAYS) }), now), COLD_DAYS);
assert.equal(coldDays(row({ contacted_at: ago(10) }), now), 10);
assert.equal(coldDays(row({ contacted_at: ago(10), last_contact_at: ago(1) }), now), null, "un mensaje nuevo reinicia la cuenta");
assert.equal(coldDays(row({ status: "en_charla", contacted_at: ago(10) }), now), null);
assert.equal(coldDays(row({ status: "nuevo" }), now), null);
assert.equal(coldDays(row({ contacted_at: null }), now), null);
assert.equal(coldDays(undefined, now), null);

// Hoy (hora de Argentina): cuenta por quien hizo el último contacto.
const t = contactedToday(
  [
    row({ last_contact_at: ago(0), last_contact_by: "federico" }),
    row({ last_contact_at: ago(0), last_contact_by: "federico" }),
    row({ contacted_at: ago(0), contacted_by: "franco" }), // sin el dato nuevo: vale el primer contacto
    row({ last_contact_at: ago(1), last_contact_by: "franco" }), // ayer
    row({ status: "nuevo", contacted_by: null }),
  ],
  now,
);
assert.deepEqual(t, { franco: 1, federico: 2 });

// Días desde el último contacto, y qué tipo de mensaje corresponde según la etapa.
assert.equal(daysSinceContact(undefined, now), null);
assert.equal(daysSinceContact(row({ contacted_at: ago(4) }), now), 4);
assert.equal(daysSinceContact(row({ contacted_at: ago(4), last_contact_at: ago(2) }), now), 2);
assert.equal(templateKindFor(undefined), "primero");
assert.equal(templateKindFor("nuevo"), "primero");
assert.equal(templateKindFor("numero_equivocado"), "primero");
assert.equal(templateKindFor("contactado"), "seguimiento");
assert.equal(templateKindFor("en_charla"), "seguimiento");

console.log("estado de prospectos: ok");
