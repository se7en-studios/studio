import { Database } from "lucide-react";

const code = "rounded bg-white/[0.06] px-1 text-foreground";

/** Pasos pendientes para Federico: sin la tabla no hay panel, y sin el seed no hay posts. */
export function ContentSetup({ tableMissing }: { tableMissing: boolean }) {
  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
        <Database size={16} />
        {tableMissing
          ? "Federico: falta activar el panel de contenido en Supabase."
          : "Federico: faltan cargar los posts en el panel."}
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
        {tableMissing && (
          <li>
            En Supabase → SQL Editor, pegar y correr{" "}
            <code className={code}>supabase/content.sql</code> del repo.
          </li>
        )}
        <li>
          Pasarle a Franco la <code className={code}>SUPABASE_URL</code> y la{" "}
          <code className={code}>SUPABASE_SERVICE_ROLE_KEY</code> (por privado,
          nunca al repo), o correr vos{" "}
          <code className={code}>
            node scripts/seed-content.mjs &quot;carpeta subidas&quot;
          </code>
          . Eso carga los 32 posts con sus archivos.
        </li>
        <li>Recargar esta página.</li>
      </ol>
    </div>
  );
}
