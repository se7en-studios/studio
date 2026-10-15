// Herramientas y suscripciones: tipos, validación y fechas de renovación. Puro:
// lo usan la página, las acciones y los componentes de cliente.
import { dayKey } from "./task-shared";
import { CURRENCIES, OWNERS, isRealDay, type Currency, type Entry, type Owner } from "./finance-shared";

export const CYCLES = ["mensual", "anual"] as const;
export type Cycle = (typeof CYCLES)[number];

export type Tool = {
  id: string;
  /** ISO: desde qué mes cuenta como costo. */
  created_at: string;
  name: string;
  amount: number;
  currency: Currency;
  cycle: Cycle;
  /** YYYY-MM-DD: una fecha de renovación cualquiera; la próxima se calcula con nextRenewal. */
  renews_on: string;
  owner: Owner;
  notes: string;
  /** YYYY-MM-DD: se dio de baja; cuenta como costo hasta ese mes (finance-v5.sql). */
  ended_on?: string | null;
  /** Precios anteriores, del más viejo al más nuevo (finance-v5.sql): los meses pasados quedan con el de entonces. */
  prices?: ToolPrice[];
};

/** Un precio viejo de una herramienta: valió hasta `until` (el último día del mes anterior al cambio), con la cotización de ese momento. */
export type ToolPrice = Pick<Tool, "amount" | "currency" | "cycle"> & { until: string; fx: number };

export type ToolInput = Omit<Tool, "id" | "created_at" | "ended_on" | "prices">;

/** Herramientas conocidas: nombre sugerido y logo en public/logos/<id>.svg. */
export const TOOL_PRESETS = [
  { id: "claude", name: "Claude" },
  { id: "supabase", name: "Supabase" },
  { id: "vercel", name: "Vercel" },
  { id: "github", name: "GitHub" },
  { id: "resend", name: "Resend" },
  { id: "cloudflare", name: "Cloudflare" },
  { id: "notion", name: "Notion" },
  { id: "figma", name: "Figma" },
  { id: "google", name: "Google" },
  { id: "namecheap", name: "Namecheap" },
  { id: "godaddy", name: "GoDaddy" },
  { id: "hostinger", name: "Hostinger" },
  { id: "stripe", name: "Stripe" },
] as const;

/** Logo de una herramienta según su nombre («Claude Max» → claude); null si no hay. */
export function logoOf(name: string): string | null {
  const n = name.toLowerCase();
  const hit =
    TOOL_PRESETS.find((p) => n.includes(p.id)) ??
    (n.includes("anthropic") ? TOOL_PRESETS[0] : undefined);
  return hit ? `/logos/${hit.id}.svg` : null;
}

const DAY_MS = 86_400_000;

/** Suma meses a una fecha sin pasarse de mes (31/01 + 1 mes = 28/02). */
export function addMonthsClamped(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
}

/** La próxima renovación desde hoy (inclusive), avanzando de a un ciclo desde la fecha cargada. */
export function nextRenewal(renewsOn: string, cycle: Cycle, today: string): string {
  const step = cycle === "anual" ? 12 : 1;
  for (let k = 0; k < 2000; k++) {
    const c = addMonthsClamped(renewsOn, k * step);
    if (c >= today) return c;
  }
  return renewsOn;
}

export const daysUntil = (day: string, today: string) =>
  Math.round((Date.parse(day) - Date.parse(today)) / DAY_MS);

/** Lo que cuesta por mes, en la moneda pedida; 0 si hay que convertir y no hay cotización. */
export function monthlyIn(t: Pick<Tool, "amount" | "currency" | "cycle">, to: Currency, fx: number): number {
  const month = t.cycle === "anual" ? t.amount / 12 : t.amount;
  if (t.currency === to) return month;
  if (fx <= 0) return 0;
  return to === "ARS" ? month * fx : month / fx;
}

/**
 * El precio que tenía antes del cambio de hoy, si cambió: vale hasta el último
 * día del mes anterior. null si no cambió o si se cargó este mismo mes (no hay
 * meses pasados que proteger).
 */
export function priceBefore(
  old: Pick<Tool, "amount" | "currency" | "cycle" | "created_at">,
  next: Pick<Tool, "amount" | "currency" | "cycle">,
  today: string,
  fx: number,
): ToolPrice | null {
  const same = old.amount === next.amount && old.currency === next.currency && old.cycle === next.cycle;
  if (same || dayKey(0, Date.parse(old.created_at)).slice(0, 7) >= today.slice(0, 7)) return null;
  const lastOfPrev = new Date(Date.parse(`${today.slice(0, 7)}-01T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
  return { amount: old.amount, currency: old.currency, cycle: old.cycle, until: lastOfPrev, fx };
}

/**
 * Cada herramienta como costo fijo mensual (lo anual, prorrateado) desde el mes
 * en que se cargó hasta que se dio de baja, para que entre en los costos y el
 * resultado. Cada precio viejo cuenta en sus meses con su cotización; el actual,
 * con la de hoy (sin ella no se puede convertir una herramienta en pesos).
 * El tramo actual tiene id `tool-<id>`; los viejos, `tool-<id>-<n>`.
 */
export function toolEntries(tools: Tool[], fx: number): Entry[] {
  return tools.flatMap((t) => {
    let from = dayKey(0, Date.parse(t.created_at));
    const parts: (ToolPrice & { from: string; id: string })[] = [];
    (t.prices ?? []).forEach((p, i) => {
      if (p.until >= from) parts.push({ ...p, from, id: `tool-${t.id}-${i}` });
      from = new Date(Date.parse(`${p.until}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
    });
    if (!t.ended_on || t.ended_on >= from)
      parts.push({ amount: t.amount, currency: t.currency, cycle: t.cycle, fx, until: t.ended_on ?? "", from, id: `tool-${t.id}` });
    return parts
      .filter((p) => p.amount > 0 && (p.currency === "USD" || p.fx > 0))
      .map((p): Entry => ({
        id: p.id,
        kind: "costo",
        occurred_on: p.from,
        currency: p.currency,
        amount: Math.round(monthlyIn(p, p.currency, p.fx) * 100) / 100,
        fx: p.fx,
        category: "herramientas",
        description: p.cycle === "anual" ? `${t.name} (anual, prorrateado)` : t.name,
        project_slug: null,
        recurring: true,
        until: p.until || null,
        owner: t.owner,
        status: "pagado",
        created_by: null,
        source: "herramienta",
      }));
  });
}

export type CleanedTool = { ok: true; value: ToolInput } | { ok: false; error: string };

export function cleanTool(input: Partial<ToolInput> & { amount?: unknown }): CleanedTool {
  const name = String(input.name ?? "").trim().slice(0, 60);
  if (!name) return { ok: false, error: "Poné el nombre de la herramienta." };
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000)
    return { ok: false, error: "El monto no es válido." };
  const currency = CURRENCIES.find((c) => c === input.currency);
  if (!currency) return { ok: false, error: "Elegí la moneda." };
  const cycle = CYCLES.find((c) => c === input.cycle);
  if (!cycle) return { ok: false, error: "Elegí si se paga por mes o por año." };
  const renews_on = String(input.renews_on ?? "");
  if (!isRealDay(renews_on) || renews_on < "2000-01-01")
    return { ok: false, error: "La fecha de renovación no es válida." };
  return {
    ok: true,
    value: {
      name,
      amount: Math.round(amount * 100) / 100,
      currency,
      cycle,
      renews_on,
      owner: OWNERS.find((o) => o === input.owner) ?? "ambos",
      notes: String(input.notes ?? "").trim().slice(0, 200),
    },
  };
}
