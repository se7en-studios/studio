import Link from "next/link";
import { SearchX } from "lucide-react";
import { btnPrimary } from "./kit";

// Una ficha o una sección que no existe (un proyecto borrado, un link viejo).
export default function AdminNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-white/[0.04] text-muted">
        <SearchX size={22} />
      </span>
      <h1 className="text-[20px] font-semibold tracking-[-0.01em]">
        No encontramos eso
      </h1>
      <p className="mt-2 text-[14px] text-muted">
        Puede que se haya borrado o que el link esté viejo. Probá con la
        búsqueda (⌘K) o volvé al Inicio.
      </p>
      <Link href="/admin" className={`${btnPrimary} mt-6`}>
        Ir al Inicio
      </Link>
    </div>
  );
}
