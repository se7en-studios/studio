"use server";

// Acciones de la caja fuerte. Ver o cambiar una clave pide la contraseña del panel
// (o haberla puesto hace menos de 5 minutos); los intentos fallidos se frenan por IP, y
// cada vez que alguien abre una clave queda anotado en el Registro (sin la clave).
import { headers } from "next/headers";
import { after } from "next/server";
import {
  checkPassword,
  getSession,
  lockVault,
  unlockVault,
  vaultUnlocked,
} from "@/lib/admin/auth";
import type { LeadOwner } from "@/lib/admin/db";
import { logEvent } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";
import {
  accountUrl,
  insertAccount,
  readSecrets,
  removeAccount,
  updateAccount,
} from "@/lib/admin/vault";
import { vaultReady } from "@/lib/admin/vault-crypto";
import {
  cleanAccount,
  type Account,
  type AccountInput,
} from "@/lib/admin/vault-shared";
import { clearHits, clientIp, isLimitedStrict, recordHit } from "@/lib/rate-limit";

const MAX_FAILED = 5;
const WINDOW_MS = 15 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Fail = { error: string; needPassword?: boolean };
export type VaultResult<T> = T | Fail;

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  if (!vaultReady()) throw new Error("Falta cargar VAULT_KEY en Vercel.");
  return me;
}

/** null si la caja está abierta (o se abre con la contraseña); si no, el motivo. */
async function ensureOpen(
  who: LeadOwner,
  password?: string,
): Promise<Fail | null> {
  if (await vaultUnlocked(who)) return null;
  if (!password)
    return { error: "Poné tu contraseña para seguir.", needPassword: true };
  await new Promise((r) => setTimeout(r, 400)); // frena probar contraseñas en ráfaga
  const ip = clientIp(await headers());
  // Se anota el intento ANTES de probar la contraseña y se cuenta después: así una ráfaga en
  // paralelo no pasa toda con el contador en cero. Si acierta, se limpian los intentos.
  await recordHit("vault_unlock", ip);
  if (await isLimitedStrict("vault_unlock", ip, MAX_FAILED + 1, WINDOW_MS)) {
    return {
      error: "Demasiados intentos fallidos. Probá de nuevo en 15 minutos.",
      needPassword: true,
    };
  }
  if (!checkPassword(password, who)) {
    return { error: "Contraseña incorrecta.", needPassword: true };
  }
  await clearHits("vault_unlock", ip);
  await unlockVault(who);
  return null;
}

const KNOWN = /^(Sesión vencida|Falta cargar VAULT_KEY|No se pudo descifrar|Falta correr|Falta conectar)/;
const failed = (e: unknown): { error: string } => {
  if (e instanceof Error && KNOWN.test(e.message)) return { error: e.message };
  console.error("[cuentas]", e instanceof Error ? e.message : e);
  return { error: "No se pudo completar. Probá de nuevo." };
};
const name = (a: { service: string; label: string }) =>
  a.label ? `${a.service} · ${a.label}` : a.service;

/** Crea una cuenta, o la edita. Cambiar la clave o las notas de una existente pide la contraseña. */
export async function saveAccount(
  id: string | null,
  input: AccountInput,
  password?: string,
): Promise<VaultResult<{ account: Account }>> {
  try {
    const me = await guard();
    if (id && !UUID.test(id)) return { error: "Cuenta inválida." };
    const clean = cleanAccount(input, { creating: !id });
    if (!clean.ok) return { error: clean.error };
    const v = clean.value;
    if (id && (v.secret || v.notes || (v.url ?? null) !== (await accountUrl(id)))) {
      const closed = await ensureOpen(me.who, password);
      if (closed) return closed;
    }
    const today = dayKey();
    const account = id
      ? await updateAccount(id, v, today)
      : await insertAccount(v, me.who, today);
    if (!account) return { error: "Esa cuenta ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `${id ? (v.secret ? "cambió la clave de" : "editó") : "guardó la cuenta"} ${name(account)} en Cuentas`,
      }),
    );
    return { account };
  } catch (e) {
    return failed(e);
  }
}

/** La clave y las notas de una cuenta. Queda en el Registro quién la abrió. */
export async function revealAccount(
  id: string,
  password?: string,
): Promise<VaultResult<{ secret: string; notes: string | null }>> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Cuenta inválida." };
    const closed = await ensureOpen(me.who, password);
    if (closed) return closed;
    const found = await readSecrets(id);
    if (!found) return { error: "Esa cuenta ya no existe." };
    await logEvent({
      actor: me.who,
      kind: "proyecto",
      text: `abrió la clave de ${name(found)} en Cuentas`,
    });
    return { secret: found.secret, notes: found.notes };
  } catch (e) {
    return failed(e);
  }
}

export async function deleteAccount(
  id: string,
  password?: string,
): Promise<VaultResult<{ ok: true }>> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Cuenta inválida." };
    const closed = await ensureOpen(me.who, password);
    if (closed) return closed;
    const gone = await removeAccount(id);
    if (!gone) return { error: "Esa cuenta ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `borró la cuenta ${name(gone)} de Cuentas`,
      }),
    );
    return { ok: true };
  } catch (e) {
    return failed(e);
  }
}

/** Cierra la caja ya mismo, sin esperar los 5 minutos. */
export async function closeVault(): Promise<void> {
  if (await getSession()) await lockVault();
}
