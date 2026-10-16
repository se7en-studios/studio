"use client";

// Edición de un cobro de proyecto desde Finanzas: monto en dólares, fecha, nota,
// proyecto y quién lo cobró. El alta de cobros sigue en la ficha de cada proyecto.
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { parseAmount, type Owner } from "@/lib/admin/finance-shared";
import { cleanPayment, type Payment } from "@/lib/admin/payment-shared";
import { btnGhost, btnPrimary, input, label } from "../kit";
import { Dialog } from "../overlay";
import { editPayment } from "./actions";
import { OwnerPicker } from "./owner";

export function PaymentForm({
  payment,
  projects,
  onClose,
  onSaved,
}: {
  payment: Payment;
  projects: { slug: string; name: string }[];
  onClose: () => void;
  onSaved: (payment: Payment) => void;
}) {
  const [amount, setAmount] = useState(
    String(payment.amount).replace(".", ","),
  );
  const [day, setDay] = useState(payment.paid_on);
  const [note, setNote] = useState(payment.note);
  const [slug, setSlug] = useState(payment.project_slug);
  const [owner, setOwner] = useState<Owner>(payment.owner);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanPayment({
      amount: parseAmount(amount),
      paid_on: day,
      note,
      project_slug: slug,
      owner,
    });
    if (!cleaned.ok) return setError(cleaned.error);
    setError(null);
    start(async () => {
      const res = await editPayment(payment.id, cleaned.value);
      if (res.payment) {
        onSaved(res.payment);
        onClose();
      } else setError(res.error ?? "No se pudo guardar.");
    });
  }

  return (
    <Dialog onClose={onClose} label="Editar cobro" width="max-w-lg">
      <form onSubmit={submit} className="flex max-h-[92dvh] flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <h2 className="adm-title text-[15px]">
            Editar cobro de proyecto
          </h2>
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
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-amount" className={label}>
                Monto (USD)
              </label>
              <input
                id="pay-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                className={input}
              />
            </div>
            <div>
              <label htmlFor="pay-day" className={label}>
                Fecha del cobro
              </label>
              <input
                id="pay-day"
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className={`${input} [color-scheme:dark]`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="pay-project" className={label}>
              Proyecto
            </label>
            <select
              id="pay-project"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={input}
            >
              {!projects.some((p) => p.slug === slug) && (
                <option value={slug}>{slug}</option>
              )}
              {projects.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pay-note" className={label}>
              Nota
            </label>
            <input
              id="pay-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Seña, saldo, cuota 2…"
              className={input}
            />
          </div>
          <div>
            <span className={label}>Quién lo cobró</span>
            <OwnerPicker
              value={owner}
              onChange={setOwner}
              legend="Quién cobró"
            />
          </div>
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
