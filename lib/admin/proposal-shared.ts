// Propuestas online: tipos y cuentas puras (totales con opcionales, vencimiento,
// estados, plan de cobros y el hash de lo aceptado). Sin dependencias de
// servidor: lo usan el panel, la página pública /propuesta/[token] y
// scripts/check-proposals.mjs.
import { addDays } from "./calendar-shared";
import { fmt, isRealDay, type Currency } from "./finance-shared";
import { installments } from "./plata-shared";
import {
  EXPRESS_MULTIPLIER,
  USD_TO_ARS,
  addonModules,
  paceDays,
  productBases,
  type DeliveryPace,
} from "../../data/pricing";

/** «vencida» no se guarda: sale de valid_until (ver statusOf). */
export const PROPOSAL_STATUSES = [
  "borrador",
  "enviada",
  "vista",
  "aceptada",
  "rechazada",
  "vencida",
] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export type StoredStatus = Exclude<ProposalStatus, "vencida">;

export const PROPOSAL_LABEL: Record<ProposalStatus, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  vista: "Vista",
  aceptada: "Aceptada",
  rechazada: "Rechazada",
  vencida: "Vencida",
};

export type ProposalOptional = {
  id: string;
  name: string;
  price: number;
  days: number;
};
/** Seña en % al aceptar y el saldo en `installments` pagos (1 = saldo único a la entrega). */
export type ProposalPayment = { deposit_pct: number; installments: number };

/** Lo que el estudio arma y el cliente ve. */
export type ProposalContent = {
  title: string;
  intro: string;
  /** Alcance: un ítem por línea. */
  items: string[];
  optionals: ProposalOptional[];
  base_amount: number;
  currency: Currency;
  /** Días hábiles del alcance base (los opcionales suman los suyos). */
  days: number;
  /** YYYY-MM-DD: último día en que se puede aceptar. */
  valid_until: string;
  payment: ProposalPayment;
};

export type Acceptance = {
  name: string;
  email: string;
  /** ISO de cuando se aceptó. */
  at: string;
  ip: string;
  user_agent: string;
  /** SHA-256 de acceptedContent(): lo que el cliente aceptó, exacto. */
  hash: string;
};

