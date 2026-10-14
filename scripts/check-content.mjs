// Verifica la validación de los posts que se cargan desde el panel:
// node scripts/check-content.mjs
import assert from "node:assert/strict";

const { cleanPost } = await import("../lib/admin/content-shared.ts");

const base = { post_date: "2026-10-20", kind: "reel", title: "  Caso: Muzzaga  " };
assert.deepEqual(cleanPost(base), {
  post_date: "2026-10-20",
  kind: "reel",
  title: "Caso: Muzzaga",
  pinned: false,
  steps: "",
  caption: "",
  tips: [],
});
assert.deepEqual(cleanPost({ ...base, tips: [" a ", "", "b"], pinned: 1 }).tips, ["a", "b"]);
assert.equal(cleanPost({ ...base, pinned: 1 }).pinned, true);
assert.throws(() => cleanPost({ ...base, title: "  " }), /título/);
assert.throws(() => cleanPost({ ...base, post_date: "20/10/2026" }), /Fecha/);
assert.throws(() => cleanPost({ ...base, post_date: "2026-13-45" }), /Fecha/);
assert.throws(() => cleanPost({ ...base, kind: "tiktok" }), /Tipo/);
assert.equal(cleanPost({ ...base, caption: "x".repeat(9000) }).caption.length, 5000);

console.log("check-content: ok");
