/**
 * Notificador instantáneo para Se7en Studio.
 * Envía avisos de nuevos leads a Telegram si están configuradas las variables de entorno.
 */

export interface LeadNotificationPayload {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  projectType?: string;
  budget?: string;
  timeline?: string;
  source?: string;
  idea?: string;
}

export async function notifyLead(payload: LeadNotificationPayload): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // Si no está configurado, no hace nada y no bloquea el flujo.
    return false;
  }

  const lines = [
    "🔥 *¡Nuevo Lead en Se7en Studio!*",
    `👤 *Nombre:* ${payload.name}`,
    payload.phone ? `📱 *Teléfono:* ${payload.phone}` : null,
    payload.email ? `📧 *Email:* ${payload.email}` : null,
    payload.company ? `🏢 *Empresa:* ${payload.company}` : null,
    payload.projectType ? `🎯 *Tipo:* ${payload.projectType}` : null,
    payload.budget ? `💰 *Presupuesto:* ${payload.budget}` : null,
    payload.timeline ? `⏱️ *Plazo:* ${payload.timeline}` : null,
    payload.source ? `📍 *Origen:* ${payload.source}` : null,
    payload.idea ? `💬 *Detalle:* ${payload.idea.slice(0, 300)}` : null,
  ].filter(Boolean);

  const text = lines.join("\n");

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("[notify] Error enviando notificación a Telegram:", err);
    return false;
  }
}

