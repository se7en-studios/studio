"use client";

// Barra de acciones en lote de la lista de Pedidos: aparece abajo cuando hay
// pedidos tildados. Cada acción se aplica a todos los tildados que se ven.
import { useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import type { LeadOwner, LeadStatus } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { btnDanger, btnGhost, btnSecondary, cn, input } from "../kit";

type Stage = { id: LeadStatus; label: string };

export function BulkBar({
  count,
  stages,
  onStage,
  onOwner,
  onExport,
  onDelete,
  onClear,
}: {
  count: number;
  stages: Stage[];
  onStage: (s: LeadStatus) => void;
  onOwner: (o: LeadOwner | null) => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const noun = count === 1 ? "pedido" : "pedidos";

  return (
    <div
      role="region"
      aria-label="Acciones sobre los pedidos elegidos"
      className="admin-pop fixed inset-x-3 bottom-4 z-[60] mx-auto flex max-w-3xl flex-wrap items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--panel-3)] p-2.5 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6)] lg:left-[260px]"
    >
      <span className="px-2 text-[13px] font-medium tabular-nums">
        {count} {count === 1 ? "elegido" : "elegidos"}
      </span>

      <select
        aria-label="Pasar a otra etapa"
        value=""
        onChange={(e) =>
          e.target.value && onStage(e.target.value as LeadStatus)
        }
        className={cn(input, "max-w-[170px] py-1.5")}
      >
        <option value="">Pasar a…</option>
        {stages.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Asignar responsable"
        value=""
        onChange={(e) =>
          e.target.value &&
          onOwner(
            e.target.value === "sin" ? null : (e.target.value as LeadOwner),
          )
        }
        className={cn(input, "max-w-[170px] py-1.5")}
      >
        <option value="">Asignar a…</option>
        {PEOPLE_IDS.map((o) => (
          <option key={o} value={o}>
            {PEOPLE[o].name}
          </option>
        ))}
        <option value="sin">Sin asignar</option>
      </select>

      <button type="button" onClick={onExport} className={btnSecondary}>
        <Download size={14} /> CSV
      </button>

      {confirm ? (
        <span className="flex items-center gap-1.5">
          <button type="button" onClick={onDelete} className={btnDanger}>
            Sí, borrar {count} {noun}
          </button>
          <button
            type="button"
            onClick={() => setConfirm(false)}
            className={btnGhost}
          >
            No
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setConfirm(true)}
          className={btnGhost}
        >
          <Trash2 size={14} /> Borrar
        </button>
      )}

      <button
        type="button"
        onClick={onClear}
        aria-label="Quitar la selección"
        className={cn(btnGhost, "ml-auto")}
      >
        <X size={16} />
      </button>
    </div>
  );
}
