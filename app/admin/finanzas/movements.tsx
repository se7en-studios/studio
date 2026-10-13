"use client";

// Libro de movimientos: todo lo que entró y salió, con filtros, orden y subtotales
// por mes. Cada fila muestra el monto en la moneda en que se cargó y el equivalente
// debajo, en dos renglones para que entre bien en el celular sin cortar ni superponer.
// Editar y borrar valen para los tres orígenes (manual, cobro de proyecto,
// herramienta): la vista decide qué abre o borra en cada caso.
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Copy, Pencil, Repeat, Search, Trash2, X } from "lucide-react";
import {
  COST_CATEGORIES,
  INCOME_CATEGORIES,
  arsOf,
  categoriesOf,
  categoryLabel,
  fmt,
  otherCurrency,
  usdOf,
  type Currency,
  type Entry,
  type FinanceKind,
} from "@/lib/admin/finance-shared";
import { Card, Chip, Empty, btnGhost, btnSecondary, cn, input } from "../kit";
import { OwnerFaces } from "./owner";

const PAGE = 40;

type KindFilter = "todos" | FinanceKind;
type SourceFilter = "todos" | Entry["source"];
type Sort = "fecha-desc" | "fecha-asc" | "monto-desc";

const SORTS: { id: Sort; label: string }[] = [
  { id: "fecha-desc", label: "Fecha ↓ (más nuevos)" },
  { id: "fecha-asc", label: "Fecha ↑ (más viejos)" },
  { id: "monto-desc", label: "Monto ↓ (más altos)" },
];
const SOURCES: { id: SourceFilter; label: string }[] = [
  { id: "todos", label: "Todos los orígenes" },
  { id: "manual", label: "Cargados a mano" },
  { id: "cobro", label: "Cobros de proyectos" },
  { id: "herramienta", label: "Herramientas" },
];
const KINDS: { id: KindFilter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "ingreso", label: "Ingresos" },
  { id: "costo", label: "Costos" },
];

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

const monthLabel = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });

// Categorías para el select: las del tipo elegido, o las dos listas sin repetir ids («otros»).
const categoryOptions = (kind: KindFilter) =>
  kind === "todos"
    ? [...COST_CATEGORIES, ...INCOME_CATEGORIES].filter(
        (c, i, all) => all.findIndex((x) => x.id === c.id) === i,
      )
    : categoriesOf(kind);

