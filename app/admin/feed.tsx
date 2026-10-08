// Registro de cambios del panel, agrupado por día. Cada línea dice quién hizo
// qué y, si fue una edición, el antes y el después de cada campo. Sin hooks:
// sirve en servidor (Inicio, Registro) y en cliente (las fichas).
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ago } from "@/lib/admin/brief";
import type { Change } from "@/lib/admin/changes";
import type { EventKind, PanelEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { Empty, Face, cn } from "./kit";

export const KIND_LABEL: Record<EventKind, string> = {
  archivos: "Archivos",
  proyecto: "Proyectos",
  pedido: "Pedidos",
  tarea: "Tareas",
};

const KIND_DOT: Record<EventKind, string> = {
  archivos: "bg-sky-400",
  proyecto: "bg-violet-400",
  pedido: "bg-accent",
  tarea: "bg-emerald-400",
};

const TZ = "America/Argentina/Buenos_Aires";
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });

function dayLabel(iso: string) {
  const d = new Date(iso);
  if (dayKey(d) === dayKey(new Date())) return "Hoy";
  if (dayKey(d) === dayKey(new Date(Date.now() - 86_400_000))) return "Ayer";
  return d.toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

export function EventList({
  events,
  names,
  grouped = false,
  compact = false,
  hideProject = false,
}: {
  events: PanelEvent[];
  /** slug → nombre, para linkear el proyecto de cada cambio. */
  names: Record<string, string>;
  grouped?: boolean;
  /** Sin el detalle de los cambios (para Inicio). */
  compact?: boolean;
  /** Dentro de un proyecto no hace falta repetir cuál. */
  hideProject?: boolean;
}) {
  if (!events.length) {
    return <Empty title="Todavía no pasó nada">Cada cambio que se haga en el panel queda anotado acá.</Empty>;
  }
  const row = (e: PanelEvent) => (
    <Row key={e.id} e={e} names={names} withTime={grouped} compact={compact} hideProject={hideProject} />
  );
  if (!grouped) return <ul className="divide-y divide-[var(--line)]">{events.map(row)}</ul>;

  const days: { label: string; items: PanelEvent[] }[] = [];
  for (const e of events) {
    const label = dayLabel(e.created_at);
    const last = days[days.length - 1];
    if (last?.label === label) last.items.push(e);
    else days.push({ label, items: [e] });
  }
  return (
    <div className="space-y-6">
      {days.map((d) => (
        <section key={d.label}>
          <h2 className="sticky top-14 z-10 mb-2 bg-[#08080a]/90 px-1 py-1 text-[12px] font-medium text-muted backdrop-blur first-letter:uppercase lg:top-0">
            {d.label} <span className="ml-1 font-mono text-[10.5px] text-muted/60">{d.items.length}</span>
          </h2>
          <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
            {d.items.map(row)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({
  e,
  names,
  withTime,
  compact,
  hideProject,
}: {
  e: PanelEvent;
  names: Record<string, string>;
  withTime?: boolean;
  compact?: boolean;
  hideProject?: boolean;
}) {
  const project = !hideProject && e.project_slug ? names[e.project_slug] ?? e.project_slug : null;
  return (
    <li className="flex gap-3 px-4 py-3">
      <span className="relative mt-0.5 h-fit">
        <Face who={e.actor} size={26} />
        <span className={cn("absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--panel)]", KIND_DOT[e.kind])} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-foreground/80">
          <span className="font-medium text-foreground">{e.actor ? PEOPLE[e.actor].name : "Alguien"}</span> {e.text}
          {project && e.project_slug && (
            <>
              {" en "}
              <Link
                href={`/admin/proyectos/${e.project_slug}`}
                className="focus-ring font-medium text-foreground underline decoration-white/20 underline-offset-4 hover:decoration-accent"
              >
                {project}
              </Link>
            </>
          )}
        </p>
        {!compact && e.changes.length > 0 && <Changes changes={e.changes} />}
        {e.thumbs.length > 0 && (
          <div className="mt-2 flex gap-1.5">
            {e.thumbs.map((src) => (
              // URL firmada de Supabase que cambia en cada carga: pasarla por
              // next/image gastaría una optimización nueva cada vez.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy" className="h-11 w-11 rounded-md border border-[var(--line)] object-cover" />
            ))}
            {e.paths.length > e.thumbs.length && (
              <span className="self-center pl-1 font-mono text-[11px] text-muted">+{e.paths.length - e.thumbs.length}</span>
            )}
          </div>
        )}
        <p className="mt-1 flex items-center gap-2 text-[11.5px] text-muted">
          <span>{KIND_LABEL[e.kind]}</span>
          <span className="text-muted/40">·</span>
          <time dateTime={e.created_at} title={new Date(e.created_at).toLocaleString("es-AR", { timeZone: TZ })}>
            {withTime ? timeLabel(e.created_at) : ago(e.created_at)}
          </time>
          {e.lead_id && (
            <>
              <span className="text-muted/40">·</span>
              <Link href={`/admin/pedidos?pedido=${e.lead_id}`} className="focus-ring hover:text-foreground">
                Ver pedido
              </Link>
            </>
          )}
        </p>
      </div>
    </li>
  );
}

export function Changes({ changes }: { changes: Change[] }) {
  return (
    <ul className="mt-2 space-y-1 rounded-lg border border-[var(--line)] bg-black/20 px-3 py-2">
      {changes.map((c, i) => (
        <li key={`${c.field}-${i}`} className="grid grid-cols-[minmax(0,110px)_minmax(0,1fr)] items-baseline gap-3 text-[12px]">
          <span className="truncate text-muted">{c.label}</span>
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
            <span className={cn("break-words", c.before ? "text-muted line-through decoration-white/25" : "text-muted/60 italic")}>
              {c.before ?? "vacío"}
            </span>
            <ArrowRight size={11} className="shrink-0 translate-y-px text-muted/60" />
            <span className={cn("break-words", c.after ? "text-foreground" : "text-muted/60 italic")}>{c.after ?? "vacío"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
