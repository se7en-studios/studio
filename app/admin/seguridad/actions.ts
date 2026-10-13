"use server";

import { getSession } from "@/lib/admin/auth";
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