export function Movements({
  entries,
  currency,
  projectName,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  entries: Entry[];
  /** Moneda de los subtotales y del orden por monto. */
  currency: Currency;
  projectName: (slug: string | null) => string | null;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
  /** Sólo se ofrece para los cargados a mano. */
  onDuplicate: (entry: Entry) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("todos");
  const [category, setCategory] = useState("todas");
  const [source, setSource] = useState<SourceFilter>("todos");
  const [sort, setSort] = useState<Sort>("fecha-desc");
  const [shown, setShown] = useState(PAGE);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const filtered =
    category !== "todas" ||
    kind !== "todos" ||
    source !== "todos" ||
    query.trim() !== "";

  // Cada cambio de filtro vuelve a la primera página.
  const change =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setShown(PAGE);
    };
  const pickKind = (k: KindFilter) => {
    setKind(k);
    setCategory("todas");
    setShown(PAGE);
  };
  const clear = () => {
    setQuery("");
    setKind("todos");
    setCategory("todas");
    setSource("todos");
    setShown(PAGE);
  };

  const rows = useMemo(() => {
    const q = plain(query.trim());
    const list = entries.filter(
      (e) =>
        (kind === "todos" || e.kind === kind) &&
        (category === "todas" || e.category === category) &&
        (source === "todos" || e.source === source) &&
        (!q ||
          plain(
            `${e.description} ${categoryLabel(e.kind, e.category)} ${projectName(e.project_slug) ?? ""}`,
          ).includes(q)),
    );
    const byDate = (a: Entry, b: Entry) =>
      a.occurred_on.localeCompare(b.occurred_on);
    return list.sort((a, b) =>
      sort === "fecha-asc"
        ? byDate(a, b)
        : sort === "monto-desc"
          ? currency === "USD"
            ? usdOf(b) - usdOf(a)
            : arsOf(b) - arsOf(a)
          : byDate(b, a),
    );
  }, [entries, kind, category, source, query, sort, currency, projectName]);

  // ponytail: los subtotales suman las filas listadas; un recurrente cuenta una vez, en su mes de inicio
  // (el total mes a mes con repeticiones está en los KPI y el gráfico de arriba).
  const monthTotals = useMemo(() => {
    const out = new Map<string, { ingreso: number; costo: number }>();
    for (const e of rows) {
      const m = e.occurred_on.slice(0, 7);
      const t = out.get(m) ?? { ingreso: 0, costo: 0 };
      t[e.kind] += currency === "USD" ? usdOf(e) : arsOf(e);
      out.set(m, t);
    }
    return out;
  }, [rows, currency]);

  // La página visible, en grupos por mes (con el orden por monto va todo en un solo grupo sin encabezado).
  const visible = rows.slice(0, shown);
  const groups: { month: string | null; items: Entry[] }[] = [];
  for (const e of visible) {
    const month = sort === "monto-desc" ? null : e.occurred_on.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(e);
    else groups.push({ month, items: [e] });
  }

  return (
    <Card title="Movimientos" count={entries.length || undefined}>
      {entries.length === 0 ? (
        <Empty title="Todavía no hay movimientos en este período">
          Cargá un ingreso o un costo con «Nuevo movimiento».
        </Empty>
      ) : (
        <>
          <div className="space-y-2.5 border-b border-[var(--line)] p-3">
            <label className="relative block">
              <span className="sr-only">Buscar movimientos</span>
              <Search
                size={14}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => change(setQuery)(e.target.value)}
                placeholder="Buscar por descripción, categoría o proyecto"
                className={cn(input, "pl-9")}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex gap-1.5"
                role="group"
                aria-label="Tipo de movimiento"
              >
                {KINDS.map((k) => (
                  <Chip
                    key={k.id}
                    on={kind === k.id}
                    onClick={() => pickKind(k.id)}
                    className="min-h-9 px-3"
                  >
                    {k.label}
                  </Chip>
                ))}
              </div>
              <select
                value={category}
                onChange={(e) => change(setCategory)(e.target.value)}
                aria-label="Filtrar por categoría"
                className={cn(input, "w-auto max-w-[200px]")}
              >
                <option value="todas">Todas las categorías</option>
                {categoryOptions(kind).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <select
                value={source}
                onChange={(e) =>
                  change(setSource)(e.target.value as SourceFilter)
                }
                aria-label="Filtrar por origen"
                className={cn(input, "w-auto max-w-[200px]")}
              >
                {SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => change(setSort)(e.target.value as Sort)}
                aria-label="Ordenar"
                className={cn(input, "w-auto max-w-[220px]")}
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              {filtered && (
                <button
                  type="button"
                  onClick={clear}
                  className={cn(btnGhost, "min-h-9")}
                >
                  <X size={14} /> Limpiar
                </button>
              )}
            </div>
            <p className="text-[12px] text-muted" aria-live="polite">
              {rows.length} de {entries.length} movimientos
            </p>
          </div>

          {rows.length === 0 ? (
            <Empty title="Ningún movimiento coincide con los filtros">
              <button
                type="button"
                onClick={clear}
                className={cn(btnSecondary, "mt-2")}
              >
                Limpiar filtros
              </button>
            </Empty>
          ) : (
            <>
              {groups.map((g) => (
                <section
                  key={g.month ?? "todos"}
                  aria-label={g.month ? monthLabel(g.month) : "Movimientos"}
                >
                  {g.month && (
                    <MonthHeader
                      month={g.month}
                      totals={monthTotals.get(g.month)}
                      currency={currency}
                    />
                  )}
                  <ul className="divide-y divide-[var(--line)]">
                    {g.items.map((e) => (
                      <li key={e.id}>
                        <Row
                          e={e}
                          project={projectName(e.project_slug)}
                          confirming={confirmId === e.id}
                          onAsk={() => setConfirmId(e.id)}
                          onCancel={() => setConfirmId(null)}
                          onEdit={() => onEdit(e)}
                          onDuplicate={() => onDuplicate(e)}
                          onDelete={() => {
                            setConfirmId(null);
                            onDelete(e.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {rows.length > shown && (
                <button
                  type="button"
                  onClick={() => setShown((n) => n + PAGE)}
                  className={cn(btnGhost, "m-3 min-h-9")}
                >
                  Ver {Math.min(PAGE, rows.length - shown)} más
                </button>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}

/** Encabezado de un mes con lo que entró, lo que salió y el resultado de lo listado. */
function MonthHeader({
  month,
  totals,
  currency,
}: {
  month: string;
  totals: { ingreso: number; costo: number } | undefined;
  currency: Currency;
}) {
  const t = totals ?? { ingreso: 0, costo: 0 };
  const result = t.ingreso - t.costo;
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-[var(--line)] bg-white/[0.02] px-4 py-2">
      <h3 className="text-[12px] font-medium tracking-wide text-muted first-letter:uppercase">
        {monthLabel(month)}
      </h3>
      <p className="flex flex-wrap gap-x-3 text-[12px] tabular-nums">
        <span className="text-emerald-300">+ {fmt(t.ingreso, currency)}</span>
        <span className="text-muted">− {fmt(t.costo, currency)}</span>
        <span
          className={cn(
            "font-medium",
            result < 0 ? "text-red-400" : "text-foreground",
          )}
        >
          = {fmt(result, currency)}
        </span>
      </p>
    </header>
  );
}

const iconBtn = cn(btnGhost, "h-9 w-9 p-0");

function Row({
  e,
  project,
  confirming,
  onAsk,
  onCancel,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  e: Entry;
  project: string | null;
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const other = otherCurrency(e);
  const income = e.kind === "ingreso";
  const title = e.description || categoryLabel(e.kind, e.category);
  const derived = e.source !== "manual";
  // Qué se borra en cada caso, para quien usa lector de pantalla.
  const deleteLabel =
    e.source === "cobro"
      ? `Borrar el cobro de proyecto ${title}`
      : e.source === "herramienta"
        ? `Borrar la herramienta ${title} (deja de contar como costo)`
        : `Borrar ${title}`;
  const editLabel =
    e.source === "cobro"
      ? `Editar el cobro ${title} en su proyecto`
      : e.source === "herramienta"
        ? `Editar la herramienta ${title}`
        : `Editar ${title}`;
  return (
    <div className="flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]">
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          income ? "bg-emerald-400/10 text-emerald-300" : "bg-white/[0.06] text-muted",
        )}
      >
        {income ? <ArrowDownLeft size={15} /> : <ArrowUpRight size={15} />}
      </span>
      <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-[13px] leading-snug font-medium">
          <OwnerFaces owner={e.owner} size={16} />
          <span className="break-words">{title}</span>
        </p>
        <p
          className={cn(
            "shrink-0 text-[13px] font-medium tabular-nums",
            income ? "text-emerald-300" : "text-foreground",
          )}
        >
          {income ? "+" : "−"} {fmt(e.amount, e.currency)}
        </p>
      </div>

      <div className="mt-1 flex items-start justify-between gap-3">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
          <span className="tabular-nums">{dayLabel(e.occurred_on)}</span>
          <span>{categoryLabel(e.kind, e.category)}</span>
          {e.source === "cobro" && (
            <span className="rounded-full bg-emerald-400/10 px-1.5 whitespace-nowrap text-emerald-300">
              Cobro de proyecto
            </span>
          )}
          {e.source === "herramienta" && (
            <span className="rounded-full bg-white/[0.06] px-1.5 whitespace-nowrap">
              Herramienta
            </span>
          )}
          {e.recurring && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Repeat size={11} /> Todos los meses
              {e.until ? ` hasta ${dayLabel(e.until)}` : ""}
            </span>
          )}
          {project &&
            (e.project_slug ? (
              <Link
                href={`/admin/proyectos/${e.project_slug}`}
                className="focus-ring underline hover:text-foreground"
              >
                {project}
              </Link>
            ) : (
              <span>{project}</span>
            ))}
        </p>
        <span
          className="shrink-0 text-[12px] text-muted tabular-nums"
          title={
            derived ? "Al cambio de hoy" : `Cotización ${fmt(e.fx, "ARS")}`
          }
        >
          {derived && e.fx === 0
            ? "—"
            : `${derived ? "≈ " : ""}${fmt(other.amount, other.currency)}`}
        </span>
      </div>

      <div className="mt-1 flex items-center justify-end gap-0.5">
        {confirming ? (
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={onDelete}
              className="focus-ring min-h-9 rounded-md bg-red-500/90 px-3 text-[12px] text-white"
            >
              Borrar
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="focus-ring min-h-9 rounded-md px-3 text-[12px] text-muted hover:text-foreground"
            >
              No
            </button>
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={editLabel}
              title="Editar"
              className={iconBtn}
            >
              <Pencil size={14} />
            </button>
            {!derived && (
              <button
                type="button"
                onClick={onDuplicate}
                aria-label={`Duplicar ${title}`}
                title="Duplicar"
                className={iconBtn}
              >
                <Copy size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onAsk}
              aria-label={deleteLabel}
              title="Borrar"
              className={iconBtn}
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
      </div>
    </div>
  );
}
