// Cuentas de Finanzas: puro y sin dependencias de servidor, lo usan la página,
// las acciones y los componentes de cliente. Cada movimiento se carga en pesos
// o en dólares con la cotización del momento; el equivalente se calcula con ella.
import { addMonths, monthOf } from "./calendar-shared";
import type { LeadOwner } from "./db";

export const KINDS = ["ingreso", "costo"] as const;
export type FinanceKind = (typeof KINDS)[number];

export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** De quién es un movimiento: de un socio o de los dos (se parte 50/50). */
export const OWNERS = ["ambos", "franco", "federico"] as const;
export type Owner = (typeof OWNERS)[number];

export const STATUSES = ["pagado", "pendiente"] as const;
export type EntryStatus = (typeof STATUSES)[number];

type Category = { id: string; label: string };

export const COST_CATEGORIES: Category[] = [
  { id: "infra", label: "Hosting e infraestructura" },
  { id: "herramientas", label: "Herramientas y software" },
  { id: "publicidad", label: "Publicidad" },
  { id: "sueldos", label: "Sueldos y retiros" },
  { id: "impuestos", label: "Impuestos y contador" },
  { id: "dominios", label: "Dominios y licencias" },
  { id: "otros", label: "Otros" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "proyecto", label: "Proyecto" },
  { id: "mantenimiento", label: "Mantenimiento" },
  { id: "suscripcion", label: "Suscripciones" },
  { id: "otros", label: "Otros" },
];

export const categoriesOf = (kind: FinanceKind) =>
  kind === "costo" ? COST_CATEGORIES : INCOME_CATEGORIES;

export function categoryLabel(kind: FinanceKind, id: string) {
  return categoriesOf(kind).find((c) => c.id === id)?.label ?? id;
}

export type Entry = {
  id: string;
  kind: FinanceKind;
  /** YYYY-MM-DD */
  occurred_on: string;
  currency: Currency;
  amount: number;
  /** Pesos por dólar. */
  fx: number;
  category: string;
  description: string;
  project_slug: string | null;
  recurring: boolean;
  /** YYYY-MM-DD: último mes en que se repite. null = sin fin. */
  until: string | null;
  /** Quién puso o cobró la plata: de ahí sale quién le debe a quién (todo se divide 50/50). */
  owner: Owner;
  /** «pendiente»: todavía no se cobró o pagó, no cuenta en los totales. */
  status: EntryStatus;
  created_by: LeadOwner | null;
  /** «cobro» viene de los cobros de proyectos y «herramienta» de las suscripciones: no se editan acá y su cotización es la de hoy. */
  source: "manual" | "cobro" | "herramienta";
  /** Es la mitad de un movimiento de la cuenta del estudio, vista desde un socio: el monto ya viene partido. */
  studio?: boolean;
};

export type EntryInput = Pick<
  Entry,
  | "kind"
  | "occurred_on"
  | "currency"
  | "amount"
  | "fx"
  | "category"
  | "description"
  | "project_slug"
  | "recurring"
  | "until"
  | "owner"
  | "status"
>;

const round2 = (n: number) => Math.round(n * 100) / 100;

export const usdOf = (e: Pick<Entry, "currency" | "amount" | "fx">) =>
  e.currency === "USD" ? e.amount : e.amount / e.fx;
export const arsOf = (e: Pick<Entry, "currency" | "amount" | "fx">) =>
  e.currency === "ARS" ? e.amount : e.amount * e.fx;

/** El monto en la otra moneda, para mostrarlo mientras se carga. */
export const otherCurrency = (e: Pick<Entry, "currency" | "amount" | "fx">) =>
  e.currency === "USD"
    ? { currency: "ARS" as const, amount: round2(arsOf(e)) }
    : { currency: "USD" as const, amount: round2(usdOf(e)) };

export function fmt(n: number, currency: Currency) {
  const v = Math.round(n).toLocaleString("es-AR");
  return currency === "USD" ? `USD ${v}` : `$ ${v}`;
}

// --- Validación (cliente y servidor) ----------------------------------------

const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** Una fecha YYYY-MM-DD que existe (2026-02-31 no). */
export const isRealDay = (d: string) =>
  DAY.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0, 10) === d;
const SLUG = /^[a-z0-9-]{1,64}$/;
export const MAX_AMOUNT = 1_000_000_000;
export const MAX_FX = 100_000;

