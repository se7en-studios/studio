"use client";

import { useState, useSyncExternalStore } from "react";
import { Check } from "lucide-react";

const noop = () => () => {};

/** Lee el valor real de una variable de globals.css: si cambia el CSS, cambia acá. */
function useCssVar(name: string) {
  return useSyncExternalStore(
    noop,
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
    () => "",
  );
}

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  return {
    copied,
    copy(text: string) {
      navigator.clipboard?.writeText(text).then(
        () => {
          setCopied(text);
          window.setTimeout(() => setCopied(null), 1600);
        },
        () => {},
      );
    },
  };
}

export function ColorToken({ name, label, note }: { name: string; label: string; note: string }) {
  const value = useCssVar(name);
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => value && copy(value)}
      className="focus-ring group overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] text-left transition-colors hover:border-foreground/20"
    >
      <span className="block h-20 border-b border-border" style={{ background: `var(${name})` }} />
      <span className="block p-3">
        <span className="block text-sm text-foreground">{label}</span>
        <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[11px] text-muted">
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" /> <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            value || "…"
          )}
        </span>
        <span className="mt-1 block font-mono text-[10px] text-muted/70">{name}</span>
        <span className="mt-2 block text-xs leading-snug text-muted">{note}</span>
      </span>
    </button>
  );
}

export function MotionToken({ name, note }: { name: string; note: string }) {
  const value = useCssVar(name);
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <span>
        <span className="font-mono text-xs text-foreground">{name}</span>
        <span className="ml-2 text-xs text-muted">{note}</span>
      </span>
      <span className="shrink-0 font-mono text-xs text-muted">{value || "…"}</span>
    </li>
  );
}

export function AccentChip({ name, color }: { name: string; color: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(color)}
      className="focus-ring flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-sm transition-colors hover:border-foreground/20"
    >
      <span className="h-5 w-5 shrink-0 rounded-md" style={{ background: color }} />
      <span className="truncate text-foreground">{name}</span>
      <span className={`ml-auto font-mono text-[11px] ${copied ? "text-emerald-400" : "text-muted"}`}>{copied ? "Copiado" : color}</span>
    </button>
  );
}
