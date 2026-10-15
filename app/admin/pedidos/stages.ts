// Etapas del tablero de pedidos y las reglas que dependen de la etapa.
import { priority, type Priority } from "@/lib/admin/brief";
import type { Lead, LeadStatus } from "@/lib/admin/db";

export const COLUMNS: {
  id: LeadStatus;
  label: string;
  hint: string;
  dot: string;
}[] = [
  { id: "nuevo", label: "Nuevos", hint: "Sin responder", dot: "bg-accent" },
  {
    id: "contactado",
    label: "Contactados",
    hint: "Charla en curso",
    dot: "bg-sky-400",
  },
  {
    id: "propuesta",
    label: "Propuesta",
    hint: "Esperando respuesta",
    dot: "bg-amber-400",
  },
  {
    id: "ganado",
    label: "Ganados",
    hint: "En producción",
    dot: "bg-emerald-400",
  },
  { id: "perdido", label: "Perdidos", hint: "Cerrados", dot: "bg-zinc-500" },
];
export const STAGE = Object.fromEntries(
  COLUMNS.map((c) => [c.id, c]),
) as Record<LeadStatus, (typeof COLUMNS)[number]>;

/** Etapas en las que un pedido todavía se puede ganar. */
export const OPEN_STAGES: LeadStatus[] = ["nuevo", "contactado", "propuesta"];

// Al pasar un pedido a estas etapas sin ninguna tarea de seguimiento abierta, se crea una sola.
export const FOLLOW_UP: Partial<
  Record<LeadStatus, { days: number; title: (name: string) => string }>
> = {
  contactado: { days: 3, title: (name) => `Dar seguimiento a ${name}` },
  propuesta: {
    days: 2,
    title: (name) => `Seguimiento de la propuesta a ${name}`,
  },
};

export const PRIORITY_DOT: Record<Priority, string> = {
  alta: "bg-accent",
  media: "bg-amber-400",
  baja: "bg-white/20",
};

/** Orden dentro de cada columna: prioridad primero, después lo más reciente. */
export function rank(l: Lead) {
  const p = { alta: 3, media: 2, baja: 1 }[priority(l)];
  return p * 1e13 + new Date(l.created_at).getTime();
}

export const COLD_HINT = "7 días o más";
/** Tipo propio del drag: así una columna sólo acepta tarjetas, no texto ni archivos. */
export const DRAG_TYPE = "application/x-se7en-lead";
