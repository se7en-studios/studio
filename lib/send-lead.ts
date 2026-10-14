export interface LeadPayload {
  name: string;
  email?: string;
  company?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  idea?: string;
  /** De qué formulario viene, para el panel /admin. */
  source?: string;
  phone?: string;
  /** Texto libre con nombre y contacto (kickoff): de ahí salen email y teléfono. */
  contact?: string;
  /** Fecha y hora de la reunión pedida (ISO), para la reserva. */
  meetingAt?: string;
}

export type LeadResult = { ok: true } | { ok: false; error: string };

const FALLBACK_ERROR =
  "No pudimos enviar tu mensaje. Escribinos por WhatsApp y lo vemos al toque.";

// Único punto de envío de leads: si /api/contact no confirma, el formulario
// tiene que mostrar el error y ofrecer WhatsApp, nunca un éxito falso.
export async function sendLead(payload: LeadPayload): Promise<LeadResult> {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    const data: unknown = await res.json().catch(() => null);
    const error =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : FALLBACK_ERROR;
    return { ok: false, error };
  } catch {
    return { ok: false, error: FALLBACK_ERROR };
  }
}
