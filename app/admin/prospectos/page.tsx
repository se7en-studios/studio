import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { PanelNotReady } from "@/lib/admin/panel";
import type { ProspectState } from "@/lib/admin/prospect-shared";
import { listProspectState } from "@/lib/admin/prospects";
import { DEFAULT_TEMPLATES, type ProspectTemplate } from "@/lib/admin/prospect-template-shared";
import { listTemplates } from "@/lib/admin/prospect-templates";
import { AdminGate } from "../ui";
import { ProspectosClient } from "./prospectos-client";

export const metadata: Metadata = {
  title: "Radar de Prospectos & Leads | Se7en Studio Admin",
};

export default async function ProspectosPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  let state: Record<string, ProspectState> = {};
  let setup: string | null = null;
  try {
    state = await listProspectState();
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  // Sin su tabla (prospect-templates.sql) el radar anda igual con las sugeridas, sin poder editarlas.
  let templates: ProspectTemplate[] = DEFAULT_TEMPLATES;
  let templatesReady = true;
  try {
    templates = await listTemplates();
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    templatesReady = false;
  }

  if (setup) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-[13px] text-muted">
        <p className="adm-title text-[15px] text-foreground">
          Falta un paso para compartir los prospectos
        </p>
        <p className="mt-2">{setup}</p>
        <p className="mt-2">
          Abrí el SQL Editor de Supabase, pegá el contenido de{" "}
          <code>supabase/prospectos.sql</code> y ejecutalo. Después recargá esta
          página.
        </p>
      </div>
    );
  }

  return <ProspectosClient initialState={state} me={me.who} templates={templates} templatesReady={templatesReady} />;
}
