"use client";

// En la ficha de un pedido ganado: crea su proyecto (con cliente, monto,
// responsable y la idea ya cargados) o, si ya existe, lleva a él.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FolderPlus } from "lucide-react";
import { projectFromLead } from "../proyectos/actions";
import { btnPrimary, btnSecondary } from "../kit";

export function WonProject({ leadId, slug }: { leadId: string; slug: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-400/20 bg-emerald-400/[0.05] px-3.5 py-3">
      <p className="text-[13px]">
        <span className="block text-[11px] font-medium tracking-wide text-emerald-300 uppercase">Ganado</span>
        {slug ? "Este pedido ya tiene su proyecto." : "Pasalo a proyecto: cliente, monto y responsable se copian solos."}
        {error && <span className="mt-1 block text-[12px] text-red-400">{error}</span>}
      </p>
      {slug ? (
        <Link href={`/admin/proyectos/${slug}`} className={btnSecondary}>
          Abrir proyecto <ArrowRight size={14} />
        </Link>
      ) : (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await projectFromLead(leadId);
              if (r.slug) router.push(`/admin/proyectos/${r.slug}`);
              else setError(r.error ?? "No se pudo crear el proyecto.");
            })
          }
          className={btnPrimary}
        >
          <FolderPlus size={14} /> {pending ? "Creando…" : "Crear proyecto"}
        </button>
      )}
    </div>
  );
}
