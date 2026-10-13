"use client";

// Cuentas entre socios. Todo se divide 50/50: cada movimiento dice quién puso o
// cobró la plata, y de ahí sale quién le debe a quién para quedar parejos.
// Lo de la «cuenta del estudio» se reparte mitad y mitad y no genera deuda.
import {
  fmt,
  settle,
  type Currency,
  type Occurrence,
} from "@/lib/admin/finance-shared";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { Card, Face, cn } from "../kit";

export function Partners({
  occ,
  currency,
  result,
}: {
  occ: Occurrence[];
  currency: Currency;
  /** Ingresos menos costos del período, de todo el estudio. */
  result: number;
}) {
  const s = settle(occ, currency);
  return (
    <Card title="Cuentas entre socios">
      <div className="grid divide-y divide-[var(--line)] sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {PEOPLE_IDS.map((who) => (
          <div key={who} className="p-4">
            <p className="flex items-center gap-2 text-[13px] font-medium">
              <Face who={who} size={22} alt="" /> {PEOPLE[who].name}
            </p>
            <dl className="mt-3 space-y-1.5 text-[13px]">
              <Line label="Cobró" value={fmt(s[who].in, currency)} />
              <Line label="Pagó" value={fmt(s[who].out, currency)} />
            </dl>
          </div>
        ))}
      </div>
      <div className="space-y-1 border-t border-[var(--line)] px-4 py-3 text-[13px]">
        <p
          className={cn(
            "font-medium",
            s.owes ? "text-amber-300" : "text-emerald-300",
          )}
        >
          {s.owes
            ? `${PEOPLE[s.owes.from].name} le debe ${fmt(s.owes.amount, currency)} a ${PEOPLE[s.owes.to].name}`
            : "Están a mano"}
        </p>
        <p className="text-[12px] text-muted">
          A cada uno le toca la mitad del resultado:{" "}
          {fmt(result / 2, currency)}. La deuda cuenta lo que cada uno cobró y
          pagó de su bolsillo; la cuenta del estudio se parte 50/50 y no genera deuda.
        </p>
      </div>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
