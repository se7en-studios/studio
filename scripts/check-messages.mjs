// Verifica la búsqueda y los adjuntos de los mensajes:
// node scripts/check-messages.mjs
import assert from "node:assert/strict";

const { attachmentPrefix, cleanAttachments, likePattern, MAX_ATTACHMENTS } = await import("../lib/admin/message-shared.ts");

// Búsqueda: los comodines de ilike que escribe la persona se buscan literales.
assert.equal(likePattern(" hola "), "%hola%");
assert.equal(likePattern("100%"), String.raw`%100\%%`);
assert.equal(likePattern("a_b"), String.raw`%a\_b%`);
assert.equal(likePattern(String.raw`c:\x`), String.raw`%c:\\x%`);

// Adjuntos: sólo los de la carpeta del canal, sin «..», con tope.
const ch = "p:muzzaga";
assert.equal(attachmentPrefix(ch), "_chat/p-muzzaga/");
assert.equal(attachmentPrefix("general"), "_chat/general/");
const ok = { path: "_chat/p-muzzaga/abc-logo.png", name: "logo.png", size: 1234.6, mime: "image/png" };
assert.deepEqual(cleanAttachments(ch, [ok]), [{ ...ok, size: 1235 }]);
assert.deepEqual(cleanAttachments(ch, [{ ...ok, path: "_chat/general/x.png" }]), []); // otro canal
assert.deepEqual(cleanAttachments(ch, [{ ...ok, path: "_chat/p-muzzaga/../muzzaga/diseno/x.png" }]), []);
assert.deepEqual(cleanAttachments(ch, [{ ...ok, path: "muzzaga/diseno/x.png" }]), []); // archivo de proyecto
assert.deepEqual(cleanAttachments(ch, "nada"), []);
assert.deepEqual(cleanAttachments(ch, [null, 3]), []);
assert.equal(cleanAttachments(ch, Array.from({ length: 30 }, () => ok)).length, MAX_ATTACHMENTS);
assert.equal(cleanAttachments(ch, [{ ...ok, size: -5, name: undefined }])[0].size, 0);

console.log("check-messages: ok");
