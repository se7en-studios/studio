// Estado de gestión de un proyecto: etapas, tipos y validación. Puro y sin
// dependencias de servidor: lo usan las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";

export const PROJECT_STATUSES = [
  "descubrimiento",
  "diseno",
  "desarrollo",
  "revision",
  "entregado",
  "mantenimiento",
  "pausado",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: string; dot: string }> = {
  descubrimiento: { label: "Descubrimiento", tone: "text-sky-300 bg-sky-400/10 ring-sky-400/20", dot: "bg-sky-400" },
  diseno: { label: "Diseño", tone: "text-violet-300 bg-violet-400/10 ring-violet-400/20", dot: "bg-violet-400" },
  desarrollo: { label: "Desarrollo", tone: "text-accent bg-accent/10 ring-accent/25", dot: "bg-accent" },
  revision: { label: "Revisión", tone: "text-amber-300 bg-amber-400/10 ring-amber-400/20", dot: "bg-amber-400" },
  entregado: { label: "Entregado", tone: "text-emerald-300 bg-emerald-400/10 ring-emerald-400/20", dot: "bg-emerald-400" },
  mantenimiento: { label: "Mantenimiento", tone: "text-teal-300 bg-teal-400/10 ring-teal-400/20", dot: "bg-teal-400" },
  pausado: { label: "Pausado", tone: "text-zinc-400 bg-white/5 ring-white/10", dot: "bg-zinc-500" },
};

/** Los que todavía se están haciendo: cuentan como «activos» en Inicio. */
export const ACTIVE_STATUSES: ProjectStatus[] = ["descubrimiento", "diseno", "desarrollo", "revision"];

export type ProjectState = {
  slug: string;
  updated_at: string | null;
  updated_by: LeadOwner | null;
  status: ProjectStatus;
  owner: LeadOwner | null;
  client: string;
  lead_id: string | null;
  start_date: string | null;
  due: string | null;
  progress: number;
  budget: number | null;
  notes: string;
};

export type ProjectStateInput = Partial<
  Pick<ProjectState, "status" | "owner" | "client" | "lead_id" | "start_date" | "due" | "progress" | "budget" | "notes">
>;

/** Sin fila guardada: los casos de la web ya están entregados; los nuevos arrancan en descubrimiento. */
export function defaultState(slug: string, isCase: boolean): ProjectState {
  return {
    slug,
    updated_at: null,
    updated_by: null,
    status: isCase ? "entregado" : "descubrimiento",
    owner: null,
    client: "",
    lead_id: null,
    start_date: null,
    due: null,
    progress: isCase ? 100 : 0,
    budget: null,
    notes: "",
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Valida y recorta lo que llega del cliente. Tira error con un mensaje para mostrar. */
export function cleanStateInput(input: ProjectStateInput, owners: readonly string[]): ProjectStateInput {
  const out: ProjectStateInput = {};
  if (input.status !== undefined) {
    if (!PROJECT_STATUSES.includes(input.status)) throw new Error("Etapa inválida.");
    out.status = input.status;
  }
  if (input.owner !== undefined) {
    if (input.owner !== null && !owners.includes(input.owner)) throw new Error("Responsable inválido.");
    out.owner = input.owner;
  }
  if (input.client !== undefined) out.client = String(input.client).trim().slice(0, 120);
  if (input.lead_id !== undefined) {
    if (input.lead_id !== null && !/^[0-9a-f-]{36}$/i.test(input.lead_id)) throw new Error("Pedido inválido.");
    out.lead_id = input.lead_id;
  }
  for (const k of ["start_date", "due"] as const) {
    if (input[k] === undefined) continue;
    const v = input[k] || null;
    if (v !== null && !DATE.test(v)) throw new Error("Fecha inválida.");
    out[k] = v;
  }
  if (input.progress !== undefined) {
    const n = Math.round(Number(input.progress));
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("Avance inválido.");
    out.progress = n;
  }
  if (input.budget !== undefined) {
    if (input.budget === null || (input.budget as unknown) === "") out.budget = null;
    else {
      const n = Number(input.budget);
      if (!Number.isFinite(n) || n < 0 || n > 10_000_000) throw new Error("Monto inválido.");
      out.budget = Math.round(n * 100) / 100;
    }
  }
  if (input.notes !== undefined) out.notes = String(input.notes).slice(0, 10_000);
  return out;
}
