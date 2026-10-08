// Lista de cambios del panel, agrupada por día. Componente de servidor.
import Link from "next/link";
import { ago } from "@/lib/admin/brief";
import type { EventKind, PanelEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { Avatar, dayLabel, timeLabel } from "./ui";

export const KIND_LABEL: Record<EventKind, string> = {
  archivos: "Archivos",
  proyecto: "Proyectos",
  pedido: "Pedidos",
  tarea: "Tareas",
};

export function EventList({
  events,
  names,
  grouped = false,
}: {
  events: PanelEvent[];
  /** slug → nombre, para linkear el proyecto de cada cambio. */
  names: Record<string, string>;
  grouped?: boolean;
}) {
  if (!events.length) {
    return <p className="px-4 py-8 text-center text-sm text-muted">Todavía no pasó nada. Subí un archivo y aparece acá.</p>;
  }
  if (!grouped) return <ul>{events.map((e) => <Row key={e.id} e={e} names={names} />)}</ul>;

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
          <h2 className="mb-2 px-1 font-mono text-[11px] tracking-widest text-muted uppercase first-letter:uppercase">{d.label}</h2>
          <ul className="rounded-2xl border border-border bg-surface/50">
            {d.items.map((e) => (
              <Row key={e.id} e={e} names={names} withTime />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ e, names, withTime }: { e: PanelEvent; names: Record<string, string>; withTime?: boolean }) {
  const project = e.project_slug ? names[e.project_slug] ?? e.project_slug : null;
  return (
    <li className="flex gap-3 border-b border-border px-4 py-3.5 last:border-0">
      <Avatar who={e.actor} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-foreground/85">
          <span className="font-medium text-foreground">{e.actor ? PEOPLE[e.actor].name : "Alguien"}</span> {e.text}
          {project && e.project_slug && (
            <>
              {" en "}
              <Link href={`/admin/proyectos/${e.project_slug}`} className="focus-ring text-foreground underline decoration-border underline-offset-4 hover:decoration-accent">
                {project}
              </Link>
            </>
          )}
        </p>
        {e.thumbs.length > 0 && (
          <div className="mt-2.5 flex gap-1.5">
            {e.thumbs.map((src) => (
              // URL firmada de Supabase que cambia en cada carga: pasarla por
              // next/image gastaría una optimización nueva cada vez.
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy" className="h-12 w-12 rounded-md border border-border object-cover" />
            ))}
            {e.paths.length > e.thumbs.length && (
              <span className="self-center pl-1 font-mono text-[11px] text-muted">+{e.paths.length - e.thumbs.length}</span>
            )}
          </div>
        )}
        <p className="mt-1.5 font-mono text-[10px] tracking-widest text-muted uppercase">
          {KIND_LABEL[e.kind]} · {withTime ? timeLabel(e.created_at) : ago(e.created_at)}
        </p>
      </div>
    </li>
  );
}
