"use client";

// En la ficha de un pedido perdido: por qué se perdió (opciones cortas) y el
// detalle en texto libre. El motivo se guarda al tocarlo; el detalle, al salir.
import { useState } from "react";
import type { Lead } from "@/lib/admin/db";
import { LOST_NOTE_MAX, LOST_REASONS } from "@/lib/admin/sales-shared";
import { Chip, cn, input, label as sectionLabel } from "../kit";

export function LostReason({
  lead,
  onSave,
}: {
  lead: Lead;
  onSave: (reason: string | null, note: string) => void;
}) {
  const [note, setNote] = useState(lead.lost_note ?? "");
  const reason = lead.lost_reason ?? null;
  return (
    <div
      className={cn(
        "mt-3 rounded-lg border p-3.5",
        reason
          ? "border-[var(--line)]"
          : "border-amber-400/30 bg-amber-400/[0.04]",
      )}
    >
      <p className={sectionLabel}>
        {reason
          ? "Por qué se perdió"
          : "¿Por qué se perdió? Anotalo para la próxima"}
      </p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Motivo de pérdida"
      >
        {LOST_REASONS.map((r) => (
          <Chip
            key={r.id}
            on={reason === r.id}
            onClick={() => onSave(reason === r.id ? null : r.id, note.trim())}
          >
            {r.label}
          </Chip>
        ))}
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() =>
          note.trim() !== (lead.lost_note ?? "") && onSave(reason, note.trim())
        }
        maxLength={LOST_NOTE_MAX}
        rows={2}
        aria-label="Detalle de la pérdida"
        placeholder="Detalle (opcional): qué dijo, a quién eligió, cuándo volver a escribirle…"
        className={cn(input, "mt-2 py-2 leading-relaxed")}
      />
    </div>
  );
}
