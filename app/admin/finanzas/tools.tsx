"use client";

// Herramientas y suscripciones con su logo, cuánto cuestan y cuándo renuevan.
// La próxima renovación se calcula sola desde la fecha cargada y el ciclo: no
// hace falta volver a cargarla después de cada pago.
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { fmt, type Currency, type Owner } from "@/lib/admin/finance-shared";
import {
  daysUntil,
  monthlyIn,
  nextRenewal,
  type Tool,
} from "@/lib/admin/tool-shared";
import { Card, btnGhost, btnSecondary, cn } from "../kit";
import { useToast } from "../overlay";
import { OwnerFaces } from "./owner";
import { ToolForm } from "./tool-form";
import { ToolLogo } from "./tool-logo";

const dayLabel = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

/** Cuántos días faltan, en palabras. */
function inDays(n: number) {
  if (n === 0) return "Hoy";
  if (n === 1) return "Mañana";
  return `En ${n} días`;
}

const NONE: Tool[] = [];

export function Tools({
  list,
  setList,
  editing,
  setEditing,
  onRemove,
  defaultOwner,
  currency,
  fx,
  today,
}: {
  /** null: falta la tabla en Supabase. */
  list: Tool[] | null;
  setList: Dispatch<SetStateAction<Tool[]>>;
  /** La herramienta que se está editando, «new» para una nueva; el estado vive en la vista para poder abrirla desde Movimientos. */
  editing: Tool | "new" | null;
  setEditing: (t: Tool | "new" | null) => void;
  onRemove: (id: string) => void;
  defaultOwner: Owner;
  currency: Currency;
  /** Pesos por dólar de hoy; 0 si no hay. */
  fx: number;
  today: string;
}) {
  const flash = useToast();
  const tools = list ?? NONE;
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      tools
        .map((t) => {
          const next = nextRenewal(t.renews_on, t.cycle, today);
          return { tool: t, next, days: daysUntil(next, today) };
        })
        .sort(
          (a, b) =>
            a.next.localeCompare(b.next) ||
            a.tool.name.localeCompare(b.tool.name),
        ),
    [tools, today],
  );
  const monthly = tools.reduce((sum, t) => sum + monthlyIn(t, currency, fx), 0);
  const unconverted = fx <= 0 && tools.some((t) => t.currency !== currency);

  function remove(id: string) {
    setConfirmId(null);
    onRemove(id);
  }

  return (
    <Card
      title="Herramientas y renovaciones"
      icon={<CalendarClock size={14} />}
      count={list && tools.length ? tools.length : undefined}
      action={
        list && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={btnSecondary}
          >
            <Plus size={14} /> Agregar
          </button>
        )
      }
    >
      {!list ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          Federico: falta correr{" "}
          <code className="rounded bg-white/[0.06] px-1 text-foreground">
            supabase/finance-v2.sql
          </code>{" "}
          en Supabase para activar las herramientas.
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          Cargá Claude, Supabase, Vercel y el resto de las herramientas que
          pagan para ver cuándo renueva cada una y cuánto suman por mes.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-[var(--line)]">
            {rows.map(({ tool: t, next, days }) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                <ToolLogo name={t.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-[13px] leading-snug font-medium">
                    <span className="truncate">{t.name}</span>
                    <OwnerFaces owner={t.owner} size={16} />
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted">
                    Renueva el {dayLabel(next)}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[13px] font-medium tabular-nums">
                    {fmt(t.amount, t.currency)}
                    <span className="font-normal text-muted">
                      {" "}
                      / {t.cycle === "anual" ? "año" : "mes"}
                    </span>
                  </p>
                  <p
                    className={cn(
                      "text-[12px] tabular-nums",
                      days <= 3
                        ? "font-medium text-red-400"
                        : days <= 7
                          ? "text-amber-300"
                          : "text-muted",
                    )}
                  >
                    {inDays(days)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {confirmId === t.id ? (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => remove(t.id)}
                        className="focus-ring rounded-md bg-red-500/90 px-2 py-1 text-[11px] text-white"
                      >
                        Quitar
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        className="focus-ring rounded-md px-1.5 py-1 text-[11px] text-muted hover:text-foreground"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(t)}
                        aria-label={`Editar ${t.name}`}
                        className={cn(btnGhost, "p-1.5")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(t.id)}
                        aria-label={`Quitar ${t.name}`}
                        className={cn(btnGhost, "p-1.5")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p className="border-t border-[var(--line)] px-4 py-3 text-[12px] text-muted">
            Suman {fmt(monthly, currency)} por mes (lo anual, prorrateado).
            {unconverted &&
              " Sin cotización del dólar: no cuento lo que está en la otra moneda."}
          </p>
        </>
      )}

      {editing && (
        <ToolForm
          tool={editing === "new" ? null : editing}
          defaultOwner={defaultOwner}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            setList((xs) =>
              xs.some((x) => x.id === saved.id)
                ? xs.map((x) => (x.id === saved.id ? saved : x))
                : [...xs, saved],
            );
            flash(
              editing === "new"
                ? "Herramienta agregada"
                : "Herramienta actualizada",
              "ok",
            );
          }}
          today={today}
        />
      )}
    </Card>
  );
}
