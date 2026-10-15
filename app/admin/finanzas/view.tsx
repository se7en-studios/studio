"use client";

// Finanzas: ingresos y costos del período en pesos o en dólares, con el
// equivalente en la otra moneda. El período, la moneda y el proyecto cambian
// todos los números a la vez.
import { useMemo, useState, useTransition } from "react";
import { Download, Plus } from "lucide-react";
import { monthOf } from "@/lib/admin/calendar-shared";
import {
  CURRENCIES,
  OWNERS,
  PERIODS,
  arsOf,
  byMonth,
  categoryLabel,
  expand,
  fixedCosts,
  fmt,
  forPartner,
  groupTotals,
  isWithdrawal,
  margin,
  periodMonths,
  pick,
  settle as splitOf,
  totals,
  usdOf,
  type Currency,
  type Entry,
  type Owner,
  type Period,
} from "@/lib/admin/finance-shared";
import type { LeadOwner } from "@/lib/admin/db";
import type { TaxCategory } from "@/lib/admin/plata-shared";
import { paymentToEntry, receivables, type Billable, type Payment } from "@/lib/admin/payment-shared";
import { toolEntries, type Tool } from "@/lib/admin/tool-shared";
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
import { deleteCobro, deleteEntry, deleteTool, settleEntry } from "./actions";
import { Breakdown, MonthlyChart, ProjectProfit } from "./charts";
import { EntryForm } from "./entry-form";
import { Movements } from "./movements";
import { Partners } from "./partners";
import { PaymentForm } from "./payment-form";
import { OWNER_LABEL } from "./owner";
import { Pending, type OwedProject } from "./pending";
import { Collections, TaxMeters } from "./plata";
import type { Tab } from "./tabs";
import { ByOwner, SummaryTable } from "./summary-table";
import { Tools } from "./tools";

type Project = { slug: string; name: string };
const NO_PROJECT = "__sin-proyecto";
// ponytail: apagada por ahora, hay costos individuales de cada socio. Poner en true para volver a ver quién le debe a quién (todo a 50/50).
const SHOW_PARTNERS = false;
const PERIOD_IDS = PERIODS.map((p) => p.id);


type Props = {
  entries: Entry[];
  rates: Rates;
  /** Cotización de referencia (pesos por dólar); 0 si no hay ninguna. */
  fx: number;
  projects: Project[];
  /** Monto acordado y etapa de cada proyecto, para calcular lo que falta cobrar. */
  billable: Billable[];
  /** Herramientas con renovación; null si falta la tabla. */
  tools: Tool[] | null;
  today: string;
  /** Quién está cargando: es el «quién pagó o cobró» por defecto. */
  me: LeadOwner;
  /** Desde un link (?nuevo=1): abre el formulario de alta. */
  initialAdd?: boolean;
  /** La pestaña de ?tab= (link directo a Pendientes, etc.). */
  initialTab: Tab;
  /** Categoría de monotributo de cada socio; null si falta finance-v5.sql. */
  taxCategories: Partial<Record<LeadOwner, TaxCategory>> | null;
};

