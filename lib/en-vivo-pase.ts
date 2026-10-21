// Los pases del canal en vivo de la oficina (ver lib/oficinas/vivo.ts). Cada
// pestaña que entra (la landing a pantalla completa o el mapa del panel) arma
// un par de llaves que no sale del navegador y pide acá un pase: quién es (la
// visita, por su IP del día, o el socio con la sesión del panel), qué muñeco
// lleva y la llave pública de esa pestaña, firmado por el servidor. Cada
// movimiento y cada gesto va firmado con la llave de la pestaña: los demás
// verifican el pase con la llave del servidor y el mensaje con la del pase.
// Así nadie mueve el muñeco de otro ni se hace pasar por Franco o Federico.
//
// La llave del servidor (ECDSA P-256) se deriva de ADMIN_SESSION_SECRET con
// una etiqueta propia: no hay que cargar nada nuevo en Vercel. Sin ese secreto
// (o si tiene menos de 32 caracteres) no hay pases y la oficina sigue como
// antes, sin el canal. Sólo servidor.
import { createECDH, createPrivateKey, hkdfSync, sign, type KeyObject } from "node:crypto";
import type { ActorLook } from "@/lib/oficinas/art";

/** Cuánto vale un pase: la pestaña pide otro antes de que venza. */
export const PASS_MS = 2 * 60 * 60_000;

export type PassBody = { i: string; l: ActorLook; n: string | null; e: number; k: string };
export type PassReply = {
  /** El pase (JSON en base64url) y su firma. */
  pass: string;
  sig: string;
  /** La llave pública del servidor (P-256 cruda, base64url), para verificar los pases de los demás. */
  server: string;
  /** El canal de Supabase Realtime; null = local (las pestañas del mismo navegador, por BroadcastChannel). */
  topic: string | null;
};

let keys: { priv: KeyObject; pub: string } | null | undefined;
function serverKeys() {
  if (keys !== undefined) return keys;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) return (keys = null);
  // Si el número cae fuera de la curva (casi imposible) se prueba con el siguiente
  for (let n = 0; n < 8; n++) {
    const d = Buffer.from(hkdfSync("sha256", secret, "se7en-en-vivo", `pase p256 ${n}`, 32));
    try {
      const ecdh = createECDH("prime256v1");
      ecdh.setPrivateKey(d);
      const pub = ecdh.getPublicKey();
      const priv = createPrivateKey({
        key: { kty: "EC", crv: "P-256", d: d.toString("base64url"), x: pub.subarray(1, 33).toString("base64url"), y: pub.subarray(33).toString("base64url") },
        format: "jwk",
      });
      return (keys = { priv, pub: pub.toString("base64url") });
    } catch {
      // siguiente
    }
  }
  return (keys = null);
}

/** La llave pública de una pestaña: un punto P-256 sin comprimir (65 bytes, empieza con 0x04). */
export function validTabKey(k: unknown): k is string {
  return typeof k === "string" && /^[A-Za-z0-9_-]{87}$/.test(k) && Buffer.from(k, "base64url")[0] === 4;
}

/** El canal de cada entorno: producción y las vistas previas no se mezclan; en local, las pestañas entre sí. */
const topicOf = () => (process.env.VERCEL_ENV ? `se7en-en-vivo-${process.env.VERCEL_ENV}` : null);

/** Firma el pase de `who` para la llave `k` de su pestaña. null si no hay llave del servidor. */
export function issuePass(who: { id: string; look: ActorLook; name: string | null }, k: string, now = Date.now()): PassReply | null {
  const s = serverKeys();
  if (!s) return null;
  const body: PassBody = { i: who.id, l: who.look, n: who.name, e: now + PASS_MS, k };
  const pass = Buffer.from(JSON.stringify(body)).toString("base64url");
  const sig = sign("sha256", Buffer.from(pass), { key: s.priv, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return { pass, sig, server: s.pub, topic: topicOf() };
}
