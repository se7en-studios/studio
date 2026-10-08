"use client";

// Historial de contactos de un pedido: registrar una llamada, un mail, un
// WhatsApp, una reunión o una nota, y verlos en orden en la ficha.
import { useState } from "react";
import {
  MessageCircle,
  Mail,
  Phone,
  StickyNote,
  Trash2,
  Users,
} from "lucide-react";
import { ago } from "@/lib/admin/brief";
import { PEOPLE } from "@/lib/admin/people";
import {
  ACTIVITY_KINDS,
  ACTIVITY_LABEL,
  ACTIVITY_TEXT_MAX,
  type Activity,
  type ActivityKind,
} from "@/lib/admin/activity-shared";
import { dayKey } from "@/lib/admin/task-shared";
import { Face } from "../kit";

export const ACTIVITY_ICON: Record<ActivityKind, React.ReactNode> = {
  llamada: <Phone size={13} />,
  mail: <Mail size={13} />,
  whatsapp: <MessageCircle size={13} />,
  reunion: <Users size={13} />,
  nota: <StickyNote size={13} />,
};

const PLACEHOLDER: Record<ActivityKind, string> = {
  llamada: "Qué se habló en la llamada…",
  mail: "Qué se le mandó o qué respondió…",
  whatsapp: "Resumen del chat…",
  reunion: "Qué se acordó en la reunión…",
  nota: "Nota interna…",
};

export function ActivityLog({
  items,
  onLog,
  onDelete,
}: {
  items: Activity[];
  onLog: (kind: ActivityKind, text: string, day: string) => void;
  onDelete: (id: string) => void;
}) {
  const [kind, setKind] = useState<ActivityKind>("llamada");
  const [body, setBody] = useState("");
  const [day, setDay] = useState(dayKey);
  const canSave = kind !== "nota" || body.trim().length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    onLog(kind, body.trim(), day);
    setBody("");
    setDay(dayKey());
  }

  return (
    <>
      <p className="mt-6 mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
        Historial de contacto
      </p>
      <form
        onSubmit={submit}
        className="rounded-lg border border-[var(--line)] bg-black/20 p-3"
      >
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Tipo de contacto"
        >
          {ACTIVITY_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={`focus-ring inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors ${
                kind === k
                  ? "border-accent/60 bg-accent/15 text-foreground"
                  : "border-[var(--line-strong)] text-muted hover:text-foreground"
              }`}
            >
              {ACTIVITY_ICON[k]} {ACTIVITY_LABEL[k]}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
          }}
          maxLength={ACTIVITY_TEXT_MAX}
          rows={2}
          placeholder={PLACEHOLDER[kind]}
          aria-label="Detalle del contacto"
          className="focus-ring mt-2.5 w-full rounded-lg border border-[var(--line-strong)] bg-black/30 px-3 py-2 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-muted">
            Fue el
            <input
              type="date"
              value={day}
              max={dayKey()}
              onChange={(e) => setDay(e.target.value || dayKey())}
              className="focus-ring rounded-md border border-[var(--line-strong)] bg-black/30 px-2 py-1 text-[12px] text-foreground [color-scheme:dark]"
            />
          </label>
          <button
            type="submit"
            disabled={!canSave}
            className="focus-ring rounded-lg bg-accent px-3 py-1.5 text-[12px] font-medium text-background disabled:opacity-40"
          >
            Registrar
          </button>
        </div>
      </form>

      {items.length > 0 ? (
        <ol className="mt-3 space-y-0 border-l border-[var(--line)] pl-4">
          {items.map((a) => (
            <li key={a.id} className="group relative pb-4 last:pb-0">
              <span className="absolute top-0.5 -left-[25px] flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--panel)] text-muted">
                {ACTIVITY_ICON[a.kind]}
              </span>
              <div className="flex items-center gap-2 text-xs">
                <Face who={a.actor} size={16} />
                <span className="text-foreground">
                  {a.actor ? PEOPLE[a.actor].name : "Alguien"} ·{" "}
                  {ACTIVITY_LABEL[a.kind]}
                </span>
                <span className="font-mono text-[10px] text-muted">
                  {ago(a.at)}
                </span>
                <button
                  onClick={() => onDelete(a.id)}
                  aria-label="Borrar del historial"
                  className="focus-ring ml-auto rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400 focus-visible:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              {a.text && (
                <p className="mt-1 text-sm leading-snug whitespace-pre-wrap text-foreground/85">
                  {a.text}
                </p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Todavía no hay contactos registrados.
        </p>
      )}
    </>
  );
}
