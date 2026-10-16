import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  ChevronRight,
  KeyRound,
  Mail,
  MessageCircle,
} from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { dateLabel } from "@/lib/admin/changes";
import {
  getClient,
  listAccountLinks,
  type AccountLink,
} from "@/lib/admin/clients";
import { fmt } from "@/lib/admin/finance-shared";
import { projectMoney } from "@/lib/admin/payment-shared";
import {
  chargeEntries,
  chargesOf,
  listRequests,
} from "@/lib/admin/maintenance";
import {
  CHARGE_STATE,
  chargeState,
  mrr,
  openBySlug,
  type MaintRequest,
} from "@/lib/admin/maintenance-shared";
import { PanelNotReady } from "@/lib/admin/panel";
import { healthLabel } from "@/lib/admin/site-health-shared";
import { dayKey } from "@/lib/admin/task-shared";
import { waNumber } from "@/lib/admin/templates";
import {
  Card,
  Empty,
  Kpi,
  StatusPill,
  btnSecondary,
  cn,
  kpiRow,
  usd,
} from "../../kit";
import { AdminGate, SetupNotice } from "../../ui";
import { loadBook, optional, owedOf } from "../data";
import {
  AccountLinks,
  ClientInfo,
  DeleteClient,
  ProjectLinks,
} from "./client-parts";
import { PortalCard } from "./portal-card";

type Props = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f-]{36}$/i;

