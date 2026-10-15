"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { btnGhost, btnPrimary, input, label } from "../kit";
import { Dialog } from "../overlay";
import { createClient, type NewClientState } from "./actions";

/** Alta a mano de un cliente (los de pedidos ganados se crean solos). */
export function NewClient({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        <Plus size={14} /> Nuevo cliente
      </button>
      {open && <NewClientDialog onClose={() => setOpen(false)} />}
    </>
  );
}

const FIELDS = [
  { name: "name", label: "Nombre o empresa", placeholder: "Ej: Muzzaga Pádel", required: true, span: true },
  { name: "contact", label: "Persona de contacto", placeholder: "Nombre" },
  { name: "email", label: "Email", placeholder: "hola@cliente.com", type: "email" },
  { name: "whatsapp", label: "WhatsApp", placeholder: "+54 9 299 …", type: "tel" },
];

function NewClientDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<NewClientState, FormData>(createClient, {});
  return (
    <Dialog onClose={onClose} label="Nuevo cliente">
      <form action={action} className="p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[20px] font-semibold tracking-[-0.01em]">Nuevo cliente</h2>
          <button type="button" onClick={onClose} aria-label="Cancelar" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-white/[0.06] hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name} className={f.span ? "sm:col-span-2" : undefined}>
              <label htmlFor={`nc-${f.name}`} className={label}>
                {f.label}
              </label>
              <input id={`nc-${f.name}`} name={f.name} type={f.type ?? "text"} required={f.required} autoFocus={f.required} maxLength={120} placeholder={f.placeholder} className={input} />
            </div>
          ))}
        </div>
        {state.error && <p className="mt-3 text-[13px] text-red-400">{state.error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Creando…" : "Crear cliente"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
