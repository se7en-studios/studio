// Tipos y cuentas de los cobros. Puro: lo usan las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";

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
};

/** Lo que falta cobrar. Sin monto acordado no hay saldo que calcular. */
export function balance(budget: number | null, paid: number): number | null {
  return budget ? Math.max(0, Math.round((budget - paid) * 100) / 100) : null;
}
