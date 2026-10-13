import { Database } from "lucide-react";

const code = "rounded bg-white/[0.06] px-1 text-foreground";

/** Falta la tabla de Finanzas: el paso que tiene que hacer Federico en Supabase. */
export function FinanceSetup() {
  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
        <Database size={16} /> Federico: falta activar Finanzas en Supabase.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
        <li>
          En Supabase → SQL Editor, pegar y correr{" "}
          <code className={code}>supabase/finance.sql</code> y después{" "}
          <code className={code}>supabase/finance-v2.sql</code> del repo. Crean
          las tablas de ingresos y costos, el reparto entre socios, los pagos
          pendientes y las herramientas.
        </li>
        <li>Recargar esta página.</li>
      </ol>
    </div>
  );
}
