"use client";

// Finanzas: ingresos y costos del período en pesos o en dólares, con el
// equivalente en la otra moneda. El período, la moneda y el proyecto cambian
// todos los números a la vez.
import { useMemo, useState, useTransition } from "react";
import { Download, Plus } from "lucide-react";
import { monthOf } from "@/lib/admin/calendar-shared";
import {
  CURRENCIES,
  PERIODS,
  arsOf,
  byMonth,
  categoryLabel,
  expand,
  fixedCosts,
  fmt,
  groupTotals,
  margin,
  periodMonths,
  pick,
  totals,
  usdOf,
  type Currency,
  type Entry,
  type Period,
} from "@/lib/admin/finance-shared";
import type { Rates } from "@/lib/admin/fx";
import {
  Kpi,
  Segmented,
  btnPrimary,
  btnSecondary,
  cn,
  input,
  kpiRow,
} from "../kit";
import { useStoredChoice, useToast } from "../overlay";
import { cell } from "../pedidos/csv";
import { deleteEntry } from "./actions";
import { Breakdown, MonthlyChart, ProjectProfit } from "./charts";
import { EntryForm } from "./entry-form";
import { Movements } from "./movements";

type Project = { slug: string; name: string };
const NO_PROJECT = "__sin-proyecto";
const PERIOD_IDS = PERIODS.map((p) => p.id);

type Props = {
  entries: Entry[];
  rates: Rates;
  /** Cotización de referencia (pesos por dólar); 0 si no hay ninguna. */
  fx: number;
  projects: Project[];
  /** USD por cobrar de los proyectos con monto acordado; null si falta la base. */
  receivable: number | null;
  today: string;
};

