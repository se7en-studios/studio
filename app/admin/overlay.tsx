"use client";

// Panel lateral, diálogo y aviso del panel. Entran con keyframes de CSS (ver
// .admin-drawer en globals.css): sin framer-motion, sin layout por cuadro.
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertCircle, Check, X } from "lucide-react";
import { cn } from "./kit";

// Pila de capas abiertas: Escape cierra sólo la de arriba (una tarea abierta
// desde la ficha de un pedido, por ejemplo).
const stack: object[] = [];

function useEscape(onClose: () => void) {
  const ref = useRef(onClose);
  useEffect(() => {
    ref.current = onClose;
  });
  useEffect(() => {
    const me = {};
    stack.push(me);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && stack[stack.length - 1] === me) {
        e.stopPropagation();
        ref.current();
      }
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      stack.splice(stack.indexOf(me), 1);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);
}

export function Drawer({
  onClose,
  label,
  children,
  width = "max-w-xl",
  header,
}: {
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  width?: string;
  /** Va fijo arriba; el resto scrollea. */
  header?: React.ReactNode;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button aria-label="Cerrar" onClick={onClose} className="admin-overlay absolute inset-0 bg-black/55" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "admin-drawer relative flex h-full w-full flex-col border-l border-[var(--line-strong)] bg-[var(--panel)] shadow-[-30px_0_80px_-20px_rgba(0,0,0,0.7)]",
          width,
        )}
      >
        <div className="flex items-start gap-3 border-b border-[var(--line)] px-5 py-4">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="focus-ring -mr-1 rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>
        <div className="admin-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </aside>
    </div>
  );
}

export function Dialog({
  onClose,
  label,
  children,
  width = "max-w-lg",
}: {
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  width?: string;
}) {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 md:items-start md:p-4 md:pt-[12vh]">
      <button aria-label="Cerrar" onClick={onClose} className="admin-overlay absolute inset-0 bg-black/60" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cn(
          "admin-pop relative max-h-[92dvh] w-full overflow-hidden rounded-t-2xl border border-[var(--line-strong)] bg-[var(--panel)] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] md:rounded-2xl",
          width,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Una preferencia de este navegador (por ejemplo, ver los pedidos en lista).
 * Si el navegador no deja guardar, igual cambia mientras dure la pestaña.
 */
export function useStoredChoice<T extends string>(key: string, fallback: T, allowed: readonly T[]): [T, (v: T) => void] {
  const [local, setLocal] = useState<T | null>(null);
  const stored = useSyncExternalStore(
    subscribePrefs,
    () => {
      try {
        const v = localStorage.getItem(key) as T | null;
        return v && allowed.includes(v) ? v : fallback;
      } catch {
        return fallback;
      }
    },
    () => fallback,
  );
  const set = useCallback(
    (v: T) => {
      setLocal(v);
      try {
        localStorage.setItem(key, v);
      } catch {}
    },
    [key],
  );
  return [local ?? stored, set];
}

function subscribePrefs(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

/** Avisos que se van solos, para todo el panel. Un error se distingue y dura más. */
export type ToastTone = "info" | "ok" | "error";
export type Flash = (msg: string, tone?: ToastTone) => void;
const ToastCtx = createContext<Flash>(() => {});

const TOAST_MS: Record<ToastTone, number> = { info: 2800, ok: 2400, error: 6000 };
const TOAST_STYLE: Record<ToastTone, { box: string; icon: React.ReactNode }> = {
  info: { box: "border-[var(--line-strong)]", icon: null },
  ok: { box: "border-emerald-400/30", icon: <Check size={14} className="text-emerald-400" /> },
  error: { box: "border-red-500/40", icon: <AlertCircle size={14} className="text-red-400" /> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; tone: ToastTone; id: number } | null>(null);
  const flash = useCallback<Flash>((msg, tone = "info") => {
    const id = Date.now();
    setToast({ msg, tone, id });
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), TOAST_MS[tone]);
  }, []);
  const style = toast ? TOAST_STYLE[toast.tone] : null;
  return (
    <ToastCtx.Provider value={flash}>
      {children}
      {toast && style && (
        <p
          key={toast.id}
          role={toast.tone === "error" ? "alert" : "status"}
          className={`admin-pop fixed bottom-5 left-1/2 z-[90] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-lg border bg-[var(--panel-3)] px-3.5 py-2 text-[13px] text-foreground shadow-[0_20px_50px_-10px_rgba(0,0,0,0.7)] ${style.box}`}
        >
          {style.icon}
          {toast.msg}
        </p>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
