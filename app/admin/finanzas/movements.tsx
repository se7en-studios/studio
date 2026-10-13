"use client";

// Lista de movimientos: monto en la moneda en que se cargó y el equivalente debajo.
// Los cobros de proyectos se ven pero no se borran acá: se editan en su proyecto.
// Cada fila son dos renglones (título y monto, detalle y equivalente) para que
// entre bien en el celular sin cortar ni superponer nada.
import { useState } from "react";
import Link from "next/link";
import { Repeat, Trash2 } from "lucide-react";
import {
  categoryLabel,
  fmt,
  otherCurrency,
  type Entry,
} from "@/lib/admin/finance-shared";
import { Card, Empty, btnGhost, cn } from "../kit";

const PAGE = 40;

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });

export function Movements({
  entries,
  projectName,
  onDelete,
}: {
  entries: Entry[];
  projectName: (slug: string | null) => string | null;
  onDelete: (id: string) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const sorted = [...entries].sort((a, b) =>
    b.occurred_on.localeCompare(a.occurred_on),
  );

  return (
    <Card title="Movimientos" count={entries.length || undefined}>
      {sorted.length === 0 ? (
        <Empty title="Todavía no hay movimientos en este período">
          Cargá un ingreso o un costo con «Nuevo movimiento».
        </Empty>
      ) : (
        <>
          <ul className="divide-y divide-[var(--line)]">
            {sorted.slice(0, shown).map((e) => (
              <li key={e.id}>
                <Row
                  e={e}
                  project={projectName(e.project_slug)}
                  confirming={confirmId === e.id}
                  onAsk={() => setConfirmId(e.id)}
                  onCancel={() => setConfirmId(null)}
                  onDelete={() => onDelete(e.id)}
                />
              </li>
            ))}
          </ul>
          {sorted.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className={cn(btnGhost, "m-3")}
            >
              Ver {Math.min(PAGE, sorted.length - shown)} más
            </button>
          )}
        </>
      )}
    </Card>
  );
}

function Row({
  e,
  project,
  confirming,
  onAsk,
  onCancel,
  onDelete,
}: {
  e: Entry;
  project: string | null;
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const other = otherCurrency(e);
  const income = e.kind === "ingreso";
  const title = e.description || categoryLabel(e.kind, e.category);
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[13px] leading-snug font-medium break-words">
          {title}
        </p>
        <p
          className={cn(
            "shrink-0 text-[13px] font-medium tabular-nums",
            income ? "text-emerald-300" : "text-foreground",
          )}
        >
          {income ? "+" : "−"} {fmt(e.amount, e.currency)}
        </p>
      </div>

      <div className="mt-1 flex items-start justify-between gap-3">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-muted">
          <span className="tabular-nums">{dayLabel(e.occurred_on)}</span>
          <span>{categoryLabel(e.kind, e.category)}</span>
          {e.source === "cobro" && (
            <span className="rounded-full bg-emerald-400/10 px-1.5 whitespace-nowrap text-emerald-300">
              Cobro de proyecto
            </span>
          )}
          {e.recurring && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Repeat size={11} /> Todos los meses
              {e.until ? ` hasta ${dayLabel(e.until)}` : ""}
            </span>
          )}
          {project &&
            (e.project_slug ? (
              <Link
                href={`/admin/proyectos/${e.project_slug}`}
                className="focus-ring hover:text-foreground hover:underline"
              >
                {project}
              </Link>
            ) : (
              <span>{project}</span>
            ))}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className="text-[12px] text-muted tabular-nums"
            title={
              e.source === "cobro"
                ? "Al cambio de hoy"
                : `Cotización ${fmt(e.fx, "ARS")}`
            }
          >
            {e.source === "cobro" && e.fx === 0
              ? "—"
              : `${e.source === "cobro" ? "≈ " : ""}${fmt(other.amount, other.currency)}`}
          </span>
          {e.source === "manual" &&
            (confirming ? (
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={onDelete}
                  className="focus-ring rounded-md bg-red-500/90 px-2 py-1 text-[11px] text-white"
                >
                  Borrar
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="focus-ring rounded-md px-1.5 py-1 text-[11px] text-muted hover:text-foreground"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={onAsk}
                aria-label={`Borrar ${title}`}
                className={cn(btnGhost, "p-1.5")}
              >
                <Trash2 size={14} />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