async function find(id: string) {
  if (!UUID.test(id)) return null;
  try {
    return await getClient(id);
  } catch (e) {
    if (e instanceof PanelNotReady) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return { title: (await find(id).catch(() => null))?.name ?? "Cliente" };
}

export default async function ClientPage({ params }: Props) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  let client;
  try {
    client = await getClient(id);
  } catch (e) {
    if (e instanceof PanelNotReady) return <SetupNotice reason={e.message} />;
    throw e;
  }
  if (!client) notFound();

  const today = dayKey();
  const missing: string[] = [];
  const [book, accounts, requests, charges] = await Promise.all([
    loadBook(missing),
    optional(listAccountLinks(), [] as AccountLink[], missing),
    optional(listRequests(), [] as MaintRequest[], []),
    optional(
      chargesOf(today.slice(0, 7)),
      new Map<string, string | null>(),
      [],
    ),
  ]);
  const chargeRows = await optional(
    chargeEntries([...charges.values()].filter((x): x is string => Boolean(x))),
    new Map(),
    [],
  );

  const projects = book.projects.filter((p) => p.clientId === client.id);
  const slugs = new Set(projects.map((p) => p.slug));
  const plans = projects.flatMap((p) => book.plans.get(p.slug) ?? []);
  const owed = owedOf(projects, book.entries, today);
  const income = book.entries.filter(
    (e) => e.kind === "ingreso" && e.project_slug && slugs.has(e.project_slug),
  );
  const paid = projects.reduce((s, p) => s + projectMoney({ slug: p.slug, name: p.name, budget: p.state.budget, status: p.state.status }, book.entries, today).paid, 0);
  const open = openBySlug(requests);
  const names = Object.fromEntries(book.projects.map((p) => [p.slug, p.name]));
  const wa = waNumber(client.whatsapp);

  return (
    <div className="space-y-6">
      <nav
        aria-label="Ruta"
        className="flex items-center gap-1.5 text-[13px] text-muted"
      >
        <Link
          href="/admin/clientes"
          className="focus-ring hover:text-foreground"
        >
          Clientes
        </Link>
        <ChevronRight size={14} />
        <span className="truncate text-foreground">{client.name}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="adm-display text-[clamp(30px,4.2vw,52px)] text-balance">
            {client.name}
          </h1>
          <p className="mt-1.5 text-[14px] text-muted">
            {[client.contact, client.email, client.whatsapp]
              .filter(Boolean)
              .join(" · ") || "Sin contacto cargado"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {client.email && (
            <a href={`mailto:${client.email}`} className={btnSecondary}>
              <Mail size={14} /> Email
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener"
              className={btnSecondary}
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
        </div>
      </header>

      {missing[0] && <SetupNotice reason={missing[0]} />}

      <div className={`${kpiRow} md:grid-cols-4`}>
        <Kpi label="Proyectos" value={projects.length} />
        <Kpi
          label="Abono mensual"
          value={usd(mrr(plans, book.fx))}
          hint={plans.some((p) => !p.active) ? "Hay un plan pausado" : "En USD"}
          href="/admin/mantenimiento"
        />
        <Kpi label="Cobrado" value={usd(paid)} hint="Histórico, en USD" />
        <Kpi
          label="Por cobrar"
          value={usd(owed.total)}
          tone={owed.total ? "amber" : undefined}
          hint={
            owed.projects.some((p) => p.late)
              ? "Hay cobros vencidos"
              : undefined
          }
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <ClientInfo initial={client} />

        <div className="min-w-0 space-y-4">
          <Card title="Proyectos" count={projects.length}>
            {projects.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {projects.map((p) => {
                  const plan = book.plans.get(p.slug);
                  const fid = charges.get(p.slug);
                  const charge = plan?.active
                    ? CHARGE_STATE[
                        chargeState((fid && chargeRows.get(fid)) || null, today)
                      ]
                    : null;
                  const check = book.checks.get(p.slug);
                  return (
                    <li key={p.slug} className="space-y-1.5 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/proyectos/${p.slug}`}
                          className="focus-ring text-[14px] font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <StatusPill status={p.state.status} />
                        {p.state.lead_id && (
                          <Link
                            href={`/admin/pedidos?pedido=${p.state.lead_id}`}
                            className="focus-ring inline-flex items-center gap-0.5 text-[12px] text-muted hover:text-foreground"
                          >
                            Pedido de origen (chat e historial){" "}
                            <ArrowUpRight size={12} />
                          </Link>
                        )}
                      </div>
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
                        <span>
                          {plan
                            ? `Abono ${fmt(plan.amount, plan.currency)}/mes${plan.active ? "" : " (pausado)"}`
                            : "Sin plan de mantenimiento"}
                          {charge && (
                            <span className={cn("ml-1", charge.tone)}>
                              · {charge.label} este mes
                            </span>
                          )}
                        </span>
                        {open.get(p.slug) ? (
                          <span>{open.get(p.slug)} pedidos abiertos</span>
                        ) : null}
                        {p.url && (
                          <span
                            className={
                              check && !check.ok ? "text-red-400" : undefined
                            }
                          >
                            Sitio: {healthLabel(check)}
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Sin proyectos vinculados">
                Vinculá uno con el selector de abajo.
              </Empty>
            )}
            <ProjectLinks
              clientId={client.id}
              options={book.projects
                .filter((p) => p.clientId !== client.id)
                .map((p) => ({
                  slug: p.slug,
                  name: p.name,
                  taken: Boolean(p.clientId),
                }))}
              linked={projects.map((p) => ({ slug: p.slug, name: p.name }))}
            />
          </Card>

          <Card
            title="Cobros"
            count={income.length || undefined}
            action={
              <span className="text-[12px] text-muted">Desde Finanzas</span>
            }
          >
            {income.length ? (
              <ul className="divide-y divide-[var(--line)]">
                {income.slice(0, 15).map((e) => {
                  const st =
                    e.status === "pagado"
                      ? CHARGE_STATE.cobrado
                      : e.occurred_on < today
                        ? CHARGE_STATE.vencido
                        : CHARGE_STATE.pendiente;
                  return (
                    <li
                      key={e.id}
                      className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 text-[13px]"
                    >
                      <span className="min-w-0 truncate">
                        {e.description || "Cobro"}{" "}
                        <span className="text-muted">
                          · {names[e.project_slug ?? ""] ?? e.project_slug}
                        </span>
                      </span>
                      <span className="tabular-nums">
                        {fmt(e.amount, e.currency)}
                      </span>
                      <span className="text-[12px] text-muted">
                        {dateLabel(e.occurred_on)}
                      </span>
                      <span className={cn("text-right text-[12px]", st.tone)}>
                        {st.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <Empty title="Sin cobros cargados">
                Los cobros son los ingresos de Finanzas con el proyecto del
                cliente.
              </Empty>
            )}
          </Card>

          <Card
            title="Cuentas de acceso"
            icon={<KeyRound size={14} />}
            action={
              <Link
                href="/admin/cuentas"
                className="focus-ring text-[12px] text-muted hover:text-foreground"
              >
                Abrir Cuentas →
              </Link>
            }
          >
            <AccountLinks clientId={client.id} initial={accounts} />
          </Card>

          <PortalCard clientId={client.id} whatsapp={client.whatsapp} name={client.contact || client.name} />
        </div>
      </div>

      <DeleteClient id={client.id} name={client.name} />
    </div>
  );
}
