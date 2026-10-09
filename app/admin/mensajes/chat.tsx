"use client";

// Una conversación del equipo: la general, la de un proyecto o la de un pedido.
// Se lee de /admin/api/messages cada pocos segundos mientras la pestaña está a
// la vista (un route handler, no una acción: las acciones van en fila y el
// polling trabaría el resto del panel). Mandar es optimista.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Check, MessagesSquare, Pencil, Trash2, X } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { MESSAGE_MAX, type Message } from "@/lib/admin/message-shared";
import { Empty, Face, cn } from "../kit";
import { useToast } from "../overlay";
import { usePulse } from "../shell";
import { deleteMessage, sendMessage, updateMessage } from "./actions";

const POLL_MS = 4000;
const TZ = "America/Argentina/Buenos_Aires";
/** Mensajes seguidos del mismo autor dentro de este rango van en un solo bloque. */
const GROUP_MS = 5 * 60_000;

const dayKey = (iso: string) => new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
const time = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
function dayTitle(iso: string) {
  const k = dayKey(iso);
  if (k === dayKey(new Date().toISOString())) return "Hoy";
  if (k === dayKey(new Date(Date.now() - 86_400_000).toISOString())) return "Ayer";
  return new Date(iso).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });
}

const signature = (ms: Message[]) => ms.map((m) => `${m.id}:${m.edited_at ?? ""}`).join("|");

