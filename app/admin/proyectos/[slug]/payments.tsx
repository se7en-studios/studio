"use client";

// Cobros del proyecto: monto acordado, lo cobrado y lo que falta, con el
// detalle de cada ingreso. Son los ingresos de Finanzas con este proyecto: lo
// que se carga acá aparece allá y al revés, y las cuentas son las mismas que
// usan Inicio y Finanzas. Alta y baja optimistas; si el servidor falla, se deshace.
import { useState, useTransition } from "react";
import { Trash2, Wallet } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { fmt, otherCurrency, type Entry, type Owner } from "@/lib/admin/finance-shared";
import { PEOPLE } from "@/lib/admin/people";
import { projectMoney, type Billable } from "@/lib/admin/payment-shared";
import { Card, CardLink, Progress, Segmented, btnPrimary, cn, input, usd } from "../../kit";
import { useToast } from "../../overlay";
import { OWNER_LABEL, OwnerPicker } from "../../finanzas/owner";
import { addPayment, deletePayment } from "../actions";

type Category = "proyecto" | "mantenimiento";

const day = (d: string) =>
  new Date(`${d}T12:00:00`)
    .toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(/\./g, "");

export function Payments({
  project,
  initial,
  me,
  accent,
  today,
}: {
  project: Billable;
  /** Ingresos del proyecto (cobrados y pendientes). */
  initial: Entry[];
  me: LeadOwner;
  accent: string;
  /** YYYY-MM-DD en Argentina. */
  today: string;
}) {
  const flash = useToast();
  const [items, setItems] = useState(initial);
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [owner, setOwner] = useState<Owner>(me);
  // Un sitio en mantenimiento cobra el abono; uno en curso, el proyecto.
  const [category, setCategory] = useState<Category>(project.status === "mantenimiento" ? "mantenimiento" : "proyecto");
  const [pending, start] = useTransition();

  const { budget } = project;
  const money = projectMoney(project, items, today);
  const pct = budget ? Math.min(100, Math.round((money.paid / budget) * 100)) : 0;
  const sorted = [...items].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on));

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return flash("Poné un monto.", "error");
    const temp: Entry = {
      id: `tmp-${Date.now()}`,
      kind: "ingreso",
      occurred_on: paidOn,
      currency: "USD",
      amount: n,
      fx: 0,
      category,
      description: note.trim(),
      project_slug: project.slug,
      recurring: false,
      until: null,
      owner,
      status: "pagado",
      created_by: me,
      source: "manual",
    };
    setItems((xs) => [temp, ...xs]);
    setAmount("");
    setNote("");
    start(async () => {
      try {
        const saved = await addPayment(project.slug, {
          amount: n,
          paid_on: paidOn,
          note: temp.description,
          owner,
          category,
        });
        setItems((xs) => xs.map((x) => (x.id === temp.id ? saved : x)));
      } catch (err) {
        setItems((xs) => xs.filter((x) => x.id !== temp.id));
        flash(err instanceof Error ? err.message : "No se pudo guardar el cobro.", "error");
      }
    });
  }

  function remove(p: Entry) {
    if (p.id.startsWith("tmp-")) return;
    setItems((xs) => xs.filter((x) => x.id !== p.id));
    start(async () => {
      try {
        await deletePayment(p.id);
      } catch (err) {
        setItems((xs) => [...xs, p]);
        flash(err instanceof Error ? err.message : "No se pudo borrar el cobro.", "error");
      }
    });
  }

  return (
    <Card
      title="Cobros"
      icon={<Wallet size={14} />}
      count={items.length || undefined}
      action={<CardLink href="/admin/finanzas">Finanzas →</CardLink>}
    >
      <div className="grid grid-cols-3 gap-3 px-4 pt-4">
        <Stat label="Acordado" value={usd(budget)} />
        <Stat label="Cobrado" value={money.paid ? usd(money.paid) : "—"} tone={money.paid ? "text-emerald-300" : undefined} />
        <Stat
          label="Falta"
          value={money.owed ? usd(money.owed) : budget ? "Nada" : "—"}
          tone={money.owed ? "text-amber-300" : budget ? "text-emerald-300" : undefined}
        />
      </div>
      <div className="px-4 pt-3 pb-4">
        {budget ? (
          <Progress value={pct} accent={accent} />
        ) : (
          <p className="text-[12px] text-muted">
            {money.pending
              ? "«Falta» son los pendientes cargados. Con el monto acordado en el estado del proyecto se ve el saldo total."
              : "Cargá el monto en el estado del proyecto para ver cuánto falta."}
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
          max={today}
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
        <button type="submit" disabled={pending} className={cn(btnPrimary, "col-span-2 justify-center sm:col-span-1")}>
          Registrar
        </button>
        <div className="col-span-2 flex flex-wrap items-end gap-x-4 gap-y-2 sm:col-span-4">
          <div>
            <span className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase">Quién lo cobró</span>
            <OwnerPicker value={owner} onChange={setOwner} legend="Quién cobró" />
          </div>
          <div>
            <span className="mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase">Es de</span>
            <Segmented
              value={category}
              onChange={setCategory}
              label="Qué se cobró"
              options={[
                { id: "proyecto", label: "Proyecto" },
                { id: "mantenimiento", label: "Mantenimiento" },
              ]}
            />
          </div>
        </div>
      </form>

      {sorted.length > 0 && (
        <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {sorted.map((p) => {
            const due = p.status === "pendiente";
            const late = due && p.occurred_on < today;
            const usdValue = p.currency === "USD" ? null : otherCurrency(p);
            return (
              <li key={p.id} className="group flex items-center gap-3 px-4 py-2.5 text-[13px]">
                <span className={cn("w-24 shrink-0 font-medium tabular-nums", due && "text-muted")}>
                  {fmt(p.amount, p.currency)}
                  {usdValue && usdValue.amount > 0 && (
                    <span className="block text-[11px] font-normal text-muted">≈ {fmt(usdValue.amount, usdValue.currency)}</span>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted">
                  {[
                    due ? `${late ? "Venció el" : "Para el"} ${day(p.occurred_on)}` : day(p.occurred_on),
                    p.recurring && "todos los meses",
                    p.description,
                    p.created_by && PEOPLE[p.created_by].name,
                    `cobró: ${OWNER_LABEL[p.owner]}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {due && (
                  <span className={cn("shrink-0 rounded px-1.5 py-px text-[11px]", late ? "bg-amber-400/10 text-amber-300" : "bg-white/[0.06] text-muted")}>
                    Pendiente
                  </span>
                )}
                <button
                  onClick={() => remove(p)}
                  aria-label={`Borrar cobro de ${fmt(p.amount, p.currency)}`}
                  className="focus-ring rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 focus-visible:opacity-100 max-md:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={cn("mt-1 truncate text-[14px] font-semibold tabular-nums", tone)}>{value}</p>
    </div>
  );
}
