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
};

export type ToolInput = Omit<Tool, "id" | "created_at">;

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
function addMonthsClamped(day: string, n: number): string {
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
 * Cada herramienta como costo fijo mensual (lo anual, prorrateado) desde el mes
 * en que se cargó, para que entre en los costos y el resultado. La cotización es
 * la de hoy; sin ella no se puede convertir una herramienta en pesos.
 */
export function toolEntries(tools: Tool[], fx: number): Entry[] {
  return tools
    .filter((t) => t.amount > 0 && (t.currency === "USD" || fx > 0))
    .map((t) => ({
      id: `tool-${t.id}`,
      kind: "costo",
      occurred_on: dayKey(0, Date.parse(t.created_at)),
      currency: t.currency,
      amount: Math.round(monthlyIn(t, t.currency, fx) * 100) / 100,
      fx,
      category: "herramientas",
      description: t.cycle === "anual" ? `${t.name} (anual, prorrateado)` : t.name,
      project_slug: null,
      recurring: true,
      until: null,
      owner: t.owner,
      status: "pagado",
      created_by: null,
      source: "herramienta",
    }));
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
