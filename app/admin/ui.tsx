// Piezas compartidas por las páginas del panel (componentes de servidor).
import { Database } from "lucide-react";
import { adminConfigured } from "@/lib/admin/auth";
import type { LeadOwner } from "@/lib/admin/db";
import { Face } from "./kit";
import { LoginForm } from "./login-form";

/** Lo que ve quien entra sin sesión a cualquier página del panel. */
export function AdminGate() {
  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 py-16">
      {/* Los anillos del logo, grandes y cruzados detrás del formulario. */}
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-[min(150vw,980px)] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 -rotate-[32deg] rounded-[50%] border border-[var(--line-strong)]" />
      <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-[min(150vw,980px)] w-[min(92vw,640px)] -translate-x-1/2 -translate-y-1/2 rotate-[24deg] rounded-[50%] border border-accent/45" />
      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <div className="relative max-w-md rounded-2xl border border-border bg-surface p-8">
          <p className="adm-label">Panel</p>
          <h1 className="adm-display mt-3 text-[28px] text-foreground">Falta la contraseña del panel</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted [&_code]:rounded [&_code]:bg-background [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-foreground">
            Cargá la variable <code>ADMIN_PASSWORD</code> en Vercel (Settings → Environment Variables) y volvé a
            deployar. No va en el código porque el repositorio es público.
          </p>
        </div>
      )}
    </div>
  );
}

export { PageHeader } from "./kit";

/** Cara de quien hizo algo (alias de Face, para los componentes de servidor). */
export function Avatar({ who, size = 26 }: { who: LeadOwner | null; size?: number }) {
  return <Face who={who} size={size} />;
}

/** Qué crea cada migración, para decirlo en el aviso. */
const SQL_WHAT: Record<string, React.ReactNode> = {
  "panel.sql": (
    <>
      Crea las tablas y el bucket privado <code>panel</code>.
    </>
  ),
  "panel-v2.sql": "Crea el estado de los proyectos, los mensajes y el detalle del registro de cambios.",
  "content.sql": "Crea la tabla del calendario de contenido de Instagram.",
  "payments.sql": "Crea la tabla de cobros de los proyectos.",
  "clients.sql": "Crea los clientes a partir de los nombres escritos en los proyectos y los vincula.",
  "maintenance.sql": "Crea los planes de mantenimiento, sus cobros mensuales y la cola de pedidos de los clientes.",
  "site-health.sql": "Crea la tabla de chequeos diarios de los sitios (respuesta, tiempo, SSL y dominio).",
  "finance-v4.sql": "Pasa los cobros de los proyectos a Finanzas, como ingresos con proyecto: así todo el panel suma lo mismo.",
};

/** Falta la base o faltan las tablas del panel: cómo activarlo, sin romper la página. */
export function SetupNotice({ reason }: { reason: string }) {
  // El mensaje nombra la migración que falta («Falta correr supabase/x.sql…»);
  // si no nombra ninguna, es la base: panel.sql.
  const file = /supabase\/([\w-]+\.sql)/.exec(reason)?.[1] ?? "panel.sql";
  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
        <Database size={16} /> {reason}
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:text-foreground">
        <li>
          En Supabase → SQL Editor, pegar y correr <code>supabase/{file}</code> del repo. {SQL_WHAT[file]}
        </li>
        <li>
          Usa las mismas variables que los pedidos: <code>SUPABASE_URL</code> y <code>SUPABASE_SERVICE_ROLE_KEY</code> en
          Vercel.
        </li>
        <li>Recargar esta página.</li>
      </ol>
    </div>
  );
}

export { dayLabel, timeLabel } from "@/lib/admin/tz";

export function bytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}
