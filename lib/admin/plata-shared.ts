// Cobros con fecha y los números de la plata. Puro: lo usan Finanzas, la ficha
// de cada proyecto, Mantenimiento y (después) Números. Probado en scripts/check-finance.mjs.
import { addDays, addMonths, monthOf } from "./calendar-shared";
import type { LeadOwner } from "./db";
import {
  arsOf,
  expand,
  periodMonths,
  pick,
  totals,
  usdOf,
  type Currency,
  type Entry,
  type EntryInput,
} from "./finance-shared";
import { addMonthsClamped } from "./tool-shared";

const round2 = (n: number) => Math.round(n * 100) / 100;
const DAY_MS = 86_400_000;
const days = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
const isPendingIncome = (e: Entry) =>
  e.kind === "ingreso" && e.status === "pendiente";

// --- Pendientes mensuales -----------------------------------------------------

/**
 * Un cobro que se repite todos los meses: cada mes genera un pendiente en
 * panel_finance que se marca cobrado a mano. Es idempotente: cada pendiente
 * lleva `series` = «<key>:YYYY-MM» y hay un índice único en esa columna
 * (finance-v5.sql), así que generar dos veces el mismo mes no duplica.
 *
 * Lo usan:
 * - Finanzas, para los ingresos recurrentes (key = id del movimiento; ver planOf).
 * - Mantenimiento, para el abono de cada sitio: key = `abono:<slug>`, con
 *   entry.project_slug = slug y category "mantenimiento". Se insertan con
 *   insertDues() de lib/admin/finance.ts (server):
 *
 *     await insertDues(monthlyDues({ key: `abono:${slug}`, start, until: null,
 *       entry: { kind: "ingreso", currency: "USD", amount, fx, fx_source,
 *                category: "mantenimiento", description: "Abono", project_slug: slug,
 *                owner: "ambos" } }, dayKey()));
 */
export type MonthlyPlan = {
  /** Clave estable del plan: no cambiarla, es lo que evita duplicados. */
  key: string;
  /** YYYY-MM-DD del primer vencimiento; el día se repite cada mes (31 → último día del mes). */
  start: string;
  /** YYYY-MM-DD: el último mes que se cobra; null = sin fin. */
  until: string | null;
  entry: Omit<
    EntryInput,
    "occurred_on" | "status" | "recurring" | "until" | "due_on" | "series"
  >;
};

/** Los pendientes del plan desde el primer mes hasta el de `upTo` inclusive (ya existan o no: la base descarta los repetidos). */
export function monthlyDues(plan: MonthlyPlan, upTo: string): EntryInput[] {
  const out: EntryInput[] = [];
  const last = plan.until && plan.until < upTo ? plan.until : upTo;
  for (let i = 0; i < 600; i++) {
    const due = addMonthsClamped(plan.start, i);
    if (monthOf(due) > monthOf(last)) break;
    out.push({
      ...plan.entry,
      occurred_on: due,
      due_on: due,
      status: "pendiente",
      recurring: false,
      until: null,
      series: `${plan.key}:${monthOf(due)}`,
    });
  }
  return out;
}

/** El plan de un ingreso recurrente de Finanzas (key = su id). */
export function planOf(e: Entry): MonthlyPlan {
  return {
    key: e.id,
    start: e.occurred_on,
    until: e.until,
    entry: {
      kind: "ingreso",
      currency: e.currency,
      amount: e.amount,
      fx: e.fx,
      fx_source: e.fx_source ?? null,
      category: e.category,
      description: e.description,
      project_slug: e.project_slug,
      owner: e.owner,
    },
  };
}

/** Los pendientes de los planes de Finanzas que faltan generar hasta hoy. */
export function missingDues(entries: Entry[], today: string): EntryInput[] {
  const have = new Set(entries.map((e) => e.series).filter(Boolean));
  return entries
    .filter((e) => e.plan)
    .flatMap((e) => monthlyDues(planOf(e), today))
    .filter((d) => !have.has(d.series));
}

/** Un monto partido en `n` cuotas mensuales desde `first`; la última se lleva los centavos que sobran. */
export function installments(
  total: number,
  n: number,
  first: string,
): { amount: number; due: string }[] {
  const count = Math.max(1, Math.min(60, Math.floor(n)));
  const each = Math.floor((total / count) * 100) / 100;
  return Array.from({ length: count }, (_, i) => ({
    amount: i === count - 1 ? round2(total - each * (count - 1)) : each,
    due: addMonthsClamped(first, i),
  }));
}

// --- Cobros con fecha ---------------------------------------------------------

/** Lo que ya debió entrar y no entró, en USD. */
export function overdue(
  entries: Entry[],
  today: string,
): { total: number; count: number; oldestDays: number } {
  const late = entries.filter(
    (e) => isPendingIncome(e) && e.occurred_on < today,
  );
  return {
    total: round2(late.reduce((s, e) => s + usdOf(e), 0)),
    count: late.length,
    oldestDays: late.reduce(
      (max, e) => Math.max(max, days(e.occurred_on, today)),
      0,
    ),
  };
}

/**
 * Lo que entra en los próximos 30, 60 y 90 días (acumulado, USD): los
 * pendientes que vencen en ese lapso más los meses que todavía no se generaron
 * de los ingresos recurrentes. Lo vencido va aparte (overdue).
 */
