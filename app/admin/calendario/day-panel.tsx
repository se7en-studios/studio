"use client";

// Detalle de un día del calendario: lo que hay (posts, tareas, entregas) y el
// alta rápida de tareas con esa fecha. Lo comparten el panel lateral y la agenda.
import Link from "next/link";
import { Check } from "lucide-react";
import type { CalEvent } from "@/lib/admin/calendar-shared";
import { KIND_LABEL, type ContentKind } from "@/lib/admin/content-shared";
import type { LeadOwner } from "@/lib/admin/db";
import type { TaskPriority } from "@/lib/admin/task-shared";
import { Face, cn } from "../kit";

export const KIND_STYLE: Record<ContentKind, string> = {
  reel: "bg-[#ff6a4a]/15 text-[#ff6a4a]",
  carrusel: "bg-emerald-400/15 text-emerald-400",
  historias: "bg-violet-300/15 text-violet-300",
  perfil: "bg-white/[0.08] text-muted",
};

export const PRIORITY_DOT: Record<TaskPriority, string> = {
  alta: "bg-red-400",
  media: "bg-amber-300",
  baja: "bg-zinc-500",
};

/** Color de un evento: por tipo de post, neutro para tareas y el acento del proyecto para entregas. */
export function eventStyle(e: CalEvent): {
  className: string;
  style?: React.CSSProperties;
} {
  if (e.type === "post" && e.kind) return { className: KIND_STYLE[e.kind] };
  if (e.type === "entrega" && e.accent)
    return {
      className: "",
      style: { backgroundColor: `${e.accent}26`, color: e.accent },
    };
  return { className: "bg-white/[0.07] text-foreground" };
}

export type DayActions = {
  projectName: (slug: string | null) => string | null;
  onToggleTask: (id: string, done: boolean) => void;
  onOpenTask: (id: string) => void;
  onTogglePost: (id: string, done: boolean) => void;
};

const SECTIONS = [
  { type: "post", label: "Posts de Instagram" },
  { type: "task", label: "Tareas" },
  { type: "entrega", label: "Entregas de proyectos" },
] as const;

export function DayEvents({
  events,
  actions,
}: {
  events: CalEvent[];
  actions: DayActions;
}) {
  return (
    <div className="space-y-4">
      {SECTIONS.map((s) => {
        const rows = events.filter((e) => e.type === s.type);
        if (!rows.length) return null;
        return (
          <section key={s.type}>
            <h3 className="mb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
              {s.label}
            </h3>
            <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-[var(--line)]">
              {rows.map((e) => (
                <li key={e.key}>
                  <EventRow e={e} actions={actions} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function ToggleButton({
  done,
  label,
  onClick,
}: {
  done: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={label}
      className={cn(
        "focus-ring flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
        done
          ? "border-emerald-400/60 bg-emerald-400/20 text-emerald-300"
          : "border-[var(--line-strong)] text-transparent hover:text-muted",
      )}
    >
      <Check size={12} />
    </button>
  );
}

function EventRow({ e, actions }: { e: CalEvent; actions: DayActions }) {
  const project = actions.projectName(e.project);
  const title = (
    <span
      className={cn(
        "truncate text-[13px] font-medium",
        e.done && "text-muted line-through",
      )}
    >
      {e.title}
    </span>
  );

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {e.type === "task" && (
        <ToggleButton
          done={e.done}
          label={`Marcar «${e.title}» como hecha`}
          onClick={() => actions.onToggleTask(e.id, !e.done)}
        />
      )}
      {e.type === "post" && (
        <ToggleButton
          done={e.done}
          label={`Marcar «${e.title}» como publicado`}
          onClick={() => actions.onTogglePost(e.id, !e.done)}
        />
      )}
      {e.type === "entrega" && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: e.accent }}
        />
      )}

      <div className="min-w-0 flex-1">
        {e.type === "task" ? (
          <button
            type="button"
            onClick={() => actions.onOpenTask(e.id)}
            className="focus-ring block max-w-full text-left"
          >
            {title}
          </button>
        ) : (
          <Link
            href={
              e.type === "post"
                ? "/admin/contenido"
                : `/admin/proyectos/${e.project}`
            }
            className="focus-ring block max-w-full"
          >
            {title}
          </Link>
        )}
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] text-muted">
          {e.type === "task" && e.priority && (
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                PRIORITY_DOT[e.priority],
              )}
            />
          )}
          {e.type === "post" && e.kind && (
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px]",
                KIND_STYLE[e.kind],
              )}
            >
              {KIND_LABEL[e.kind]}
            </span>
          )}
          {e.type === "post" && <span>19 h</span>}
          {e.type === "entrega" && (
            <span>{e.done ? "Entregado" : "Fecha de entrega"}</span>
          )}
          {project && <span className="truncate">{project}</span>}
        </p>
      </div>

      {(e.type === "task" || e.type === "entrega") && (
        <OwnerFace who={e.owner} />
      )}
    </div>
  );
}

function OwnerFace({ who }: { who: LeadOwner | null }) {
  return who ? <Face who={who} size={22} /> : null;
}
