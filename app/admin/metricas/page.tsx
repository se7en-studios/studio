import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { db, listLeads, type Lead } from "@/lib/admin/db";
import { listActivity } from "@/lib/admin/activity";
import type { Activity } from "@/lib/admin/activity-shared";
import { PanelNotReady } from "@/lib/admin/panel";
import { AdminGate, PageHeader } from "../ui";
import { MetricsView } from "./view";

export const metadata: Metadata = { title: "Métricas" };

export default async function MetricasPage() {
  if (!(await panelSession())) return <AdminGate />;
  if (!db()) {
    return (
      <div className="space-y-8">
        <PageHeader title="Métricas" />
        <p className="text-sm text-muted">Falta conectar la base de datos: las métricas salen de los pedidos.</p>
      </div>
    );
  }

  // En paralelo. El historial es opcional (crm.sql): sin él, «Primera
  // respuesta» queda en blanco.
  const [leads, activities] = await Promise.all([
    listLeads() as Promise<Lead[]>,
    listActivity().catch((e): Activity[] | null => {
      if (!(e instanceof PanelNotReady)) throw e;
      return null;
    }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader title="Métricas">
        Cuántos pedidos llegan, cuántos se cierran, cuánto valen y qué canal
        rinde.
      </PageHeader>
      <MetricsView leads={leads} activities={activities} />
    </div>
  );
}
