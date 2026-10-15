// Los 8 puntos de «Seguridad», en un solo lugar: los muestra Seguridad con su
// paso a paso y Ajustes como «N de 8». Sólo lee variables de entorno.
import { hasOwnPassword, sessionSecretStrong, sharedPasswordActive, totpStatus } from "@/lib/admin/auth";
import type { LeadOwner } from "@/lib/admin/db";
import { notificationsConfigured } from "@/lib/admin/notify";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { vaultReady } from "@/lib/admin/vault-crypto";

export type CheckRow = { label: string; ok: boolean; hint: string };

export function securityChecklist(who: LeadOwner): CheckRow[] {
  const me = { who };
  const other = PEOPLE_IDS.find((p) => p !== me.who) ?? me.who;
  const mine = me.who.toUpperCase();
  const names = { me: PEOPLE[me.who].name, other: PEOPLE[other].name };
  const bothOwn = hasOwnPassword(me.who) && hasOwnPassword(other);

  return [
  {
    label: `Contraseña propia de ${names.me}`,
    ok: hasOwnPassword(me.who),
    hint: `Cargá ADMIN_PASSWORD_${mine} en Vercel.`,
  },
  {
    label: `Contraseña propia de ${names.other}`,
    ok: hasOwnPassword(other),
    hint: `Que cargue ADMIN_PASSWORD_${other.toUpperCase()} en Vercel.`,
  },
  {
    label: "Contraseña compartida apagada",
    ok: !sharedPasswordActive(),
    hint: bothOwn
      ? "Los dos ya tienen la propia: borrá ADMIN_PASSWORD de Vercel y redeployá."
      : "Se apaga cuando los dos tengan la propia (borrando ADMIN_PASSWORD).",
  },
  {
    label: `Segundo paso de ${names.me}`,
    ok: totpStatus(me.who) === "ok",
    hint:
      totpStatus(me.who) === "broken"
        ? `TOTP_SECRET_${mine} no es un secreto válido: entrar queda bloqueado. Corregila o borrala en Vercel.`
        : "Activalo en el recuadro de al lado.",
  },
  {
    label: `Segundo paso de ${names.other}`,
    ok: totpStatus(other) === "ok",
    hint:
      totpStatus(other) === "broken"
        ? `TOTP_SECRET_${other.toUpperCase()} no es un secreto válido: su ingreso queda bloqueado hasta corregirla o borrarla.`
        : "Lo activa desde esta misma pantalla.",
  },
  {
    label: "Firma de las sesiones",
    ok: sessionSecretStrong(),
    hint: "ADMIN_SESSION_SECRET tiene que tener 32 caracteres o más.",
  },
  {
    label: "Llave de la caja fuerte",
    ok: vaultReady(),
    hint: "Falta VAULT_KEY en Vercel.",
  },
  {
    label: "Avisos al celular",
    ok: notificationsConfigured(),
    hint: "Falta NTFY_TOPIC en Vercel.",
  },
];
}
