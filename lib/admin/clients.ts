// Clientes (tabla panel_clients), el vínculo proyecto → cliente
// (panel_project_state.client_id) y cuenta → cliente (panel_vault.client_id).
// Usa la service role key: NUNCA importar este archivo desde un componente de cliente.
import type { Lead, LeadOwner } from "./db";
import type { Client, ClientInput } from "./client-shared";
import { PanelNotReady, client as sb } from "./panel";
import { upsertState } from "./projects";

const COLUMNS =
  "id, created_at, updated_at, name, contact, email, whatsapp, cuit, iva, notes, created_by";
const NOT_READY = "Falta correr supabase/clients.sql en Supabase.";

/** Tabla o columna de clients.sql que todavía no existe. */
export const missingClients = (e: { code?: string; message?: string }) =>
  e.code === "PGRST205" ||
  e.code === "42P01" ||
  e.code === "42703" ||
  e.code === "PGRST204" ||
  /client_id/.test(e.message ?? "");

function fail(e: { code?: string; message: string }): never {
  if (missingClients(e)) throw new PanelNotReady(NOT_READY);
  if (e.code === "23505") throw new Error("Ya hay un cliente con ese nombre.");
  throw new Error(e.message);
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await sb()
    .from("panel_clients")
    .select(COLUMNS)
    .order("name")
    .limit(1000);
  if (error) fail(error);
  return data as Client[];
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await sb()
    .from("panel_clients")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  return (data as Client | null) ?? null;
}

export async function insertClient(
  input: ClientInput & { name: string },
  by: LeadOwner,
): Promise<Client> {
  const { data, error } = await sb()
    .from("panel_clients")
    .insert({ ...input, created_by: by })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as Client;
}

export async function updateClient(
  id: string,
  patch: ClientInput,
): Promise<{ before: Client; after: Client }> {
  const before = await getClient(id);
  if (!before) throw new Error("Ese cliente ya no existe.");
  const { data, error } = await sb()
    .from("panel_clients")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return { before, after: data as Client };
}

/** Borra el cliente: sus proyectos y cuentas quedan sin cliente (on delete set null). */
export async function removeClient(id: string): Promise<string> {
  const { data, error } = await sb()
    .from("panel_clients")
    .delete()
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Ese cliente ya no existe.");
  return (data as { name: string }).name;
}

// --- Proyecto → cliente ---------------------------------------------------------

/** slug → id del cliente, de los proyectos que tienen uno. */
export async function projectClients(): Promise<Map<string, string>> {
  const { data, error } = await sb()
    .from("panel_project_state")
    .select("slug, client_id")
    .not("client_id", "is", null);
  if (error) fail(error);
  return new Map(
    (data as { slug: string; client_id: string }[]).map((r) => [
      r.slug,
      r.client_id,
    ]),
  );
}

/** El cliente de un proyecto, o null. */
export async function clientOfProject(slug: string): Promise<string | null> {
  const { data, error } = await sb()
    .from("panel_project_state")
    .select("client_id")
    .eq("slug", slug)
    .maybeSingle();
  if (error) fail(error);
  return (data as { client_id: string | null } | null)?.client_id ?? null;
}

/** Vincula (o desvincula, con null) un proyecto a un cliente. Devuelve el cliente anterior. */
export async function setProjectClient(
  slug: string,
  isCase: boolean,
  clientId: string | null,
  by: LeadOwner,
): Promise<string | null> {
  const before = await clientOfProject(slug);
  // Sin fila de estado (un caso que nunca se tocó), se crea con los valores por defecto.
  if (before === null) await upsertState(slug, isCase, {}, by);
  const { error } = await sb()
    .from("panel_project_state")
    .update({
      client_id: clientId,
      updated_by: by,
      updated_at: new Date().toISOString(),
    })
    .eq("slug", slug);
  if (error) fail(error);
  return before;
}

/**
 * El cliente de un pedido ganado: uno que ya exista con el mismo email o el
 * mismo nombre, o uno nuevo con el contacto del pedido. Al existente le
 * completa el email y el WhatsApp si no los tenía.
 */
export async function clientForLead(
  lead: Lead,
  by: LeadOwner,
): Promise<{ client: Client; created: boolean }> {
  const name = (lead.company || lead.name).trim().slice(0, 120) || "Cliente";
  const email = (lead.email ?? "").trim().toLowerCase().slice(0, 200);
  const phone = (lead.phone ?? "").trim().slice(0, 40);
  const c = sb();
  const byEmail = email
    ? await c.from("panel_clients").select(COLUMNS).eq("email", email).limit(1)
    : null;
  if (byEmail?.error) fail(byEmail.error);
  // ilike sin comodines: igual sin importar mayúsculas (como el índice único).
  const byName = byEmail?.data?.length
    ? null
    : await c
        .from("panel_clients")
        .select(COLUMNS)
        .ilike("name", name.replace(/[%_\\]/g, "\\$&"))
        .limit(1);
  if (byName?.error) fail(byName.error);
  const found = (byEmail?.data?.[0] ?? byName?.data?.[0]) as Client | undefined;
  if (found) {
    const fill: ClientInput = {};
    if (!found.email && email) fill.email = email;
    if (!found.whatsapp && phone) fill.whatsapp = phone;
    if (!found.contact && lead.company) fill.contact = lead.name.slice(0, 120);
    return {
      client: Object.keys(fill).length
        ? (await updateClient(found.id, fill)).after
        : found,
      created: false,
    };
  }
  const created = await insertClient(
    {
      name,
      contact: lead.company ? lead.name.slice(0, 120) : "",
      email,
      whatsapp: phone,
    },
    by,
  );
  return { client: created, created: true };
}

// --- Cuentas de la caja fuerte ----------------------------------------------------

/** Lo que se muestra de una cuenta en la ficha: nunca la clave ni las notas. */
export type AccountLink = {
  id: string;
  service: string;
  label: string;
  username: string;
  client_id: string | null;
};

/** Todas las cuentas (para vincular) sin secretos. */
export async function listAccountLinks(): Promise<AccountLink[]> {
  const { data, error } = await sb()
    .from("panel_vault")
    .select("id, service, label, username, client_id")
    .order("service")
    .order("label")
    .limit(500);
  if (error) fail(error);
  return data as AccountLink[];
}

export async function linkAccount(
  accountId: string,
  clientId: string | null,
): Promise<AccountLink> {
  const { data, error } = await sb()
    .from("panel_vault")
    .update({ client_id: clientId })
    .eq("id", accountId)
    .select("id, service, label, username, client_id")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Esa cuenta ya no existe.");
  return data as AccountLink;
}