export function projection(
  entries: Entry[],
  today: string,
): { d30: number; d60: number; d90: number } {
  const future = [
    ...entries.filter((e) => isPendingIncome(e) && e.occurred_on >= today),
    ...entries
      .filter((e) => e.plan)
      .flatMap((e) => monthlyDues(planOf(e), addDays(today, 90)))
      .filter(
        (d) =>
          d.occurred_on >= today && !entries.some((x) => x.series === d.series),
      ),
  ];
  const upTo = (n: number) =>
    round2(
      future
        .filter((e) => e.occurred_on <= addDays(today, n))
        .reduce((s, e) => s + usdOf(e), 0),
    );
  return { d30: upTo(30), d60: upTo(60), d90: upTo(90) };
}

/**
 * Días promedio para cobrar (DSO): de la fecha prevista a la real, en los
 * cobros de los últimos 12 meses que tenían vencimiento. Uno cobrado antes de
 * tiempo cuenta 0. null si no hay ninguno.
 */
export function daysToCollect(entries: Entry[], today: string): number | null {
  const since = addDays(today, -365);
  const lags = entries
    .filter(
      (e) =>
        e.kind === "ingreso" &&
        e.status === "pagado" &&
        e.due_on &&
        e.occurred_on >= since,
    )
    .map((e) => Math.max(0, days(e.due_on as string, e.occurred_on)));
  return lags.length
    ? Math.round(lags.reduce((s, d) => s + d, 0) / lags.length)
    : null;
}

// --- Para «Números» -------------------------------------------------------------

/**
 * Caja y meses que alcanza. Saldo = todo lo cobrado menos costos y retiros hasta
 * hoy (no hay saldo bancario cargado). Gasto = promedio de costos de los últimos
 * `months` meses (sin retiros). months: null si no hay gasto.
 */
export function runway(
  entries: Entry[],
  today: string,
  currency: Currency,
  months = 3,
): { balance: number; burn: number; months: number | null } {
  const all = expand(entries, periodMonths("todo", today, entries));
  const t = pick(
    totals(all.filter((o) => o.entry.occurred_on <= today)),
    currency,
  );
  const recent = Array.from({ length: months }, (_, i) =>
    addMonths(monthOf(today), -i),
  );
  const burn = round2(
    pick(totals(expand(entries, recent)), currency).costo / months,
  );
  const balance = round2(t.ingreso - t.costo - t.retiro);
  return {
    balance,
    burn,
    months: burn > 0 ? Math.round((balance / burn) * 10) / 10 : null,
  };
}

/**
 * Qué parte del ingreso cobrado en los meses dados viene del cliente más
 * grande. Cliente = clientOf(project_slug) (el nombre del cliente o del
 * proyecto); lo que no tiene proyecto no entra. null si no hubo ingresos.
 */
export function concentration(
  entries: Entry[],
  months: string[],
  clientOf: (slug: string) => string,
): { client: string; amount: number; share: number } | null {
  const byClient = new Map<string, number>();
  for (const { entry: e } of expand(entries, months))
    if (e.kind === "ingreso" && e.project_slug) {
      const c = clientOf(e.project_slug);
      byClient.set(c, (byClient.get(c) ?? 0) + usdOf(e));
    }
  const total = [...byClient.values()].reduce((s, v) => s + v, 0);
  if (!total) return null;
  const [client, amount] = [...byClient].sort((a, b) => b[1] - a[1])[0];
  return {
    client,
    amount: round2(amount),
    share: Math.round((amount / total) * 100),
  };
}

// --- Monotributo ------------------------------------------------------------------

/**
 * Topes anuales de facturación (ingresos brutos, en pesos) por categoría.
 * ARCA los actualiza cada seis meses: al cambiar, reemplazar los montos, la
 * vigencia y la fuente. Confirmarlos con el contador.
 */
export const MONOTRIBUTO = {
  vigencia: "2026-08-01",
  fuente:
    "ARCA, actualización de agosto 2026 (+16,8 %), publicada por iProfesional el 07/09/2026",
  topes: {
    A: 12_009_410.45,
    B: 17_595_182.74,
    C: 24_670_494.31,
    D: 30_628_651.43,
    E: 36_028_231.33,
    F: 45_151_659.41,
    G: 53_995_798.87,
    H: 81_924_660.37,
    I: 91_699_761.9,
    J: 105_012_519.2,
    K: 126_610_838.75,
  },
} as const;
export type TaxCategory = keyof typeof MONOTRIBUTO.topes;
export const TAX_CATEGORIES = Object.keys(MONOTRIBUTO.topes) as TaxCategory[];

/**
 * Lo facturado por un socio en los últimos 12 meses, en pesos con la cotización
 * de cada cobro: lo que cobró él más la mitad de lo de la cuenta del estudio.
 */
export function billedLast12(
  entries: Entry[],
  who: LeadOwner,
  today: string,
): number {
  const since = addDays(today, -365);
  return round2(
    entries
      .filter(
        (e) =>
          e.kind === "ingreso" &&
          e.status === "pagado" &&
          !e.plan &&
          e.occurred_on > since &&
          e.occurred_on <= today,
      )
      .reduce(
        (s, e) =>
          s +
          (e.owner === who ? arsOf(e) : e.owner === "ambos" ? arsOf(e) / 2 : 0),
        0,
      ),
  );
}

/** Cuánto del tope lleva usado; aviso al 75 % y al 90 %. */
export function taxMeter(
  billed: number,
  category: TaxCategory,
): { cap: number; pct: number; level: "ok" | "75" | "90" | "over" } {
  const cap = MONOTRIBUTO.topes[category];
  const pct = Math.round((billed / cap) * 100);
  return {
    cap,
    pct,
    level: pct >= 100 ? "over" : pct >= 90 ? "90" : pct >= 75 ? "75" : "ok",
  };
}