export function FinanceView({
  entries,
  rates,
  fx,
  projects,
  billable,
  tools,
  today,
  me,
  initialAdd = false,
  initialTab,
  taxCategories,
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
  // De quién: cada uno ve lo suyo (sus costos individuales) o todo junto.
  const [who, setWho] = useState<"todos" | Owner>("todos");
  // La pestaña va en la URL (?tab=pendientes): se puede pasar el link o volver con atrás.
  const [tab, setTabState] = useState<Tab>(initialTab);
  function setTab(next: Tab) {
    setTabState(next);
    const url = new URL(window.location.href);
    if (next === "resumen") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }
  const [copyFrom, setCopyFrom] = useState<Entry | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [toolList, setToolList] = useState(tools ?? []);
  const activeTools = toolList.filter((t) => !t.ended_on);
  const [editing, setEditing] = useState<Entry | null>(null);
  const [editingTool, setEditingTool] = useState<Tool | "new" | null>(null);
  const [adding, setAdding] = useState<"movimiento" | "pendiente" | null>(
    initialAdd ? "movimiento" : null,
  );
  const [, start] = useTransition();

  // Las herramientas cuentan como costos fijos mensuales (lo anual, prorrateado).
  const all = useMemo(
    () => [...items, ...toolEntries(toolList, fx)],
    [items, toolList, fx],
  );

  // Cobros de antes de finance-v4.sql: no guardan cotización y usan la de hoy.
  const legacy = items.some((e) => e.source === "cobro");
  // Sin cotización, esos cobros (y las herramientas) no tienen equivalente en pesos: se muestra sólo en dólares.
  const arsReliable = fx > 0 || !all.some((e) => e.source !== "manual");
  const currency: Currency = arsReliable ? stored : "USD";
  const other: Currency = currency === "USD" ? "ARS" : "USD";

  const names = useMemo(
    () => new Map(projects.map((p) => [p.slug, p.name])),
    [projects],
  );
  const projectName = (slug: string | null) =>
    slug ? (names.get(slug) ?? slug) : null;

  const byProject = useMemo(
    () =>
      all.filter(
        (e) =>
          project === "todos" ||
          (project === NO_PROJECT
            ? !e.project_slug
            : e.project_slug === project),
      ),
    [all, project],
  );
  const scoped = useMemo(
    () =>
      who === "todos"
        ? byProject
        : who === "ambos"
          ? byProject.filter((e) => e.owner === "ambos")
          : forPartner(byProject, who),
    [byProject, who],
  );
  const months = useMemo(
    () => periodMonths(period, today, all),
    [period, today, all],
  );
  const occ = useMemo(() => expand(scoped, months), [scoped, months]);
  const tot = totals(occ);
  const { ingreso, costo } = pick(tot, currency);
  const otherTot = pick(tot, other);
  // Lo que le toca a cada socio de los ingresos (la cuenta del estudio va mitad y mitad).
  const split = splitOf(occ, currency);
  const evenSplit = Math.abs(split.franco.in - split.federico.in) < 1;
  const result = ingreso - costo;
  const pendingItems = scoped.filter((e) => e.status === "pendiente");
  // Ingresos recurrentes (finance-v5.sql): no cuentan solos, cada mes generan un pendiente.
  const plans = scoped.filter((e) => e.plan);
  // Lo que falta cobrar, con la misma cuenta que Inicio y la ficha del proyecto.
  // Se calcula sobre los movimientos sin filtrar: cobrar no es de un socio en particular.
  const owing = useMemo(() => receivables(billable, items, today), [billable, items, today]);
  const receivable =
    who !== "todos"
      ? null
      : project === "todos"
        ? owing.total
        : project === NO_PROJECT
          ? owing.loose
          : (owing.projects.find((p) => p.slug === project)?.owed ?? 0);
  // El saldo del acordado que no cubre ningún pendiente cargado: los pendientes ya están en la lista.
  const owedShown: OwedProject[] = owing.projects
    .filter((p) => p.uncovered > 0 && who === "todos" && (project === "todos" || project === p.slug))
    .map((p) => ({ slug: p.slug, name: p.name, balance: p.uncovered, partial: p.pending > 0 }));
  const fixed = fixedCosts(scoped, monthOf(today));
  const inPeriod = useMemo(() => {
    const ids = new Set(occ.map((o) => o.entry.id));
    return scoped.filter((e) => ids.has(e.id));
  }, [occ, scoped]);

  const costRows = [
    ...groupTotals(
      occ.filter((o) => o.entry.kind === "costo" && !isWithdrawal(o.entry)),
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

  function settle(id: string) {
    start(async () => {
      const res = await settleEntry(id);
      if (res.entry) {
        const paid = res.entry;
        setItems((xs) => xs.map((x) => (x.id === id ? paid : x)));
        flash(paid.kind === "costo" ? "Marcado como pagado" : "Marcado como cobrado", "ok");
      } else flash(res.error ?? "No se pudo actualizar.", "error");
    });
  }

  // Dada de baja (finance-v5.sql) sigue en la lista interna: sus meses pagados siguen siendo costo.
  function removeTool(id: string) {
    const before = toolList;
    setToolList((xs) => xs.filter((x) => x.id !== id));
    start(async () => {
      const res = await deleteTool(id);
      if (res.error) {
        setToolList(before);
        flash(res.error, "error");
        return;
      }
      if (res.ended_on) {
        const ended_on = res.ended_on;
        setToolList(before.map((x) => (x.id === id ? { ...x, ended_on } : x)));
      }
      flash("Herramienta quitada", "ok");
    });
  }

  // Cada origen se edita donde corresponde: herramientas en su formulario, cobros en el suyo.
  // Con el filtro de un socio, las filas de la cuenta del estudio vienen partidas: se edita el original.
  const original = (e: Entry) => all.find((x) => x.id === e.id) ?? e;

  function editRow(shown: Entry) {
    const e = original(shown);
    // Un precio viejo (`tool-<id>-<n>`) también abre la herramienta.
    const tool = toolList.find((t) => e.id.startsWith(`tool-${t.id}`));
    if (tool) return setEditingTool(tool);
    if (e.source === "cobro")
      return setEditingPayment({
        id: e.id.slice("cobro-".length),
        created_at: "",
        project_slug: e.project_slug ?? "",
        paid_on: e.occurred_on,
        amount: e.amount,
        note: e.description,
        created_by: e.created_by,
        owner: e.owner,
      });
    setEditing(e);
  }

  function removeCobro(id: string) {
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    start(async () => {
      const res = await deleteCobro(id.slice("cobro-".length));
      if (res.error) {
        setItems(before);
        flash(res.error, "error");
      } else flash("Cobro borrado", "ok");
    });
  }

  function remove(id: string) {
    if (id.startsWith("tool-")) return removeTool(id.slice(5, 41));
    if (id.startsWith("cobro-")) return removeCobro(id);
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
        <Segmented
          value={who}
          onChange={setWho}
          label="De quién"
          options={[
            { id: "todos", label: "Todos" },
            ...OWNERS.map((o) => ({ id: o, label: OWNER_LABEL[o] })),
          ]}
        />
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
            onClick={() => setAdding("movimiento")}
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
            . Cada movimiento se convierte con la cotización que tiene
            cargada{legacy && "; los cobros que siguen en la tabla vieja, con esta"}.
          </>
        ) : (
          `No pude traer la cotización del dólar.${legacy ? " Los cobros que siguen en la tabla vieja se ven sólo en dólares;" : ""} cargá a mano la cotización en cada movimiento.`
        )}
      </p>

      <div className={cn(kpiRow, "md:grid-cols-3 xl:grid-cols-5")}>
        <Kpi
          label="Ingresos"
          value={fmt(ingreso, currency)}
          tone={ingreso ? "green" : undefined}
          hint={
            <>
              <span className="block truncate">≈ {fmt(otherTot.ingreso, other)}</span>
              {ingreso > 0 && (
                <span className="block truncate">
                  {evenSplit
                    ? `50/50: ${fmt(split.franco.in, currency)} c/u`
                    : `Franco ${fmt(split.franco.in, currency)} · Federico ${fmt(split.federico.in, currency)}`}
                </span>
              )}
            </>
          }
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
            <>
              <span className="block truncate">
                {margin(ingreso, costo) === null
                  ? `≈ ${fmt(otherTot.ingreso - otherTot.costo, other)}`
                  : `Margen ${margin(ingreso, costo)}% · ≈ ${fmt(otherTot.ingreso - otherTot.costo, other)}`}
              </span>
              {/* Los retiros no son costo: se muestran aparte, no restan del resultado. */}
              {pick(tot, currency).retiro > 0 && (
                <span className="block truncate">Retiros de socios: {fmt(pick(tot, currency).retiro, currency)}</span>
              )}
            </>
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
            hint="Pendientes y saldo de lo acordado"
          />
        )}
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        label="Sección"
        options={[
          { id: "resumen", label: "Resumen" },
          { id: "movimientos", label: `Movimientos (${inPeriod.length})` },
          {
            id: "pendientes",
            label: `Pendientes (${pendingItems.length + owedShown.length})`,
          },
          { id: "herramientas", label: `Herramientas (${activeTools.length})` },
        ]}
      />

      {tab === "resumen" && (
        <div className="space-y-4">
          <MonthlyChart series={byMonth(occ, months)} currency={currency} />
          <SummaryTable series={byMonth(occ, months)} currency={currency} />
          <ByOwner occ={occ} currency={currency} />
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
          <TaxMeters entries={items} today={today} categories={taxCategories} />
          {SHOW_PARTNERS && (
            <Partners occ={occ} currency={currency} result={result} />
          )}
          <ProjectProfit rows={profitRows} currency={currency} />
        </div>
      )}

      {tab === "movimientos" && (
        <Movements
          entries={inPeriod}
          currency={currency}
          projectName={projectName}
          onEdit={editRow}
          onDelete={remove}
          onDuplicate={(e) => setCopyFrom(original(e))}
        />
      )}

      {tab === "pendientes" && (
        <div className="space-y-4">
        <Collections entries={scoped} today={today} />
        <Pending
          entries={pendingItems}
          plans={plans}
          owed={owedShown}
          today={today}
          projectName={projectName}
          onSettle={settle}
          onEdit={(e) => setEditing(original(e))}
          onAdd={() => setAdding("pendiente")}
        />
        </div>
      )}

      {tab === "herramientas" && (
        <Tools
          list={tools === null ? null : activeTools}
          setList={setToolList}
          editing={editingTool}
          setEditing={setEditingTool}
          onRemove={removeTool}
          defaultOwner={me}
          currency={currency}
          fx={fx}
          today={today}
        />
      )}

      {(adding || editing || copyFrom) && (
        <EntryForm
          rates={rates}
          fx={fx}
          projects={projects}
          today={today}
          entry={editing}
          copyFrom={copyFrom}
          defaultOwner={me}
          initialPending={adding === "pendiente"}
          onClose={() => {
            setAdding(null);
            setEditing(null);
            setCopyFrom(null);
          }}
          onSaved={(entry) => {
            const edited = items.some((x) => x.id === entry.id);
            setItems((xs) =>
              edited
                ? xs.map((x) => (x.id === entry.id ? entry : x))
                : [entry, ...xs],
            );
            flash(edited ? "Movimiento actualizado" : "Movimiento cargado", "ok");
          }}
        />
      )}

      {editingPayment && (
        <PaymentForm
          payment={editingPayment}
          projects={projects}
          onClose={() => setEditingPayment(null)}
          onSaved={(saved) => {
            setItems((xs) =>
              xs.map((x) => (x.id === `cobro-${saved.id}` ? paymentToEntry(saved, fx) : x)),
            );
            flash("Cobro actualizado", "ok");
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
    "Fuente cotización",
    "Vencimiento",
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
    e.source === "cobro"
      ? "cobro de proyecto"
      : e.source === "herramienta"
        ? "herramienta"
        : "manual",
    e.fx_source ?? "",
    e.due_on ?? "",
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
