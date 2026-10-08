// Qué cambió en una edición, campo por campo, para el registro de cambios.
// Puro y sin dependencias: lo usan las acciones y los componentes.

export type Change = {
  field: string;
  label: string;
  before: string | null;
  after: string | null;
};

type Spec<T> = {
  field: keyof T & string;
  label: string;
  /** Cómo se muestra el valor (por ejemplo «USD 1.200» o «Franco»). */
  format?: (v: T[keyof T]) => string | null;
  /** Textos largos: en el registro alcanza con un recorte. */
  long?: boolean;
};

const CLIP = 140;

function show(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  return String(v);
}

function clip(s: string | null) {
  if (!s) return s;
  const one = s.replace(/\s+/g, " ").trim();
  return one.length > CLIP ? `${one.slice(0, CLIP - 1).trimEnd()}…` : one;
}

/** Sólo los campos de `specs` que de verdad cambiaron entre `before` y `after`. */
export function diff<T extends object>(before: T, after: Partial<T>, specs: Spec<T>[]): Change[] {
  const out: Change[] = [];
  for (const s of specs) {
    if (!(s.field in after)) continue;
    const a = before[s.field];
    const b = after[s.field] as T[keyof T];
    if ((a ?? null) === (b ?? null) || show(a) === show(b)) continue;
    const fmt = s.format ?? show;
    const pick = (v: T[keyof T]) => (s.long ? clip(fmt(v)) : fmt(v));
    out.push({ field: s.field, label: s.label, before: pick(a), after: pick(b) });
  }
  return out;
}

export const usd = (v: unknown) =>
  v === null || v === undefined || v === "" ? null : `USD ${Number(v).toLocaleString("es-AR")}`;

/** «Etapa: Nuevo → Contactado», para el texto plano (CSV, títulos). */
export const changeText = (c: Change) => `${c.label}: ${c.before ?? "—"} → ${c.after ?? "—"}`;

/** «18 oct 2026» para fechas sin hora (YYYY-MM-DD). */
export const dateLabel = (v: unknown) =>
  v
    ? new Date(`${v}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "")
    : null;
