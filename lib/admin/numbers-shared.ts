// «Números»: las cuentas que faltaban para la página (ex Métricas). Lo que ya
// existía se reusa (mrr, overdue, runway, concentration, weightedPipeline…);
// acá va lo nuevo: los períodos a comparar, los semáforos y la tarifa efectiva
// por hora. Puro y probado en scripts/check-numbers.mjs.
import { addDays, addMonths, monthOf } from "./calendar-shared";
import type { Lead } from "./db";
import { expand, periodMonths, usdOf, type Entry } from "./finance-shared";
import type { MaintRequest, Plan } from "./maintenance-shared";
import { monthKey, wonAt } from "./metrics";
import { entryDay, entryMinutes, type TimeEntry } from "./time-shared";

// --- Semáforos ----------------------------------------------------------------
// Los valores de referencia salen de la auditoría del panel («Los números que
// miran las agencias», que a su vez cita consultoras de agencias y a los
// proveedores). Son orientativos: donde la fuente da un solo número, el corte
// del ámbar es criterio propio y lo dice el comentario.

export type Tone = "green" | "amber" | "red";
type Cuts = { green: number; amber: number };

/** Peso del ingreso recurrente sobre el total. Fuente: más de 70 % recurrente es muy sano. Ámbar desde 40 %: propio. */
export const RECURRING_SHARE: Cuts = { green: 0.7, amber: 0.4 };
/** Días promedio para cobrar. Fuente: 30 a 45 días es normal. Más de 60, rojo: propio. */
export const DAYS_TO_COLLECT: Cuts = { green: 45, amber: 60 };
/** Meses de caja. La fuente pide sólo «alerta temprana»: 6 meses o más tranquilo y menos de 3 alarma es criterio propio. */
export const RUNWAY_MONTHS: Cuts = { green: 6, amber: 3 };
/** Peso del cliente más grande. Fuente: más de 20 % de un solo cliente es riesgo. Rojo desde 40 %: propio. */
export const CONCENTRATION: Cuts = { green: 0.2, amber: 0.4 };
/** Tasa de cierre (ganados sobre decididos). Fuente: ~20 % es el promedio, 30 % o más muy bueno. */
export const WIN_RATE: Cuts = { green: 0.3, amber: 0.2 };
/**
 * Tarifa por hora de un proyecto o abono contra la del estudio en el mismo
 * lapso. No hay tarifa objetivo cargada: se compara contra la propia (propio).
 */
export const RATE_VS_STUDIO: Cuts = { green: 1, amber: 0.75 };

/** Más es mejor. null sin dato. */
export const toneUp = (v: number | null, c: Cuts): Tone | null =>
  v === null ? null : v >= c.green ? "green" : v >= c.amber ? "amber" : "red";
/** Menos es mejor. null sin dato. */
export const toneDown = (v: number | null, c: Cuts): Tone | null =>
  v === null ? null : v <= c.green ? "green" : v <= c.amber ? "amber" : "red";

// --- Períodos -----------------------------------------------------------------

export type Compare = "mes" | "trimestre";

/**
 * Los meses del período actual (incluye el mes en curso) y los del anterior,
 * de igual largo, y el último día del anterior (para lo que es una foto).
 */
export function windows(
  period: Compare,
  today: string,
): { cur: string[]; prev: string[]; prevEnd: string } {
  const n = period === "mes" ? 1 : 3;
  const now = monthOf(today);
  const cur = Array.from({ length: n }, (_, i) => addMonths(now, i - n + 1));
  const prev = cur.map((m) => addMonths(m, -n));
  return { cur, prev, prevEnd: addDays(`${cur[0]}-01`, -1) };
}

/** Los 12 meses que terminan en el de `day`. */
export const last12 = (day: string) =>
  Array.from({ length: 12 }, (_, i) => addMonths(monthOf(day), i - 11));

// --- Plata ----------------------------------------------------------------------

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Un ingreso que se repite: abono de mantenimiento, recurrente o un pendiente generado por mes. */
export const isRecurringIncome = (e: Entry) =>
  e.kind === "ingreso" &&
  (e.category === "mantenimiento" || e.recurring || Boolean(e.series));