export function Chat({
  channel,
  me,
  initial,
  placeholder = "Escribí un mensaje…",
  className,
  onActivity,
}: {
  channel: string;
  me: LeadOwner;
  /** Si la página ya los trajo, no hace falta esperar el primer pedido. */
  initial?: Message[];
  placeholder?: string;
  className?: string;
  /** Avisa el último mensaje (para la lista de conversaciones). */
  onActivity?: (last: Message | null) => void;
}) {
  const flash = useToast();
  const { refresh: refreshPulse } = usePulse();
  const [messages, setMessages] = useState<Message[] | null>(initial ?? null);
  const [notReady, setNotReady] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const sig = useRef(initial ? signature(initial) : "");
  const pendingSends = useRef(0);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/admin/api/messages?channel=${encodeURIComponent(channel)}&read=1`, { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) {
        if (data?.notReady) setNotReady(data.error);
        return;
      }
      // Mientras se manda algo, no pisar el mensaje optimista con una lectura vieja.
      if (pendingSends.current > 0) return;
      const next = data.messages as Message[];
      const s = signature(next);
      if (s !== sig.current) {
        sig.current = s;
        setMessages(next);
      } else setMessages((m) => m ?? next);
    } catch {
      /* sin conexión: el próximo intento lo resuelve */
    }
  }, [channel]);

  useEffect(() => {
    // Primera lectura en el próximo tick, igual que las siguientes.
    const first = window.setTimeout(() => load().then(refreshPulse), 0);
    const tick = () => document.visibilityState === "visible" && load();
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load, refreshPulse]);

  const last = messages?.[messages.length - 1] ?? null;
  useEffect(() => {
    onActivity?.(last);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [last?.id, last?.edited_at]);

  // Abajo de todo al llegar algo nuevo, salvo que se esté leyendo más arriba.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    const now = new Date().toISOString();
    const temp: Message = { id: `tmp-${now}`, created_at: now, edited_at: null, channel, author: me, body };
    setDraft("");
    stick.current = true;
    setMessages((m) => [...(m ?? []), temp]);
    pendingSends.current++;
    startTransition(async () => {
      try {
        const saved = await sendMessage(channel, body);
        setMessages((m) => (m ?? []).map((x) => (x.id === temp.id ? saved : x)));
      } catch (e) {
        setMessages((m) => (m ?? []).filter((x) => x.id !== temp.id));
        setDraft(body);
        flash(e instanceof Error ? e.message : "No se pudo mandar");
      } finally {
        pendingSends.current--;
      }
    });
  }

  function saveEdit(id: string, body: string) {
    setEditing(null);
    const before = messages;
    setMessages((m) => (m ?? []).map((x) => (x.id === id ? { ...x, body, edited_at: new Date().toISOString() } : x)));
    startTransition(async () => {
      try {
        const saved = await updateMessage(id, body);
        setMessages((m) => (m ?? []).map((x) => (x.id === id ? saved : x)));
      } catch (e) {
        setMessages(before);
        flash(e instanceof Error ? e.message : "No se pudo editar");
      }
    });
  }

  function remove(id: string) {
    const before = messages;
    setMessages((m) => (m ?? []).filter((x) => x.id !== id));
    startTransition(async () => {
      try {
        await deleteMessage(id);
      } catch (e) {
        setMessages(before);
        flash(e instanceof Error ? e.message : "No se pudo borrar");
      }
    });
  }

  if (notReady) {
    return (
      <div className={cn("flex items-center justify-center p-6 text-center text-[13px] text-amber-300", className)}>
        {notReady}
      </div>
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="admin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {messages === null ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="admin-skeleton h-7 w-7 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="admin-skeleton h-3 w-24 rounded" />
                  <div className="admin-skeleton h-3 w-3/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <Empty icon={<MessagesSquare size={18} />} title="Todavía no hay mensajes">
            Lo que se escriba acá lo ven los dos. Mencioná con @franco o @federico.
          </Empty>
        ) : (
          <ol>
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              const grouped =
                !newDay && prev && prev.author === m.author && Date.parse(m.created_at) - Date.parse(prev.created_at) < GROUP_MS;
              return (
                <li key={m.id}>
                  {newDay && (
                    <div className={cn("mb-2 flex items-center gap-3", i > 0 && "mt-5")}>
                      <span className="h-px flex-1 bg-[var(--line)]" />
                      <span className="text-[11px] font-medium text-muted first-letter:uppercase">{dayTitle(m.created_at)}</span>
                      <span className="h-px flex-1 bg-[var(--line)]" />
                    </div>
                  )}
                  <Bubble
                    m={m}
                    mine={m.author === me}
                    grouped={Boolean(grouped)}
                    me={me}
                    editing={editing === m.id}
                    onEdit={() => setEditing(m.id)}
                    onCancel={() => setEditing(null)}
                    onSave={(body) => saveEdit(m.id, body)}
                    onDelete={() => remove(m.id)}
                  />
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-[var(--line)] p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--well)] p-1.5 pl-3 transition-colors focus-within:border-accent/60">
          <AutoTextarea
            value={draft}
            onChange={setDraft}
            onEnter={send}
            placeholder={placeholder}
            ariaLabel="Mensaje"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Mandar"
            className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-background transition-opacity disabled:opacity-30"
          >
            <ArrowUp size={16} />
          </button>
        </div>
        <p className="mt-1.5 px-1 text-[11px] text-muted/70">Enter para mandar · Shift + Enter para otra línea</p>
      </form>
    </div>
  );
}

function AutoTextarea({
  value,
  onChange,
  onEnter,
  placeholder,
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onEnter: () => void;
  placeholder?: string;
  ariaLabel: string;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      autoFocus={autoFocus}
      value={value}
      maxLength={MESSAGE_MAX}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className="admin-scroll min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[14px] leading-relaxed text-foreground placeholder:text-muted/60 focus:outline-none"
    />
  );
}

function Bubble({
  m,
  mine,
  grouped,
  me,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  m: Message;
  mine: boolean;
  grouped: boolean;
  me: LeadOwner;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (body: string) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(m.body);
  const [confirm, setConfirm] = useState(false);
  const temp = m.id.startsWith("tmp-");
  return (
    <div className={cn("group relative flex gap-3 rounded-lg px-2 py-0.5 -mx-2 hover:bg-white/[0.025]", !grouped && "mt-3")}>
      <span className="w-7 shrink-0">{!grouped && <Face who={m.author} size={28} />}</span>
      <div className="min-w-0 flex-1">
        {!grouped && (
          <p className="flex items-baseline gap-2">
            <span className="text-[13px] font-medium text-foreground">{PEOPLE[m.author].name}</span>
            <time className="text-[11px] text-muted" dateTime={m.created_at}>
              {time(m.created_at)}
            </time>
          </p>
        )}
        {editing ? (
          <div className="mt-1 rounded-lg border border-accent/50 bg-[var(--well)] p-1.5 pl-2.5">
            <div className="flex items-end gap-1">
              <AutoTextarea value={draft} onChange={setDraft} onEnter={() => draft.trim() && onSave(draft.trim())} ariaLabel="Editar mensaje" autoFocus />
              <button type="button" onClick={onCancel} aria-label="Cancelar" className="focus-ring rounded-md p-1.5 text-muted hover:text-foreground">
                <X size={14} />
              </button>
              <button type="button" onClick={() => draft.trim() && onSave(draft.trim())} aria-label="Guardar" className="focus-ring rounded-md p-1.5 text-accent">
                <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          <p className={cn("text-[14px] leading-relaxed break-words whitespace-pre-wrap text-foreground/90", temp && "opacity-60")}>
            <Rich text={m.body} me={me} />
            {m.edited_at && <span className="ml-1.5 text-[11px] text-muted">(editado)</span>}
          </p>
        )}
      </div>
      {mine && !temp && !editing && (
        <div className="absolute top-0 right-1 hidden items-center gap-0.5 rounded-lg border border-[var(--line-strong)] bg-[var(--panel-3)] p-0.5 shadow-lg group-hover:flex group-focus-within:flex">
          {confirm ? (
            <>
              <span className="px-1.5 text-[12px] text-muted">¿Borrar?</span>
              <button onClick={onDelete} className="focus-ring rounded-md px-1.5 py-0.5 text-[12px] text-red-400 hover:bg-white/[0.06]">
                Sí
              </button>
              <button onClick={() => setConfirm(false)} className="focus-ring rounded-md px-1.5 py-0.5 text-[12px] text-muted hover:bg-white/[0.06]">
                No
              </button>
            </>
          ) : (
            <>
              <button onClick={onEdit} aria-label="Editar" className="focus-ring rounded-md p-1 text-muted hover:bg-white/[0.06] hover:text-foreground">
                <Pencil size={13} />
              </button>
              <button onClick={() => setConfirm(true)} aria-label="Borrar" className="focus-ring rounded-md p-1 text-muted hover:bg-white/[0.06] hover:text-red-400">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Links clickeables y menciones (@franco, @federico) resaltadas. */
function Rich({ text, me }: { text: string; me: LeadOwner }) {
  const parts = text.split(/(https?:\/\/[^\s]+|@(?:franco|federico)\b)/gi);
  return (
    <>
      {parts.map((p, i) => {
        if (/^https?:\/\//i.test(p)) {
          return (
            <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent">
              {p}
            </a>
          );
        }
        if (/^@(franco|federico)$/i.test(p)) {
          const isMe = p.slice(1).toLowerCase() === me;
          return (
            <span key={i} className={cn("rounded px-0.5 font-medium", isMe ? "bg-accent/20 text-accent" : "bg-white/[0.08] text-foreground")}>
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}
