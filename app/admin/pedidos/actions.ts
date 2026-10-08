"use server";

// Acciones del CRM de pedidos: alta manual, datos de contacto, monto acordado
// e historial de contactos. Etapa, responsable y notas siguen en ../actions.ts.
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/admin/auth";
import {
  OWNERS,
  createLeadRow,
  db,
  patchLead,
  type Lead,
  type LeadOwner,
  type NewLead,
} from "@/lib/admin/db";
import { insertActivity, removeActivity } from "@/lib/admin/activity";
import {
  ACTIVITY_KINDS,
  ACTIVITY_TEXT_MAX,
  MANUAL_CHANNELS,
  isContact,
  type Activity,
  type ActivityKind,
} from "@/lib/admin/activity-shared";
import { logEvent } from "@/lib/admin/panel";

const MAX_VALUE = 10_000_000;
const CONTACT_TEXT: Record<ActivityKind, string> = {
  llamada: "una llamada",
  mail: "un mail",
  whatsapp: "un WhatsApp",
  reunion: "una reunión",
  nota: "una nota",
};

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const UUID = /^[0-9a-f-]{36}$/i;
function checkId(id: string) {
  if (!UUID.test(id)) throw new Error("Pedido inválido.");
}

function text(v: unknown, max: number) {
  return String(v ?? "")
    .trim()
    .slice(0, max);
}

function cleanPhone(v: unknown) {
  const phone = text(v, 40);
  if (phone && !/^[0-9+()\s.-]{6,40}$/.test(phone))
    throw new Error("Teléfono inválido.");
  return phone;
}

function cleanEmail(v: unknown) {
  const email = text(v, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Email inválido.");
  return email;
}

function cleanValue(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > MAX_VALUE)
    throw new Error("Monto inválido.");
  return Math.round(n * 100) / 100;
}

export type ManualLead = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  channel: string;
  project_type?: string;
  budget?: string;
  idea?: string;
  owner?: LeadOwner | null;
  value?: number | string | null;
};

export async function createLead(input: ManualLead): Promise<Lead> {
  const me = await guard();
  const name = text(input.name, 120);
  if (!name) throw new Error("El pedido necesita un nombre.");
  const channel = text(input.channel, 20);
  if (!(MANUAL_CHANNELS as readonly string[]).includes(channel))
    throw new Error("Canal inválido.");
  if (input.owner != null && !OWNERS.includes(input.owner))
    throw new Error("Responsable inválido.");

  const lead: NewLead = {
    source: "panel",
    channel,
    name,
    company: text(input.company, 120),
    email: cleanEmail(input.email),
    project_type: text(input.project_type, 120),
    budget: text(input.budget, 60),
    idea: text(input.idea, 5000),
    owner: input.owner ?? null,
  };
  // Las columnas de crm.sql sólo se mandan si hay dato: así el alta anda aunque
  // todavía no se haya corrido la migración.
  const phone = cleanPhone(input.phone);
  const value = cleanValue(input.value);
  if (phone) lead.phone = phone;
  if (value !== null) lead.value = value;

  const row = await createLeadRow(lead);
  await logEvent({
    actor: me.who,
    kind: "pedido",
    text: `cargó a mano el pedido de ${row.name}`,
  });
  revalidatePath("/admin", "layout");
  return row;
}

export type ContactFields = Partial<
  Pick<Lead, "name" | "company" | "email" | "phone">
>;

export async function setContact(id: string, fields: ContactFields) {
  await guard();
  checkId(id);
  const patch: ContactFields = {};
  if (fields.name !== undefined) {
    patch.name = text(fields.name, 120);
    if (!patch.name) throw new Error("El nombre no puede quedar vacío.");
  }
  if (fields.company !== undefined) patch.company = text(fields.company, 120);
  if (fields.email !== undefined) patch.email = cleanEmail(fields.email);
  if (fields.phone !== undefined) patch.phone = cleanPhone(fields.phone);
  await patchLead(id, patch);
  revalidatePath("/admin", "layout");
}

export async function setValue(id: string, value: number | string | null) {
  const me = await guard();
  checkId(id);
  const clean = cleanValue(value);
  const name = await patchLead(id, { value: clean });
  if (clean !== null) {
    await logEvent({
      actor: me.who,
      kind: "pedido",
      text: `fijó en USD ${clean.toLocaleString("es-AR")} el pedido de ${name}`,
    });
  }
  revalidatePath("/admin", "layout");
}

/**
 * Registra un contacto. Si el pedido seguía «Nuevo» y fue un contacto real
 * (no una nota), pasa a «Contactado». Devuelve la nueva etapa si cambió.
 */
export async function logActivity(
  leadId: string,
  kind: ActivityKind,
  body: string,
  day?: string,
): Promise<{ activity: Activity; status: Lead["status"] | null }> {
  const me = await guard();
  checkId(leadId);
  if (!ACTIVITY_KINDS.includes(kind))
    throw new Error("Tipo de contacto inválido.");
  const clean = text(body, ACTIVITY_TEXT_MAX);
  if (!clean && kind === "nota") throw new Error("La nota está vacía.");
  // Un día pasado se guarda al mediodía de Argentina; hoy, con la hora real.
  let at = new Date().toISOString();
  if (day) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Fecha inválida.");
    const when = new Date(`${day}T12:00:00-03:00`);
    if (
      Number.isNaN(when.getTime()) ||
      when.getTime() > Date.now() + 86_400_000
    )
      throw new Error("Fecha inválida.");
    if (
      day !==
      new Date().toLocaleDateString("en-CA", {
        timeZone: "America/Argentina/Buenos_Aires",
      })
    )
      at = when.toISOString();
  }

  const activity = await insertActivity({
    lead_id: leadId,
    kind,
    text: clean,
    at,
    actor: me.who,
  });

  let status: Lead["status"] | null = null;
  const c = db();
  const lead = c
    ? (await c.from("leads").select("name, status").eq("id", leadId).single())
        .data
    : null;
  if (lead && lead.status === "nuevo" && isContact(activity)) {
    await patchLead(leadId, { status: "contactado" });
    status = "contactado";
  }
  if (lead && isContact(activity)) {
    await logEvent({
      actor: me.who,
      kind: "pedido",
      text: `registró ${CONTACT_TEXT[kind]} con ${lead.name}${status ? " (pasó a Contactado)" : ""}`,
    });
  }
  revalidatePath("/admin", "layout");
  return { activity, status };
}

export async function deleteActivity(id: string) {
  await guard();
  checkId(id);
  await removeActivity(id);
  revalidatePath("/admin", "layout");
}

