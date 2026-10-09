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
      <div aria-hidden className="pointer-events-none absolute top-[-20%] left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,77,46,0.16),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <div className="relative max-w-md rounded-2xl border border-border bg-surface p-8">
          <p className="font-mono text-[11px] tracking-widest text-accent uppercase">Panel</p>
          <h1 className="mt-3 text-2xl text-foreground">Falta la contraseña del panel</h1>
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

/** Falta la base o faltan las tablas del panel: cómo activarlo, sin romper la página. */
export function SetupNotice({ reason }: { reason: string }) {
  const v2 = /panel-v2/.test(reason);
  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
        <Database size={16} /> {reason}
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted [&_code]:rounded [&_code]:bg-white/[0.06] [&_code]:px-1 [&_code]:text-foreground">
        <li>
          {v2 ? (
            <>
              En Supabase → SQL Editor, pegar y correr <code>supabase/panel-v2.sql</code> del repo. Crea el estado de
              los proyectos, los mensajes y el detalle del registro de cambios.
            </>
          ) : (
            <>
              En Supabase → SQL Editor, pegar y correr <code>supabase/panel.sql</code> del repo. Crea las tablas y el
              bucket privado <code>panel</code>.
            </>
          )}
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

const TZ = "America/Argentina/Buenos_Aires";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

/** «Hoy», «Ayer» o «martes 6 de octubre», en hora de Argentina. */
export function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (dayKey(d) === dayKey(today)) return "Hoy";
  if (dayKey(d) === dayKey(yesterday)) return "Ayer";
  return d.toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
}

export function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}

export function bytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1024 / 1024).toLocaleString("es-AR", { maximumFractionDigits: 1 })} MB`;
}
