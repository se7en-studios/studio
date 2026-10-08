import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { db, listLeads, type Lead } from "@/lib/admin/db";
import { Dashboard } from "../dashboard";
import { AdminGate } from "../ui";

// Los pedidos que llegan por los formularios del sitio, en un tablero para
// responderlos y darles seguimiento.
export const metadata: Metadata = { title: "Pedidos · Panel" };

export default async function PedidosPage() {
  if (!(await panelSession())) return <AdminGate />;

  const ready = db() !== null;
  let leads: Lead[] = [];
  let error: string | null = null;
  if (ready) {
    try {
      leads = await listLeads();
    } catch (e) {
      error = e instanceof Error ? e.message : "Error leyendo los pedidos";
    }
  }
  return <Dashboard leads={leads} dbReady={ready} error={error} />;
}
