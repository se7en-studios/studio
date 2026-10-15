import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import type { Client } from "@/lib/admin/client-shared";
import { listClients } from "@/lib/admin/clients";
import { fmt } from "@/lib/admin/finance-shared";
import { mrr } from "@/lib/admin/maintenance-shared";
import { dayKey } from "@/lib/admin/task-shared";
import { Card, Empty, Kpi, PageHeader, kpiRow, usd } from "../kit";
import { AdminGate, SetupNotice } from "../ui";
import { loadBook, optional, owedOf } from "./data";
import { NewClient } from "./new-client";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const { nuevo } = await searchParams;
  const today = dayKey();
  const missing: string[] = [];
  const [clients, book] = await Promise.all([
    optional(listClients(), [] as Client[], missing),
    loadBook(missing),
  ]);

  const rows = clients.map((c) => {
    const projects = book.projects.filter((p) => p.clientId === c.id);
    const plans = projects.flatMap((p) => book.plans.get(p.slug) ?? []);
    return {
      client: c,
      projects,
      plans,
      mrr: mrr(plans, book.fx),
      owed: owedOf(projects, book.entries, today).total,
    };
  });
  const loose = book.projects.filter(
    (p) => !p.clientId && p.state.status !== "pausado",
  );
  const totalMrr = rows.reduce((s, r) => s + r.mrr, 0);
  const totalOwed = rows.reduce((s, r) => s + r.owed, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        right={<NewClient initialOpen={nuevo === "1"} />}
      >
        Cada cliente con sus contactos, proyectos, abono de mantenimiento,
        cobros y cuentas de acceso.
      </PageHeader>
      {missing[0] && <SetupNotice reason={missing[0]} />}

      <div className={`${kpiRow} md:grid-cols-3`}>
        <Kpi
          label="Clientes"
          value={clients.length}
          hint={`${rows.filter((r) => r.plans.some((p) => p.active)).length} con mantenimiento`}
        />
        <Kpi
          label="Ingreso mensual fijo"
          value={usd(totalMrr)}
          hint="Abonos activos, en USD"
          href="/admin/mantenimiento"
        />
        <Kpi
          label="Por cobrar"
          value={usd(totalOwed)}
          tone={totalOwed ? "amber" : undefined}
          hint="De los proyectos de clientes"
          href="/admin/finanzas"
        />
      </div>

      <Card title="Todos los clientes" count={clients.length}>
        {rows.length ? (
          <ul className="divide-y divide-[var(--line)]">
            {rows.map(({ client: c, projects, plans, owed }) => (
              <li key={c.id}>
                <Link
                  href={`/admin/clientes/${c.id}`}
                  className="focus-ring grid gap-1 px-4 py-3 transition-colors hover:bg-white/[0.03] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_120px] sm:items-center sm:gap-4"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-foreground">
                      {c.name}
                    </span>
                    <span className="block truncate text-[12px] text-muted">
                      {[c.contact, c.email, c.whatsapp]
                        .filter(Boolean)
                        .join(" · ") || "Sin contacto cargado"}
                    </span>
                  </span>
                  <span className="truncate text-[13px] text-muted">
                    {projects.map((p) => p.name).join(", ") || "Sin proyectos"}
                  </span>
                  <span className="text-[13px] tabular-nums text-muted">
                    {plans
                      .filter((p) => p.active)
                      .map((p) => `${fmt(p.amount, p.currency)}/mes`)
                      .join(" + ") || "Sin abono"}
                  </span>
                  <span
                    className={`text-[13px] tabular-nums ${owed ? "text-amber-300" : "text-muted"}`}
                  >
                    {owed ? `Debe ${usd(owed)}` : "Al día"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty icon={<Users size={18} />} title="Todavía no hay clientes">
            Se crean solos al pasar un pedido ganado a proyecto, o con «Nuevo
            cliente».
          </Empty>
        )}
      </Card>

      {loose.length > 0 && clients.length > 0 && (
        <p className="text-[13px] text-muted">
          {loose.length === 1
            ? "Un proyecto no tiene"
            : `${loose.length} proyectos no tienen`}{" "}
          cliente: {loose.map((p) => p.name).join(", ")}. Se vinculan desde la
          ficha del cliente.
        </p>
      )}
    </div>
  );
}
