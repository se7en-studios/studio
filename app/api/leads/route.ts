import { NextResponse } from "next/server";
import { insertLead } from "@/lib/admin/db";
import { allowRequest, clientIp } from "@/lib/rate-limit";

// Registro de un pedido del formulario de la home, que sigue la charla por
// WhatsApp o mail (no manda nada desde el servidor). Sólo guarda el pedido
// para el panel /admin; si no hay base configurada, no pasa nada.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function field(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  if (body.honeypot) return NextResponse.json({ ok: true });

  const name = field(body.name);
  const idea = field(body.idea, 5000);
  const email = field(body.email).toLowerCase();
  if (!name || !idea) return NextResponse.json({ error: "Faltan datos." }, { status: 400 });

  if (!(await allowRequest("leads", clientIp(request.headers), 10, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "Recibimos varios pedidos seguidos. Esperá unos minutos." },
      { status: 429 }
    );
  }

  const channel = body.channel === "whatsapp" ? "whatsapp" : "email";
  const ok = await insertLead({
    source: "contacto",
    channel,
    name,
    email: EMAIL_RE.test(email) ? email : "",
    company: field(body.company),
    project_type: field(body.projectType),
    budget: field(body.budget),
    idea,
  });
  return NextResponse.json({ ok });
}
