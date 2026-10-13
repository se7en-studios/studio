"use client";

// Gráficos de Finanzas hechos con CSS, sin librería: barras por mes, desglose y
// rentabilidad por proyecto. Cada gráfico tiene su texto: nada depende sólo del color.
import {
  fmt,
  margin,
  pick,
  type Currency,
  type Totals,
} from "@/lib/admin/finance-shared";
import { Card, cn } from "../kit";

const COLORS = { ingreso: "bg-emerald-400", costo: "bg-orange-400" };

function monthName(month: string, withYear: boolean) {
  return new Date(`${month}-01T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    month: "short",
    ...(withYear && { year: "2-digit" }),
  });
}

export function MonthlyChart({
  series,
  currency,
}: {
  series: (Totals & { month: string })[];
  currency: Currency;
}) {
  const rows = series.map((s) => ({ month: s.month, ...pick(s, currency) }));
  const max = Math.max(1, ...rows.flatMap((r) => [r.ingreso, r.costo]));
  const withYear = rows.length > 12;
  const height = (v: number) =>
    v > 0 ? `${Math.max(3, (v / max) * 100)}%` : "0%";

  return (
    <Card
      title="Ingresos y costos por mes"
      action={
        <span className="flex items-center gap-3 text-[11px] text-muted">
          <Legend color={COLORS.ingreso} label="Ingresos" />
          <Legend color={COLORS.costo} label="Costos" />
        </span>
      }
    >
      <div className="overflow-x-auto p-4">
        <ul
          className="flex h-40 items-end gap-2"
          style={{ minWidth: `${rows.length * 44}px` }}
        >
          {rows.map((r) => (
            <li
              key={r.month}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5"
            >
              <div
                className="flex h-full w-full items-end justify-center gap-1"
                title={`${monthName(r.month, true)}: ingresos ${fmt(r.ingreso, currency)} · costos ${fmt(r.costo, currency)}`}
              >
                <span
                  className={cn("w-1/2 max-w-[18px] rounded-t", COLORS.ingreso)}
                  style={{ height: height(r.ingreso) }}
                />
                <span
                  className={cn("w-1/2 max-w-[18px] rounded-t", COLORS.costo)}
                  style={{ height: height(r.costo) }}
                />
              </div>
              <span className="text-[11px] text-muted capitalize">
                {monthName(r.month, withYear)}
              </span>
              <span className="sr-only">
                {monthName(r.month, true)}: ingresos {fmt(r.ingreso, currency)},
                costos {fmt(r.costo, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("h-2 w-2 rounded-full", color)} /> {label}
    </span>
  );
}

export type BreakdownRow = { key: string; label: string; value: number };

/** Barras horizontales con el porcentaje de cada fila sobre el total. */
export function Breakdown({
  title,
  rows,
  currency,
  tone,
}: {
  title: string;
  rows: BreakdownRow[];
  currency: Currency;
  tone: keyof typeof COLORS;
}) {
  const sorted = rows
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, r) => s + r.value, 0);
  return (
    <Card title={title}>
      {sorted.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          Sin datos en este período.
        </p>
      ) : (
        <ul className="space-y-3 p-4">
          {sorted.map((r) => {
            const share = Math.round((r.value / total) * 100);
            return (
              <li key={r.key}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate">{r.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {fmt(r.value, currency)}{" "}
                    <span className="text-muted">· {share}%</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className={cn("h-full rounded-full", COLORS[tone])}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export type ProfitRow = { key: string; label: string; totals: Totals };

/** Ingresos, costos y margen de cada proyecto, el que más aporta primero. */
export function ProjectProfit({
  rows,
  currency,
}: {
  rows: ProfitRow[];
  currency: Currency;
}) {
  const lines = rows
    .map((r) => ({ ...r, ...pick(r.totals, currency) }))
    .filter((r) => r.ingreso > 0 || r.costo > 0)
    .sort((a, b) => b.ingreso - b.costo - (a.ingreso - a.costo));
  return (
    <Card title="Rentabilidad por proyecto">
      {lines.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          Ningún ingreso ni costo con proyecto en este período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-[13px]">
            <thead className="text-[11px] tracking-wide text-muted uppercase">
              <tr className="border-b border-[var(--line)]">
                <th className="px-4 py-2 font-medium">Proyecto</th>
                <th className="px-2 py-2 text-right font-medium">Ingresos</th>
                <th className="px-2 py-2 text-right font-medium">Costos</th>
                <th className="px-2 py-2 text-right font-medium">Resultado</th>
                <th className="px-4 py-2 text-right font-medium">Margen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {lines.map((r) => {
                const result = r.ingreso - r.costo;
                const m = margin(r.ingreso, r.costo);
                return (
                  <tr key={r.key}>
                    <td className="px-4 py-2.5 font-medium">{r.label}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {fmt(r.ingreso, currency)}
                    </td>
                    <td className="px-2 py-2.5 text-right text-muted tabular-nums">
                      {fmt(r.costo, currency)}
                    </td>
                    <td
                      className={cn(
                        "px-2 py-2.5 text-right tabular-nums",
                        result < 0 ? "text-red-400" : "text-emerald-300",
                      )}
                    >
                      {fmt(result, currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted tabular-nums">
                      {m === null ? "—" : `${m}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
