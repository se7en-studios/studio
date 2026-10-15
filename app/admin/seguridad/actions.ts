"use server";

import { after } from "next/server";
import { getSession, lockVault, revokeAllSessions, startSession } from "@/lib/admin/auth";
import { logEvent } from "@/lib/admin/panel";
import { isTotpSecret, verifyTotp } from "@/lib/admin/totp";

/**
 * Comprueba que la app de la persona ya genera los códigos del secreto nuevo, ANTES de que lo
 * cargue en Vercel. Si el código no coincide, no se activa nada: así nadie se deja afuera por
 * cargar un secreto mal copiado.
 */
export async function checkSetupCode(
  secret: string,
  code: string,
): Promise<{ ok: true } | { error: string }> {
  if (!(await getSession()))
    return { error: "Sesión vencida: volvé a entrar." };
  if (!isTotpSecret(secret))
    return { error: "El secreto no es válido. Recargá la página." };
  return verifyTotp(secret, code)
    ? { ok: true }
    : {
        error:
          "Ese código no coincide. Revisá que la hora del celular sea automática y probá con el código siguiente.",
      };
}

/**
 * Saca a todos del panel (los dos, en todos los dispositivos): las sesiones
 * firmadas hasta ahora dejan de valer. Quien lo pide sigue adentro en este
 * dispositivo con una sesión nueva. Para un celular perdido o una compu ajena.
 */
export async function closeAllSessions(): Promise<{ error?: string }> {
  const me = await getSession();
  if (!me) return { error: "Sesión vencida: volvé a entrar." };
  try {
    if (!(await revokeAllSessions())) return { error: "Falta correr supabase/security-v2.sql en Supabase." };
  } catch (e) {
    console.error("[seguridad] cerrar sesiones:", e instanceof Error ? e.message : e);
    return { error: "No se pudieron cerrar las sesiones. Probá de nuevo." };
  }
  await startSession(me.who);
  await lockVault();
  after(() => logEvent({ actor: me.who, kind: "seguridad", text: "cerró todas las sesiones del panel" }));
  return {};
}
