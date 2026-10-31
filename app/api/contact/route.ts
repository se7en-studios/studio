import { NextResponse } from "next/server";
import { SITE } from "@/data/site";
import { insertLead, type NewLead } from "@/lib/admin/db";
import { intakeLead } from "@/lib/admin/intake";
import { cleanPublicPhone, contactFrom, meetingLabel, parseMeeting } from "@/lib/admin/sales-shared";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import { notifyLead } from "@/lib/notify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD = 200;
const MAX_IDEA = 5000;
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 10 * 60 * 1000;
// Formularios que llaman a /api/contact (vía lib/send-lead.ts). Otro valor → "web".
const SOURCES = new Set(["auditoría", "kickoff", "start", "reserva", "cotizador"]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function field(value: unknown, fallback: string, max = MAX_FIELD): string {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, max) : fallback;
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  // Trampa anti-spam: los bots completan el campo oculto.
  if (body.honeypot) {
    return NextResponse.json({ success: true }, { status: 200 });
  }

  const source = typeof body.source === "string" && SOURCES.has(body.source) ? body.source : "web";
  // El kickoff trae el contacto en un solo campo libre («Ana · +54 9 299…»): de ahí
  // salen el nombre, el email y el teléfono para engancharlo al pedido que ya existe.
  const fromText = source === "kickoff" ? contactFrom(field(body.contact, "")) : null;

  const name = (fromText?.rest || field(body.name, "")).slice(0, MAX_FIELD);
  if (!name) {
    return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  // Email opcional (el kickoff no lo pide), pero si viene tiene que ser válido.
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : fromText?.email ?? "";
  if (rawEmail && (rawEmail.length > MAX_FIELD || !EMAIL_RE.test(rawEmail))) {
    return NextResponse.json({ error: "Ingresá un email válido." }, { status: 400 });
  }
  // Teléfono opcional, con el mismo criterio: si viene, tiene que parecer un teléfono.
  const typedPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const phone = typedPhone ? cleanPublicPhone(typedPhone) : fromText?.phone ?? "";
  if (typedPhone && !phone) {
    return NextResponse.json({ error: "Revisá el teléfono: con código de área, sólo números." }, { status: 400 });
  }
  // El cotizador sólo registra si dejaron cómo contactarlos.
  if (source === "cotizador" && !rawEmail && !phone) {
    return NextResponse.json({ error: "Dejanos un email o un WhatsApp para escribirte." }, { status: 400 });
  }
  // La reserva trae la fecha y hora de la llamada; si viene, tiene que ser una fecha posible.
  const meetingAt = body.meetingAt === undefined ? null : parseMeeting(body.meetingAt, Date.now());
  if (body.meetingAt !== undefined && !meetingAt) {
    return NextResponse.json({ error: "Ese horario ya no está disponible: elegí otro." }, { status: 400 });
  }

  if (!(await allowRequest("contact", clientIp(request.headers), RATE_LIMIT, RATE_WINDOW_MS))) {
    return NextResponse.json(
      { error: "Recibimos varios mensajes seguidos. Esperá unos minutos o escribinos por WhatsApp." },
      { status: 429 }
    );
  }

  const lead = {
    name,
    email: rawEmail,
    company: field(body.company, ""),
    projectType: field(body.projectType, "General"),
    budget: field(body.budget, "A definir"),
    timeline: field(body.timeline, "Flexible"),
    // `message` se acepta como alias histórico de `idea`.
    idea: field(body.idea ?? body.message, "", MAX_IDEA),
  };

  // El pedido se guarda para el panel /admin. Con eso solo ya no se pierde:
  // el mail es un aviso extra.
  const row: NewLead = {
    source,
    channel: "email",
    name: lead.name,
    email: lead.email,
    company: lead.company,
    project_type: lead.projectType,
    budget: lead.budget,
    timeline: lead.timeline,
    idea: lead.idea,
  };
  if (phone) row.phone = phone;
  // Kickoff y reserva se enganchan al pedido de esa persona si ya existe (sin
  // disparar «pedido nuevo»); lo demás crea un pedido como siempre.
  const stored =
    source === "kickoff"
      ? await intakeLead({
          lead: row,
          extra: { kickoff: lead.idea },
          note: "Mandó la ficha de kickoff desde el sitio.",
          notice: { title: "Kickoff recibido", message: "Un cliente mandó su ficha de kickoff." },
        })
      : source === "reserva" && meetingAt
        ? await intakeLead({
            lead: row,
            extra: { meeting_at: meetingAt },
            note: `Agendó una llamada desde el sitio para el ${meetingLabel(meetingAt)}.`,
            notice: { title: "Llamada agendada", message: `Pidieron una llamada para el ${meetingLabel(meetingAt)}.` },
          })
        : await insertLead(row);

  // Notificación instantánea a Telegram si está configurado
  notifyLead({
    name: lead.name,
    email: lead.email,
    phone: phone || undefined,
    company: lead.company || undefined,
    projectType: lead.projectType,
    budget: lead.budget,
    timeline: lead.timeline,
    source,
    idea: lead.idea,
  }).catch(() => {});

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    if (stored) return NextResponse.json({ success: true }, { status: 200 });
    // Sin base ni proveedor de mail: responder éxito acá perdía leads en silencio.
    console.error("[contact] Sin base ni RESEND_API_KEY; lead no guardado:", lead.name);
    return NextResponse.json(
      { error: "El formulario no está disponible ahora. Escribinos por WhatsApp o mail." },
      { status: 503 }
    );
  }

  const e = {
    name: escapeHtml(lead.name),
    email: escapeHtml(lead.email),
    company: escapeHtml(lead.company),
    projectType: escapeHtml(lead.projectType),
    budget: escapeHtml(lead.budget),
    timeline: escapeHtml(lead.timeline),
    idea: escapeHtml(lead.idea),
  };

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #111; line-height: 1.6;">
      <h2 style="color: #000; border-bottom: 2px solid #eaeaea; padding-bottom: 8px;">Nuevo contacto desde Se7en Studio</h2>
      <p><strong>Nombre:</strong> ${e.name}</p>
      ${e.email ? `<p><strong>Email:</strong> <a href="mailto:${e.email}">${e.email}</a></p>` : ""}
      ${e.company ? `<p><strong>Empresa:</strong> ${e.company}</p>` : ""}
      <p><strong>Tipo de Proyecto:</strong> ${e.projectType}</p>
      <p><strong>Presupuesto:</strong> ${e.budget}</p>
      <p><strong>Plazo deseado:</strong> ${e.timeline}</p>
      ${phone ? `<p><strong>Teléfono:</strong> ${escapeHtml(phone)}</p>` : ""}
      ${meetingAt ? `<p><strong>Reunión pedida:</strong> ${escapeHtml(meetingLabel(meetingAt))} (hora de Argentina)</p>` : ""}
      <div style="margin-top: 20px; padding: 16px; background-color: #f9f9f9; border-radius: 8px;">
        <strong>Detalle:</strong>
        <p style="white-space: pre-wrap; margin-top: 8px;">${e.idea || "Sin detalle adicional"}</p>
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        // ponytail: onboarding@resend.dev sólo entrega al dueño de la cuenta de
        // Resend; con dominio verificado, setear RESEND_FROM.
        from: process.env.RESEND_FROM || "Se7en Studio <onboarding@resend.dev>",
        to: [process.env.CONTACT_EMAIL || SITE.email],
        ...(lead.email ? { reply_to: lead.email } : {}),
        subject: `Nuevo Proyecto: ${lead.projectType} — ${lead.name}`,
        html,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[contact] Resend rechazó el envío:", res.status, detail);
      if (stored) return NextResponse.json({ success: true }, { status: 200 });
      return NextResponse.json(
        { error: "No pudimos enviar tu mensaje. Escribinos por WhatsApp o mail." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[contact] Error de red con Resend:", error);
    if (stored) return NextResponse.json({ success: true }, { status: 200 });
    return NextResponse.json(
      { error: "No pudimos enviar tu mensaje. Escribinos por WhatsApp o mail." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
