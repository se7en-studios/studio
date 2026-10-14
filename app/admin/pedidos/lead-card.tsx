"use client";

import { memo } from "react";
import { CalendarClock, Snowflake } from "lucide-react";
import { ago, headline, priority, tags } from "@/lib/admin/brief";
import type { Lead, LeadStatus } from "@/lib/admin/db";
import { bucket, dueLabel, type Task } from "@/lib/admin/task-shared";
import { Face, cn, usd } from "../kit";
import { COLUMNS, DRAG_TYPE, PRIORITY_DOT } from "./stages";

// memo: al escribir en la búsqueda o mover una tarjeta, las demás no se
// vuelven a dibujar.
export const LeadCard = memo(function LeadCard({
  lead,
  next: task,
  lastContact,
  cold,
  noStep,
  onOpen,
  onMove,
  onDragEnd,
}: {
  lead: Lead;
  next?: Task;
  lastContact?: string;
  cold: number | null;
  /** En curso y sin tarea de seguimiento abierta. */
  noStep: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, s: LeadStatus) => void;
  onDragEnd: () => void;
}) {
  const p = priority(lead);
  const idx = COLUMNS.findIndex((c) => c.id === lead.status);
  const next = lead.status === "perdido" || lead.status === "ganado" ? null : COLUMNS[idx + 1];
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, lead.id);
        e.dataTransfer.effectAllowed = "move";
        e.currentTarget.dataset.dragging = "";
      }}
      onDragEnd={(e) => {
        delete e.currentTarget.dataset.dragging;
        onDragEnd();
      }}
      className="group w-[268px] shrink-0 cursor-grab rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--shadow-card)] transition-[border-color,transform] hover:-translate-y-px [content-visibility:auto] [contain-intrinsic-size:auto_170px] hover:border-[var(--line-strong)] active:cursor-grabbing"
    >
      <button onClick={() => onOpen(lead.id)} className="focus-ring block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[13px] leading-snug font-medium">
            {lead.name}
            {lead.company && <span className="font-normal text-muted"> · {lead.company}</span>}
          </p>
          <span title={`Prioridad ${p}`} className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[p])}>
            <span className="sr-only">Prioridad {p}</span>
          </span>
        </div>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-foreground/75">{headline(lead.idea)}</p>
        {tags(lead).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags(lead).map((t) => (
              <span key={t} className="rounded bg-white/[0.05] px-1.5 py-px text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
        {task && <FollowUpBadge task={task} />}
        {noStep && (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] text-muted">
            <CalendarClock size={12} className="shrink-0" /> Sin próximo paso
          </span>
        )}
        {cold !== null ? (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-400/[0.07] px-2 py-1 text-[11px] text-amber-300">
            <Snowflake size={12} className="shrink-0" /> {lastContact ? `${cold} días sin contacto` : `Sin contacto en ${cold} días`}
          </span>
        ) : (
          lastContact && <span className="mt-2 block text-[11px] text-muted">Último contacto {ago(lastContact)}</span>
        )}
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
          <Face who={lead.owner} size={18} />
          {lead.value != null ? <span className="truncate text-foreground/85">{usd(lead.value)}</span> : <span>{ago(lead.created_at)}</span>}
        </span>
        {next && (
          <button
            onClick={() => onMove(lead.id, next.id)}
            title={`Mover a ${next.label}`}
            className="focus-ring shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-accent/10 hover:text-accent focus-visible:opacity-100"
          >
            {next.label} →
          </button>
        )}
      </div>
    </article>
  );
});

/** En la tarjeta: el próximo seguimiento y para cuándo. */
function FollowUpBadge({ task }: { task: Task }) {
  const b = bucket(task);
  const tone = b === "vencidas" ? "bg-red-500/[0.08] text-red-300" : b === "hoy" ? "bg-accent/[0.08] text-accent" : "bg-white/[0.04] text-muted";
  return (
    <span className={cn("mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]", tone)}>
      <CalendarClock size={12} className="shrink-0" />
      <span className="truncate">{task.title}</span>
      {task.due && <span className="ml-auto shrink-0">{dueLabel(task.due)}</span>}
    </span>
  );
}
