"use client";

// Resumen por mes y por persona: ingresos, costos, resultado y margen, con los
// números del período. El gráfico los muestra; acá se leen exactos.
import {
  fmt,
  margin,
  pick,
  settle,
  type Currency,
  type Occurrence,
  type Totals,
} from "@/lib/admin/finance-shared";
import { PEOPLE_IDS } from "@/lib/admin/people";
import { Card, cn } from "../kit";
import { OWNER_LABEL, OwnerFaces } from "./owner";

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

type Line = {
  key: string;
  label: React.ReactNode;
  ingreso: number;
  costo: number;
};

export function SummaryTable({
  series,
  currency,
}: {
  series: (Totals & { month: string })[];
  currency: Currency;
}) {
  const lines: Line[] = [...series].reverse().map((s) => ({
    key: s.month,
    label: <span className="inline-block first-letter:uppercase">{monthLabel(s.month)}</span>,
    ...pick(s, currency),
  }));
  return (
    <Table
      title="Resumen por mes"
      first="Mes"
      lines={lines}
      currency={currency}
      showTotal
    />
  );
}

/** Lo de cada socio: lo suyo más la mitad de la cuenta del estudio (que se reparte 50/50). */
export function ByOwner({
  occ,
  currency,
}: {
  occ: Occurrence[];
  currency: Currency;
}) {
  const s = settle(occ, currency);
  const lines: Line[] = PEOPLE_IDS.map((who) => ({
    key: who,
    label: (
      <span className="inline-flex items-center gap-2">
        <OwnerFaces owner={who} size={18} /> {OWNER_LABEL[who]}
      </span>
    ),
    ingreso: s[who].in,
    costo: s[who].out,
  }));
  return (
    <Table
      title="Por persona"
      first="De quién"
      lines={lines}
      currency={currency}
      showTotal
    />
  );
}

function Table({
  title,
  first,
  lines,
  currency,
  showTotal,
}: {
  title: string;
  first: string;
  lines: Line[];
  currency: Currency;
  showTotal?: boolean;
}) {
  const total = lines.reduce(
    (t, r) => ({ ingreso: t.ingreso + r.ingreso, costo: t.costo + r.costo }),
    { ingreso: 0, costo: 0 },
  );
  return (
    <Card title={title}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-[13px]">
          <thead className="font-mono text-[10.5px] tracking-[0.13em] text-muted uppercase">
            <tr className="border-b border-[var(--line)]">
              <th className="px-4 py-2 font-medium">{first}</th>
              <th className="px-2 py-2 text-right font-medium">Ingresos</th>
              <th className="px-2 py-2 text-right font-medium">Costos</th>
              <th className="px-2 py-2 text-right font-medium">Resultado</th>
              <th className="px-4 py-2 text-right font-medium">Margen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {lines.map(({ key, ...r }) => (
              <Row key={key} {...r} currency={currency} />
            ))}
          </tbody>
          {showTotal && lines.length > 1 && (
            <tfoot className="border-t border-[var(--line-strong)] font-medium">
              <Row key="total" label="Total" {...total} currency={currency} />
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  );
}

function Row({
  label,
  ingreso,
  costo,
  currency,
}: {
  label: React.ReactNode;
  ingreso: number;
  costo: number;
  currency: Currency;
}) {
  const result = ingreso - costo;
  const m = margin(ingreso, costo);
  return (
    <tr className="transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-2.5">{label}</td>
      <td className="px-2 py-2.5 text-right tabular-nums">
        {fmt(ingreso, currency)}
      </td>
      <td className="px-2 py-2.5 text-right text-muted tabular-nums">
        {fmt(costo, currency)}
      </td>
      <td
        className={cn(
          "px-2 py-2.5 text-right tabular-nums",
          result < 0
            ? "text-red-400"
            : result > 0
              ? "text-emerald-300"
              : undefined,
        )}
      >
        {fmt(result, currency)}
      </td>
      <td className="px-4 py-2.5 text-right text-muted tabular-nums">
        {m === null ? "—" : `${m}%`}
      </td>
    </tr>
  );
}
