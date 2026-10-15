"use client";

// Horas livianas: el cronómetro de un proyecto o de un pedido de mantenimiento,
// la carga a mano de un tramo y la lista para editar o borrar los propios.
// Uno corriendo por persona: prender otro frena el anterior (lo hace el
// servidor) y el evento TIMER_EVENT avisa a los demás cronómetros de la página
// y al indicador del menú.
import { useEffect, useState, useTransition } from "react";
import { Pencil, Play, Plus, Square, Timer, Trash2, X } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { durationLabel } from "@/lib/admin/maintenance-shared";
import { PEOPLE } from "@/lib/admin/people";
import {
  TIMER_EVENT,
  clock,
  entryDay,
  entryMinutes,
  type TimeEntry,
  type TimerEventDetail,
} from "@/lib/admin/time-shared";
import { Card, btnGhost, btnPrimary, btnSecondary, cn, input } from "../kit";
import { useToast } from "../overlay";
import {
  addManualAction,
  deleteAction,
  editAction,
  startAction,
  stopAction,
} from "./actions";

/** Avisa a los otros cronómetros y al indicador del menú. */
export function announce(detail: TimerEventDetail) {
  window.dispatchEvent(
    new CustomEvent<TimerEventDetail>(TIMER_EVENT, { detail }),
  );
}

const small = cn(input, "w-auto px-2 py-1 text-[12px]");
const shortDate = (d: string) =>
  new Date(`${d}T12:00:00`)
    .toLocaleDateString("es-AR", { day: "numeric", month: "short" })
    .replace(/\./g, "");

type Props = {
  slug: string;
  /** Si es de un pedido de mantenimiento. */
  requestId?: string | null;
  initial: TimeEntry[];
  me: LeadOwner;
  today: string;
  /** Minutos cargados a mano antes del cronómetro (pedidos viejos). */
  legacy?: number;
  /** En una fila de la cola: botón y total, con los tramos en un desplegable. */
  compact?: boolean;
};

