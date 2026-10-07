"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { createProject, type NewProjectState } from "./actions";

const field =
  "focus-ring w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/60 focus:border-accent";
const label = "mb-1.5 block font-mono text-[10px] tracking-widest text-muted uppercase";

/** Proyectos que no son casos de la web: clientes en curso, pruebas, cosas internas. */
export function NewProject() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<NewProjectState, FormData>(createProject, {});

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-background"
      >
        <Plus size={15} /> Nuevo proyecto
      </button>
    );
  }

  return (
    <form action={action} className="w-full rounded-2xl border border-border bg-surface p-5 md:w-auto md:min-w-[560px]">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-foreground">Nuevo proyecto</p>
        <button type="button" onClick={() => setOpen(false)} aria-label="Cancelar" className="focus-ring rounded-full border border-border p-1.5 text-muted hover:text-foreground">
          <X size={14} />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="np-name" className={label}>Nombre</label>
          <input id="np-name" name="name" required maxLength={80} placeholder="Ej: Muzzaga Pádel" className={field} />
        </div>
        <div>
          <label htmlFor="np-category" className={label}>Tipo</label>
          <input id="np-category" name="category" maxLength={80} placeholder="E-commerce, landing, app…" className={field} />
        </div>
        <div>
          <label htmlFor="np-url" className={label}>Sitio (opcional)</label>
          <input id="np-url" name="url" maxLength={300} placeholder="cliente.com.ar" className={field} />
        </div>
        <div>
          <label htmlFor="np-accent" className={label}>Color del proyecto</label>
          <input id="np-accent" name="accent" type="color" defaultValue="#ff4d2e" className="focus-ring h-[42px] w-full cursor-pointer rounded-lg border border-border bg-background p-1" />
        </div>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-400">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-background disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear proyecto"}
      </button>
    </form>
  );
}