export function FinanceView({
  entries,
  rates,
  fx,
  projects,
  receivable,
  today,
}: Props) {
  const flash = useToast();
  const [items, setItems] = useState(entries);
  const [period, setPeriod] = useStoredChoice<Period>(
    "panel:finanzas:periodo",
    "3m",
    PERIOD_IDS,
  );
  const [stored, setCurrency] = useStoredChoice<Currency>(
    "panel:finanzas:moneda",
    "USD",
    CURRENCIES,
  );
  const [project, setProject] = useState("todos");
  const [adding, setAdding] = useState(false);
  const [, start] = useTransition();

  // Sin cotización, los cobros de proyectos (en dólares) no tienen equivalente en pesos: se muestra sólo en dólares.
  const arsReliable = fx > 0 || !items.some((e) => e.source === "cobro");
  const currency: Currency = arsReliable ? stored : "USD";
  const other: Currency = currency === "USD" ? "ARS" : "USD";

  const names = useMemo(
    () => new Map(projects.map((p) => [p.slug, p.name])),
    [projects],
  );
  const projectName = (slug: string | null) =>
    slug ? (names.get(slug) ?? slug) : null;

  const scoped = useMemo(
    () =>
      items.filter(
        (e) =>
          project === "todos" ||
          (project === NO_PROJECT
            ? !e.project_slug
            : e.project_slug === project),
      ),
    [items, project],
  );
  const months = useMemo(
    () => periodMonths(period, today, items),
    [period, today, items],
  );
  const occ = useMemo(() => expand(scoped, months), [scoped, months]);
  const tot = totals(occ);
  const { ingreso, costo } = pick(tot, currency);
  const otherTot = pick(tot, other);
  const result = ingreso - costo;
  const fixed = fixedCosts(scoped, monthOf(today));
  const inPeriod = useMemo(() => {
    const ids = new Set(occ.map((o) => o.entry.id));
    return scoped.filter((e) => ids.has(e.id));
  }, [occ, scoped]);

  const costRows = [
    ...groupTotals(
      occ.filter((o) => o.entry.kind === "costo"),
      (o) => o.entry.category,
    ),
  ].map(([key, t]) => ({
    key,
    label: categoryLabel("costo", key),
    value: pick(t, currency).costo,
  }));
  const incomeRows = [
    ...groupTotals(
      occ.filter((o) => o.entry.kind === "ingreso"),
      (o) => o.entry.project_slug ?? NO_PROJECT,
    ),
  ].map(([key, t]) => ({
    key,
    label: key === NO_PROJECT ? "Sin proyecto" : (projectName(key) ?? key),
    value: pick(t, currency).ingreso,
  }));
  const profitRows = [
    ...groupTotals(
      occ.filter((o) => o.entry.project_slug),
      (o) => o.entry.project_slug ?? "",
    ),
  ].map(([key, t]) => ({
    key,
    label: projectName(key) ?? key,
    totals: t,
  }));

  function remove(id: string) {
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    start(async () => {
      const res = await deleteEntry(id);
      if (res.error) {
        setItems(before);
        flash(res.error, "error");
      } else flash("Movimiento borrado", "ok");
    });
  }

  const money = (usd: number, ars: number, c: Currency) =>
    fmt(c === "USD" ? usd : ars, c);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={period}
          onChange={setPeriod}
          label="Período"
          options={PERIODS}
        />
        <Segmented
          value={currency}
          onChange={setCurrency}
          label="Moneda"
          options={[
            { id: "USD", label: "Dólares" },
            { id: "ARS", label: "Pesos" },
          ]}
        />
        <select
          value={project}
          onChange={(e) => setProject(e.target.value)}
          aria-label="Filtrar por proyecto"
          className={cn(input, "max-w-[220px]")}
        >
          <option value="todos">Todos los proyectos</option>
          <option value={NO_PROJECT}>Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(inPeriod, projectName)}
            disabled={!inPeriod.length}
            className={btnSecondary}
          >
            <Download size={14} /> CSV
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={btnPrimary}
          >
            <Plus size={14} /> Nuevo movimiento
          </button>
        </div>
      </div>

      <p className="text-[12px] text-muted">
        {fx > 0 ? (
          <>
            Cotización de hoy:{" "}
            {(
              [
                ["MEP", rates.mep],
                ["Oficial", rates.oficial],
                ["Blue", rates.blue],
              ] as const
            )
              .filter(([, v]) => v)
              .map(([n, v]) => `${n} ${fmt(v ?? 0, "ARS")}`)
              .join(" · ") || `${fmt(fx, "ARS")} (la del último movimiento)`}
            . Los cobros de proyectos se convierten con esa cotización; los
            movimientos cargados a mano, con la que les pusiste.
          </>
        ) : (
          "No pude traer la cotización del dólar. Los cobros de proyectos se ven sólo en dólares; cargá a mano la cotización en cada movimiento."
        )}
      </p>

      <div className={cn(kpiRow, "md:grid-cols-3 xl:grid-cols-5")}>
        <Kpi
          label="Ingresos"
          value={fmt(ingreso, currency)}
          tone={ingreso ? "green" : undefined}
          hint={`≈ ${fmt(otherTot.ingreso, other)}`}
        />
        <Kpi
          label="Costos"
          value={fmt(costo, currency)}
          hint={`≈ ${fmt(otherTot.costo, other)}`}
        />
        <Kpi
          label="Resultado"
          value={fmt(result, currency)}
          tone={result < 0 ? "red" : result > 0 ? "green" : undefined}
          hint={
            margin(ingreso, costo) === null
              ? `≈ ${fmt(otherTot.ingreso - otherTot.costo, other)}`
              : `Margen ${margin(ingreso, costo)}% · ≈ ${fmt(otherTot.ingreso - otherTot.costo, other)}`
          }
        />
        <Kpi
          label="Costos fijos por mes"
          value={money(fixed.usd, fixed.ars, currency)}
          hint="Los que se repiten todos los meses"
        />
        {receivable !== null && (
          <Kpi
            label="Por cobrar"
            value={
              currency === "USD"
                ? fmt(receivable, "USD")
                : fmt(receivable * fx, "ARS")
            }
            tone={receivable > 0 ? "amber" : undefined}
            hint="Saldo de proyectos con monto acordado"
          />
        )}
      </div>

      <MonthlyChart series={byMonth(occ, months)} currency={currency} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="Costos por categoría"
          rows={costRows}
          currency={currency}
          tone="costo"
        />
        <Breakdown
          title="Ingresos por proyecto"
          rows={incomeRows}
          currency={currency}
          tone="ingreso"
        />
      </div>

      <ProjectProfit rows={profitRows} currency={currency} />
      <Movements
        entries={inPeriod}
        projectName={projectName}
        onDelete={remove}
      />

      {adding && (
        <EntryForm
          rates={rates}
          fx={fx}
          projects={projects}
          today={today}
          onClose={() => setAdding(false)}
          onCreated={(entry) => {
            setItems((xs) => [entry, ...xs]);
            flash("Movimiento cargado", "ok");
          }}
        />
      )}
    </div>
  );
}

/** Sólo los movimientos del período filtrado, con los dos montos calculados. */
function downloadCsv(
  entries: Entry[],
  projectName: (slug: string | null) => string | null,
) {
  const head = [
    "Fecha",
    "Tipo",
    "Descripción",
    "Categoría",
    "Proyecto",
    "Moneda",
    "Monto",
    "Cotización",
    "USD",
    "ARS",
    "Se repite",
    "Hasta",
    "Origen",
  ];
  const rows = entries.map((e) => [
    e.occurred_on,
    e.kind,
    e.description,
    categoryLabel(e.kind, e.category),
    projectName(e.project_slug) ?? "",
    e.currency,
    e.amount,
    e.fx || "",
    Math.round(usdOf(e) * 100) / 100,
    e.fx || e.currency === "ARS" ? Math.round(arsOf(e) * 100) / 100 : "",
    e.recurring ? "mensual" : "",
    e.until ?? "",
    e.source === "cobro" ? "cobro de proyecto" : "manual",
  ]);
  // BOM: sin él Excel abre los acentos rotos.
  const blob = new Blob(
    ["﻿", [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanzas-se7en-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
