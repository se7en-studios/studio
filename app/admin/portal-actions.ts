"use server";

// Acciones del panel sobre el portal del cliente: el link de acceso, las
// aprobaciones de un proyecto y qué archivos ve el cliente.
import { after } from "next/server";
import { headers } from "next/headers";
import { getSession } from "@/lib/admin/auth";
import { getClient } from "@/lib/admin/clients";
import { PanelNotReady, getProject, logEvent } from "@/lib/admin/panel";
import {
  createLink,
  insertApproval,
  newRound,
  portalSecret,
  removeApproval,
  revokeLink,
  setFileVisible,
} from "@/lib/admin/portal";
import {
  cleanApproval,
  type Approval,
  type ApprovalInput,
} from "@/lib/admin/portal-shared";

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const message = (e: unknown) =>
  e instanceof PanelNotReady || e instanceof Error
    ? e.message
    : "Algo falló. Probá de nuevo.";
const UUID = /^[0-9a-f-]{36}$/i;
const SLUG = /^[a-z0-9-]{1,64}$/;

// --- Link de acceso -------------------------------------------------------------

/** Genera (o regenera) el link. La URL se muestra una sola vez: en la base queda sólo el hash. */
export async function generatePortalLink(
  clientId: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(clientId)) return { error: "Cliente inválido." };
    if (!portalSecret())
      return {
        error: "Falta cargar PORTAL_SESSION_SECRET (32+ caracteres) en Vercel.",
      };
    const client = await getClient(clientId);
    if (!client) return { error: "Ese cliente ya no existe." };
    const token = await createLink(clientId, me.who);
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto =
      h.get("x-forwarded-proto") ??
      (host?.startsWith("localhost") ? "http" : "https");
    after(() =>
      logEvent({
        actor: me.who,
        kind: "seguridad",
        text: `generó un link nuevo del portal para «${client.name}» (el anterior deja de andar)`,
      }),
    );
    return { url: `${proto}://${host}/portal/acceso/${token}` };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function revokePortalLink(
  clientId: string,
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(clientId)) return { error: "Cliente inválido." };
    const client = await getClient(clientId);
    if (!client) return { error: "Ese cliente ya no existe." };
    if (await revokeLink(clientId))
      after(() =>
        logEvent({
          actor: me.who,
          kind: "seguridad",
          text: `revocó el link del portal de «${client.name}»`,
        }),
      );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// --- Aprobaciones -----------------------------------------------------------------

async function projectOr(slug: string) {
  if (!SLUG.test(slug)) throw new Error("Proyecto inválido.");
  const p = await getProject(slug);
  if (!p) throw new Error("Ese proyecto ya no existe.");
  return p;
}

export async function requestApproval(
  slug: string,
  raw: Partial<ApprovalInput>,
): Promise<{ approval?: Approval; error?: string }> {
  try {
    const me = await guard();
    const project = await projectOr(slug);
    const input = cleanApproval(raw);
    if (!input.ok) return { error: input.error };
    const approval = await insertApproval(slug, input.value, me.who);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `pidió aprobación de «${approval.title}» al cliente de ${project.name}`,
        project_slug: slug,
      }),
    );
    return { approval };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function approvalNewRound(
  id: string,
  slug: string,
  raw: Partial<ApprovalInput>,
): Promise<{ approval?: Approval; error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Aprobación inválida." };
    await projectOr(slug);
    const input = cleanApproval(raw);
    if (!input.ok) return { error: input.error };
    const approval = await newRound(id, slug, input.value);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `mandó la ronda ${approval.round} de «${approval.title}» al cliente`,
        project_slug: slug,
      }),
    );
    return { approval };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteApproval(
  id: string,
  slug: string,
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id) || !SLUG.test(slug))
      return { error: "Datos inválidos." };
    const title = await removeApproval(id, slug);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `canceló el pedido de aprobación «${title}»`,
        project_slug: slug,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// --- Archivos ----------------------------------------------------------------------

export async function shareFile(
  id: string,
  on: boolean,
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Archivo inválido." };
    const f = await setFileVisible(id, on);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "archivos",
        text: `${on ? "le mostró al cliente" : "le ocultó al cliente"} «${f.name}»`,
        project_slug: f.project_slug,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}
