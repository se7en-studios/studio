// Historial de contactos de un pedido: tipos y reglas. Puro, sin dependencias
// de servidor: lo usan las páginas y los componentes de cliente.
import type { Lead, LeadOwner } from "./db";

export const ACTIVITY_KINDS = ["llamada", "mail", "whatsapp", "reunion", "nota"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  llamada: "Llamada",
  mail: "Mail",
  whatsapp: "WhatsApp",
  reunion: "Reunión",
  nota: "Nota",
};

export type Activity = {
  id: string;
  created_at: string;
  lead_id: string;
  kind: ActivityKind;
  text: string;
  at: string;
  actor: LeadOwner | null;
};

export const ACTIVITY_TEXT_MAX = 2000;

/** Por dónde llegó un pedido cargado a mano desde el panel. */
export const MANUAL_CHANNELS = ["whatsapp", "instagram", "referido", "email", "llamada", "otro"] as const;
/** Un pedido en curso sin contacto hace más que esto está frío. */
export const COLD_AFTER_DAYS = 7;

/** Una nota no cuenta como contacto con el cliente; lo demás sí. */
export const isContact = (a: Pick<Activity, "kind">) => a.kind !== "nota";

/** Último contacto real (ISO) de cada pedido. */
export function lastContacts(activities: Activity[]): Map<string, string> {
  const out = new Map<string, string>();
  for (const a of activities) {
    if (!isContact(a)) continue;
    const prev = out.get(a.lead_id);
    if (!prev || a.at > prev) out.set(a.lead_id, a.at);
  }
  return out;
}

/** Días sin contacto si el pedido está en curso y se enfrió; si no, null. */
export function coldDays(lead: Pick<Lead, "status" | "created_at">, last: string | undefined, now: number): number | null {
  if (lead.status !== "contactado" && lead.status !== "propuesta") return null;
  const days = Math.floor((now - Date.parse(last ?? lead.created_at)) / 86_400_000);
  return days >= COLD_AFTER_DAYS ? days : null;
}
