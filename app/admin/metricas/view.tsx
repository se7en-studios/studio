"use client";

import { useMemo, useState } from "react";
import type { Lead, LeadStatus } from "@/lib/admin/db";
import type { Activity } from "@/lib/admin/activity-shared";
import { PEOPLE } from "@/lib/admin/people";
import { computeMetrics, type Group } from "@/lib/admin/metrics";
import { Card, Kpi, Segmented, cn, kpiRow } from "../kit";

// Métricas del CRM: cuántos pedidos llegan, cuántos se cierran, cuánto vale y
// qué canal rinde. Una sola serie por gráfico, en el naranja de la marca, con
// el valor escrito y un tooltip al pasar el mouse.

const RANGES = [
  { id: "30", label: "30 días", days: 30 },
  { id: "90", label: "90 días", days: 90 },
  { id: "365", label: "12 meses", days: 365 },
  { id: "todo", label: "Todo", days: null },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const STAGES: { id: LeadStatus; label: string }[] = [
  { id: "nuevo", label: "Nuevos" },
  { id: "contactado", label: "Contactados" },
  { id: "propuesta", label: "Propuesta" },
  { id: "ganado", label: "Ganados" },
  { id: "perdido", label: "Perdidos" },
];

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  instagram: "Instagram",
  referido: "Referido",
  llamada: "Llamada",
  otro: "Otro",
  web: "Web",
};

const usd = (n: number | null) =>
  n ? `USD ${Math.round(n).toLocaleString("es-AR")}` : "—";
