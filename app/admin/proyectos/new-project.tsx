"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { btnGhost, btnPrimary, input, label } from "../kit";
import { Dialog } from "../overlay";
import { createProject, type NewProjectState } from "./actions";

/** Proyectos que no son casos de la web: clientes en curso, pruebas, cosas internas. */
export function NewProject({ initialOpen = false }: { initialOpen?: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btnPrimary}>
        <Plus size={14} /> Nuevo proyecto
      </button>
      {open && <NewProjectDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function NewProjectDialog({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<NewProjectState, FormData>(createProject, {});
  return (
    <Dialog onClose={onClose} label="Nuevo proyecto">
      <form action={action} className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] text-muted">Proyecto del estudio</p>
            <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.01em]">Nuevo proyecto</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cancelar" className="focus-ring rounded-lg p-1.5 text-muted hover:bg-white/[0.06] hover:text-foreground">
            <X size={16} />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="np-name" className={label}>
              Nombre
            </label>
            <input id="np-name" name="name" required autoFocus maxLength={80} placeholder="Ej: Muzzaga Pádel" className={input} />
          </div>
          <div>
            <label htmlFor="np-category" className={label}>
              Tipo
            </label>
            <input id="np-category" name="category" maxLength={80} placeholder="E-commerce, landing, app…" className={input} />
          </div>
          <div>
            <label htmlFor="np-url" className={label}>
              Sitio (opcional)
            </label>
            <input id="np-url" name="url" maxLength={300} placeholder="cliente.com.ar" className={input} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="np-accent" className={label}>
              Color del proyecto
            </label>
            <input
              id="np-accent"
              name="accent"
              type="color"
              defaultValue="#ff4d2e"
              className="focus-ring h-10 w-full cursor-pointer rounded-lg border border-[var(--line-strong)] bg-black/30 p-1"
            />
          </div>
        </div>
        {state.error && <p className="mt-3 text-[13px] text-red-400">{state.error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancelar
          </button>
          <button type="submit" disabled={pending} className={btnPrimary}>
            {pending ? "Creando…" : "Crear proyecto"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