/** Ingreso cobrado en esos meses, el recurrente y su peso (0 a 1; null sin ingresos). En USD. */
export function recurringIncome(
  entries: Entry[],
  months: string[],
): { total: number; recurring: number; share: number | null } {
  let total = 0,
    recurring = 0;
  for (const { entry: e } of expand(entries, months))
    if (e.kind === "ingreso") {
      total += usdOf(e);
      if (isRecurringIncome(e)) recurring += usdOf(e);
    }
  return {
    total: round2(total),
    recurring: round2(recurring),
    share: total ? recurring / total : null,
  };
}

/**
 * Lo vencido sin cobrar al final de `day`, en USD. Igual que overdue() para hoy,
 * pero sirve para una fecha pasada: cuenta también lo que se cobró después
 * (un cobrado guarda la fecha prevista en due_on y la real en occurred_on).
 */
export function overdueAt(
  entries: Entry[],
  day: string,
): { total: number; count: number } {
  const late = entries.filter(
    (e) =>
      e.kind === "ingreso" &&
      (e.status === "pendiente"
        ? e.occurred_on < day
        : Boolean(e.due_on) &&
          (e.due_on as string) < day &&
          e.occurred_on > day),
  );
  return {
    total: round2(late.reduce((s, e) => s + usdOf(e), 0)),
    count: late.length,
  };
}

/** Días promedio para cobrar de lo cobrado en esos meses: de la fecha prevista a la real (antes de tiempo cuenta 0). */
export function daysToCollectIn(
  entries: Entry[],
  months: string[],
): number | null {
  const lags = entries
    .filter(
      (e) =>
        e.kind === "ingreso" &&
        e.status === "pagado" &&
        e.due_on &&
        months.includes(monthOf(e.occurred_on)),
    )
    .map((e) =>
      Math.max(
        0,
        Math.round(
          (Date.parse(e.occurred_on) - Date.parse(e.due_on as string)) /
            86_400_000,
        ),
      ),
    );
  return lags.length
    ? Math.round(lags.reduce((s, d) => s + d, 0) / lags.length)
    : null;
}

// --- Ventas -------------------------------------------------------------------------

const lostAt = (l: Pick<Lead, "lost_at" | "updated_at" | "created_at">) =>
  l.lost_at ?? l.updated_at ?? l.created_at;

/** Pedidos que se decidieron (ganados o perdidos) en esos meses. */
export function decidedIn(leads: Lead[], months: string[]): Lead[] {
  const set = new Set(months);
  return leads.filter(
    (l) =>
      (l.status === "ganado" && set.has(monthKey(wonAt(l)))) ||
      (l.status === "perdido" && set.has(monthKey(lostAt(l)))),
  );
}

/** Tasa de cierre de lo decidido en esos meses (0 a 1; null si nada se decidió). */
export function winRateIn(leads: Lead[], months: string[]): number | null {
  const d = decidedIn(leads, months);
  return d.length
    ? d.filter((l) => l.status === "ganado").length / d.length
    : null;
}

export type ChannelRate = {
  key: string;
  won: number;
  decided: number;
  rate: number;
};

/** Conversión por canal de lo decidido en esos meses: el canal cargado o, si no, el formulario de origen (source). */
export function channelConversion(
  leads: Lead[],
  months: string[],
): ChannelRate[] {
  const by = new Map<string, { won: number; decided: number }>();
  for (const l of decidedIn(leads, months)) {
    const key = l.channel || l.source || "otro";
    const g = by.get(key) ?? { won: 0, decided: 0 };
    by.set(key, {
      won: g.won + (l.status === "ganado" ? 1 : 0),
      decided: g.decided + 1,
    });
  }
  return [...by]
    .map(([key, g]) => ({ key, ...g, rate: g.won / g.decided }))
    .sort((a, b) => b.decided - a.decided || b.rate - a.rate);
}

// --- Tarifa efectiva por hora -----------------------------------------------------

export type Rate = { usd: number; hours: number; rate: number | null };
const rateOf = (usd: number, minutes: number): Rate => ({
  usd: round2(usd),
  hours: Math.round((minutes / 60) * 10) / 10,
  rate: minutes > 0 ? round2(usd / (minutes / 60)) : null,
});