const pct = (n: number | null) => (n == null ? "—" : `${Math.round(n * 100)}%`);
function hours(h: number | null) {
  if (h == null) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} días`;
}
const monthLabel = (key: string) =>
  new Date(`${key}-15T12:00:00`)
    .toLocaleDateString("es-AR", { month: "short" })
    .replace(".", "");

export function MetricsView({
  leads,
  activities,
}: {
  leads: Lead[];
  activities: Activity[] | null;
}) {
  const [range, setRange] = useState<RangeId>("90");
  const [now] = useState(() => Date.now());
  const m = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)?.days ?? null;
    const since = days ? new Date(now - days * 86_400_000).toISOString() : null;
    return computeMetrics(leads, activities, since, 12, now);
  }, [leads, activities, range, now]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={range} onChange={setRange} label="Período" options={RANGES} />
        <p className="text-xs text-muted">
          Según la fecha en que llegó cada pedido.
        </p>
      </div>

      <div className={cn(kpiRow, "md:grid-cols-3 xl:grid-cols-6")}>
        <Kpi label="Pedidos" value={m.total} />
        <Kpi
          label="Tasa de cierre"
          value={pct(m.winRate)}
          hint={`${m.won} ${m.won === 1 ? "ganado" : "ganados"} · ${m.lost} ${m.lost === 1 ? "perdido" : "perdidos"}`}
        />
        <Kpi label="Ganado" value={usd(m.wonValue)} />
        <Kpi label="Ticket promedio" value={usd(m.avgTicket)} />
        <Kpi
          label="Valor en juego"
          value={usd(m.pipelineValue)}
          hint="Contactados + propuesta"
        />
        <Kpi
          label="Primera respuesta"
          value={hours(m.firstResponseHours)}
          hint={
            activities
              ? `Mediana · ${m.responded} con contacto registrado`
              : "Necesita el historial (crm.sql)"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Pedidos por mes" note="Últimos 12 meses">
          <MonthBars data={m.byMonth} />
        </Panel>
        <Panel
          title="Dónde están hoy"
          note="Etapa actual de los pedidos del período"
        >
          <StageBars byStage={m.byStage} total={m.total} />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Por canal" note="Por dónde llegaron">
          <GroupTable rows={m.byChannel} name={(k) => CHANNEL_LABEL[k] ?? k} />
        </Panel>
        <Panel title="Por responsable">
          <GroupTable
            rows={m.byOwner}
            name={(k) =>
              k === "sin"
                ? "Sin asignar"
                : (PEOPLE[k as keyof typeof PEOPLE]?.name ?? k)
            }
          />
        </Panel>
      </div>
    </div>
  );
}


/** Un gráfico: la Card del panel con la nota a la derecha del título. */
function Panel({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <Card title={title} action={note && <span className="text-[11px] text-muted">{note}</span>} className="min-w-0">
      <div className="p-4">{children}</div>
    </Card>
  );
}

/** Columnas finas con el valor arriba; tooltip con pedidos y ganados del mes. */
function MonthBars({
  data,
}: {
  data: { month: string; leads: number; won: number }[];
}) {
  const max = Math.max(1, ...data.map((d) => d.leads));
  if (!data.some((d) => d.leads)) return <Empty />;
  return (
    <div
      className="flex h-48 items-end gap-1.5"
      role="list"
      aria-label="Pedidos por mes"
    >
      {data.map((d) => {
        const label = `${monthLabel(d.month)} ${d.month.slice(0, 4)}: ${d.leads} pedidos, ${d.won} ganados`;
        return (
          <div
            key={d.month}
            role="listitem"
            aria-label={label}
            title={label}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            <span className="mb-1 font-mono text-[11px] text-muted tabular-nums group-hover:text-foreground">
              {d.leads || ""}
            </span>
            <span
              className="w-full max-w-7 rounded-t-[4px] bg-accent/80 transition-colors group-hover:bg-accent"
              style={{
                height: `${(d.leads / max) * 100}%`,
                minHeight: d.leads ? 3 : 0,
              }}
            />
            <span className="mt-1.5 h-px w-full bg-border" aria-hidden />
            <span className="mt-1.5 font-mono text-[11px] text-muted uppercase">
              {monthLabel(d.month)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StageBars({
  byStage,
  total,
}: {
  byStage: Record<LeadStatus, number>;
  total: number;
}) {
  if (!total) return <Empty />;
  const max = Math.max(1, ...Object.values(byStage));
  return (
    <ul className="space-y-3">
      {STAGES.map((s) => {
        const n = byStage[s.id];
        return (
          <li
            key={s.id}
            title={`${s.label}: ${n} (${Math.round((n / total) * 100)}%)`}
          >
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="text-foreground">{s.label}</span>
              <span className="font-mono text-muted tabular-nums">
                {n}{" "}
                <span className="text-muted/60">
                  · {Math.round((n / total) * 100)}%
                </span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.04]">
              <div
                className="h-2 rounded-full bg-accent/80"
                style={{ width: `${(n / max) * 100}%`, minWidth: n ? 4 : 0 }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function GroupTable({
  rows,
  name,
}: {
  rows: Group[];
  name: (key: string) => string;
}) {
  if (!rows.length) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.leads));
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-[11px] font-medium tracking-wide text-muted uppercase">
            <th className="px-1 pb-2 font-normal">Nombre</th>
            <th className="px-1 pb-2 font-normal">Pedidos</th>
            <th className="px-1 pb-2 text-right font-normal">Ganados</th>
            <th className="px-1 pb-2 text-right font-normal">Cierre</th>
            <th className="px-1 pb-2 text-right font-normal">Ganado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border">
              <td className="px-1 py-2.5 text-foreground">{name(r.key)}</td>
              <td className="px-1 py-2.5">
                <span className="flex items-center gap-2">
                  <span
                    className="h-1.5 rounded-full bg-accent/80"
                    style={{ width: `${(r.leads / max) * 72}px` }}
                    aria-hidden
                  />
                  <span className="font-mono text-xs text-foreground tabular-nums">
                    {r.leads}
                  </span>
                </span>
              </td>
              <td className="px-1 py-2.5 text-right font-mono text-xs tabular-nums">
                {r.won}
              </td>
              <td className="px-1 py-2.5 text-right font-mono text-xs tabular-nums">
                {pct(r.winRate)}
              </td>
              <td className="px-1 py-2.5 text-right font-mono text-xs tabular-nums">
                {usd(r.wonValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty() {
  return (
    <p className="py-8 text-center text-sm text-muted">
      Sin pedidos en este período.
    </p>
  );
}