export type Proposal = ProposalContent & {
  id: string;
  lead_id: string;
  version: number;
  status: StoredStatus;
  created_at: string;
  created_by: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  decided_at: string | null;
  /** Anulada a mano o reemplazada por otra versión enviada: el link deja de servir. */
  revoked_at: string | null;
  /** Opcionales que tildó el cliente al aceptar. */
  selected: string[] | null;
  total: number | null;
  acceptance: Acceptance | null;
  reject_reason: string | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

// --- Estados ------------------------------------------------------------------

const NEXT: Record<StoredStatus, StoredStatus[]> = {
  borrador: ["enviada"],
  enviada: ["vista", "aceptada", "rechazada"],
  vista: ["aceptada", "rechazada"],
  aceptada: [],
  rechazada: [],
};

export const canTransition = (from: StoredStatus, to: StoredStatus) =>
  NEXT[from].includes(to);

/** El estado que se muestra: una enviada o vista pasado valid_until está vencida. */
export function statusOf(
  p: Pick<Proposal, "status" | "valid_until">,
  today: string,
): ProposalStatus {
  return (p.status === "enviada" || p.status === "vista") &&
    p.valid_until < today
    ? "vencida"
    : p.status;
}

/** Si el cliente todavía puede aceptarla o rechazarla. */
export const isOpen = (
  p: Pick<Proposal, "status" | "valid_until" | "revoked_at">,
  today: string,
) =>
  !p.revoked_at &&
  (statusOf(p, today) === "enviada" || statusOf(p, today) === "vista");

// --- Totales ------------------------------------------------------------------

/** Los ids tildados que existen en la propuesta, sin repetir y en el orden de la propuesta. */
export const cleanSelection = (
  c: Pick<ProposalContent, "optionals">,
  ids: readonly unknown[],
) => c.optionals.filter((o) => ids.includes(o.id)).map((o) => o.id);

export function totalOf(
  c: Pick<ProposalContent, "base_amount" | "optionals">,
  selected: readonly string[],
) {
  return round2(
    c.base_amount +
      c.optionals
        .filter((o) => selected.includes(o.id))
        .reduce((s, o) => s + o.price, 0),
  );
}

export function daysOf(
  c: Pick<ProposalContent, "days" | "optionals">,
  selected: readonly string[],
) {
  return (
    c.days +
    c.optionals
      .filter((o) => selected.includes(o.id))
      .reduce((s, o) => s + o.days, 0)
  );
}

export const money = (n: number, currency: Currency) => fmt(n, currency);

// --- Plan de cobros -------------------------------------------------------------

export type PlanPart = { label: string; amount: number; due: string };

/**
 * La seña vence el día que se acepta; el saldo, a la entrega estimada (días
 * hábiles → corridos) y, en cuotas, una por mes desde ahí. La última cuota se
 * lleva los centavos (installments de Plata).
 */
export function paymentPlan(
  total: number,
  payment: ProposalPayment,
  acceptedDay: string,
  days: number,
): PlanPart[] {
  const deposit = round2((total * payment.deposit_pct) / 100);
  const rest = round2(total - deposit);
  const out: PlanPart[] =
    deposit > 0 ? [{ label: "Seña", amount: deposit, due: acceptedDay }] : [];
  if (rest <= 0) return out;
  const parts = installments(
    rest,
    payment.installments,
    addDays(acceptedDay, Math.ceil((days * 7) / 5)),
  );
  return [
    ...out,
    ...parts.map((p, i) => ({
      label: parts.length === 1 ? "Saldo" : `Cuota ${i + 1}/${parts.length}`,
      ...p,
    })),
  ];
}

// --- Prueba de aceptación ---------------------------------------------------------

/** JSON con las claves ordenadas: el mismo contenido da siempre el mismo texto. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map(
        (k) =>
          `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`,
      )
      .join(",")}}`;
  return JSON.stringify(v ?? null);
}

export async function sha256Hex(text: string) {
  const buf = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

/** Exactamente lo que el cliente aceptó, firmado con su nombre, email y la hora. Es lo que se hashea. */
export function acceptedContent(
  p: Pick<Proposal, "id" | "version" | keyof ProposalContent>,
  selected: readonly string[],
  signer: { name: string; email: string; at: string },
) {
  const total = totalOf(p, selected);
  const days = daysOf(p, selected);
  return {
    proposal: p.id,
    version: p.version,
    title: p.title,
    intro: p.intro,
    items: p.items,
    optionals: p.optionals,
    selected: [...selected],
    base_amount: p.base_amount,
    currency: p.currency,
    total,
    days,
    valid_until: p.valid_until,
    payment: p.payment,
    plan: paymentPlan(total, p.payment, signer.at.slice(0, 10), days),
    signer,
  };
}

export const acceptanceHash = (...args: Parameters<typeof acceptedContent>) =>
  sha256Hex(canonical(acceptedContent(...args)));

// --- Validación (panel y público) ------------------------------------------------

export const MAX_ITEMS = 40;
export const MAX_OPTIONALS = 12;
const MAX_MONEY = 1_000_000_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const str = (v: unknown, max: number) =>
  String(v ?? "")
    .trim()
    .slice(0, max);
const num = (v: unknown) =>
  v === "" || v === null || v === undefined ? NaN : Number(v);

export type CleanedContent =
  { ok: true; value: ProposalContent } | { ok: false; error: string };

export function cleanContent(
  input: Partial<Record<keyof ProposalContent, unknown>>,
): CleanedContent {
  const title = str(input.title, 120);
  if (!title) return { ok: false, error: "Poné un título." };
  const items = (Array.isArray(input.items) ? input.items : [])
    .map((x) => str(x, 300))
    .filter(Boolean)
    .slice(0, MAX_ITEMS);
  if (!items.length)
    return { ok: false, error: "Cargá al menos un ítem de alcance." };
  const currency =
    input.currency === "ARS" ? "ARS" : input.currency === "USD" ? "USD" : null;
  if (!currency) return { ok: false, error: "Elegí la moneda." };
  const base = num(input.base_amount);
  if (!Number.isFinite(base) || base <= 0 || base > MAX_MONEY)
    return { ok: false, error: "El monto tiene que ser mayor a 0." };
  const days = num(input.days);
  if (!Number.isInteger(days) || days < 1 || days > 365)
    return { ok: false, error: "El plazo va en días hábiles (1 a 365)." };
  const valid = str(input.valid_until, 10);
  if (!isRealDay(valid))
    return { ok: false, error: "La validez no es una fecha válida." };
  const rawOpts = Array.isArray(input.optionals)
    ? input.optionals.slice(0, MAX_OPTIONALS)
    : [];
  const optionals: ProposalOptional[] = [];
  for (const [i, o] of rawOpts.entries()) {
    const r = (o ?? {}) as Record<string, unknown>;
    const name = str(r.name, 120);
    if (!name) continue;
    const price = num(r.price);
    const od = num(r.days ?? 0);
    if (!Number.isFinite(price) || price < 0 || price > MAX_MONEY)
      return { ok: false, error: `Revisá el precio de «${name}».` };
    if (!Number.isInteger(od) || od < 0 || od > 365)
      return { ok: false, error: `Revisá los días de «${name}».` };
    const id = /^[a-z0-9-]{1,40}$/.test(String(r.id ?? ""))
      ? String(r.id)
      : `op-${i + 1}`;
    optionals.push({
      id: optionals.some((x) => x.id === id) ? `${id}-${i + 1}` : id,
      name,
      price: round2(price),
      days: od,
    });
  }
  const pay = (input.payment ?? {}) as Record<string, unknown>;
  const pct = num(pay.deposit_pct);
  const n = num(pay.installments);
  if (!Number.isInteger(pct) || pct < 0 || pct > 100)
    return { ok: false, error: "La seña va en % (0 a 100)." };
  if (!Number.isInteger(n) || n < 1 || n > 24)
    return { ok: false, error: "El saldo va en 1 a 24 pagos." };
  return {
    ok: true,
    value: {
      title,
      intro: str(input.intro, 2000),
      items,
      optionals,
      base_amount: round2(base),
      currency,
      days,
      valid_until: valid,
      payment: { deposit_pct: pct, installments: n },
    },
  };
}

export type Signer = { name: string; email: string };

/** Nombre y email de quien acepta: los dos obligatorios. */
export function cleanSigner(input: {
  name?: unknown;
  email?: unknown;
}): { ok: true; value: Signer } | { ok: false; error: string } {
  const name = str(input.name, 120);
  const email = str(input.email, 200).toLowerCase();
  if (name.length < 3)
    return { ok: false, error: "Escribí tu nombre completo." };
  if (!EMAIL.test(email)) return { ok: false, error: "Revisá el email." };
  return { ok: true, value: { name, email } };
}

// --- Borrador desde el cotizador ------------------------------------------------

export const DEFAULT_VALID_DAYS = 15;

/** Una propuesta nueva con los precios y plazos de /pricing: producto base, ritmo y todos los módulos como opcionales. */
export function draftFromQuote(
  baseId: string,
  pace: DeliveryPace,
  currency: Currency,
  today: string,
): ProposalContent {
  const base = productBases.find((b) => b.id === baseId) ?? productBases[0];
  const k =
    (pace === "express" ? EXPRESS_MULTIPLIER : 1) *
    (currency === "ARS" ? USD_TO_ARS : 1);
  return {
    title: base.name,
    intro: base.description,
    items: base.included,
    optionals: addonModules.map((a) => ({
      id: a.id,
      name: a.name,
      price: Math.round(a.priceUSD * k),
      days: pace === "express" ? Math.round(a.extraDays * 0.6) : a.extraDays,
    })),
    base_amount: Math.round(base.basePriceUSD * k),
    currency,
    days: paceDays(base.baseDays, pace),
    valid_until: addDays(today, DEFAULT_VALID_DAYS),
    payment: { deposit_pct: 50, installments: 1 },
  };
}
