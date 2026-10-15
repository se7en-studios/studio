import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import type { Client } from "@/lib/admin/client-shared";
import { listClients } from "@/lib/admin/clients";
import {
  chargeEntries,
  chargesOf,
  ensureCharges,
  listRequests,
} from "@/lib/admin/maintenance";
import {
  chargeState,
  hoursUsage,
  manualDomains,
  mrr,
  openBySlug,
  type MaintRequest,
} from "@/lib/admin/maintenance-shared";
import { siteAlerts } from "@/lib/admin/site-health-shared";
import { dayKey } from "@/lib/admin/task-shared";
import { Kpi, PageHeader, kpiRow, usd } from "../kit";
import { AdminGate, SetupNotice } from "../ui";
import { loadBook, optional } from "../clientes/data";
import { RequestQueue } from "./queue";
import { Sites, type SiteRow } from "./sites";

export const metadata: Metadata = { title: "Mantenimiento" };

export default async function MantenimientoPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const today = dayKey();
  const missing: string[] = [];

  // Los cobros del mes se generan al abrir esta página (y en el resumen de las 9).
  // Idempotente: abrirla dos veces no genera dos.
  await optional(ensureCharges(today), 0, missing);

  const [book, requests, charges, clients] = await Promise.all([
    loadBook(missing),
    optional(listRequests(), [] as MaintRequest[], missing),
    optional(
      chargesOf(today.slice(0, 7)),
      new Map<string, string | null>(),
      missing,
    ),
    optional(listClients(), [] as Client[], []),
  ]);
  const entries = await optional(
    chargeEntries([...charges.values()].filter((x): x is string => Boolean(x))),
    new Map(),
    missing,
  );

  const plans = [...book.plans.values()];
  const alerts = siteAlerts(book.checks.values(), today, manualDomains(plans));
  const open = openBySlug(requests);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  // Los sitios: los proyectos con plan o en mantenimiento.
  const rows: SiteRow[] = book.projects
    .filter((p) => book.plans.has(p.slug) || p.state.status === "mantenimiento")
    .map((p) => {
      const plan = book.plans.get(p.slug) ?? null;
      const fid = charges.get(p.slug);
      return {
        slug: p.slug,
        name: p.name,
        url: p.url,
        client: p.clientId
          ? { id: p.clientId, name: clientName.get(p.clientId) ?? "Cliente" }
          : null,
        plan,
        charge: plan?.active
          ? chargeState((fid && entries.get(fid)) || null, today)
          : null,
        open: open.get(p.slug) ?? 0,
        hours: hoursUsage(plan, p.slug, requests, today),
        check: book.checks.get(p.slug) ?? null,
        alerts: alerts.filter((a) => a.slug === p.slug),
      };
    })
    .sort(
      (a, b) =>
        Number(Boolean(b.plan?.active)) - Number(Boolean(a.plan?.active)) ||
        a.name.localeCompare(b.name),
    );

  const active = plans.filter((p) => p.active);
  const charged = rows.filter((r) => r.charge === "cobrado").length;
  const late = rows.filter((r) => r.charge === "vencido").length;
  const openTotal = requests.filter((r) => r.status !== "hecho").length;
  const sitesWithAlerts = new Set(alerts.map((a) => a.slug)).size;

  return (
    <div className="space-y-6">
      <PageHeader title="Mantenimiento">
        Los abonos de cada sitio, el cobro de este mes, los pedidos de los
        clientes y si los sitios andan. Cada mes se genera solo el cobro
        pendiente de cada abono en Finanzas.
      </PageHeader>
      {missing[0] && <SetupNotice reason={missing[0]} />}

      <div className={`${kpiRow} md:grid-cols-4`}>
        <Kpi
          label="Ingreso mensual fijo"
          value={usd(mrr(plans, book.fx))}
          hint={`${active.length} ${active.length === 1 ? "abono activo" : "abonos activos"}, en USD`}
        />
        <Kpi
          label="Cobros del mes"
          value={`${charged}/${active.length}`}
          tone={
            late
              ? "red"
              : charged === active.length && active.length
                ? "green"
                : undefined
          }
          hint={late ? `${late} vencido${late === 1 ? "" : "s"}` : "Cobrados"}
          href="/admin/finanzas"
        />
        <Kpi
          label="Pedidos abiertos"
          value={openTotal}
          tone={openTotal ? "amber" : undefined}
        />
        <Kpi
          label="Sitios con alertas"
          value={sitesWithAlerts}
          tone={sitesWithAlerts ? "red" : "green"}
          hint="Caído, lento, SSL o dominio"
        />
      </div>

      <Sites
        rows={rows}
        candidates={book.projects
          .filter((p) => !book.plans.has(p.slug))
          .map((p) => ({ slug: p.slug, name: p.name }))}
        today={today}
      />

      <RequestQueue
        initial={requests}
        projects={book.projects.map((p) => ({ slug: p.slug, name: p.name }))}
        today={today}
      />
    </div>
  );
}
