"use client";

// Indicador chico del cronómetro que tengo corriendo: dónde, cuánto va y un
// botón para frenarlo. Va en el marco del panel (shell.tsx). Se actualiza al
// entrar, al volver a la pestaña y cuando otro cronómetro avisa (TIMER_EVENT).
// Sin time.sql o sin cronómetro, no muestra nada.
import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Square } from "lucide-react";
import {
  TIMER_EVENT,
  clock,
  type TimeEntry,
  type TimerEventDetail,
} from "@/lib/admin/time-shared";
import { cn } from "../kit";
import { useToast } from "../overlay";
import { myRunning, stopAction } from "./actions";
import { announce } from "./timer";

export function RunningTimer({ className }: { className?: string }) {
  const flash = useToast();
  const [run, setRun] = useState<{ entry: TimeEntry; name: string } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    const load = () =>
      myRunning().then((r) => {
        if (alive)
          setRun(
            r.running
              ? { entry: r.running, name: r.name ?? r.running.project_slug }
              : null,
          );
      });
    const onVisible = () => document.visibilityState === "visible" && load();
    const onTimer = (ev: Event) => {
      const { running } = (ev as CustomEvent<TimerEventDetail>).detail;
      // El nombre del proyecto lo trae el servidor.
      if (running) load();
      else setRun(null);
    };
    load();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(TIMER_EVENT, onTimer);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(TIMER_EVENT, onTimer);
    };
  }, []);

  useEffect(() => {
    if (!run) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [run]);

  if (!run) return null;

  function stop() {
    start(async () => {
      const res = await stopAction();
      if (res.error) return flash(res.error, "error");
      announce({ running: null, stopped: res.stopped ?? null });
    });
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--line-strong)] bg-white/[0.03] py-1 pr-1 pl-2 text-[12px]",
        className,
      )}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-400"
        aria-hidden
      />
      <Link
        href={`/admin/proyectos/${run.entry.project_slug}`}
        className="focus-ring min-w-0 truncate text-muted hover:text-foreground"
        title="Cronómetro corriendo"
      >
        {run.name}
      </Link>
      <span className="font-mono text-foreground tabular-nums">
        {clock(now - Date.parse(run.entry.started_at))}
      </span>
      <button
        type="button"
        onClick={stop}
        disabled={pending}
        aria-label="Frenar el cronómetro"
        className="focus-ring rounded-md p-1 text-muted hover:bg-white/[0.06] hover:text-foreground"
      >
        <Square size={11} />
      </button>
    </span>
  );
}
