// Números del CRM para la página Métricas. Puro y sin dependencias de
// servidor: recibe pedidos e historial y devuelve lo que se grafica.
import type { Lead, LeadOwner, LeadStatus } from "./db";
import { isContact, type Activity } from "./activity-shared";
import { budgetValue } from "./brief";
import { dayIn } from "./tz";

/** Monto acordado si se cargó; si no, lo que sugiere el rango del formulario. */
export const dealValue = (l: Pick<Lead, "value" | "budget">) =>
  l.value ?? budgetValue(l.budget);

/** Valor en juego: lo que está en charla o con propuesta (los nuevos todavía no cuentan). */
export const pipelineValue = (
  leads: Pick<Lead, "status" | "value" | "budget">[],
) =>
  leads
    .filter((l) => l.status === "contactado" || l.status === "propuesta")
    .reduce((s, l) => s + dealValue(l), 0);

// Chance de cierre por etapa, para el pipeline ponderado. Son supuestos propios, no historial:
// ajustarlos cuando haya suficientes pedidos cerrados para medirlos de verdad.
export const STAGE_ODDS: Partial<Record<LeadStatus, number>> = {
  nuevo: 0.1,
  contactado: 0.25,
  propuesta: 0.5,
};

/** Pipeline ponderado: cada pedido abierto vale su monto por la chance de su etapa. */
export const weightedPipeline = (
  leads: Pick<Lead, "status" | "value" | "budget">[],
) => leads.reduce((s, l) => s + dealValue(l) * (STAGE_ODDS[l.status] ?? 0), 0);

/** Tasa de cierre: ganados sobre decididos (ganados + perdidos), de 0 a 1. null si no hay decididos. */
export function winRate(leads: Pick<Lead, "status">[]): number | null {
  const won = leads.filter((l) => l.status === "ganado").length;
  const decided = won + leads.filter((l) => l.status === "perdido").length;
  return decided ? won / decided : null;
}

/** "2026-10" en hora de Argentina. */
export const monthKey = (iso: string) => dayIn(iso).slice(0, 7);

/**
 * Cuándo se ganó un pedido: la fecha de cierre (won_at, desde crm-v2.sql). Sin
 * ella, el último cambio, que es lo mejor que hay pero se mueve con cualquier edición.
 */
export const wonAt = (l: Pick<Lead, "won_at" | "updated_at" | "created_at">) =>
  l.won_at ?? l.updated_at ?? l.created_at;

/** Lo ganado en un mes ("2026-10"), en USD. */
export const wonInMonth = (leads: Lead[], month: string) =>
  leads
    .filter((l) => l.status === "ganado" && monthKey(wonAt(l)) === month)
    .reduce((s, l) => s + dealValue(l), 0);

/** Las últimas `n` claves de mes, de la más vieja a la actual. */
export function lastMonths(n: number, now = Date.now()): string[] {
  const cur = monthKey(new Date(now).toISOString());
  let [y, m] = cur.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, "0")}`);
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export type Group = {
  key: string;
  leads: number;
  won: number;
  lost: number;
  wonValue: number;
  winRate: number | null;
};

function group(leads: Lead[], keyOf: (l: Lead) => string): Group[] {
  const by = new Map<string, Group>();
  for (const l of leads) {
    const key = keyOf(l);
    const g = by.get(key) ?? {
      key,
      leads: 0,
      won: 0,
      lost: 0,
      wonValue: 0,
      winRate: null,
    };
    g.leads++;
    if (l.status === "ganado") {
      g.won++;
      g.wonValue += dealValue(l);
    }
    if (l.status === "perdido") g.lost++;
    by.set(key, g);
  }
  return [...by.values()]
    .map((g) => ({
      ...g,
      winRate: g.won + g.lost ? g.won / (g.won + g.lost) : null,
    }))
    .sort((a, b) => b.leads - a.leads);
}

export type Metrics = {
  total: number;
  won: number;
  lost: number;
  winRate: number | null;
  wonValue: number;
  pipelineValue: number;
  avgTicket: number | null;
  /** Horas hasta el primer contacto registrado (mediana); null sin historial. */
  firstResponseHours: number | null;
  /** Pedidos con al menos un contacto registrado, sobre el total. */
  responded: number;
  byStage: Record<LeadStatus, number>;
  byMonth: { month: string; leads: number; won: number }[];
  byChannel: Group[];
  byOwner: Group[];
};

/**
 * `since` filtra por fecha de llegada (ISO); null = todo. `months` arma la
 * serie mensual (siempre los últimos N meses, independiente de `since`).
 */
export function computeMetrics(
  all: Lead[],
  activities: Activity[] | null,
  since: string | null,
  months = 6,
  now = Date.now(),
): Metrics {
  const leads = since ? all.filter((l) => l.created_at >= since) : all;
  const won = leads.filter((l) => l.status === "ganado");
  const lost = leads.filter((l) => l.status === "perdido").length;
  const wonValue = won.reduce((s, l) => s + dealValue(l), 0);

  const firstContact = new Map<string, string>();
  for (const a of activities ?? []) {
    if (!isContact(a)) continue;
    const prev = firstContact.get(a.lead_id);
    if (!prev || a.at < prev) firstContact.set(a.lead_id, a.at);
  }
  const waits = leads
    .map((l) => {
      const at = firstContact.get(l.id);
      return at
        ? (Date.parse(at) - Date.parse(l.created_at)) / 3_600_000
        : null;
    })
    .filter((h): h is number => h !== null && h >= 0);

  const byStage = {
    nuevo: 0,
    contactado: 0,
    propuesta: 0,
    ganado: 0,
    perdido: 0,
  } as Record<LeadStatus, number>;
  for (const l of leads) byStage[l.status]++;

  const keys = lastMonths(months, now);
  const byMonth = keys.map((month) => ({ month, leads: 0, won: 0 }));
  for (const l of all) {
    const row = byMonth[keys.indexOf(monthKey(l.created_at))];
    if (!row) continue;
    row.leads++;
    if (l.status === "ganado") row.won++;
  }

  return {
    total: leads.length,
    won: won.length,
    lost,
    winRate: winRate(leads),
    wonValue,
    pipelineValue: pipelineValue(leads),
    avgTicket: won.length ? wonValue / won.length : null,
    firstResponseHours: activities ? median(waits) : null,
    responded: waits.length,
    byStage,
    byMonth,
    byChannel: group(leads, (l) => l.channel || l.source || "otro"),
    byOwner: group(leads, (l) => (l.owner as LeadOwner | null) ?? "sin"),
  };
}
