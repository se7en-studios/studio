// Verifica los textos de los avisos: node scripts/check-digest.mjs
import assert from "node:assert/strict";

const { morningDigest, eveningReminder, newLeadNotice } = await import("../lib/admin/digest.ts");

const today = "2026-10-13";
const base = { posts: [], today, overdueTasks: 0, dueTodayTasks: 0, newLeads: 0 };

// Sin nada que avisar no se manda nada.
assert.equal(morningDigest(base), null);
assert.equal(eveningReminder([], today), null);
assert.equal(eveningReminder([{ title: "Atrasado", date: "2026-10-12" }], today), null); // solo los de hoy

// Mañana: posts de hoy, atrasados, tareas y pedidos, con singular y plural.
const full = morningDigest({
  ...base,
  posts: [
    { title: "Reel: la web de Altum", date: today },
    { title: "Viejo", date: "2026-10-10" },
    { title: "Otro viejo", date: "2026-10-11" },
  ],
  overdueTasks: 1,
  dueTodayTasks: 3,
  newLeads: 2,
});
assert.equal(full.title, "Buen día: esto es lo de hoy");
assert.equal(
  full.message,
  ["• Hoy 19 h: Reel: la web de Altum", "• 2 posts atrasados sin publicar", "• 1 tarea vencida y 3 para hoy", "• 2 pedidos sin responder"].join("\n"),
);
assert.equal(full.path, "/admin");
assert.equal(morningDigest({ ...base, overdueTasks: 2 }).message, "• 2 tareas vencidas");
assert.equal(morningDigest({ ...base, dueTodayTasks: 1 }).message, "• 1 tarea para hoy");
assert.equal(morningDigest({ ...base, newLeads: 1 }).message, "• 1 pedido sin responder");
assert.equal(morningDigest({ ...base, posts: [{ title: "x", date: "2026-10-01" }] }).message, "• 1 post atrasado sin publicar");

// Tarde: título según cantidad, y abre Contenido.
const one = eveningReminder([{ title: "Carrusel: Takefyy", date: today }], today);
assert.equal(one.title, "Falta publicar hoy");
assert.equal(one.message, "• Carrusel: Takefyy");
assert.equal(one.path, "/admin/contenido");
assert.equal(
  eveningReminder(
    [
      { title: "A", date: today },
      { title: "B", date: today },
    ],
    today,
  ).title,
  "Faltan publicar hoy",
);

// Pedido nuevo: nunca lleva nombre ni datos del cliente, solo por dónde llegó.
assert.match(newLeadNotice("whatsapp").message, /WhatsApp/);
assert.match(newLeadNotice("email").message, /web/);
assert.equal(newLeadNotice(undefined).path, "/admin/pedidos");

console.log("digest OK");