export type Cleaned =
  { ok: true; value: EntryInput } | { ok: false; error: string };

/** Lo que llega de un formulario o de una acción: se normaliza o se rechaza con un mensaje claro. */
export function cleanEntry(
  input: Partial<EntryInput> & { amount?: unknown; fx?: unknown },
): Cleaned {
  const kind = KINDS.find((k) => k === input.kind);
  if (!kind) return { ok: false, error: "Elegí si es un ingreso o un costo." };
  const currency = CURRENCIES.find((c) => c === input.currency);
  if (!currency) return { ok: false, error: "Elegí la moneda." };
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT)
    return { ok: false, error: "El monto tiene que ser mayor a 0." };
  const fx = Number(input.fx);
  if (!Number.isFinite(fx) || fx <= 0 || fx > MAX_FX)
    return { ok: false, error: "Poné la cotización (pesos por dólar)." };
  const day = String(input.occurred_on ?? "");
  if (!isRealDay(day))
    return { ok: false, error: "La fecha no es válida." };
  const category = categoriesOf(kind).some((c) => c.id === input.category)
    ? String(input.category)
    : "otros";
  const slug = input.project_slug ? String(input.project_slug) : null;
  if (slug && !SLUG.test(slug))
    return { ok: false, error: "Proyecto inválido." };
  const owner = OWNERS.find((o) => o === input.owner) ?? "ambos";
  const status = STATUSES.find((x) => x === input.status) ?? "pagado";
  // Un pago pendiente es uno solo: no se repite.
  const recurring = Boolean(input.recurring) && status === "pagado";
  const until = recurring && input.until ? String(input.until) : null;
  if (until && (!isRealDay(until) || until < day))
    return { ok: false, error: "«Hasta» no puede ser anterior a la fecha." };
  return {
    ok: true,
    value: {
      kind,
      occurred_on: day,
      currency,
      amount: round2(amount),
      fx: round2(fx),
      category,
      description: String(input.description ?? "")
        .trim()
        .slice(0, 200),
      project_slug: slug,
      recurring,
      until,
      owner,
      status,
    },
  };
}

// --- Períodos y totales -----------------------------------------------------

export type Period = "mes" | "3m" | "12m" | "todo";
export const PERIODS: { id: Period; label: string }[] = [
  { id: "mes", label: "Este mes" },
  { id: "3m", label: "3 meses" },
  { id: "12m", label: "12 meses" },
  { id: "todo", label: "Todo" },
];

const MAX_MONTHS = 60;

/** Los meses (YYYY-MM) del período, del más viejo al actual. */
export function periodMonths(
  period: Period,
  today: string,
  entries: Pick<Entry, "occurred_on">[],
): string[] {
  const now = monthOf(today);
  const count = { mes: 1, "3m": 3, "12m": 12 }[
    period as Exclude<Period, "todo">
  ];
  if (count)
    return Array.from({ length: count }, (_, i) =>
      addMonths(now, i - count + 1),
    );
  const first = entries
    .reduce((min, e) => (e.occurred_on < min ? e.occurred_on : min), today)
    .slice(0, 7);
  const out: string[] = [];
  for (let m = first; m <= now && out.length < MAX_MONTHS; m = addMonths(m, 1))
    out.push(m);
  return out;
}

export type Occurrence = { entry: Entry; month: string };

/**
 * Un movimiento puntual cuenta en su mes; uno recurrente, en cada mes desde que
 * empieza hasta que termina. Los pendientes no cuentan hasta que se pagan.
 */
export function expand(entries: Entry[], months: string[]): Occurrence[] {
  const out: Occurrence[] = [];
  for (const entry of entries) {
    if (entry.status === "pendiente") continue;
    const start = monthOf(entry.occurred_on);
    const end = entry.until ? monthOf(entry.until) : null;
    for (const month of months) {
      const counts = entry.recurring
        ? month >= start && (!end || month <= end)
        : month === start;
      if (counts) out.push({ entry, month });
    }
  }
  return out;
}

export type Totals = {
  ingresoUsd: number;
  ingresoArs: number;
  costoUsd: number;
  costoArs: number;
};
const EMPTY: Totals = {
  ingresoUsd: 0,
  ingresoArs: 0,
  costoUsd: 0,
  costoArs: 0,
};

