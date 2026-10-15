// Mantenimiento: planes (abonos), cobros mensuales y la cola de pedidos de los
// clientes. Puro y sin dependencias de servidor: lo usan las páginas, las
// acciones, los componentes de cliente y scripts/check-maintenance.mjs.
import { addMonths, monthOf } from "./calendar-shared";
import type { LeadOwner } from "./db";
import {
  CURRENCIES,
  OWNERS,
  isRealDay,
  type Currency,
  type Entry,
  type Owner,
} from "./finance-shared";
import { projectMinutesInMonth, type TimeEntry } from "./time-shared";

export type Plan = {
  project_slug: string;
  amount: number;
  currency: Currency;
  /** 1 a 28. */
  billing_day: number;
  includes: string;
  /** Horas por mes; null = sin tope. */
  hours_included: number | null;
  active: boolean;
  /** YYYY-MM-DD */
  start_date: string;
  /** YYYY-MM-DD: desde cuándo genera cobros (el alta o la última reactivación). */
  billing_from: string;
  owner: Owner;
  domain_expires_on: string | null;
  updated_at: string | null;
  updated_by: LeadOwner | null;
};

export type PlanInput = Pick<
  Plan,
  | "amount"
  | "currency"
  | "billing_day"
  | "includes"
  | "hours_included"
  | "active"
  | "start_date"
  | "owner"
  | "domain_expires_on"
>;

