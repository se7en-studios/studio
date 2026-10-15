"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "../../kit";
import { shareFile } from "../../portal-actions";

/** «Lo ve el cliente»: privado por defecto, se marca uno por uno. Optimista: si falla, vuelve atrás. */
export function ShareToggle({ id, initial }: { id: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  function toggle() {
    const next = !on;
    setOn(next);
    start(async () => {
      const r = await shareFile(id, next);
      if (r.error) {
        setOn(!next);
        setError(r.error);
      } else setError(null);
    });
  }
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={on}
        className={cn(
          "focus-ring mt-1.5 inline-flex items-center gap-1 text-[11px]",
          on ? "text-emerald-300" : "text-muted hover:text-foreground",
        )}
      >
        {on ? <Eye size={12} /> : <EyeOff size={12} />}
        {on ? "Lo ve el cliente" : "Privado"}
      </button>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </>
  );
}
