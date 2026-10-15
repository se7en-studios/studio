// Una sola agenda de «Hoy»: qué cuenta como pendiente y en qué orden se atiende.
// La usan «Para atender» en Inicio, el resumen de las 9 y los contadores del
// menú, para que los tres digan lo mismo. Puro: sin servidor.
import type { Entry } from "./finance-shared";
import type { MaintRequest } from "./maintenance-shared";
import { ACTIVE_STATUSES, type ProjectState } from "./project-shared";
import type { SiteAlert } from "./site-health-shared";

/** Un cobro que ya debió entrar: ingreso pendiente con la fecha prevista pasada. */
export const isLateCharge = (
  e: Pick<Entry, "kind" | "status" | "occurred_on"> & {
    due_on?: string | null;
  },
  today: string,
) =>
  e.kind === "ingreso" &&
  e.status === "pendiente" &&
  (e.due_on ?? e.occurred_on) < today;

/** Un proyecto en curso con la entrega ya pasada. */
export const isLateDelivery = (
  s: Pick<ProjectState, "status" | "due">,
  today: string,
) => ACTIVE_STATUSES.includes(s.status) && !!s.due && s.due < today;

export const isOpenRequest = (r: Pick<MaintRequest, "status">) =>
  r.status !== "hecho";

export const isSiteDown = (a: Pick<SiteAlert, "kind">) => a.kind === "caido";

/**
 * De lo más urgente a lo menos: lo que hace perder plata o un cliente va antes
 * que lo que se puede hacer más tarde (los posts y las renovaciones, al final).
 */
export const TODAY_ORDER = [
  "pedido", // pedido nuevo sin responder
  "sitio", // sitio caído o por vencer
  "cobro", // cobro vencido o saldo de lo entregado
  "urgente", // pedido de mantenimiento urgente
  "reunion", // reunión de hoy
  "entrega", // entrega vencida
  "frio", // pedido que se enfría
  "renovacion", // herramienta que renueva
  "post", // post del día o atrasado
] as const;
export type TodayKind = (typeof TODAY_ORDER)[number];

export type TodayItem = {
  id: string;
  kind: TodayKind;
  href: string;
  title: string;
  detail: string;
  /** Rojo = ya está mal; ámbar = se está poniendo mal; acento = nuevo. */
  tone: "red" | "amber" | "accent";
  /** Para desempatar dentro del mismo tipo: lo más viejo primero. */
  at?: string;
};

const TONE_RANK = { red: 0, amber: 1, accent: 2 } as const;

export function sortToday(items: TodayItem[]): TodayItem[] {
  return [...items].sort(
    (a, b) =>
      TODAY_ORDER.indexOf(a.kind) - TODAY_ORDER.indexOf(b.kind) ||
      TONE_RANK[a.tone] - TONE_RANK[b.tone] ||
      (a.at ?? "").localeCompare(b.at ?? ""),
  );
}
