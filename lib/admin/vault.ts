// Caja fuerte del panel (tabla panel_vault). Usa la service role key: NUNCA importar
// desde un componente de cliente. La lista no trae claves ni notas: esas se descifran
// de a una, cuando alguien las pide (ver app/admin/cuentas/actions.ts).
import { randomUUID } from "node:crypto";
import type { LeadOwner } from "./db";
import { PanelNotReady, client } from "./panel";
import { decrypt, encrypt } from "./vault-crypto";
import type { Account, CleanAccount } from "./vault-shared";

const COLUMNS =
  "id, created_at, updated_at, service, label, url, username, twofa, owner, rotated_on, created_by, notes_enc";

type Row = Omit<Account, "has_notes"> & { notes_enc: string | null };

function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01") {
    throw new PanelNotReady("Falta correr supabase/vault.sql en Supabase.");
  }
  throw new Error(e.message);
}

const toAccount = ({ notes_enc, ...rest }: Row): Account => ({
  ...rest,
  has_notes: Boolean(notes_enc),
});

// El «aad» ata cada dato a su fila y a su campo: un texto cifrado no sirve en otro lado.
const secretAad = (id: string) => `${id}:secret`;
const notesAad = (id: string) => `${id}:notes`;

export async function listAccounts(): Promise<Account[]> {
  const { data, error } = await client()
    .from("panel_vault")
    .select(COLUMNS)
    .order("service", { ascending: true })
    .order("label", { ascending: true })
    .limit(500);
  if (error) fail(error);
  return (data as unknown as Row[]).map(toAccount);
}

export async function insertAccount(
  v: CleanAccount,
  by: LeadOwner,
  today: string,
): Promise<Account> {
  const id = randomUUID();
  const { data, error } = await client()
    .from("panel_vault")
    .insert({
      id,
      service: v.service,
      label: v.label,
      url: v.url,
      username: v.username,
      twofa: v.twofa,
      owner: v.owner,
      secret_enc: encrypt(v.secret ?? "", secretAad(id)),
      notes_enc: v.notes ? encrypt(v.notes, notesAad(id)) : null,
      rotated_on: today,
      created_by: by,
    })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return toAccount(data as unknown as Row);
}

/** Cambia los datos; la clave y las notas solo si vienen. Cambiar la clave reinicia el «cambiada hace…». */
export async function updateAccount(
  id: string,
  v: CleanAccount,
  today: string,
): Promise<Account | null> {
  const patch: Record<string, unknown> = {
    service: v.service,
    label: v.label,
    url: v.url,
    username: v.username,
    twofa: v.twofa,
    owner: v.owner,
    updated_at: new Date().toISOString(),
  };
  if (v.secret) {
    patch.secret_enc = encrypt(v.secret, secretAad(id));
    patch.rotated_on = today;
  }
  if (v.notes) patch.notes_enc = encrypt(v.notes, notesAad(id));
  const { data, error } = await client()
    .from("panel_vault")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toAccount(data as unknown as Row) : null;
}

/** La clave y las notas descifradas de una cuenta. null si no existe. */
export async function readSecrets(
  id: string,
): Promise<{
  secret: string;
  notes: string | null;
  service: string;
  label: string;
} | null> {
  const { data, error } = await client()
    .from("panel_vault")
    .select("service, label, secret_enc, notes_enc")
    .eq("id", id)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const row = data as {
    service: string;
    label: string;
    secret_enc: string;
    notes_enc: string | null;
  };
  return {
    service: row.service,
    label: row.label,
    secret: decrypt(row.secret_enc, secretAad(id)),
    notes: row.notes_enc ? decrypt(row.notes_enc, notesAad(id)) : null,
  };
}

export async function removeAccount(
  id: string,
): Promise<{ service: string; label: string } | null> {
  const { data, error } = await client()
    .from("panel_vault")
    .delete()
    .eq("id", id)
    .select("service, label")
    .maybeSingle();
  if (error) fail(error);
  return data as { service: string; label: string } | null;
}
