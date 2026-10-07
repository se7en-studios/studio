// Piezas compartidas por las páginas del panel (componentes de servidor).
import Image from "next/image";
import Link from "next/link";
import { Database } from "lucide-react";
import { adminConfigured } from "@/lib/admin/auth";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { LoginForm } from "./login-form";

/** Lo que ve quien entra sin sesión a cualquier página del panel. */
export function AdminGate() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-6 pt-24 pb-16">
      {adminConfigured() ? (
        <LoginForm />
      ) : (
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8">
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

export function PageHeader({
  title,
  children,
  right,
}: {
  title: string;
  children?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] tracking-widest text-accent uppercase">Panel · Se7en Studio</p>
        <h1 className="mt-2 text-3xl text-foreground md:text-4xl">{title}</h1>
        {children && <p className="mt-2 max-w-2xl text-sm text-muted">{children}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <>
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
      <p className={`mt-2 text-2xl tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
    </>
  );
  const cls = "block rounded-2xl border border-border bg-surface p-4";
  return href ? (
    <Link href={href} className={`focus-ring ${cls} transition-colors hover:border-foreground/20`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Avatar({ who, size = 26 }: { who: LeadOwner | null; size?: number }) {
  const p = who ? PEOPLE[who] : null;
  return p?.image ? (
    <Image src={p.image} alt={p.name} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="shrink-0 rounded-full bg-white/10" style={{ width: size, height: size }} />
  );
}

/** Falta la base o faltan las tablas del panel: cómo activarlo, sin romper la página. */
export function SetupNotice({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
      <p className="flex items-center gap-2 text-sm text-amber-300">
        <Database size={15} /> {reason} Hasta entonces no se pueden subir archivos ni ver los cambios.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted [&_code]:text-foreground">
        <li>
          En Supabase → SQL Editor, pegar y correr <code>supabase/panel.sql</code> del repo. Crea las tablas y el bucket
          privado <code>panel</code>.
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
