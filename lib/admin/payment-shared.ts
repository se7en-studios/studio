// Tipos y cuentas de los cobros. Puro: lo usan las páginas y los componentes de cliente.
//
// Un cobro de proyecto es un ingreso de Finanzas (panel_finance) con proyecto:
// cobrado si ya entró, pendiente si todavía no. Los cobros viejos de
// panel_payments se siguen leyendo hasta que finance-v4.sql los pasa a Finanzas.
import type { LeadOwner } from "./db";
import { OWNERS, expand, isRealDay, periodMonths, usdOf, type Entry, type Owner } from "./finance-shared";
import type { ProjectStatus } from "./project-shared";

export type Payment = {
  id: string;
  created_at: string;
  project_slug: string;
  /** YYYY-MM-DD */
  paid_on: string;
  /** USD. */
  amount: number;
  note: string;
  created_by: LeadOwner | null;
  /** Quién cobró la plata (todo se divide 50/50 entre los socios). */
  owner: Owner;
};

/** Un cobro viejo (panel_payments) como ingreso de Finanzas. No guarda cotización: el equivalente en pesos usa la de hoy (`fx`). */
export function paymentToEntry(p: Payment, fx: number): Entry {
  return {
    id: `cobro-${p.id}`,
    kind: "ingreso",
    occurred_on: p.paid_on,
    currency: "USD",
    amount: p.amount,
    fx,
    category: "proyecto",
    description: p.note,
    project_slug: p.project_slug,
    recurring: false,
    until: null,
    owner: p.owner,
    status: "pagado",
    created_by: p.created_by,
    source: "cobro",
  };
}

export type PaymentInput = Pick<Payment, "project_slug" | "paid_on" | "amount" | "note" | "owner">;

export type CleanedPayment = { ok: true; value: PaymentInput } | { ok: false; error: string };

const MAX_PAYMENT = 10_000_000;

/** Lo que llega de un formulario: se normaliza o se rechaza con un mensaje claro (cliente y servidor). */
export function cleanPayment(input: Partial<PaymentInput> & { amount?: unknown }): CleanedPayment {
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_PAYMENT)
    return { ok: false, error: "El monto tiene que ser mayor a 0." };
  const paid_on = String(input.paid_on ?? "");
  if (!isRealDay(paid_on)) return { ok: false, error: "La fecha no es válida." };
  const project_slug = String(input.project_slug ?? "");
  if (!/^[a-z0-9-]{1,64}$/.test(project_slug)) return { ok: false, error: "Elegí el proyecto." };
  return {
    ok: true,
    value: {
      project_slug,
      paid_on,
      amount,
      note: String(input.note ?? "").trim().slice(0, 200),
      owner: OWNERS.find((o) => o === input.owner) ?? "ambos",
    },
  };
}

/**
 * Los movimientos de Finanzas más los cobros viejos que todavía no pasaron.
 * finance-v4.sql los copia con el mismo id: si uno ya está, no se cuenta dos veces.
 */
export function withLegacy(entries: Entry[], cobros: Entry[]): Entry[] {
  const ids = new Set(entries.map((e) => e.id));
  return [...entries, ...cobros.filter((c) => !ids.has(c.id.slice("cobro-".length)))];
}

// --- Por cobrar ---------------------------------------------------------------

/** Lo que hace falta de un proyecto para saber cuánto le falta cobrar. */
export type Billable = {
  slug: string;
  name: string;
  /** Monto acordado en USD (el del estado del proyecto). */
  budget: number | null;
  status: ProjectStatus;
};

/** Las cuentas de cobro de un proyecto, en USD. */
export type ProjectMoney = {
  slug: string;
  name: string;
  budget: number | null;
  /** Ingresos cobrados hasta este mes (uno recurrente cuenta una vez por mes). */
  paid: number;
  /** Ingresos pendientes cargados con el proyecto. */
  pending: number;
  /** De esos pendientes, los que ya vencieron. */
  late: number;
  /** El saldo del monto acordado que ningún pendiente cubre todavía. */
  uncovered: number;
  /** Lo que falta cobrar: el saldo del acordado o los pendientes, lo que sea más. */
  owed: number;
  /** Entregado o en mantenimiento: lo que falta ya se debería haber cobrado. */
  done: boolean;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const sumUsd = (xs: Entry[]) => round2(xs.reduce((s, e) => s + usdOf(e), 0));
const isPending = (e: Entry) => e.kind === "ingreso" && e.status === "pendiente";

export function projectMoney(p: Billable, entries: Entry[], today: string): ProjectMoney {
  const mine = entries.filter((e) => e.kind === "ingreso" && e.project_slug === p.slug);
  const cobrados = mine.filter((e) => e.status === "pagado");
  const pendientes = mine.filter(isPending);
  const paid = sumUsd(expand(cobrados, periodMonths("todo", today, cobrados)).map((o) => o.entry));
  const pending = sumUsd(pendientes);
  // Un proyecto pausado no debe su saldo; lo que se anotó como pendiente, sí.
  const left = p.budget && p.status !== "pausado" ? Math.max(0, round2(p.budget - paid)) : 0;
  const owed = Math.max(left, pending);
  return {
    slug: p.slug,
    name: p.name,
    budget: p.budget,
    paid,
    pending,
    late: sumUsd(pendientes.filter((e) => e.occurred_on < today)),
    uncovered: round2(owed - pending),
    owed,
    done: p.status === "entregado" || p.status === "mantenimiento",
  };
}

export type Receivable = {
  /** Todo lo que falta cobrar, en USD. */
  total: number;
  /** Los proyectos que deben algo, el que más primero. */
  projects: ProjectMoney[];
  /** Pendientes sin proyecto (o de un proyecto que ya no está), en USD. */
  loose: number;
};

/**
 * El «por cobrar» de todo el panel: Inicio, Finanzas y la ficha de cada
 * proyecto suman esto mismo. Por proyecto, el saldo del monto acordado o los
 * pendientes cargados, lo que sea más (un pendiente es una cuota de ese saldo,
 * no se suma aparte); más los pendientes que no son de ningún proyecto.
 */
export function receivables(projects: Billable[], entries: Entry[], today: string): Receivable {
  const list = projects
    .map((p) => projectMoney(p, entries, today))
    .filter((m) => m.owed > 0)
    .sort((a, b) => b.owed - a.owed);
  const known = new Set(projects.map((p) => p.slug));
  const loose = sumUsd(entries.filter((e) => isPending(e) && !(e.project_slug && known.has(e.project_slug))));
  return { total: round2(list.reduce((s, m) => s + m.owed, 0) + loose), projects: list, loose };
}
