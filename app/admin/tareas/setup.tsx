import { Database } from "lucide-react";

/** Faltan la base o la tabla de tareas: cómo activarlas, sin romper la página. */
export function TasksSetup({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-sm">
      <p className="flex items-center gap-2 text-amber-300">
        <Database size={15} /> {reason}
      </p>
      <p className="mt-3 text-muted [&_code]:text-foreground">
        En Supabase → SQL Editor, pegar y correr <code>supabase/tasks.sql</code>{" "}
        del repo y recargar.
      </p>
    </div>
  );
}
