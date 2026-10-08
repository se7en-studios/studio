"use client";

// Piezas de las tareas que se repiten en Tareas, Inicio y la ficha de un
// pedido: la fila, el alta rápida y el panel lateral para editar.
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  FileText,
  FolderOpen,
  Inbox,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import {
  PRIORITIES,
  TITLE_MAX,
  bucket,
  dayKey,
  dueLabel,
  type Task,
  type TaskInput,
  type TaskLinks,
  type TaskPriority,
} from "@/lib/admin/task-shared";

const PRIORITY_DOT: Record<TaskPriority, string> = {
  alta: "bg-accent",
  media: "bg-amber-400",
  baja: "bg-white/25",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function Face({
  who,
  size = 22,
}: {
  who: LeadOwner | null;
  size?: number;
}) {
  const p = who ? PEOPLE[who] : null;
  if (p?.image) {
    return (
      <Image
        src={p.image}
        alt={p.name}
        title={p.name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      title="Sin asignar"
      className="shrink-0 rounded-full border border-dashed border-white/25"
      style={{ width: size, height: size }}
    />
  );
}

function linkName(t: Task, links: TaskLinks) {
  if (t.lead_id)
    return {
      kind: "pedido" as const,
      name: links.leads.find((l) => l.id === t.lead_id)?.name ?? "Pedido",
    };
  if (t.project_slug)
    return {
      kind: "proyecto" as const,
      name:
        links.projects.find((p) => p.slug === t.project_slug)?.name ??
        t.project_slug,
    };
  return null;
}

export function TaskRow({
  task,
  links,
  onToggle,
  onOpen,
  hideLink,
}: {
  task: Task;
  links: TaskLinks;
  onToggle: (done: boolean) => void;
  onOpen: () => void;
  hideLink?: boolean;
}) {
  const done = Boolean(task.done_at);
  const b = bucket(task);
  const link = hideLink ? null : linkName(task, links);
  return (
    <motion.li
      layout="position"
      className="group flex items-start gap-3 border-b border-border px-4 py-3 last:border-0"
    >
      <button
        onClick={() => onToggle(!done)}
        aria-label={done ? "Marcar como pendiente" : "Marcar como hecha"}
        className={`focus-ring mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
          done
            ? "border-accent bg-accent text-background"
            : "border-white/30 hover:border-accent"
        }`}
      >
        {done && <Check size={11} strokeWidth={3} />}
      </button>
      <button onClick={onOpen} className="focus-ring min-w-0 flex-1 text-left">
        <span
          className={`block text-sm leading-snug ${done ? "text-muted line-through" : "text-foreground"}`}
        >
          {task.priority === "alta" && !done && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 -translate-y-px rounded-full bg-accent align-middle" />
          )}
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] tracking-wide text-muted uppercase">
          {task.due && !done && (
            <span
              className={`inline-flex items-center gap-1 ${b === "vencidas" ? "text-red-400" : b === "hoy" ? "text-accent" : ""}`}
            >
              <Calendar size={11} /> {dueLabel(task.due)}
            </span>
          )}
          {link && (
            <span className="inline-flex max-w-[220px] items-center gap-1 truncate normal-case">
              {link.kind === "pedido" ? (
                <Inbox size={11} />
              ) : (
                <FolderOpen size={11} />
              )}{" "}
              {link.name}
            </span>
          )}
          {task.notes && <FileText size={11} aria-label="Tiene notas" />}
        </span>
      </button>
      <Face who={task.assignee} />
    </motion.li>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`focus-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        on
          ? "border-accent bg-accent/15 text-foreground"
          : "border-border text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function AssigneePicker({
  value,
  onChange,
}: {
  value: LeadOwner | null;
  onChange: (v: LeadOwner | null) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5"
      role="group"
      aria-label="Responsable"
    >
      {PEOPLE_IDS.map((o) => (
        <Chip key={o} on={value === o} onClick={() => onChange(o)}>
          <Face who={o} size={16} /> {PEOPLE[o].name}
        </Chip>
      ))}
      <Chip on={value === null} onClick={() => onChange(null)}>
        Sin asignar
      </Chip>
    </div>
  );
}

export function DuePicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const quick: [string, string][] = [
    ["Hoy", dayKey()],
    ["Mañana", dayKey(1)],
    ["En una semana", dayKey(7)],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {quick.map(([label, d]) => (
        <Chip
          key={label}
          on={value === d}
          onClick={() => onChange(value === d ? null : d)}
        >
          {label}
        </Chip>
      ))}
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label="Fecha límite"
        className="focus-ring rounded-full border border-border bg-background px-2.5 py-1 text-xs text-foreground [color-scheme:dark]"
      />
    </div>
  );
}

export function PriorityPicker({
  value,
  onChange,
}: {
  value: TaskPriority;
  onChange: (v: TaskPriority) => void;
}) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Prioridad">
      {PRIORITIES.map((p) => (
        <Chip key={p} on={value === p} onClick={() => onChange(p)}>
          <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[p]}`} />{" "}
          {PRIORITY_LABEL[p]}
        </Chip>
      ))}
    </div>
  );
}

