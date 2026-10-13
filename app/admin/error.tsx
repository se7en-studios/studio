"use client";

// Pantalla de error del panel: algo falló al leer o dibujar una sección. El marco
// (barra lateral) sigue en pie; se puede reintentar o volver al Inicio. El mensaje
// técnico no se muestra (Next lo oculta en producción): sólo un código para buscarlo en el log.
import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { btnPrimary, btnSecondary } from "./kit";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel]", error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center py-24 text-center"
    >
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
        <TriangleAlert size={22} />
      </span>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
        Algo salió mal
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        No pudimos cargar esta sección. Suele ser un tropiezo con la conexión a
        la base de datos: probá de nuevo en unos segundos.
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={reset} className={btnPrimary}>
          Reintentar
        </button>
        <Link href="/admin" className={btnSecondary}>
          Ir al Inicio
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[11px] text-muted">
          Código: {error.digest}
        </p>
      )}
    </div>
  );
}
