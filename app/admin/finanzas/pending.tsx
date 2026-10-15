"use client";

// Pagos pendientes: lo que falta cobrar o pagar. Los cargados a mano no cuentan
// en los totales hasta que se marcan como cobrados. Debajo, lo que queda del
// monto acordado de cada proyecto sin un pendiente cargado (se cobra desde la
// ficha del proyecto). Los ingresos de la lista suman el «Por cobrar».
import Link from "next/link";
import { Check, Clock, Pencil, Plus } from "lucide-react";
import {
  categoryLabel,
  fmt,
  otherCurrency,
  type Entry,
} from "@/lib/admin/finance-shared";
import { Card, btnGhost, btnSecondary, cn } from "../kit";
import { OwnerFaces } from "./owner";

/** `partial`: el proyecto ya tiene pendientes cargados y esto es lo que queda del acordado. */
export type OwedProject = { slug: string; name: string; balance: number; partial?: boolean };

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

export function Pending({
  entries,
  plans = [],
  owed,
  today,
  projectName,
  onSettle,
  onEdit,
  onAdd,
}: {
  entries: Entry[];
  /** Ingresos que se repiten todos los meses (finance-v5.sql): cada mes generan un pendiente acá. */
  plans?: Entry[];
  owed: OwedProject[];
  today: string;
  projectName: (slug: string | null) => string | null;
  onSettle: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onAdd: () => void;
}) {
  const sorted = [...entries].sort((a, b) =>
    a.occurred_on.localeCompare(b.occurred_on),
  );
  const count = sorted.length + plans.length + owed.length;
  return (
    <Card
      title="Pagos pendientes"
      icon={<Clock size={14} />}
      count={count || undefined}
      action={
        <button type="button" onClick={onAdd} className={btnSecondary}>
          <Plus size={14} /> Agregar
        </button>
      }
    >
      {count === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          No hay pagos pendientes. Con «Agregar» anotás un proyecto o un costo que falta pagar.
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {sorted.map((e) => {
            const income = e.kind === "ingreso";
            const other = otherCurrency(e);
            const project = projectName(e.project_slug);
            const late = e.occurred_on < today;
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <OwnerFaces owner={e.owner} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug font-medium break-words">
                    {e.description || categoryLabel(e.kind, e.category)}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                    <span>{income ? "Falta cobrar" : "Falta pagar"}</span>
                    {project && <span>{project}</span>}
                    <span
                      className={cn("tabular-nums", late && "text-amber-300")}
                    >
                      {late ? "Venció el" : "Para el"} {dayLabel(e.occurred_on)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-medium tabular-nums">
                    {fmt(e.amount, e.currency)}
                  </p>
                  <p className="text-[12px] text-muted tabular-nums">
                    ≈ {fmt(other.amount, other.currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(e)}
                  aria-label={`Editar ${e.description || categoryLabel(e.kind, e.category)}`}
                  className={cn(btnGhost, "shrink-0 p-1.5")}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => onSettle(e.id)}
                  className={cn(btnSecondary, "shrink-0")}
                  aria-label={`${income ? "Marcar como cobrado" : "Marcar como pagado"}: ${e.description || categoryLabel(e.kind, e.category)}`}
                >
                  <Check size={14} /> {income ? "Cobrado" : "Pagado"}
                </button>
              </li>
            );
          })}
          {plans.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-3">
              <OwnerFaces owner={e.owner} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug font-medium break-words">
                  {e.description || categoryLabel(e.kind, e.category)}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted">
                  <span>Todos los meses, el día {Number(e.occurred_on.slice(8))}</span>
                  {projectName(e.project_slug) && <span>{projectName(e.project_slug)}</span>}
                  {e.until && <span>hasta {dayLabel(e.until)}</span>}
                </p>
              </div>
              <p className="shrink-0 text-[13px] font-medium tabular-nums">{fmt(e.amount, e.currency)}</p>
              <button
                type="button"
                onClick={() => onEdit(e)}
                aria-label={`Editar ${e.description || categoryLabel(e.kind, e.category)}`}
                className={cn(btnGhost, "shrink-0 p-1.5")}
              >
                <Pencil size={14} />
              </button>
            </li>
          ))}
          {owed.map((p) => (
            <li key={p.slug} className="flex items-center gap-3 px-4 py-3">
              <span className="w-[18px] shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug font-medium break-words">
                  {p.name}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">
                  {p.partial ? "Resto del monto acordado, sin cuota cargada" : "Saldo del monto acordado"}
                </p>
              </div>
              <p className="shrink-0 text-[13px] font-medium tabular-nums">
                {fmt(p.balance, "USD")}
              </p>
              <Link
                href={`/admin/proyectos/${p.slug}`}
                className={cn(btnSecondary, "shrink-0")}
              >
                Cargar cobro
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
