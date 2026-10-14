// Copia de seguridad de lo que el panel guarda en Supabase (tablas, no archivos). Usa la
// service role key: NUNCA importar desde un componente de cliente. Las claves de Cuentas
// salen cifradas, tal cual están en la base: sin VAULT_KEY no se pueden leer.
import { missingTable } from "./db";
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

const PAGE = 1000;
/** Tope por tabla: evita una respuesta gigante si alguna crece mucho. */
const MAX_ROWS = 20_000;

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
  const rows: unknown[] = [];
  while (rows.length < MAX_ROWS) {
    const { data, error } = await c
      .from(table)
      .select("*")
      .order("created_at", { ascending: true, nullsFirst: true })
      .range(rows.length, rows.length + PAGE - 1);
    if (error) {
      if (missingTable(error)) return { missing: true };
      // Alguna tabla no tiene created_at: se reintenta sin orden.
      if (error.code === "42703") return dumpUnordered(table);
      return { error: error.message };
    }
    rows.push(...data);
    if (data.length < PAGE) return { rows };
  }
  return { rows, truncated: true };
}

async function dumpUnordered(table: string): Promise<TableDump> {
  const c = client();
  const rows: unknown[] = [];
  while (rows.length < MAX_ROWS) {
    const { data, error } = await c
      .from(table)
      .select("*")
      .range(rows.length, rows.length + PAGE - 1);
    if (error) return { error: error.message };
    rows.push(...data);
    if (data.length < PAGE) return { rows };
  }
  return { rows, truncated: true };
}

export async function backupAll(): Promise<Backup> {
  client(); // si no hay base conectada, falla acá con un mensaje claro
  const tables: Record<string, TableDump> = {};
  for (const t of BACKUP_TABLES) tables[t] = await dump(t);
  return { exported_at: new Date().toISOString(), app: "se7en-panel", tables };
}

