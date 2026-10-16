"use client";

// Alta y edición de una herramienta. Los atajos de arriba completan el nombre
// con el que se reconoce el logo (Claude, Supabase, Vercel…).
import { useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  CURRENCIES,
  parseAmount,
  type Currency,
  type Owner,
} from "@/lib/admin/finance-shared";
import {
  CYCLES,
  TOOL_PRESETS,
  cleanTool,
  type Cycle,
  type Tool,
} from "@/lib/admin/tool-shared";
import { Chip, btnGhost, btnPrimary, input, label } from "../kit";
import { Dialog } from "../overlay";
import { saveTool } from "./actions";
import { OwnerPicker } from "./owner";
import { ToolLogo } from "./tool-logo";

export function ToolForm({
  tool,
  defaultOwner,
  today,
  onClose,
  onSaved,
}: {
  tool: Tool | null;
  defaultOwner: Owner;
  today: string;
  onClose: () => void;
  onSaved: (tool: Tool) => void;
}) {
  const [name, setName] = useState(tool?.name ?? "");
  const [amount, setAmount] = useState(
    tool ? String(tool.amount).replace(".", ",") : "",
  );
  const [currency, setCurrency] = useState<Currency>(tool?.currency ?? "USD");
  const [cycle, setCycle] = useState<Cycle>(tool?.cycle ?? "mensual");
  const [renewsOn, setRenewsOn] = useState(tool?.renews_on ?? today);
  const [owner, setOwner] = useState<Owner>(tool?.owner ?? defaultOwner);
  const [notes, setNotes] = useState(tool?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = cleanTool({
      name,
      amount: parseAmount(amount),
      currency,
      cycle,
      renews_on: renewsOn,
      owner,
      notes,
    });
    if (!cleaned.ok) return setError(cleaned.error);
    setError(null);
    start(async () => {
      const res = await saveTool(tool?.id ?? null, cleaned.value);
      if (res.tool) {
        onSaved(res.tool);
        onClose();
      } else setError(res.error ?? "No se pudo guardar.");
    });
  }

  const title = tool ? "Editar herramienta" : "Nueva herramienta";
  return (
    <Dialog onClose={onClose} label={title} width="max-w-lg">
      <form onSubmit={submit} className="flex max-h-[92dvh] flex-col">
        <header className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3.5">
          <h2 className="adm-title text-[15px]">{title}</h2>
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
          {!tool && (
            <div
              className="flex flex-wrap gap-1.5"
              role="group"
              aria-label="Herramientas conocidas"
            >
              {TOOL_PRESETS.map((p) => (
                <Chip
                  key={p.id}
                  on={name === p.name}
                  onClick={() => setName(p.name)}
                >
                  {p.name}
                </Chip>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="tool-name" className={label}>
              Nombre
            </label>
            <div className="flex items-center gap-2">
              <ToolLogo name={name || "?"} />
              <input
                id="tool-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                placeholder="Ej.: Claude Max"
                autoFocus
                className={input}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="tool-amount" className={label}>
                Cuánto cuesta
              </label>
              <input
                id="tool-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={currency === "USD" ? "20" : "20.000"}
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={label}>Se paga</span>
              <div
                className="flex gap-1.5"
                role="group"
                aria-label="Ciclo de pago"
              >
                {CYCLES.map((c) => (
                  <Chip key={c} on={cycle === c} onClick={() => setCycle(c)}>
                    {c === "mensual" ? "Por mes" : "Por año"}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="tool-renews" className={label}>
                Fecha de renovación
              </label>
              <input
                id="tool-renews"
                type="date"
                value={renewsOn}
                onChange={(e) => setRenewsOn(e.target.value)}
                className={`${input} [color-scheme:dark]`}
              />
            </div>
          </div>
          <p className="-mt-2 text-[12px] text-muted">
            Poné cualquier fecha en que renovó o renueva: las siguientes se
            calculan solas según el ciclo.
          </p>

          <div>
            <span className={label}>Quién la paga</span>
            <OwnerPicker
              value={owner}
              onChange={setOwner}
              legend="Quién la paga"
            />
          </div>

          <div>
            <label htmlFor="tool-notes" className={label}>
              Nota (opcional)
            </label>
            <input
              id="tool-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              placeholder="Ej.: plan Pro, cuenta de Franco"
              className={input}
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
