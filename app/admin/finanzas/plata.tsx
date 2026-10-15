"use client";

// Cobros con fecha (vencido, lo que entra a 30/60/90 días y cuánto se tarda en
// cobrar) y el medidor de monotributo de cada socio. Las cuentas están en
// lib/admin/plata-shared.ts.
import { useState, useTransition } from "react";
import { CalendarClock, Landmark } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { fmt, type Entry } from "@/lib/admin/finance-shared";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import {
  MONOTRIBUTO,
  TAX_CATEGORIES,
  billedLast12,
  daysToCollect,
  overdue,
  projection,
  taxMeter,
  type TaxCategory,
} from "@/lib/admin/plata-shared";
import { Card, Face, Kpi, Progress, cn, input, kpiRow } from "../kit";
import { useToast } from "../overlay";
import { saveTaxCategory } from "./actions";

/** Lo vencido, lo que entra y los días promedio para cobrar (en USD). */
export function Collections({
  entries,
  today,
}: {
  entries: Entry[];
  today: string;
}) {
  const late = overdue(entries, today);
  const next = projection(entries, today);
  const dso = daysToCollect(entries, today);
  return (
    <div className={cn(kpiRow, "md:grid-cols-3")}>
      <Kpi
        label="Cobros vencidos"
        value={fmt(late.total, "USD")}
        tone={late.total > 0 ? "red" : undefined}
        icon={<CalendarClock size={14} />}
        hint={
          late.count
            ? `${late.count} ${late.count === 1 ? "cobro" : "cobros"} · el más viejo hace ${late.oldestDays} días`
            : "Nada vencido"
        }
      />
      <Kpi
        label="Entra en 30 días"
        value={fmt(next.d30, "USD")}
        tone={next.d30 > 0 ? "green" : undefined}
        hint={`60 días: ${fmt(next.d60, "USD")} · 90 días: ${fmt(next.d90, "USD")}`}
      />
      <Kpi
        label="Días para cobrar"
        value={dso === null ? "—" : `${dso} días`}
        tone={dso !== null && dso > 45 ? "amber" : undefined}
        hint={
          dso === null
            ? "Se mide al marcar cobrado un pendiente con vencimiento"
            : "Promedio desde el vencimiento, últimos 12 meses"
        }
      />
    </div>
  );
}

const LEVEL_COLOR = {
  ok: undefined,
  "75": "#fbbf24",
  "90": "#f87171",
  over: "#ef4444",
} as const;
const LEVEL_TEXT = {
  ok: "",
  "75": "Pasó el 75 %: mirá la categoría con el contador.",
  "90": "Pasó el 90 %: hay que recategorizar o frenar la facturación.",
  over: "Pasó el tope de la categoría.",
} as const;

/**
 * Lo facturado por cada socio en los últimos 12 meses contra el tope de su
 * categoría. `categories` null: falta la tabla (finance-v5.sql).
 */
export function TaxMeters({
  entries,
  today,
  categories,
}: {
  entries: Entry[];
  today: string;
  categories: Partial<Record<LeadOwner, TaxCategory>> | null;
}) {
  const flash = useToast();
  const [cats, setCats] = useState(categories ?? {});
  const [, start] = useTransition();

  function pick(who: LeadOwner, cat: TaxCategory) {
    const before = cats;
    setCats({ ...cats, [who]: cat });
    start(async () => {
      const res = await saveTaxCategory(who, cat);
      if (res.error) {
        setCats(before);
        flash(res.error, "error");
      }
    });
  }

  return (
    <Card title="Monotributo" icon={<Landmark size={14} />}>
      {categories === null ? (
        <p className="px-4 py-4 text-[13px] text-muted">
          Falta correr supabase/finance-v5.sql en Supabase para elegir la
          categoría de cada socio.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {PEOPLE_IDS.map((who) => {
            const billed = billedLast12(entries, who, today);
            const cat = cats[who];
            const meter = cat ? taxMeter(billed, cat) : null;
            return (
              <li key={who} className="space-y-2 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Face who={who} size={22} alt="" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">
                      {PEOPLE[who].name}
                    </p>
                    <p className="text-[12px] text-muted tabular-nums">
                      {fmt(billed, "ARS")} en 12 meses
                      {meter && ` · ${meter.pct}% de ${fmt(meter.cap, "ARS")}`}
                    </p>
                  </div>
                  <select
                    value={cat ?? ""}
                    onChange={(e) => pick(who, e.target.value as TaxCategory)}
                    aria-label={`Categoría de monotributo de ${PEOPLE[who].name}`}
                    className={cn(input, "w-auto")}
                  >
                    <option value="" disabled>
                      Categoría
                    </option>
                    {TAX_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                {meter && (
                  <>
                    <Progress
                      value={meter.pct}
                      accent={LEVEL_COLOR[meter.level]}
                      label={`Tope de ${PEOPLE[who].name}`}
                    />
                    {meter.level !== "ok" && (
                      <p
                        className={cn(
                          "text-[12px]",
                          meter.level === "75"
                            ? "text-amber-300"
                            : "text-red-400",
                        )}
                      >
                        {LEVEL_TEXT[meter.level]}
                      </p>
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="border-t border-[var(--line)] px-4 py-3 text-[12px] text-muted">
        Lo que cobró cada uno más la mitad de la cuenta del estudio, en pesos
        con la cotización de cada cobro. Topes vigentes desde{" "}
        {MONOTRIBUTO.vigencia.split("-").reverse().join("/")} (
        {MONOTRIBUTO.fuente}): confirmalos con el contador.
      </p>
    </Card>
  );
}