export function totals(occ: Occurrence[]): Totals {
  const t = { ...EMPTY };
  for (const { entry: e } of occ) {
    if (e.kind === "ingreso") {
      t.ingresoUsd += usdOf(e);
      t.ingresoArs += arsOf(e);
    } else {
      t.costoUsd += usdOf(e);
      t.costoArs += arsOf(e);
    }
  }
  return t;
}

export function byMonth(
  occ: Occurrence[],
  months: string[],
): (Totals & { month: string })[] {
  return months.map((month) => ({
    month,
    ...totals(occ.filter((o) => o.month === month)),
  }));
}

export function groupTotals(
  occ: Occurrence[],
  keyOf: (o: Occurrence) => string,
): Map<string, Totals> {
  const groups = new Map<string, Occurrence[]>();
  for (const o of occ)
    groups.set(keyOf(o), [...(groups.get(keyOf(o)) ?? []), o]);
  return new Map([...groups].map(([k, v]) => [k, totals(v)]));
}

export const pick = (t: Totals, currency: Currency) =>
  currency === "USD"
    ? { ingreso: t.ingresoUsd, costo: t.costoUsd }
    : { ingreso: t.ingresoArs, costo: t.costoArs };

/** Costos fijos de un mes: lo que se gasta todos los meses haya o no ingresos. */
export function fixedCosts(
  entries: Entry[],
  month: string,
): { usd: number; ars: number } {
  const t = totals(
    expand(
      entries.filter((e) => e.kind === "costo" && e.recurring),
      [month],
    ),
  );
  return { usd: t.costoUsd, ars: t.costoArs };
}

export type Partner = { in: number; out: number };

export type Settlement = {
  franco: Partner;
  federico: Partner;
  /** Quién le debe a quién para quedar 50/50; null si están a mano. */
  owes: { from: LeadOwner; to: LeadOwner; amount: number } | null;
};

/**
 * Todo se divide 50/50. Cada movimiento dice quién puso o cobró la plata
 * (el «owner»): el que cobró más o pagó menos le debe la diferencia al otro, a
 * la mitad. Lo de la «cuenta del estudio» (owner «ambos») se reparte mitad y
 * mitad entre los dos: cada uno lo ve en lo suyo y no genera deuda.
 */
export function settle(occ: Occurrence[], currency: Currency): Settlement {
  const out: Settlement = {
    franco: { in: 0, out: 0 },
    federico: { in: 0, out: 0 },
    owes: null,
  };
  for (const { entry: e } of occ) {
    const value = currency === "USD" ? usdOf(e) : arsOf(e);
    const side = e.kind === "ingreso" ? "in" : "out";
    if (e.owner === "ambos") {
      out.franco[side] += value / 2;
      out.federico[side] += value / 2;
    } else out[e.owner][side] += value;
  }
  const net = (p: Partner) => p.in - p.out;
  const half = round2((net(out.franco) - net(out.federico)) / 2);
  if (Math.abs(half) >= 1)
    out.owes =
      half > 0
        ? { from: "franco", to: "federico", amount: half }
        : { from: "federico", to: "franco", amount: -half };
  return out;
}

/**
 * Lo de un socio: lo suyo más la mitad de la cuenta del estudio. Esas mitades pasan a ser
 * del socio (`owner`) y quedan marcadas con `studio`; para editar hay que volver al original.
 */
export function forPartner(entries: Entry[], who: LeadOwner): Entry[] {
  return entries.flatMap((e): Entry[] =>
    e.owner === who
      ? [e]
      : e.owner === "ambos"
        ? [{ ...e, owner: who, amount: round2(e.amount / 2), studio: true }]
        : [],
  );
}

/** Margen sobre ingresos en %, o null si no hubo ingresos. */
export const margin = (ingreso: number, costo: number) =>
  ingreso > 0 ? Math.round(((ingreso - costo) / ingreso) * 100) : null;

/**
 * Un monto escrito como en Argentina: «1.500,50» o «1500.5». Un solo punto seguido
 * de tres dígitos («1.500») es separador de miles. NaN si no es un número.
 */
export function parseAmount(text: string): number {
  const t = text.trim().replace(/\s/g, "");
  if (!t) return NaN;
  const thousands = /^\d{1,3}(\.\d{3})+$/.test(t);
  const normalized = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : thousands ? t.replace(/\./g, "") : t;
  return Number(normalized);
}
