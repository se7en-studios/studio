import Link from "next/link";
import { connection } from "next/server";
import { ArrowUpRight, FileText } from "lucide-react";
import { addMonths, monthLabel } from "@/lib/admin/calendar-shared";
import { dateLabel } from "@/lib/admin/changes";
import { getClient } from "@/lib/admin/clients";
import { fmt, type Currency } from "@/lib/admin/finance-shared";
import { PanelNotReady } from "@/lib/admin/panel";
import {
  clientProjects,
  getPortalSession,
  portalData,
} from "@/lib/admin/portal";
import {
  APPROVAL_STATUS,
  CLIENT_REQUEST_STATUS,
  clientRequests,
  monthlyReport,
  reportHasData,
  reportMonth,
} from "@/lib/admin/portal-shared";
import { PROJECT_STATUS } from "@/lib/admin/project-shared";
import { dayKey } from "@/lib/admin/task-shared";
import { Card, Empty, Progress, StatusPill, btnGhost, cn } from "../admin/kit";
import { logout } from "./actions";
import { DecisionForm, RequestForm } from "./forms";

type Props = { searchParams: Promise<{ mes?: string }> };

const TZ = "America/Argentina/Buenos_Aires";
const when = (iso: string) =>
  new Date(iso)
    .toLocaleString("es-AR", {
      timeZone: TZ,
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\./g, "");
const size = (n: number) =>
  n < 1024 * 1024
    ? `${Math.max(1, Math.round(n / 1024))} KB`
    : `${(n / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
const CHARGE_TONE = {
  cobrado: "text-emerald-300",
  pendiente: "text-amber-300",
  vencido: "text-red-400",
} as const;
const CHARGE_LABEL = {
  cobrado: "Pagado",
  pendiente: "Pendiente",
  vencido: "Vencido",
} as const;

function Locked({ children }: { children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 text-[14px] text-muted shadow-[var(--shadow-card)] sm:p-8">
      <h1 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-foreground">
        Portal de clientes
      </h1>
      {children}
    </section>
  );
}

export default async function PortalPage({ searchParams }: Props) {
  await connection();
  const session = await getPortalSession().catch(() => null);
  if (!session)
    return (
      <Locked>
        Para entrar usá el link que te mandamos por WhatsApp. Si se venció o no
        lo encontrás, pedinos uno nuevo.
      </Locked>
    );

  const today = dayKey();
  const ym = reportMonth((await searchParams).mes, today);
  let client, projects, data;
  try {
    [client, projects] = await Promise.all([
      getClient(session.clientId),
      clientProjects(session.clientId),
    ]);
    data = await portalData(
      projects.map((p) => p.slug),
      today,
      ym,
    );
  } catch (e) {
    if (e instanceof PanelNotReady)
      return (
        <Locked>
          El portal se está preparando. Probá de nuevo en un rato.
        </Locked>
      );
    throw e;
  }
  if (!client) return <Locked>Este acceso ya no está activo.</Locked>;

  const names = Object.fromEntries(projects.map((p) => [p.slug, p.name]));
  const slugs = new Set(projects.map((p) => p.slug));
  const pending = data.approvals.filter((a) => a.status === "pendiente");
  const answered = data.approvals.filter((a) => a.status !== "pendiente");
  const requests = clientRequests(data.requests, slugs);
  const reports = projects
    .map((p) =>
      monthlyReport(
        p.slug,
        ym,
        today,
        data.requests,
        data.plans.find((x) => x.project_slug === p.slug) ?? null,
        data.checks,
      ),
    )
    .filter(reportHasData);
  const decisionsOf = (id: string) =>
    data.decisions.filter((d) => d.approval_id === id);
  const many = projects.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted">Hola,</p>
          <h1 className="text-[26px] leading-[1.1] font-semibold tracking-[-0.03em] sm:text-[32px]">
            {client.name}
          </h1>
        </div>
        <form action={logout}>
          <button className={btnGhost}>Salir</button>
        </form>
      </div>

      {!projects.length && (
        <Card>
          <Empty title="Todavía no hay proyectos acá">
            Cuando arranquemos tu proyecto lo vas a ver en esta página.
          </Empty>
        </Card>
      )}

      {pending.length > 0 && (
        <Card title="Para aprobar" count={pending.length}>
          <ul className="divide-y divide-[var(--line)]">
            {pending.map((a) => (
              <li key={a.id} className="px-4 py-4">
                <p className="text-[12px] text-muted">
                  {many && `${names[a.project_slug]} · `}Ronda {a.round} ·{" "}
                  {dateLabel(a.updated_at.slice(0, 10))}
                </p>
                <h3 className="mt-1 text-[15px] font-medium">{a.title}</h3>
                {a.description && (
                  <p className="mt-1.5 text-[14px] whitespace-pre-line text-foreground/80">
                    {a.description}
                  </p>
                )}
                <Attachments
                  link={a.link}
                  file={
                    a.file_id ? data.approvalFiles.get(a.file_id) : undefined
                  }
                />
                {decisionsOf(a.id).length > 0 && (
                  <History items={decisionsOf(a.id)} />
                )}
                <DecisionForm approval={a.id} csrf={session.csrf} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {projects.length > 0 && (
        <Card title={many ? "Tus proyectos" : "Tu proyecto"}>
          <ul className="divide-y divide-[var(--line)]">
            {projects.map((p) => (
              <li key={p.slug} className="space-y-2.5 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-[15px] font-medium">{p.name}</h3>
                  <StatusPill status={p.status} />
                </div>
                <div className="flex items-center gap-3 text-[13px] tabular-nums">
                  <span className="flex-1">
                    <Progress value={p.progress} />
                  </span>
                  {p.progress}%
                </div>
                <p className="text-[13px] text-muted">
                  Etapa: {PROJECT_STATUS[p.status]?.label ?? p.status}
                  {p.due && ` · Próxima entrega: ${dateLabel(p.due)}`}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {projects.length > 0 && (
        <Card
          title="Pedidos"
          count={
            requests.filter((r) => r.status !== "hecho").length || undefined
          }
        >
          <RequestForm
            projects={projects.map((p) => ({ slug: p.slug, name: p.name }))}
            csrf={session.csrf}
          />
          {requests.length > 0 && (
            <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {requests.slice(0, 30).map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 px-4 py-3 text-[13px]"
                >
                  <span className="min-w-0">
                    <span className="block">{r.title}</span>
                    <span className="text-[12px] text-muted">
                      {many && `${names[r.project_slug]} · `}
                      {dateLabel(r.created_at.slice(0, 10))}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 text-[12px]",
                      r.status === "hecho"
                        ? "text-emerald-300"
                        : r.status === "esperando"
                          ? "text-violet-300"
                          : "text-amber-300",
                    )}
                  >
                    {CLIENT_REQUEST_STATUS[r.status]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {data.files.length > 0 && (
        <Card title="Archivos" count={data.files.length}>
          <ul className="divide-y divide-[var(--line)]">
            {data.files.map((f) => (
              <li key={f.id}>
                <a
                  href={f.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex items-center gap-3 px-4 py-3 text-[13px] hover:bg-white/[0.02]"
                >
                  <FileText size={16} className="shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  <span className="shrink-0 text-[12px] text-muted">
                    {many && `${names[f.project_slug]} · `}
                    {size(f.size)}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.charges.length > 0 && (
        <Card title="Pagos">
          <ul className="divide-y divide-[var(--line)]">
            {data.charges.slice(0, 40).map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 text-[13px]"
              >
                <span className="min-w-0 truncate">
                  {c.description}
                  {many && (
                    <span className="text-muted">
                      {" "}
                      · {names[c.project_slug]}
                    </span>
                  )}
                </span>
                <span className="tabular-nums">
                  {fmt(c.amount, c.currency as Currency)}
                </span>
                <span className="text-[12px] text-muted">
                  {c.state === "cobrado" ? "Pagado el" : "Vence el"}{" "}
                  {dateLabel(c.date)}
                </span>
                <span
                  className={cn("text-right text-[12px]", CHARGE_TONE[c.state])}
                >
                  {CHARGE_LABEL[c.state]}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {(reports.length > 0 || data.plans.some((p) => p.active)) && (
        <Card
          title={`Reporte de ${monthLabel(ym)}`}
          action={<MonthNav ym={ym} today={today} />}
        >
          {!reports.length && <Empty title="Sin movimiento en este mes" />}
          <ul className="divide-y divide-[var(--line)]">
            {reports.map((r) => (
              <li key={r.slug} className="space-y-3 px-4 py-4 text-[13px]">
                {many && (
                  <h3 className="text-[14px] font-medium">{names[r.slug]}</h3>
                )}
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Stat
                    label="Pedidos resueltos"
                    value={String(r.resolved.length)}
                  />
                  <Stat
                    label="Horas usadas"
                    value={`${r.hours.toLocaleString("es-AR")} h${r.included !== null ? ` de ${r.included.toLocaleString("es-AR")}` : ""}`}
                    tone={r.over ? "text-amber-300" : undefined}
                  />
                  <Stat
                    label="Sitio en línea"
                    value={
                      r.uptime === null
                        ? "Sin chequeos"
                        : `${r.uptime.toLocaleString("es-AR")} %`
                    }
                    hint={
                      r.checks ? `${r.checks} chequeos en el mes` : undefined
                    }
                  />
                </dl>
                {r.resolved.length > 0 && (
                  <ul className="space-y-1 text-foreground/80">
                    {r.resolved.map((x) => (
                      <li key={x.id}>
                        ✓ {x.title}{" "}
                        <span className="text-muted">
                          · {dateLabel(x.done_at?.slice(0, 10))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {answered.length > 0 && (
        <Card title="Aprobaciones anteriores">
          <ul className="divide-y divide-[var(--line)]">
            {answered.map((a) => (
              <li key={a.id} className="px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  <span
                    className={cn(
                      "text-[12px]",
                      APPROVAL_STATUS[a.status].tone,
                    )}
                  >
                    {APPROVAL_STATUS[a.status].label}
                  </span>
                </div>
                <History items={decisionsOf(a.id)} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="pt-4 text-center text-[12px] text-muted">
        ¿Dudas? Escribinos por WhatsApp. Este portal es privado: no compartas el
        link.
      </p>
    </div>
  );
}

function Attachments({ link, file }: { link: string; file?: string }) {
  if (!link && !file) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1 text-accent hover:underline"
        >
          Ver la entrega <ArrowUpRight size={13} />
        </a>
      )}
      {file && (
        <a
          href={file}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1 text-accent hover:underline"
        >
          Abrir el archivo <ArrowUpRight size={13} />
        </a>
      )}
    </div>
  );
}

function History({
  items,
}: {
  items: {
    id: string;
    created_at: string;
    round: number;
    decision: string;
    signer: string;
    comment: string;
  }[];
}) {
  return (
    <ol className="mt-2 space-y-1.5 text-[12px] text-muted">
      {items.map((d) => (
        <li key={d.id}>
          Ronda {d.round}: {d.signer}{" "}
          {d.decision === "aprobado" ? "aprobó" : "pidió cambios"} ·{" "}
          {when(d.created_at)}
          {d.comment && (
            <span className="mt-0.5 block whitespace-pre-line text-foreground/70">
              «{d.comment}»
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--well-soft)] p-3">
      <dt className="text-[11px] tracking-wide text-muted uppercase">
        {label}
      </dt>
      <dd className={cn("mt-1 text-[16px] font-medium tabular-nums", tone)}>
        {value}
      </dd>
      {hint && <dd className="text-[11px] text-muted">{hint}</dd>}
    </div>
  );
}

function MonthNav({ ym, today }: { ym: string; today: string }) {
  const prev = reportMonth(addMonths(ym, -1), today);
  const next = addMonths(ym, 1);
  const isNow = ym === today.slice(0, 7);
  return (
    <span className="flex gap-1 text-[12px]">
      {prev !== ym && prev !== today.slice(0, 7) && (
        <Link
          href={`/portal?mes=${prev}`}
          className="focus-ring rounded px-1.5 text-muted hover:text-foreground"
          aria-label="Mes anterior"
        >
          ←
        </Link>
      )}
      {!isNow && (
        <Link
          href={`/portal?mes=${next}`}
          className="focus-ring rounded px-1.5 text-muted hover:text-foreground"
          aria-label="Mes siguiente"
        >
          →
        </Link>
      )}
    </span>
  );
}

