"use client";

// Alta o edición de un ingreso o un costo. Se carga en pesos o en dólares con la cotización
// del momento (atajos MEP, oficial y blue, o a mano) y muestra el equivalente en vivo.
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  CURRENCIES,
  KINDS,
  categoriesOf,
  cleanEntry,
  fmt,
  otherCurrency,
  parseAmount,
  type Currency,
  type Entry,
  type FinanceKind,
  type Owner,
} from "@/lib/admin/finance-shared";
import type { Rates } from "@/lib/admin/fx";
import { Chip, btnGhost, btnPrimary, input, label } from "../kit";
import { Dialog } from "../overlay";
import { createEntry, editEntry } from "./actions";
import { OwnerPicker } from "./owner";

type Project = { slug: string; name: string };

const KIND_LABEL: Record<FinanceKind, string> = {
  ingreso: "Ingreso",
  costo: "Costo",
};
const RATE_LABEL: { id: keyof Rates; label: string }[] = [
  { id: "mep", label: "MEP" },
  { id: "oficial", label: "Oficial" },
  { id: "blue", label: "Blue" },
];

export function EntryForm({
  rates,
  fx,
  projects,
  today,
  initialPending = false,
  entry = null,
  defaultOwner = "ambos",
  onClose,
  onSaved,
}: {
  rates: Rates;
  fx: number;
  projects: Project[];
  today: string;
  /** Abre el formulario con «Pago pendiente» ya marcado. */
  initialPending?: boolean;
  /** Si viene, se edita ese movimiento en vez de crear uno nuevo. */
  entry?: Entry | null;
  /** Quién pagó o cobró, de entrada: la persona que está cargando. */
  defaultOwner?: Owner;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}) {
  const [kind, setKind] = useState<FinanceKind>(entry?.kind ?? "costo");
  const [currency, setCurrency] = useState<Currency>(entry?.currency ?? "ARS");
  const [amount, setAmount] = useState(
    entry ? String(entry.amount).replace(".", ",") : "",
  );
  const [rate, setRate] = useState(
    entry ? String(entry.fx).replace(".", ",") : fx ? String(fx) : "",
  );
  const [day, setDay] = useState(entry?.occurred_on ?? today);
  const [category, setCategory] = useState(entry?.category ?? "otros");
  const [description, setDescription] = useState(entry?.description ?? "");
  const [project, setProject] = useState(entry?.project_slug ?? "");
  const [recurring, setRecurring] = useState(entry?.recurring ?? false);
  const [until, setUntil] = useState(entry?.until ?? "");
  const [owner, setOwner] = useState<Owner>(entry?.owner ?? defaultOwner);
  const [isPending, setIsPending] = useState(
    entry ? entry.status === "pendiente" : initialPending,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const draft = {
    kind,
    currency,
    amount: parseAmount(amount),
    fx: parseAmount(rate),
  };
  const other = draft.amount > 0 && draft.fx > 0 ? otherCurrency(draft) : null;

  function pickKind(k: FinanceKind) {
    setKind(k);
    setCategory("otros");
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanEntry({
      ...draft,
      // Un pendiente que pasa a pagado cuenta desde hoy, no desde su fecha prevista.
      occurred_on:
        entry?.status === "pendiente" && !isPending && day > today ? today : day,
      category,
      description,
      project_slug: project || null,
      recurring,
      until: until || null,
      owner,
      status: isPending ? "pendiente" : "pagado",
    });
    if (!cleaned.ok) return setError(cleaned.error);
    setError(null);
    start(async () => {
      const res = entry
        ? await editEntry(entry.id, cleaned.value)
        : await createEntry(cleaned.value);
      if (res.entry) {
        onSaved(res.entry);
        onClose();
      } else setError(res.error ?? "No se pudo guardar.");
    });
  }

  const title = entry ? "Editar movimiento" : "Nuevo movimiento";
  const whoLabel = kind === "costo" ? "Quién lo pagó" : "Quién lo cobró";
  return (
    <Dialog onClose={onClose} label={title} width="max-w-xl">
      <form onSubmit={submit} className="flex max-h-[92dvh] flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={btnGhost}
          >
            <X size={16} />
          </button>
        </header>

        <div className="admin-scroll space-y-4 overflow-y-auto p-5">
          <div className="flex gap-1.5" role="group" aria-label="Tipo">
            {KINDS.map((k) => (
              <Chip key={k} on={kind === k} onClick={() => pickKind(k)}>
                {KIND_LABEL[k]}
              </Chip>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="fin-amount" className={label}>
                Monto
              </label>
              <input
                id="fin-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={currency === "ARS" ? "150.000" : "100"}
                autoFocus
                className={input}
              />
            </div>
            <div>
              <span className={label}>Moneda</span>
              <div className="flex gap-1.5" role="group" aria-label="Moneda">
                {CURRENCIES.map((c) => (
                  <Chip
                    key={c}
                    on={currency === c}
                    onClick={() => setCurrency(c)}
                  >
                    {c === "ARS" ? "Pesos" : "Dólares"}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="fin-fx" className={label}>
              Cotización (pesos por dólar)
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="fin-fx"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="1.200"
                className={`${input} max-w-[140px]`}
              />
              {RATE_LABEL.map((r) =>
                rates[r.id] ? (
                  <Chip
                    key={r.id}
                    on={parseAmount(rate) === rates[r.id]}
                    onClick={() => setRate(String(rates[r.id]))}
                  >
                    {r.label} {fmt(rates[r.id] ?? 0, "ARS")}
                  </Chip>
                ) : null,
              )}
            </div>
            <p className="mt-1.5 text-[12px] text-muted" aria-live="polite">
              {other
                ? `Equivale a ${fmt(other.amount, other.currency)}`
                : "Con el monto y la cotización se calcula el equivalente."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="fin-day" className={label}>
                {isPending ? "Fecha prevista" : "Fecha"}
              </label>
              <input
                id="fin-day"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={`${input} [color-scheme:dark]`}
              />
            </div>
            <div>
              <label htmlFor="fin-cat" className={label}>
                Categoría
              </label>
              <select
                id="fin-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={input}
              >
                {categoriesOf(kind).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="fin-desc" className={label}>
              Descripción
            </label>
            <input
              id="fin-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={200}
              placeholder={
                kind === "costo"
                  ? "Ej.: Vercel Pro"
                  : "Ej.: Mantenimiento mensual"
              }
              className={input}
            />
          </div>

          <div>
            <label htmlFor="fin-project" className={label}>
              Proyecto (opcional)
            </label>
            <select
              id="fin-project"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              className={input}
            >
              <option value="">Sin proyecto</option>
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <span className={label}>{whoLabel}</span>
            <OwnerPicker value={owner} onChange={setOwner} legend={whoLabel} />
            <p className="mt-1.5 text-[12px] text-muted">
              Sirve para ver de quién es cada movimiento; «Cuenta del estudio» es lo que es de los dos.
            </p>
          </div>

          <div className="rounded-lg border border-[var(--line)] p-3">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={isPending}
                onChange={(e) => setIsPending(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Pago pendiente
            </label>
            <p className="mt-1.5 text-[12px] text-muted">
              {kind === "costo" ? "Todavía no se pagó" : "Todavía no se cobró"}:
              queda en «Pagos pendientes» y no cuenta en los totales hasta que
              lo marques como {kind === "costo" ? "pagado" : "cobrado"}.
            </p>
          </div>

          {!isPending && (
          <div className="rounded-lg border border-[var(--line)] p-3">
            <label className="flex items-center gap-2 text-[13px]">
              <input
                type="checkbox"
                checked={recurring}
                onChange={(e) => setRecurring(e.target.checked)}
                className="accent-[var(--accent)]"
              />
              Se repite todos los meses
            </label>
            {recurring && (
              <div className="mt-3">
                <label htmlFor="fin-until" className={label}>
                  Hasta (opcional)
                </label>
                <input
                  id="fin-until"
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className={`${input} max-w-[200px] [color-scheme:dark]`}
                />
                <p className="mt-1.5 text-[12px] text-muted">
                  Cuenta en cada mes con el mismo monto y cotización. Sin fecha,
                  sigue hasta que lo borres.
                </p>
              </div>
            )}
          </div>

          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t border-[var(--line)] px-5 py-3.5">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
