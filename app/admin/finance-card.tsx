// «Caja del mes» en Inicio: ingresos, costos y resultado del mes en dólares. Es
// un resumen; el detalle, el equivalente en pesos y los otros períodos están en
// Finanzas. Componente de servidor: sólo muestra lo que ya se calculó.
import Link from "next/link";
import { Wallet } from "lucide-react";
import { monthOf } from "@/lib/admin/calendar-shared";
import {
  expand,
  fixedCosts,
  fmt,
  margin,
  totals,
  type Entry,
} from "@/lib/admin/finance-shared";
import { Card, CardLink, cn } from "./kit";

export function FinanceCard({
  entries,
  today,
}: {
  entries: Entry[];
  today: string;
}) {
  const month = monthOf(today);
  const name = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    month: "long",
  });
  const t = totals(expand(entries, [month]));
  const result = t.ingresoUsd - t.costoUsd;
  const m = margin(t.ingresoUsd, t.costoUsd);
  const fixed = fixedCosts(entries, month);

  return (
    <Card
      title={`Caja de ${name}`}
      icon={<Wallet size={14} />}
      action={<CardLink href="/admin/finanzas">Ver finanzas →</CardLink>}
    >
      {entries.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          Todavía no hay ingresos ni costos cargados.{" "}
          <Link
            href="/admin/finanzas?nuevo=1"
            className="text-accent hover:underline"
          >
            Cargar el primero
          </Link>
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 divide-x divide-[var(--line)]">
            <Stat label="Ingresos" value={fmt(t.ingresoUsd, "USD")} />
            <Stat label="Costos" value={fmt(t.costoUsd, "USD")} />
            <Stat
              label="Resultado"
              value={fmt(result, "USD")}
              tone={
                result < 0
                  ? "text-red-400"
                  : result > 0
                    ? "text-emerald-300"
                    : undefined
              }
            />
          </dl>
          <p className="border-t border-[var(--line)] px-4 py-2.5 text-[12px] text-muted">
            Costos fijos {fmt(fixed.usd, "USD")} por mes
            {m === null ? "" : ` · Margen ${m}%`}
          </p>
        </>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="px-4 py-3.5">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-[17px] font-semibold tracking-[-0.01em] tabular-nums",
          tone,
        )}
      >
        {value}
      </dd>
    </div>
  );
}
