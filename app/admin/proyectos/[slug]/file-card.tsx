"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText, Trash2 } from "lucide-react";
import type { PanelFile } from "@/lib/admin/panel";
import { deleteFile } from "../actions";

/**
 * Una tarjeta por archivo: miniatura, nombre, quién y cuándo. Se abre en otra
 * pestaña con la URL firmada (dura una hora).
 */
export function FileCard({
  file,
  meta,
  folder,
}: {
  file: PanelFile;
  /** «2,4 MB · Federico · hace 3 h», armado en el servidor. */
  meta: string;
  /** Nombre de la carpeta, sólo cuando se ven todas juntas. */
  folder?: string;
}) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ext = file.name.split(".").pop()?.toUpperCase().slice(0, 5) ?? "";

  function remove() {
    start(async () => {
      const r = await deleteFile(file.id);
      if (r.error) {
        setError(r.error);
        setConfirm(false);
      } else router.refresh();
    });
  }

  return (
    <li className={`group overflow-hidden rounded-xl border border-border bg-background/70 transition-opacity ${pending ? "opacity-50" : ""}`}>
      <a
        href={file.url ?? undefined}
        target="_blank"
        rel="noopener"
        className="focus-ring relative block aspect-[4/3] overflow-hidden bg-surface-2"
        aria-label={`Abrir ${file.name}`}
      >
        {file.url && file.mime.startsWith("image/") ? (
          // URL firmada de Supabase: ver feed.tsx.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={file.url} alt="" loading="lazy" className="h-full w-full object-cover object-top transition-transform duration-[var(--dur-base)] ease-[var(--ease)] group-hover:scale-[1.03]" />
        ) : file.url && file.mime.startsWith("video/") ? (
          <video src={file.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-2 text-muted">
            <FileText size={28} strokeWidth={1.3} />
            <span className="font-mono text-[10px] tracking-widest">{ext}</span>
          </span>
        )}
        <span className="absolute top-2 right-2 rounded-full bg-background/80 p-1.5 text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          <ExternalLink size={12} />
        </span>
      </a>
      <div className="p-3">
        <p className="truncate text-[13px] text-foreground" title={file.name}>
          {file.name}
        </p>
        <p className="mt-0.5 truncate font-mono text-[10px] text-muted">
          {folder && `${folder} · `}
          {meta}
        </p>
        <div className="mt-2 flex h-6 items-center">
          {confirm ? (
            <span className="flex items-center gap-2 text-xs">
              <span className="text-muted">¿Borrar?</span>
              <button onClick={remove} disabled={pending} className="focus-ring rounded-full bg-red-500/90 px-2.5 py-0.5 text-white">
                Sí
              </button>
              <button onClick={() => setConfirm(false)} className="focus-ring rounded-full border border-border px-2.5 py-0.5 text-muted">
                No
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirm(true)} className="focus-ring inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-400">
              <Trash2 size={12} /> Borrar
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
      </div>
    </li>
  );
}
