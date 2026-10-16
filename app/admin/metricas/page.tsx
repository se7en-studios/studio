import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { db, listLeads, type Lead } from "@/lib/admin/db";
import { listActivity } from "@/lib/admin/activity";
import type { Activity } from "@/lib/admin/activity-shared";
import type { Client } from "@/lib/admin/client-shared";
import { listClients } from "@/lib/admin/clients";
import { listRequests } from "@/lib/admin/maintenance";
import type { MaintRequest } from "@/lib/admin/maintenance-shared";
import { PanelNotReady } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";
import { listTime } from "@/lib/admin/time";
import type { TimeEntry } from "@/lib/admin/time-shared";
import type { Compare } from "@/lib/admin/numbers-shared";
import { loadBook, optional } from "../clientes/data";
import { PageHeader, TabLinks } from "../kit";
import { AdminGate, SetupNotice } from "../ui";
import { NumberLines, RateTable, buildLines } from "./lines";
import { MetricsView } from "./view";

export const metadata: Metadata = { title: "Números" };

type Props = { searchParams: Promise<{ periodo?: string }> };

export default async function NumerosPage({ searchParams }: Props) {
  if (!(await panelSession())) return <AdminGate />;
  if (!db()) {
    return (
      <div className="space-y-8">
        <PageHeader title="Números" />
        <p className="text-sm text-muted">
          Falta conectar la base de datos: los números salen de los pedidos y de
          Finanzas.
        </p>
      </div>
    );
  }
  const period: Compare =
    (await searchParams).periodo === "trimestre" ? "trimestre" : "mes";
  const today = dayKey();
  const missing: string[] = [];

  // En paralelo. Lo opcional (historial, clientes, mantenimiento, horas) no
  // rompe la página: esa línea queda sin dato y se avisa qué SQL correr.
  const [leads, activities, book, clients, requests, time] = await Promise.all([
    listLeads() as Promise<Lead[]>,
    listActivity().catch((e): Activity[] | null => {
      if (!(e instanceof PanelNotReady)) throw e;
      return null;
    }),
    loadBook(missing),
    optional(listClients(), [] as Client[], []),
    optional(listRequests(), [] as MaintRequest[], missing),
    optional(listTime(), [] as TimeEntry[], missing),
  ]);

  // El cliente real de Clientes; sin cliente, el nombre del proyecto.
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const projects = new Map(book.projects.map((p) => [p.slug, p]));
  const clientOf = (slug: string) => {
    const p = projects.get(slug);
    return (p?.clientId && clientName.get(p.clientId)) || p?.name || slug;
  };
  const data = {
    entries: book.entries,
    plans: [...book.plans.values()],
    fx: book.fx,
    leads,
    time,
    requests,
    clientOf,
    today,
  };
  const { lines, rates, studio } = buildLines(data, period);

  return (
    <div className="space-y-8">
      <PageHeader title="Números">
        Pocas líneas para saber cómo está el estudio: plata fija, cobros, caja,
        clientes, ventas y cuánto se cobra de verdad por hora. Cada una con su
        semáforo y contra el período anterior.
      </PageHeader>
      {missing[0] && <SetupNotice reason={missing[0]} />}

      <div className="space-y-3">
        <TabLinks
          current={period}
          tabs={[
            {
              id: "mes",
              label: "Este mes vs el anterior",
              href: "/admin/metricas",
            },
            {
              id: "trimestre",
              label: "Trimestre vs el anterior",
              href: "/admin/metricas?periodo=trimestre",
            },
          ]}
        />
        <NumberLines lines={lines} period={period} />
      </div>

      <RateTable
        rows={rates}
        studio={studio}
        names={(slug) => projects.get(slug)?.name ?? slug}
      />

      <section className="space-y-4">
        <h2 className="adm-title text-[16px] text-foreground">
          Embudo de ventas
        </h2>
        <MetricsView leads={leads} activities={activities} />
      </section>
    </div>
  );
}
