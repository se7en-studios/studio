// Tokens OIDC de GitHub Actions: cada tarea puede pedirle a GitHub un token
// firmado que dice de qué repo, de qué workflow y de qué rama viene. Con eso la
// tarea de capturas se identifica sin un secreto compartido. Sólo servidor.
import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

export const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";

/** Lo que tiene que decir el token para aceptarlo. */
export type OidcExpect = {
  audience: string;
  /** El id no cambia si el repo se renombra o cambia de dueño. */
  repositoryId: string;
  /** Ruta del workflow dentro del repo, p. ej. ".github/workflows/capturas.yml". */
  workflow: string;
  ref: string;
};

type Jwk = JsonWebKey & { kid?: string };
export type KeySource = (refresh: boolean) => Promise<Jwk[]>;

let cache: { at: number; keys: Jwk[] } | null = null;
/** Las llaves públicas de GitHub, guardadas una hora (o de nuevo si aparece una que no conocemos). */
const githubKeys: KeySource = async (refresh) => {
  if (!refresh && cache && Date.now() - cache.at < 3_600_000) return cache.keys;
  const res = await fetch(`${GITHUB_ISSUER}/.well-known/jwks`, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudieron leer las llaves de GitHub (${res.status}).`);
  cache = { at: Date.now(), keys: ((await res.json()) as { keys: Jwk[] }).keys };
  return cache.keys;
};

const part = (s: string) => JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as Record<string, unknown>;

/**
 * Los claims del token si lo firmó GitHub y viene de ese workflow, en esa rama
 * de ese repo, para esta audiencia y sin vencer. Si no, null.
 */
export async function verifyGithubOidc(token: string, want: OidcExpect, keys: KeySource = githubKeys, now = Date.now()): Promise<Record<string, unknown> | null> {
  const [h, p, s] = token.split(".");
  if (!h || !p || !s || token.split(".").length !== 3) return null;
  let header: Record<string, unknown>, claims: Record<string, unknown>;
  try {
    header = part(h);
    claims = part(p);
  } catch {
    return null;
  }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  const jwk = (await keys(false)).find((k) => k.kid === header.kid) ?? (await keys(true)).find((k) => k.kid === header.kid);
  if (!jwk) return null;
  const signed = verify("RSA-SHA256", Buffer.from(`${h}.${p}`), createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(s, "base64url"));
  if (!signed) return null;

  const t = Math.floor(now / 1000);
  const aud = claims.aud;
  const audOk = aud === want.audience || (Array.isArray(aud) && aud.includes(want.audience));
  const timeOk = typeof claims.exp === "number" && claims.exp > t - 30 && (typeof claims.nbf !== "number" || claims.nbf <= t + 30);
  const fromRepo = claims.repository_id === want.repositoryId && claims.ref === want.ref;
  // workflow_ref: "dueño/repo/.github/workflows/x.yml@refs/heads/rama". El dueño
  // y el nombre pueden cambiar (ya se comprobó el id): se mira lo que sigue.
  const wf = typeof claims.workflow_ref === "string" ? claims.workflow_ref : "";
  const fromWorkflow = wf.endsWith(`/${want.workflow}@${want.ref}`);
  return claims.iss === GITHUB_ISSUER && audOk && timeOk && fromRepo && fromWorkflow ? claims : null;
}
