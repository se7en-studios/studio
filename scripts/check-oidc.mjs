// Verifica lib/admin/github-oidc.ts con llaves propias: sólo pasa el token del
// workflow de capturas, en master, de este repo, para esta audiencia y sin vencer.
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { GITHUB_ISSUER, verifyGithubOidc } from "../lib/admin/github-oidc.ts";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const keys = async () => [{ ...publicKey.export({ format: "jwk" }), kid: "k1" }];

const want = { audience: "se7en-capturas", repositoryId: "1334580586", workflow: ".github/workflows/capturas.yml", ref: "refs/heads/master" };
const now = Date.UTC(2026, 9, 14, 12, 0, 0);
const t = Math.floor(now / 1000);
const good = {
  iss: GITHUB_ISSUER,
  aud: "se7en-capturas",
  exp: t + 300,
  nbf: t - 5,
  repository: "se7en-studios/studio",
  repository_id: "1334580586",
  ref: "refs/heads/master",
  workflow_ref: "se7en-studios/studio/.github/workflows/capturas.yml@refs/heads/master",
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (claims, { key = privateKey, kid = "k1", alg = "RS256" } = {}) => {
  const head = `${b64({ alg, kid, typ: "JWT" })}.${b64(claims)}`;
  return `${head}.${sign("RSA-SHA256", Buffer.from(head), key).toString("base64url")}`;
};
const ok = (token) => verifyGithubOidc(token, want, keys, now);

assert.ok(await ok(jwt(good)), "el token bueno pasa");
assert.ok(await ok(jwt({ ...good, repository: "otro-dueño/studio", workflow_ref: "otro-dueño/studio/.github/workflows/capturas.yml@refs/heads/master" })), "el repo renombrado (mismo id) pasa");
assert.equal(await ok(jwt(good, { key: other.privateKey })), null, "firmado con otra llave");
assert.equal(await ok(jwt(good, { kid: "k9" })), null, "llave que no es de GitHub");
assert.equal(await ok(jwt(good, { alg: "none" })), null, "sin firma RS256");
assert.equal(await ok(jwt({ ...good, iss: "https://evil.example" })), null, "otro emisor");
assert.equal(await ok(jwt({ ...good, aud: "otra-cosa" })), null, "otra audiencia");
assert.equal(await ok(jwt({ ...good, exp: t - 120 })), null, "vencido");
assert.equal(await ok(jwt({ ...good, nbf: t + 600 })), null, "todavía no vale");
assert.equal(await ok(jwt({ ...good, repository_id: "999" })), null, "otro repo (un fork)");
assert.equal(await ok(jwt({ ...good, ref: "refs/heads/feature", workflow_ref: "se7en-studios/studio/.github/workflows/capturas.yml@refs/heads/feature" })), null, "otra rama");
assert.equal(await ok(jwt({ ...good, workflow_ref: "se7en-studios/studio/.github/workflows/ci.yml@refs/heads/master" })), null, "otro workflow");
assert.equal(await ok(jwt({ ...good, workflow_ref: "se7en-studios/studio/.github/workflows/x-capturas.yml@refs/heads/master" })), null, "un workflow con un nombre parecido");
const [h, , s] = jwt(good).split(".");
assert.equal(await ok(`${h}.${b64({ ...good, aud: ["se7en-capturas"], exp: t + 99999 })}.${s}`), null, "claims cambiados después de firmar");
assert.equal(await ok("no.es.unjwt"), null, "basura");
assert.equal(await ok("sólo-un-secreto"), null, "un CRON_SECRET no es un token");

console.log("oidc OK");