/** Valor del <select> de vínculo: "l:<id>", "p:<slug>" o "". */
function linkValue(t: Pick<TaskInput, "lead_id" | "project_slug">) {
  return t.lead_id
    ? `l:${t.lead_id}`
    : t.project_slug
      ? `p:${t.project_slug}`
      : "";
}
function parseLink(v: string): Pick<TaskInput, "lead_id" | "project_slug"> {
  if (v.startsWith("l:")) return { lead_id: v.slice(2), project_slug: null };
  if (v.startsWith("p:")) return { lead_id: null, project_slug: v.slice(2) };
  return { lead_id: null, project_slug: null };
}

export function LinkPicker({
  value,
  links,
  onChange,
}: {
  value: Pick<TaskInput, "lead_id" | "project_slug">;
  links: TaskLinks;
  onChange: (v: Pick<TaskInput, "lead_id" | "project_slug">) => void;
}) {
  return (
    <select
      value={linkValue(value)}
      onChange={(e) => onChange(parseLink(e.target.value))}
      aria-label="Vincular a"
      className="focus-ring max-w-full rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
    >
      <option value="">Sin vincular</option>
      {links.leads.length > 0 && (
        <optgroup label="Pedidos">
          {links.leads.map((l) => (
            <option key={l.id} value={`l:${l.id}`}>
              {l.name}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="Proyectos">
        {links.projects.map((p) => (
          <option key={p.slug} value={`p:${p.slug}`}>
            {p.name}
          </option>
        ))}
      </optgroup>
    </select>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-1.5 font-mono text-[10px] tracking-widest text-muted uppercase">
    {children}
  </p>
);

/**
 * Alta de tarea: una línea para escribir y, al enfocarla, las opciones.
 * Enter guarda. `fixed` fija el vínculo (por ejemplo, desde la ficha de un pedido).
 */
export function QuickAdd({
  me,
  links,
  onAdd,
  fixed,
  defaultAssignee,
  placeholder = "Nueva tarea… (Enter para guardar)",
}: {
  me: LeadOwner;
  links: TaskLinks;
  onAdd: (input: TaskInput) => void;
  fixed?: Pick<TaskInput, "lead_id" | "project_slug">;
  defaultAssignee?: LeadOwner | null;
  placeholder?: string;
}) {
  const blank = (): TaskInput => ({
    title: "",
    notes: "",
    assignee: defaultAssignee === undefined ? me : defaultAssignee,
    due: null,
    priority: "media",
    lead_id: fixed?.lead_id ?? null,
    project_slug: fixed?.project_slug ?? null,
  });
  const [draft, setDraft] = useState<TaskInput>(blank);
  const [open, setOpen] = useState(false);
  const set = (p: Partial<TaskInput>) => setDraft((d) => ({ ...d, ...p }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim()) return;
    onAdd({ ...draft, title: draft.title.trim() });
    // Queda abierto y con el mismo responsable (cargar varias seguidas es lo
    // común); fecha y prioridad vuelven a cero para no arrastrarlas sin querer.
    setDraft((d) => ({ ...blank(), assignee: d.assignee }));
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border bg-surface p-2"
    >
      <div className="flex items-center gap-2">
        <Plus size={16} className="ml-2 shrink-0 text-accent" />
        <input
          value={draft.title}
          onChange={(e) => set({ title: e.target.value })}
          onFocus={() => setOpen(true)}
          maxLength={TITLE_MAX}
          placeholder={placeholder}
          aria-label="Nueva tarea"
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        {open && (
          <button
            type="submit"
            disabled={!draft.title.trim()}
            className="focus-ring shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-background disabled:opacity-40"
          >
            Agregar
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 grid gap-3 border-t border-border px-2 pt-3 pb-1 md:grid-cols-2">
          <div>
            <Label>Para</Label>
            <AssigneePicker
              value={draft.assignee}
              onChange={(assignee) => set({ assignee })}
            />
          </div>
          <div>
            <Label>Para cuándo</Label>
            <DuePicker value={draft.due} onChange={(due) => set({ due })} />
          </div>
          <div>
            <Label>Prioridad</Label>
            <PriorityPicker
              value={draft.priority}
              onChange={(priority) => set({ priority })}
            />
          </div>
          {!fixed && (
            <div>
              <Label>Vinculada a</Label>
              <LinkPicker value={draft} links={links} onChange={set} />
            </div>
          )}
        </div>
      )}
    </form>
  );
}

/** Panel lateral para ver y editar una tarea. Título y notas se guardan al salir del campo. */
export function TaskDrawer({
  task,
  links,
  onClose,
  onPatch,
  onToggle,
  onDelete,
}: {
  task: Task;
  links: TaskLinks;
  onClose: () => void;
  onPatch: (p: Partial<TaskInput>) => void;
  onToggle: (done: boolean) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes);
  const [confirm, setConfirm] = useState(false);
  const done = Boolean(task.done_at);
  const link = linkName(task, links);

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <motion.aside
        role="dialog"
        aria-label="Tarea"
        initial={{ x: 40 }}
        animate={{ x: 0 }}
        exit={{ x: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <button
            onClick={() => onToggle(!done)}
            className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              done
                ? "border-accent bg-accent/15 text-foreground"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            <Check size={14} /> {done ? "Hecha" : "Marcar como hecha"}
          </button>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="focus-ring rounded-full border border-border p-2 text-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() =>
            title.trim() &&
            title !== task.title &&
            onPatch({ title: title.trim() })
          }
          maxLength={TITLE_MAX}
          rows={2}
          aria-label="Título"
          className="focus-ring mt-5 w-full resize-none rounded-xl bg-transparent text-2xl leading-snug text-foreground focus:bg-background/60"
        />

        <div className="mt-5 space-y-5">
          <div>
            <Label>Responsable</Label>
            <AssigneePicker
              value={task.assignee}
              onChange={(assignee) => onPatch({ assignee })}
            />
          </div>
          <div>
            <Label>Para cuándo</Label>
            <DuePicker value={task.due} onChange={(due) => onPatch({ due })} />
          </div>
          <div>
            <Label>Prioridad</Label>
            <PriorityPicker
              value={task.priority}
              onChange={(priority) => onPatch({ priority })}
            />
          </div>
          <div>
            <Label>Vinculada a</Label>
            <div className="flex flex-wrap items-center gap-2">
              <LinkPicker value={task} links={links} onChange={onPatch} />
              {link?.kind === "pedido" && (
                <Link
                  href="/admin/pedidos"
                  className="focus-ring text-xs text-muted underline underline-offset-4 hover:text-foreground"
                >
                  Ver pedidos
                </Link>
              )}
              {link?.kind === "proyecto" && (
                <Link
                  href={`/admin/proyectos/${task.project_slug}`}
                  className="focus-ring text-xs text-muted underline underline-offset-4 hover:text-foreground"
                >
                  Abrir proyecto
                </Link>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="task-notes"
              className="mb-1.5 block font-mono text-[10px] tracking-widest text-muted uppercase"
            >
              Notas
            </label>
            <textarea
              id="task-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== task.notes && onPatch({ notes })}
              rows={5}
              placeholder="Detalles, links, lo que haga falta… (se guarda al salir del campo)"
              className="focus-ring w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
            />
          </div>
        </div>

        <p className="mt-6 font-mono text-[10px] tracking-wide text-muted uppercase">
          {task.created_by
            ? `Anotada por ${PEOPLE[task.created_by].name}`
            : "Anotada"}{" "}
          ·{" "}
          {new Date(task.created_at).toLocaleDateString("es-AR", {
            day: "numeric",
            month: "short",
          })}
          {task.done_at &&
            ` · hecha el ${new Date(task.done_at).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`}
        </p>

        <div className="mt-auto pt-8">
          {confirm ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">¿Borrar esta tarea?</span>
              <button
                onClick={onDelete}
                className="focus-ring rounded-full bg-red-500/90 px-3 py-1.5 text-white"
              >
                Sí, borrar
              </button>
              <button
                onClick={() => setConfirm(false)}
                className="focus-ring rounded-full border border-border px-3 py-1.5 text-muted"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirm(true)}
              className="focus-ring inline-flex items-center gap-1.5 text-xs text-muted hover:text-red-400"
            >
              <Trash2 size={13} /> Borrar tarea
            </button>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

export function Toast({ msg }: { msg: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      role="status"
      className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground shadow-xl"
    >
      {msg}
    </motion.p>
  );
}

/** Mensaje que se va solo. */
export function useFlash() {
  const [toast, setToast] = useState<string | null>(null);
  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }
  return { toast, flash };
}
