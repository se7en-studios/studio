"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import { diff, type Change } from "@/lib/admin/changes";
import {
  CLIENT_FIELDS,
  cleanClient,
  ivaLabel,
  type Client,
  type ClientInput,
} from "@/lib/admin/client-shared";
import {
  getClient,
  insertClient,
  linkAccount,
  removeClient,
  setProjectClient,
  updateClient,
  type AccountLink,
} from "@/lib/admin/clients";
import { PanelNotReady, getProject, logEvent } from "@/lib/admin/panel";

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

export type NewClientState = { error?: string };

export async function createClient(
  _: NewClientState,
  form: FormData,
): Promise<NewClientState> {
  let id: string;
  try {
    const me = await guard();
    const cleaned = cleanClient(
      {
        name: String(form.get("name") ?? ""),
        contact: String(form.get("contact") ?? ""),
        email: String(form.get("email") ?? ""),
        whatsapp: String(form.get("whatsapp") ?? ""),
      },
      true,
    );
    if (!cleaned.ok) return { error: cleaned.error };
    const created = await insertClient(
      cleaned.value as ClientInput & { name: string },
      me.who,
    );
    id = created.id;
    await logEvent({
      actor: me.who,
      kind: "clientes",
      text: `creó el cliente «${created.name}»`,
    });
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/admin/clientes/${id}`);
}

/** Datos de contacto, fiscales y notas. Devuelve el cliente guardado; el Registro cuenta el antes y el después. */
export async function updateClientInfo(
  id: string,
  patch: ClientInput,
): Promise<Client> {
  const me = await guard();
  if (!UUID.test(id)) throw new Error("Cliente inválido.");
  const cleaned = cleanClient(patch, false);
  if (!cleaned.ok) throw new Error(cleaned.error);
  const { before, after: saved } = await updateClient(id, cleaned.value);
  const changes = diff<Client>(
    before,
    cleaned.value,
    CLIENT_FIELDS.map(({ field, label }) => ({
      field,
      label,
      ...(field === "notes"
        ? { long: true }
        : field === "iva"
          ? { format: (v: unknown) => (v ? ivaLabel(String(v)) : null) }
          : {}),
    })),
  );
  if (changes.length)
    after(() =>
      logEvent({
        actor: me.who,
        kind: "clientes",
        text: `editó el cliente «${saved.name}»: ${changes.map((c) => c.label.toLowerCase()).join(", ")}`,
        changes,
      }),
    );
  return saved;
}

export async function deleteClient(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Cliente inválido." };
    const name = await removeClient(id);
    await logEvent({
      actor: me.who,
      kind: "clientes",
      text: `borró el cliente «${name}» (sus proyectos quedan sin cliente)`,
    });
  } catch (e) {
    return { error: message(e) };
  }
  redirect("/admin/clientes");
}

/** Vincula un proyecto a este cliente o, con `on: false`, lo deja sin cliente. */
export async function linkProject(
  clientId: string,
  slug: string,
  on: boolean,
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(clientId) || !SLUG.test(slug))
      return { error: "Datos inválidos." };
    const [client, project] = await Promise.all([
      getClient(clientId),
      getProject(slug),
    ]);
    if (!client) return { error: "Ese cliente ya no existe." };
    if (!project) return { error: "Ese proyecto ya no existe." };
    const prev = await setProjectClient(
      slug,
      project.isCase,
      on ? clientId : null,
      me.who,
    );
    const prevName =
      prev && prev !== clientId
        ? ((await getClient(prev))?.name ?? "otro cliente")
        : null;
    const change: Change = {
      field: "client_id",
      label: "Cliente",
      before: on ? prevName : client.name,
      after: on ? client.name : null,
    };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "clientes",
        text: on
          ? `vinculó el proyecto al cliente «${client.name}»`
          : `desvinculó el proyecto del cliente «${client.name}»`,
        project_slug: slug,
        changes: [change],
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/** Vincula una cuenta de la caja fuerte al cliente (o la desvincula). Nunca toca la clave. */
export async function linkVault(
  clientId: string,
  accountId: string,
  on: boolean,
): Promise<{ account?: AccountLink; error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(clientId) || !UUID.test(accountId))
      return { error: "Datos inválidos." };
    const client = await getClient(clientId);
    if (!client) return { error: "Ese cliente ya no existe." };
    const account = await linkAccount(accountId, on ? clientId : null);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "cuentas",
        text: `${on ? "vinculó" : "desvinculó"} ${account.service}${account.label ? ` (${account.label})` : ""} ${on ? "al" : "del"} cliente «${client.name}» en Cuentas`,
      }),
    );
    return { account };
  } catch (e) {
    return { error: message(e) };
  }
}
