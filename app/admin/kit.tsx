// Piezas visuales del panel. Sin "use client" y sin hooks: sirven igual en
// componentes de servidor y de cliente, así todo el panel habla el mismo
// idioma visual.
import Image from "next/image";
import Link from "next/link";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { PROJECT_STATUS, type ProjectStatus } from "@/lib/admin/project-shared";

export const cn = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");

/** Botones. `btn` + una variante. */
export const btn =
  "focus-ring inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40";
export const btnPrimary = `${btn} bg-accent text-background shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.4)] hover:bg-[#ff6347]`;
export const btnSecondary = `${btn} border border-[var(--line-strong)] bg-white/[0.03] text-foreground hover:bg-white/[0.07]`;
export const btnGhost = `${btn} text-muted hover:bg-white/[0.05] hover:text-foreground`;
export const btnDanger = `${btn} bg-red-500/90 text-white hover:bg-red-500`;

export const input =
  "focus-ring w-full rounded-lg border border-[var(--line-strong)] bg-black/30 px-3 py-2 text-[13px] text-foreground placeholder:text-muted/60 transition-colors focus:border-accent/70 focus:bg-black/40";
export const label = "mb-1.5 block text-[11px] font-medium tracking-wide text-muted uppercase";

export function PageHeader({
  title,
  children,
  right,
  eyebrow,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  right?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-[12px] text-muted">{eyebrow}</p>}
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-foreground md:text-[30px]">{title}</h1>
        {children && <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-muted">{children}</p>}
      </div>
      {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
    </header>
  );
}

export function Card({
  title,
  action,
  children,
  className,
  icon,
  count,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  count?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        className,
      )}
    >
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
          <h2 className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
            {icon && <span className="text-muted">{icon}</span>}
            <span className="truncate">{title}</span>
            {count !== undefined && count !== null && (
              <span className="rounded-md bg-white/[0.06] px-1.5 py-px font-mono text-[10.5px] text-muted">{count}</span>
            )}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="focus-ring shrink-0 text-[12px] text-muted transition-colors hover:text-foreground">
      {children}
    </Link>
  );
}

type Tone = "accent" | "red" | "amber" | "green" | undefined;
const TONE: Record<NonNullable<Tone>, string> = {
  accent: "text-accent",
  red: "text-red-400",
  amber: "text-amber-300",
  green: "text-emerald-300",
};

/** Número grande con etiqueta. Con `href` es un link. */
export function Kpi({
  label,
  value,
  hint,
  tone,
  href,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: Tone;
  href?: string;
  icon?: React.ReactNode;
}) {
  const body = (
    <>
      <p className="flex items-center justify-between gap-2 text-[12px] text-muted">
        {label}
        {icon && <span className="text-muted/70">{icon}</span>}
      </p>
      <p className={cn("mt-2 text-[24px] leading-none font-semibold tracking-[-0.02em] tabular-nums", tone ? TONE[tone] : "text-foreground")}>
        {value}
      </p>
      {hint && <p className="mt-2 truncate text-[11.5px] text-muted">{hint}</p>}
    </>
  );
  const cls =
    "block h-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
  return href ? (
    <Link href={href} className={cn("focus-ring transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--panel-2)]", cls)}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Face({ who, size = 22, ring }: { who: LeadOwner | null; size?: number; ring?: boolean }) {
  const p = who ? PEOPLE[who] : null;
  if (p?.image) {
    return (
      <Image
        src={p.image}
        alt={p.name}
        title={p.name}
        width={size * 2}
        height={size * 2}
        className={cn("shrink-0 rounded-full object-cover", ring && "ring-2 ring-[var(--panel)]")}
        style={{ width: size, height: size }}
      />
    );
  }
  if (p) {
    return (
      <span
        title={p.name}
        className="flex shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] text-foreground"
        style={{ width: size, height: size }}
      >
        {p.name[0]}
      </span>
    );
  }
  return (
    <span
      title="Sin asignar"
      className="shrink-0 rounded-full border border-dashed border-white/25"
      style={{ width: size, height: size }}
    />
  );
}

export function StatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  const s = PROJECT_STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset", s.tone, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

export function Progress({ value, accent }: { value: number; accent?: string }) {
  return (
    <span className="block h-1 w-full overflow-hidden rounded-full bg-white/[0.07]" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span
        className="block h-full rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: accent }}
      />
    </span>
  );
}

export function Empty({ icon, title, children }: { icon?: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      {icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line)] bg-white/[0.03] text-muted">
          {icon}
        </span>
      )}
      <p className="text-[13px] font-medium text-foreground">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[12.5px] text-muted">{children}</p>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-[var(--line-strong)] bg-white/[0.04] px-1 py-px font-mono text-[10px] text-muted">{children}</kbd>
  );
}

/** Pestañas como links (cambian la URL, se pueden compartir). */
export function TabLinks({
  tabs,
  current,
}: {
  tabs: { id: string; label: string; href: string; count?: number }[];
  current: string;
}) {
  return (
    <nav className="-mx-4 overflow-x-auto border-b border-[var(--line)] px-4 [scrollbar-width:none] md:mx-0 md:px-0">
      <div className="flex w-max gap-1">
        {tabs.map((t) => {
          const on = t.id === current;
          return (
            <Link
              key={t.id}
              href={t.href}
              scroll={false}
              aria-current={on ? "page" : undefined}
              className={cn(
                "focus-ring relative flex items-center gap-1.5 px-3 pt-1 pb-2.5 text-[13px] transition-colors",
                on ? "text-foreground" : "text-muted hover:text-foreground",
              )}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && <span className="font-mono text-[10.5px] text-muted">{t.count}</span>}
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const usd = (n: number | null | undefined) => (n ? `USD ${Math.round(n).toLocaleString("es-AR")}` : "—");
export const usdShort = (n: number | null | undefined) => {
  if (!n) return "—";
  if (n >= 1000) return `USD ${(n / 1000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}k`;
  return `USD ${Math.round(n)}`;
};
