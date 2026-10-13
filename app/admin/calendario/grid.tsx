"use client";

// Grilla del mes. Cada día muestra hasta tres eventos; las tareas se arrastran
// de un día a otro para cambiarles la fecha.
import {
  WEEKDAYS,
  dayNumber,
  isTaskLike,
  monthGrid,
  monthOf,
  type CalEvent,
} from "@/lib/admin/calendar-shared";
import { cn } from "../kit";
import { PRIORITY_DOT, eventStyle } from "./day-panel";

const MAX_CHIPS = 3;
export const TASK_MIME = "text/task-id";

/** Una tarea recién creada todavía no tiene id real: no se puede arrastrar hasta que se guarde. */
export const canDrag = (e: CalEvent) =>
  isTaskLike(e) && !e.id.startsWith("tmp-");

export function EventChip({
  e,
  onClick,
}: {
  e: CalEvent;
  onClick: () => void;
}) {
  const { className, style } = eventStyle(e);
  return (
    <button
      type="button"
      onClick={onClick}
      draggable={canDrag(e)}
      onDragStart={(ev) => {
        ev.dataTransfer.setData(TASK_MIME, e.id);
        ev.dataTransfer.effectAllowed = "move";
      }}
      title={e.title}
      className={cn(
        "focus-ring flex w-full items-center gap-1 truncate rounded-md px-1.5 py-[3px] text-left text-[11px] leading-tight font-medium",
        className,
        e.done && "line-through opacity-50",
        canDrag(e) && "cursor-grab active:cursor-grabbing",
      )}
      style={style}
    >
      {isTaskLike(e) && e.priority && (
        <span
          className={cn(
            "h-1.5 w-1.5 shrink-0 rounded-full",
            PRIORITY_DOT[e.priority],
          )}
        />
      )}
      <span className="truncate">{e.title}</span>
    </button>
  );
}

export function MonthGrid({
  ym,
  today,
  selected,
  byDay,
  onSelect,
  onDropTask,
}: {
  ym: string;
  today: string;
  selected: string;
  byDay: Map<string, CalEvent[]>;
  onSelect: (day: string) => void;
  onDropTask: (taskId: string, day: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow-card)]">
      <div className="grid grid-cols-7 border-b border-[var(--line)] bg-white/[0.012] text-center text-[11px] font-medium tracking-wide text-muted uppercase">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {monthGrid(ym).map((day) => {
          const events = byDay.get(day) ?? [];
          const inMonth = monthOf(day) === ym;
          return (
            <div
              key={day}
              onDragOver={(ev) => ev.preventDefault()}
              onDrop={(ev) => {
                const id = ev.dataTransfer.getData(TASK_MIME);
                if (id) onDropTask(id, day);
              }}
              className={cn(
                "min-h-[104px] space-y-1 border-r border-b border-[var(--line)] p-1.5 transition-colors hover:bg-white/[0.02] [&:nth-child(7n)]:border-r-0",
                !inMonth && "bg-black/20",
                day === today && day !== selected && "bg-accent/[0.035]",
                day === selected &&
                  "bg-accent/[0.06] ring-1 ring-accent/50 ring-inset",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(day)}
                aria-label={`Ver el ${day}`}
                aria-current={day === today ? "date" : undefined}
                className={cn(
                  "focus-ring flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] tabular-nums",
                  day === today
                    ? "bg-accent font-semibold text-background"
                    : inMonth
                      ? "text-foreground"
                      : "text-muted",
                )}
              >
                {dayNumber(day)}
              </button>
              <ul className="space-y-0.5">
                {events.slice(0, MAX_CHIPS).map((e) => (
                  <li key={e.key}>
                    <EventChip e={e} onClick={() => onSelect(day)} />
                  </li>
                ))}
              </ul>
              {events.length > MAX_CHIPS && (
                <button
                  type="button"
                  onClick={() => onSelect(day)}
                  className="focus-ring px-1.5 text-[11px] text-muted hover:text-foreground"
                >
                  +{events.length - MAX_CHIPS} más
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