export const REQUEST_STATUSES = [
  "nuevo",
  "en_curso",
  "esperando",
  "hecho",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export const REQUEST_STATUS: Record<
  RequestStatus,
  { label: string; dot: string }
> = {
  nuevo: { label: "Nuevo", dot: "bg-sky-400" },
  en_curso: { label: "En curso", dot: "bg-amber-400" },
  esperando: { label: "Esperando al cliente", dot: "bg-violet-400" },
  hecho: { label: "Hecho", dot: "bg-emerald-400" },
};

export const REQUEST_PRIORITIES = ["urgente", "alta", "media", "baja"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];
export const PRIORITY_LABEL: Record<RequestPriority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export type MaintRequest = {
  id: string;
  created_at: string;
  updated_at: string;
  project_slug: string;
  title: string;
  notes: string;
  priority: RequestPriority;
  status: RequestStatus;
  minutes: number;
  /** YYYY-MM-DD */
  due: string | null;
  done_at: string | null;
  created_by: LeadOwner | null;
};

export type RequestInput = Partial<
  Pick<
    MaintRequest,
    | "project_slug"
    | "title"
    | "notes"
    | "priority"
    | "status"
    | "minutes"
    | "due"
  >
>;

const SLUG = /^[a-z0-9-]{1,64}$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Validación (cliente y servidor) ----------------------------------------

export function cleanPlan(
  input: Partial<PlanInput> & {
    amount?: unknown;
    hours_included?: unknown;
    billing_day?: unknown;
  },
): { ok: true; value: PlanInput } | { ok: false; error: string } {
  const amount = round2(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000)
    return { ok: false, error: "El abono tiene que ser mayor a 0." };
  const currency = CURRENCIES.find((c) => c === input.currency);
  if (!currency) return { ok: false, error: "Elegí la moneda." };
  const day = Math.round(Number(input.billing_day ?? 1));
  if (!Number.isInteger(day) || day < 1 || day > 28)
    return { ok: false, error: "El día de cobro va del 1 al 28." };
  const rawHours = input.hours_included as unknown;
  let hours: number | null = null;
  if (rawHours !== null && rawHours !== undefined && rawHours !== "") {
    hours = Math.round(Number(rawHours) * 10) / 10;
    if (!Number.isFinite(hours) || hours < 0 || hours > 999)
      return { ok: false, error: "Horas incluidas inválidas." };
  }
  const start = String(input.start_date ?? "");
  if (!isRealDay(start))
    return { ok: false, error: "La fecha de inicio no es válida." };
  const domain = input.domain_expires_on
    ? String(input.domain_expires_on)
    : null;
  if (domain && !isRealDay(domain))
    return { ok: false, error: "El vencimiento del dominio no es válido." };
  return {
    ok: true,
    value: {
      amount,
      currency,
      billing_day: day,
      includes: String(input.includes ?? "")
        .trim()
        .slice(0, 500),
      hours_included: hours,
      active: input.active !== false,
      start_date: start,
      owner: OWNERS.find((o) => o === input.owner) ?? "ambos",
      domain_expires_on: domain,
    },
  };
}

/** Lo que llega de un formulario de pedido. `creating` exige proyecto y título. */
export function cleanRequest(
  input: RequestInput,
  creating: boolean,
): { ok: true; value: RequestInput } | { ok: false; error: string } {
  const out: RequestInput = {};
  if (creating || input.project_slug !== undefined) {
    if (!SLUG.test(String(input.project_slug ?? "")))
      return { ok: false, error: "Elegí el proyecto." };
    out.project_slug = String(input.project_slug);
  }
  if (creating || input.title !== undefined) {
    const t = String(input.title ?? "")
      .trim()
      .slice(0, 200);
    if (!t) return { ok: false, error: "Poné un título." };
    out.title = t;
  }
  if (input.notes !== undefined) out.notes = String(input.notes).slice(0, 4000);
  if (input.priority !== undefined) {
    if (!REQUEST_PRIORITIES.includes(input.priority))
      return { ok: false, error: "Prioridad inválida." };
    out.priority = input.priority;
  }
  if (input.status !== undefined) {
    if (!REQUEST_STATUSES.includes(input.status))
      return { ok: false, error: "Estado inválido." };
    out.status = input.status;
  }
  if (input.minutes !== undefined) {
    const m = Math.round(Number(input.minutes));
    if (!Number.isFinite(m) || m < 0 || m > 100_000)
      return { ok: false, error: "Tiempo inválido." };
    out.minutes = m;
  }
  if (input.due !== undefined) {
    if (input.due && !isRealDay(input.due))
      return { ok: false, error: "Fecha inválida." };
    out.due = input.due || null;
  }
  return { ok: true, value: out };
}

// --- Cobros del mes -----------------------------------------------------------

export type DueCharge = {
  project_slug: string;
  /** YYYY-MM */
  period: string;
  /** YYYY-MM-DD: el día de cobro de ese mes (fecha prevista del pendiente). */
  due_on: string;
  amount: number;
  currency: Currency;
  owner: Owner;
};

/** Para no generar un año de golpe si un plan se carga con fecha vieja. */
const MAX_BACKFILL = 3;

/**
 * Los cobros que faltan generar: por plan activo, un pendiente por mes desde
 * que empezó a cobrar (inicio o reactivación, lo más nuevo) hasta este mes,
 * salvo los que ya se generaron (`done`: «slug|YYYY-MM»).
 */
export function dueCharges(
  plans: Plan[],
  done: Set<string>,
  today: string,
): DueCharge[] {
  const now = monthOf(today);
  const out: DueCharge[] = [];
  for (const p of plans) {
    if (!p.active) continue;
    const from = monthOf(
      p.start_date > p.billing_from ? p.start_date : p.billing_from,
    );
    // ponytail: como mucho los últimos MAX_BACKFILL meses; más atrás se carga a mano en Finanzas.
    const first =
      from > addMonths(now, -(MAX_BACKFILL - 1))
        ? from
        : addMonths(now, -(MAX_BACKFILL - 1));
    for (let m = first; m <= now; m = addMonths(m, 1)) {
      if (done.has(`${p.project_slug}|${m}`)) continue;
      out.push({
        project_slug: p.project_slug,
        period: m,
        due_on: `${m}-${String(p.billing_day).padStart(2, "0")}`,
        amount: p.amount,
        currency: p.currency,
        owner: p.owner,
      });
    }
  }
  return out;
}

export type ChargeState = "cobrado" | "pendiente" | "vencido" | "sin_generar";
export const CHARGE_STATE: Record<
  ChargeState,
  { label: string; tone: string }
> = {
  cobrado: { label: "Cobrado", tone: "text-emerald-300" },
  pendiente: { label: "Pendiente", tone: "text-amber-300" },
  vencido: { label: "Vencido", tone: "text-red-400" },
  sin_generar: { label: "Sin generar", tone: "text-muted" },
};

/** Estado del cobro del mes de un plan, por el ingreso de Finanzas que generó (o null). */
export function chargeState(
  entry: Pick<Entry, "status" | "occurred_on"> | null,
  today: string,
): ChargeState {
  if (!entry) return "sin_generar";
  if (entry.status === "pagado") return "cobrado";
  return entry.occurred_on < today ? "vencido" : "pendiente";
}

// --- Números ------------------------------------------------------------------

/** En USD: un abono en pesos se pasa con `fx` (pesos por dólar). */
export const planUsd = (p: Pick<Plan, "amount" | "currency">, fx: number) =>
  p.currency === "USD" ? p.amount : fx > 0 ? p.amount / fx : 0;

/** Ingreso mensual fijo (MRR): la suma de los abonos activos, en USD. */
export function mrr(
  plans: Pick<Plan, "amount" | "currency" | "active">[],
  fx: number,
): number {
  return round2(
    plans.filter((p) => p.active).reduce((s, p) => s + planUsd(p, fx), 0),
  );
}

/**
 * Minutos usados en el mes `ym` por un proyecto. Un pedido hecho cuenta en el
 * mes en que se terminó; uno abierto, en el mes de `today` (es trabajo en curso).
 */
export function minutesInMonth(
  requests: Pick<MaintRequest, "project_slug" | "minutes" | "done_at">[],
  slug: string,
  ym: string,
  today: string,
): number {
  // ponytail: el tiempo es un total por pedido, no un registro por día; si hace falta precisión, cronómetro con entradas.
  return requests
    .filter(
      (r) =>
        r.project_slug === slug &&
        monthOf(r.done_at ? r.done_at.slice(0, 10) : today) === ym,
    )
    .reduce((s, r) => s + r.minutes, 0);
}

export type HoursUsage = {
  used: number;
  included: number | null;
  over: boolean;
};

/**
 * Horas usadas este mes contra las incluidas en el plan: los minutos cargados a
 * mano en los pedidos (antes del cronómetro) más todos los tramos del proyecto
 * en el mes (supabase/time.sql), sean de un pedido o del proyecto.
 */
export function hoursUsage(
  plan: Pick<Plan, "project_slug" | "hours_included"> | null,
  slug: string,
  requests: Pick<MaintRequest, "project_slug" | "minutes" | "done_at">[],
  today: string,
  time: TimeEntry[] = [],
): HoursUsage {
  const ym = monthOf(today);
  const minutes =
    minutesInMonth(requests, slug, ym, today) +
    projectMinutesInMonth(time, slug, ym);
  const used = Math.round((minutes / 60) * 10) / 10;
  const included = plan?.hours_included ?? null;
  return { used, included, over: included !== null && used > included };
}

/** Pedidos sin terminar por proyecto. */
export function openBySlug(
  requests: Pick<MaintRequest, "project_slug" | "status">[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of requests)
    if (r.status !== "hecho")
      out.set(r.project_slug, (out.get(r.project_slug) ?? 0) + 1);
  return out;
}

const PRIORITY_RANK: Record<RequestPriority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baja: 3,
};
const STATUS_RANK: Record<RequestStatus, number> = {
  en_curso: 0,
  nuevo: 1,
  esperando: 2,
  hecho: 3,
};

/** Orden de la cola: abiertos primero, por estado y prioridad; después lo más viejo. */
export function compareRequests(a: MaintRequest, b: MaintRequest): number {
  return (
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    (a.status === "hecho"
      ? (b.done_at ?? "").localeCompare(a.done_at ?? "")
      : a.created_at.localeCompare(b.created_at))
  );
}

/** «1 h 30 min», «45 min». */
export function durationLabel(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60),
    m = minutes % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

/** slug → vencimiento del dominio cargado a mano en el plan (para siteAlerts). */
export const manualDomains = (plans: Pick<Plan, "project_slug" | "domain_expires_on">[]) =>
  new Map(plans.flatMap((p) => (p.domain_expires_on ? [[p.project_slug, p.domain_expires_on] as const] : [])));
