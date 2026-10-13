"use client";

// Cuánto le toca a cada socio en el período: ingresos, costos y resultado.
// Lo que es de «los dos» se parte 50/50.
import {
  expand,
  fmt,
  forPerson,
  pick,
  totals,
  type Currency,
  type Entry,
} from "@/lib/admin/finance-shared";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { Card, Face, cn } from "../kit";

export function Partners({
  entries,
  months,
  currency,
}: {
  entries: Entry[];
  months: string[];
  currency: Currency;
}) {
  return (
    <Card title="Por socio">
      <div className="grid divide-y divide-[var(--line)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {PEOPLE_IDS.map((who) => {
          const { ingreso, costo } = pick(
            totals(expand(forPerson(entries, who), months)),
            currency,
          );
          const result = ingreso - costo;
          return (
            <div key={who} className="p-4">
              <p className="flex items-center gap-2 text-[13px] font-medium">
                <Face who={who} size={22} alt="" /> {PEOPLE[who].name}
              </p>
              <dl className="mt-3 space-y-1.5 text-[13px]">
                <Line label="Ingresos" value={fmt(ingreso, currency)} />
                <Line label="Costos" value={fmt(costo, currency)} />
                <Line
                  label="Resultado"
                  value={fmt(result, currency)}
                  tone={
                    result < 0
                      ? "text-red-400"
                      : result > 0
                        ? "text-emerald-300"
                        : undefined
                  }
                  strong
                />
              </dl>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Line({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: string;
  tone?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("tabular-nums", strong && "font-medium", tone)}>
        {value}
      </dd>
    </div>
  );
}
