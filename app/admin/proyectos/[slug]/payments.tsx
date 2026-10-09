"use client";

// Cobros del proyecto: monto acordado, lo cobrado y lo que falta, con el
// detalle de cada pago. Alta y baja optimistas; si el servidor falla, se deshace.
import { useState, useTransition } from "react";
import { Trash2, Wallet } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { balance, type Payment } from "@/lib/admin/payment-shared";
import { Card, Progress, btnPrimary, cn, input, usd } from "../../kit";
import { useToast } from "../../overlay";
import { addPayment, deletePayment } from "../actions";

const today = () =>
  new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
const day = (d: string) =>
  new Date(`${d}T12:00:00`)
    .toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(/\./g, "");

export function Payments({
  slug,
  budget,
  initial,
  me,
  accent,
}: {
  slug: string;
  budget: number | null;
  initial: Payment[];
  me: LeadOwner;
  accent: string;
}) {
  const flash = useToast();
  const [items, setItems] = useState(initial);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const paid = items.reduce((s, p) => s + p.amount, 0);
  const left = balance(budget, paid);
  const pct = budget ? Math.min(100, Math.round((paid / budget) * 100)) : 0;

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return flash("Poné un monto.", "error");
    const temp: Payment = {
      id: `tmp-${Date.now()}`,
      created_at: new Date().toISOString(),
      project_slug: slug,
      paid_on: paidOn,
      amount: n,
      note: note.trim(),
      created_by: me,
    };
    setItems((xs) =>
      [temp, ...xs].sort((a, b) => b.paid_on.localeCompare(a.paid_on)),
    );
    setAmount("");
    setNote("");
    start(async () => {
      try {
        const saved = await addPayment(slug, {
          amount: n,
          paid_on: paidOn,
          note: temp.note,
        });
        setItems((xs) => xs.map((x) => (x.id === temp.id ? saved : x)));
      } catch (err) {
        setItems((xs) => xs.filter((x) => x.id !== temp.id));
        flash(
          err instanceof Error ? err.message : "No se pudo guardar el cobro.",
          "error",
        );
      }
    });
  }

  function remove(p: Payment) {
    if (p.id.startsWith("tmp-")) return;
    setItems((xs) => xs.filter((x) => x.id !== p.id));
    start(async () => {
      try {
        await deletePayment(p.id);
      } catch (err) {
        setItems((xs) =>
          [...xs, p].sort((a, b) => b.paid_on.localeCompare(a.paid_on)),
        );
        flash(
          err instanceof Error ? err.message : "No se pudo borrar el cobro.",
          "error",
        );
      }
    });
  }

  return (
    <Card
      title="Cobros"
      icon={<Wallet size={14} />}
      count={items.length || undefined}
    >
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        <Stat label="Acordado" value={usd(budget)} />
        <Stat
          label="Cobrado"
          value={paid ? usd(paid) : "—"}
          tone={paid ? "text-emerald-300" : undefined}
        />
        <Stat
          label="Falta"
          value={left === null ? "—" : left === 0 ? "Nada" : usd(left)}
          tone={
            left
              ? "text-amber-300"
              : left === 0
                ? "text-emerald-300"
                : undefined
          }
        />
      </div>
      <div className="px-4 pt-3 pb-4">
        {budget ? (
          <Progress value={pct} accent={accent} />
        ) : (
          <p className="text-[12px] text-muted">
            Cargá el monto en el estado del proyecto para ver cuánto falta.
          </p>
        )}
      </div>

      <form
        onSubmit={add}
        className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-[var(--line)] p-3 sm:grid-cols-[110px_140px_minmax(0,1fr)_auto]"
      >
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="USD"
          aria-label="Monto cobrado en USD"
          className={input}
          required
        />
        <input
          type="date"
          value={paidOn}
          max={today()}
          onChange={(e) => setPaidOn(e.target.value)}
          aria-label="Fecha del cobro"
          className={input}
          required
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          placeholder="Seña, saldo, cuota 2…"
          aria-label="Nota del cobro"
          className={cn(input, "col-span-2 sm:col-span-1")}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(btnPrimary, "col-span-2 justify-center sm:col-span-1")}
        >
          Registrar
        </button>
      </form>

      {items.length > 0 && (
        <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {items.map((p) => (
            <li
              key={p.id}
              className="group flex items-center gap-3 px-4 py-2.5 text-[13px]"
            >
              <span className="w-24 shrink-0 font-medium tabular-nums">
                {usd(p.amount)}
              </span>
              <span className="min-w-0 flex-1 truncate text-muted">
                {[
                  day(p.paid_on),
                  p.note,
                  p.created_by && PEOPLE[p.created_by].name,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
              <button
                onClick={() => remove(p)}
                aria-label={`Borrar cobro de ${usd(p.amount)}`}
                className="focus-ring rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 focus-visible:opacity-100 max-md:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-[14px] font-semibold tabular-nums",
          tone,
        )}
      >
        {value}
      </p>
    </div>
  );
}
