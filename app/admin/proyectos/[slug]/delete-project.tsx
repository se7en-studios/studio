"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProject } from "../actions";

/**
 * Borrar el proyecto. Sólo se monta en los creados desde el panel: los casos de
 * la web viven en data/projects.ts, así que un botón ahí sería un click que no
 * puede funcionar — ver la condición en page.tsx.
 *
 * Mismo patrón de confirmación en dos pasos que FileCard, pero diciendo de
 * antemano cuántos archivos se van, porque acá no hay vuelta atrás.
 */
export function DeleteProject({
  slug,
  name,
  files,
}: {
  slug: string;
  name: string;
  files: number;
}) {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    start(async () => {
      // Si sale bien, deleteProject redirige y lo que sigue no corre.
      const r = await deleteProject(slug);
      if (r?.error) {
        setError(r.error);
        setConfirm(false);
      }
    });
  }

  return (
    <div className="border-t border-border pt-6">
      {confirm ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-sm text-foreground">
            ¿Borrar «{name}»?{" "}
            <span className="text-muted">
              {files > 0
                ? `Se van también sus ${files} archivo${files === 1 ? "" : "s"}. No se puede deshacer.`
                : "No se puede deshacer."}
            </span>
          </p>
          <button
            onClick={remove}
            disabled={pending}
            className="focus-ring rounded-full bg-red-500/90 px-3.5 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
          <button
            onClick={() => setConfirm(false)}
            disabled={pending}
            className="focus-ring rounded-full border border-border px-3.5 py-1.5 text-sm text-muted disabled:opacity-50"
          >
            No
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirm(true)}
          className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-red-400"
        >
          <Trash2 size={14} /> Borrar proyecto
        </button>
      )}
      {error && <p className="mt-2 text-[13px] text-red-400">{error}</p>}
    </div>
  );
}
