// Tipos y cuentas de los cobros. Puro: lo usan las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";
import { OWNERS, isRealDay, type Entry, type Owner } from "./finance-shared";

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

/** Lo que falta cobrar. Sin monto acordado no hay saldo que calcular. */
export function balance(budget: number | null, paid: number): number | null {
  return budget ? Math.max(0, Math.round((budget - paid) * 100) / 100) : null;
}

/** Un cobro de proyecto como ingreso de Finanzas. No guarda cotización: el equivalente en pesos usa la de hoy (`fx`). */
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