export function Hours({
  slug,
  requestId = null,
  initial,
  me,
  today,
  legacy = 0,
  compact = false,
}: Props) {
  const flash = useToast();
  const [entries, setEntries] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const running = entries.find((e) => e.who === me && !e.ended_at);

  // Lo que pasa en los otros cronómetros (o en el indicador del menú).
  useEffect(() => {
    const on = (ev: Event) => {
      const { running: r, stopped } = (ev as CustomEvent<TimerEventDetail>)
        .detail;
      setEntries((xs) => {
        let out = stopped
          ? xs.map((x) => (x.id === stopped.id ? stopped : x))
          : xs;
        const mine =
          r &&
          r.project_slug === slug &&
          (!requestId || r.maintenance_request_id === requestId);
        if (r && mine && !out.some((x) => x.id === r.id)) out = [r, ...out];
        return out;
      });
      setNow(Date.now());
    };
    window.addEventListener(TIMER_EVENT, on);
    return () => window.removeEventListener(TIMER_EVENT, on);
  }, [slug, requestId]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const total = legacy + entries.reduce((s, e) => s + entryMinutes(e, now), 0);

  function toggle() {
    start(async () => {
      if (running) {
        const res = await stopAction();
        if (res.error) return flash(res.error, "error");
        announce({ running: null, stopped: res.stopped ?? null });
      } else {
        const res = await startAction(slug, requestId);
        if (res.error || !res.running)
          return flash(res.error ?? "No se pudo prender", "error");
        announce({ running: res.running, stopped: res.stopped ?? null });
      }
    });
  }

  const button = (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={Boolean(running)}
      aria-label={running ? "Frenar el cronómetro" : "Prender el cronómetro"}
      className={cn(
        running ? btnPrimary : btnSecondary,
        compact && "px-2 py-1 text-[12px]",
      )}
    >
      {running ? <Square size={12} /> : <Play size={12} />}
      <span className="font-mono tabular-nums">
        {running
          ? clock(now - Date.parse(running.started_at))
          : compact
            ? durationLabel(total)
            : "Empezar"}
      </span>
    </button>
  );

  const log = (
    <Log
      entries={entries.filter((e) => e.ended_at)}
      me={me}
      today={today}
      legacy={legacy}
      onAdd={async (v) => {
        const res = await addManualAction(slug, requestId, v);
        if (res.error || !res.entry) return res.error ?? "No se pudo cargar";
        const entry = res.entry;
        setEntries((xs) => [entry, ...xs]);
      }}
      onEdit={async (id, v) => {
        const res = await editAction(id, v);
        if (res.error || !res.entry) return res.error ?? "No se pudo guardar";
        const entry = res.entry;
        setEntries((xs) => xs.map((x) => (x.id === id ? entry : x)));
      }}
      onDelete={async (id) => {
        const res = await deleteAction(id);
        if (res.error) return res.error;
        setEntries((xs) => xs.filter((x) => x.id !== id));
      }}
    />
  );

  // En la fila de la cola: el desplegable va en su propia línea (la Card corta lo que sobresale).
  if (compact)
    return (
      <>
        {button}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label="Ver y cargar tramos"
          className={cn(btnGhost, "px-1.5 py-1")}
        >
          <Timer size={13} />
        </button>
        {open && (
          <div className="basis-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel-2)] md:w-[360px] md:basis-auto">
            <p className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2 text-[12px] text-muted">
              <span>
                Total:{" "}
                <span className="font-mono text-foreground tabular-nums">
                  {durationLabel(total)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={cn(btnGhost, "px-1 py-0.5")}
                aria-label="Cerrar"
              >
                <X size={12} />
              </button>
            </p>
            {log}
          </div>
        )}
      </>
    );

  return (
    <Card
      title="Horas"
      icon={<Timer size={14} />}
      action={
        <span className="font-mono text-[12px] text-muted tabular-nums">
          {durationLabel(total)}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-4 py-3">
        {button}
        <p className="text-[12px] text-muted">
          {running
            ? "Corriendo. Si prendés otro, este se frena solo."
            : "Un cronómetro por persona. Lo que trabajaste sin él, cargalo abajo."}
        </p>
      </div>
      {log}
    </Card>
  );
}

type Draft = { day: string; minutes: string; note: string };

function Log({
  entries,
  me,
  today,
  legacy,
  onAdd,
  onEdit,
  onDelete,
}: {
  entries: TimeEntry[];
  me: LeadOwner;
  today: string;
  legacy: number;
  /** Devuelven el error, o nada si salió bien. */
  onAdd: (v: Draft) => Promise<string | void>;
  onEdit: (id: string, v: Draft) => Promise<string | void>;
  onDelete: (id: string) => Promise<string | void>;
}) {
  const flash = useToast();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft>({
    day: today,
    minutes: "",
    note: "",
  });
  const [editing, setEditing] = useState<{ id: string } & Draft>();
  const [all, setAll] = useState(false);
  const sorted = [...entries].sort((a, b) =>
    b.started_at.localeCompare(a.started_at),
  );
  const shown = all ? sorted : sorted.slice(0, 8);

  const run = (p: Promise<string | void>, ok?: () => void) =>
    start(async () => {
      const err = await p;
      if (err) flash(err, "error");
      else ok?.();
    });

  const fields = (d: Draft, set: (d: Draft) => void) => (
    <>
      <input
        type="date"
        required
        max={today}
        value={d.day}
        onChange={(e) => set({ ...d, day: e.target.value })}
        aria-label="Fecha"
        className={cn(small, "[color-scheme:dark]")}
      />
      <input
        type="number"
        required
        min={1}
        max={1440}
        step={5}
        value={d.minutes}
        onChange={(e) => set({ ...d, minutes: e.target.value })}
        placeholder="min"
        aria-label="Minutos"
        className={cn(small, "w-[72px]")}
      />
      <input
        value={d.note}
        maxLength={500}
        onChange={(e) => set({ ...d, note: e.target.value })}
        placeholder="Qué hiciste (opcional)"
        aria-label="Nota"
        className={cn(small, "min-w-[120px] flex-1")}
      />
    </>
  );

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(onAdd(draft), () =>
            setDraft({ ...draft, minutes: "", note: "" }),
          );
        }}
        className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] px-3 py-2.5"
      >
        {fields(draft, setDraft)}
        <button
          type="submit"
          disabled={pending || !draft.minutes}
          className={cn(btnSecondary, "px-2 py-1 text-[12px]")}
        >
          <Plus size={12} /> Cargar
        </button>
      </form>
      {shown.length || legacy ? (
        <ul className="divide-y divide-[var(--line)] text-[12px]">
          {shown.map((e) =>
            editing?.id === e.id ? (
              <li key={e.id}>
                <form
                  onSubmit={(ev) => {
                    ev.preventDefault();
                    run(onEdit(e.id, editing), () => setEditing(undefined));
                  }}
                  className="flex flex-wrap items-center gap-1.5 px-3 py-2"
                >
                  {fields(editing, (d) => setEditing({ ...d, id: e.id }))}
                  <button
                    type="submit"
                    disabled={pending}
                    className={cn(btnPrimary, "px-2 py-1 text-[12px]")}
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(undefined)}
                    className={cn(btnGhost, "px-2 py-1 text-[12px]")}
                  >
                    Cancelar
                  </button>
                </form>
              </li>
            ) : (
              <li key={e.id} className="flex items-center gap-2 px-3 py-2">
                <span className="w-12 shrink-0 text-muted">
                  {shortDate(entryDay(e))}
                </span>
                <span className="w-16 shrink-0 font-mono text-foreground tabular-nums">
                  {durationLabel(e.minutes ?? 0)}
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-muted"
                  title={e.note || undefined}
                >
                  {PEOPLE[e.who]?.name ?? e.who}
                  {e.note && ` · ${e.note}`}
                </span>
                {e.who === me && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: e.id,
                          day: entryDay(e),
                          minutes: String(e.minutes ?? ""),
                          note: e.note,
                        })
                      }
                      className={cn(btnGhost, "px-1 py-0.5")}
                      aria-label="Editar tramo"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirm("¿Borrar este tramo?") && run(onDelete(e.id))
                      }
                      className={cn(btnGhost, "px-1 py-0.5")}
                      aria-label="Borrar tramo"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </li>
            ),
          )}
          {legacy > 0 && (
            <li className="px-3 py-2 text-muted">
              + {durationLabel(legacy)} cargados a mano antes del cronómetro
            </li>
          )}
        </ul>
      ) : (
        <p className="px-3 py-3 text-[12px] text-muted">
          Todavía no hay horas cargadas.
        </p>
      )}
      {sorted.length > shown.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className={cn(btnGhost, "m-1.5 text-[12px]")}
        >
          Ver los {sorted.length} tramos
        </button>
      )}
    </div>
  );
}
