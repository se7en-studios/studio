// Copia de seguridad de lo que el panel guarda en Supabase (tablas, no archivos). Usa la
// service role key: NUNCA importar desde un componente de cliente. Las claves de Cuentas
// salen cifradas, tal cual están en la base: sin VAULT_KEY no se pueden leer.
import { missingTable } from "./db";
import { allRows } from "./paged";
import { client } from "./panel";

/** Las tablas del panel y de los pedidos. Una que no exista (todavía) se anota y se sigue. */
export const BACKUP_TABLES = [
  "leads",
  "panel_lead_activity",
  "panel_projects",
  "panel_project_state",
  "panel_files",
  "panel_payments",
  "panel_finance",
  "panel_tools",
  "panel_tasks",
  "panel_messages",
  "panel_reads",
  "panel_events",
  "content_posts",
  "panel_vault",
] as const;


export type TableDump =
  | { rows: unknown[]; truncated?: boolean }
  | { missing: true }
  | { error: string };
export type Backup = {
  exported_at: string;
  app: string;
  tables: Record<string, TableDump>;
};

async function dump(table: string): Promise<TableDump> {
  const c = client();
  const ordered = await allRows<unknown>((from, to) =>
    c.from(table).select("*").order("created_at", { ascending: true, nullsFirst: true }).range(from, to),
  );
  // Alguna tabla no tiene created_at: se reintenta sin orden.
  const res =
    ordered.error && (ordered.error as { code?: string }).code === "42703"
      ? await allRows<unknown>((from, to) => c.from(table).select("*").range(from, to))
      : ordered;
  if (res.error) return missingTable(res.error) ? { missing: true } : { error: res.error.message };
  return res.truncated ? { rows: res.data, truncated: true } : { rows: res.data };
}

export async function backupAll(): Promise<Backup> {
  client(); // si no hay base conectada, falla acá con un mensaje claro
  const tables: Record<string, TableDump> = {};
  for (const t of BACKUP_TABLES) tables[t] = await dump(t);
  return { exported_at: new Date().toISOString(), app: "se7en-panel", tables };
}