/** Los minutos cargados a mano en los pedidos antes del cronómetro; cuentan en el mes en que se terminaron (o el de `today`). */
const legacyMinutes = (
  requests: Pick<MaintRequest, "minutes" | "done_at">[],
  today: string,
  months?: string[],
) =>
  requests
    .filter(
      (r) =>
        !months ||
        months.includes(monthOf(r.done_at ? r.done_at.slice(0, 10) : today)),
    )
    .reduce((s, r) => s + r.minutes, 0);

/**
 * La tarifa del estudio en esos meses: lo cobrado de proyectos dividido por las
 * horas reales (tramos más los minutos viejos de los pedidos). Cobros y horas
 * del mismo lapso: con pocos meses, una seña sin horas todavía la infla.
 */
export function studioRate(
  entries: Entry[],
  time: TimeEntry[],
  requests: Pick<MaintRequest, "minutes" | "done_at">[],
  months: string[],
  today: string,
  now = Date.now(),
): Rate {
  const usd = expand(entries, months)
    .filter(({ entry: e }) => e.kind === "ingreso" && e.project_slug)
    .reduce((s, o) => s + usdOf(o.entry), 0);
  const minutes =
    time
      .filter((e) => months.includes(entryDay(e).slice(0, 7)))
      .reduce((s, e) => s + entryMinutes(e, now), 0) +
    legacyMinutes(requests, today, months);
  return rateOf(usd, minutes);
}

export type RateRow = Rate & { slug: string; kind: "proyecto" | "abono" };

/**
 * Tarifa por proyecto y por abono, de todo lo cargado. En un proyecto con plan
 * de mantenimiento, lo cobrado como «mantenimiento» y las horas desde el inicio
 * del plan (más los minutos viejos de sus pedidos) son del abono; el resto, del
 * proyecto. Sólo filas con horas: sin horas no hay tarifa.
 */
export function rateRows(
  entries: Entry[],
  time: TimeEntry[],
  requests: Pick<MaintRequest, "project_slug" | "minutes" | "done_at">[],
  plans: Pick<Plan, "project_slug" | "start_date">[],
  today: string,
  now = Date.now(),
): RateRow[] {
  const paid = expand(
    entries.filter((e) => e.kind === "ingreso" && e.project_slug),
    periodMonths("todo", today, entries),
  ).map((o) => o.entry);
  const planStart = new Map(plans.map((p) => [p.project_slug, p.start_date]));
  const slugs = new Set([
    ...time.map((e) => e.project_slug),
    ...requests.filter((r) => r.minutes > 0).map((r) => r.project_slug),
  ]);
  const rows: RateRow[] = [];
  for (const slug of slugs) {
    const start = planStart.get(slug);
    const mine = time.filter((e) => e.project_slug === slug);
    const income = paid.filter((e) => e.project_slug === slug);
    const abonoMin = start
      ? mine
          .filter((e) => entryDay(e) >= start)
          .reduce((s, e) => s + entryMinutes(e, now), 0) +
        legacyMinutes(
          requests.filter((r) => r.project_slug === slug),
          today,
        )
      : 0;
    const projectMin = mine
      .filter((e) => !start || entryDay(e) < start)
      .reduce((s, e) => s + entryMinutes(e, now), 0);
    const sum = (xs: Entry[]) => xs.reduce((s, e) => s + usdOf(e), 0);
    if (projectMin > 0)
      rows.push({
        slug,
        kind: "proyecto",
        ...rateOf(
          sum(
            start
              ? income.filter((e) => e.category !== "mantenimiento")
              : income,
          ),
          projectMin,
        ),
      });
    if (abonoMin > 0)
      rows.push({
        slug,
        kind: "abono",
        ...rateOf(
          sum(income.filter((e) => e.category === "mantenimiento")),
          abonoMin,
        ),
      });
  }
  return rows.sort((a, b) => b.hours - a.hours);
}

// --- Comparación ------------------------------------------------------------------

/** Cambio relativo de `prev` a `now` (0.12 = +12 %); null si no se puede comparar. */
export const change = (now: number | null, prev: number | null) =>
  now === null || prev === null || prev === 0
    ? null
    : (now - prev) / Math.abs(prev);
