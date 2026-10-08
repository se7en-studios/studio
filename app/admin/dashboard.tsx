"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  CalendarClock,
  Copy,
  Database,
  Inbox,
  Mail,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { team } from "@/data/team";
import { SITE } from "@/data/site";
import { ago, budgetValue, headline, nextStep, priority, tags, type Priority } from "@/lib/admin/brief";
import type { Lead, LeadOwner, LeadStatus } from "@/lib/admin/db";
import { bucket, compareTasks, dueLabel, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { deleteLead, setNotes, setOwner, setStatus } from "./actions";
import { QuickAdd, TaskDrawer, TaskRow } from "./tareas/task-ui";
import { useTasks, type TasksApi } from "./tareas/use-tasks";

// Tablero de pedidos: una columna por etapa (Nuevo → Ganado/Perdido). Cada
// tarjeta resume el pedido para decidir rápido: qué quiere, cuánto vale,
// quién lo toma y cuál es el próximo paso. Los cambios se ven al instante y
// se guardan en segundo plano; si el servidor falla, se deshacen.

const COLUMNS: { id: LeadStatus; label: string; hint: string }[] = [
  { id: "nuevo", label: "Nuevos", hint: "Sin responder" },
  { id: "contactado", label: "Contactados", hint: "Charla en curso" },
  { id: "propuesta", label: "Propuesta", hint: "Esperando respuesta" },
  { id: "ganado", label: "Ganados", hint: "En producción" },
  { id: "perdido", label: "Perdidos", hint: "Cerrados" },
];

const OWNER_INFO: Record<LeadOwner, { name: string; image?: string }> = {
  franco: { name: "Franco", image: team.find((t) => /franco/i.test(t.name ?? ""))?.imageUrl ?? undefined },
  federico: { name: "Federico", image: team.find((t) => /federico/i.test(t.name ?? ""))?.imageUrl ?? undefined },
};

const PRIORITY_STYLE: Record<Priority, string> = {
  alta: "bg-accent text-background",
  media: "bg-amber-400/15 text-amber-300",
  baja: "bg-white/5 text-muted",
};

type OwnerFilter = "todos" | LeadOwner | "sin";

export function Dashboard({
  leads: initial,
  dbReady,
  error,
  tasks: initialTasks,
  me,
}: {
  leads: Lead[];
  dbReady: boolean;
  error: string | null;
  /** null si falta la tabla de tareas: el tablero anda igual sin seguimientos. */
  tasks: { list: Task[]; links: TaskLinks } | null;
  me: LeadOwner;
}) {
  const [leads, setLeads] = useState(initial);
  const [query, setQuery] = useState("");
  const [owner, setOwnerFilter] = useState<OwnerFilter>("todos");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const taskApi = useTasks(initialTasks?.list ?? [], flash);

  /** Próximo seguimiento abierto de cada pedido, para la tarjeta. */
  const nextTask = useMemo(() => {
    const out = new Map<string, Task>();
    for (const t of [...taskApi.tasks].sort(compareTasks)) {
      if (t.lead_id && !t.done_at && !out.has(t.lead_id)) out.set(t.lead_id, t);
    }
    return out;
  }, [taskApi.tasks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) => {
      if (owner === "sin" ? l.owner : owner !== "todos" && l.owner !== owner) return false;
      if (!q) return true;
      return [l.name, l.company, l.email, l.idea, l.project_type].some((v) => v.toLowerCase().includes(q));
    });
  }, [leads, query, owner]);

  const stats = useMemo(() => {
    const active = leads.filter((l) => l.status === "contactado" || l.status === "propuesta");
    const won = leads.filter((l) => l.status === "ganado").length;
    const closed = won + leads.filter((l) => l.status === "perdido").length;
    return {
      fresh: leads.filter((l) => l.status === "nuevo").length,
      active: active.length,
      pipeline: active.reduce((sum, l) => sum + budgetValue(l.budget), 0),
      winRate: closed ? Math.round((won / closed) * 100) : null,
    };
  }, [leads]);

  /** Cambio optimista: se ve ya, se guarda después, se deshace si falla. */
  function update(id: string, patch: Partial<Lead>, save: () => Promise<void>) {
    const before = leads;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
    startTransition(async () => {
      try {
        await save();
      } catch (e) {
        setLeads(before);
        flash(e instanceof Error ? e.message : "No se pudo guardar");
      }
    });
  }

  function remove(id: string) {
    const before = leads;
    setLeads((ls) => ls.filter((l) => l.id !== id));
    setOpenId(null);
    startTransition(async () => {
      try {
        await deleteLead(id);
        flash("Pedido borrado");
      } catch {
        setLeads(before);
        flash("No se pudo borrar");
      }
    });
  }

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  const open = leads.find((l) => l.id === openId) ?? null;

  return (
    <div>
      {/* Encabezado. Contenedor y botón de salir los pone el layout del panel. */}
      <div>
        <p className="font-mono text-[11px] tracking-widest text-accent uppercase">Panel · {SITE.name}</p>
        <h1 className="mt-2 text-3xl text-foreground md:text-4xl">Pedidos de proyecto</h1>
      </div>

      {!dbReady && <SetupCard />}
      {error && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          No se pudieron leer los pedidos: {error}
        </p>
      )}

      {/* Números */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sin responder" value={stats.fresh} accent={stats.fresh > 0} />
        <Stat label="En curso" value={stats.active} />
        <Stat label="Valor en juego" value={stats.pipeline ? `USD ${Math.round(stats.pipeline).toLocaleString("es-AR")}` : "—"} />
        <Stat label="Tasa de cierre" value={stats.winRate == null ? "—" : `${stats.winRate}%`} />
      </div>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <label className="relative flex min-w-[240px] flex-1 items-center">
          <Search size={15} className="pointer-events-none absolute left-3.5 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, empresa o idea…"
            className="focus-ring w-full rounded-full border border-border bg-surface py-2.5 pr-4 pl-10 text-sm text-foreground placeholder:text-muted/70 focus:border-accent"
          />
        </label>
        <div className="flex rounded-full border border-border bg-surface p-1 text-sm">
          {(["todos", "franco", "federico", "sin"] as OwnerFilter[]).map((o) => (
            <button
              key={o}
              onClick={() => setOwnerFilter(o)}
              className={`focus-ring rounded-full px-3.5 py-1.5 transition-colors ${owner === o ? "bg-white/10 text-foreground" : "text-muted hover:text-foreground"}`}
            >
              {o === "todos" ? "Todos" : o === "sin" ? "Sin asignar" : OWNER_INFO[o].name}
            </button>
          ))}
        </div>
      </div>

      {/* Tablero */}
      <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
        <div className="grid min-w-[1100px] grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const items = visible
              .filter((l) => l.status === col.id)
              .sort((a, b) => rank(b) - rank(a));
            return (
              <section key={col.id} className="flex min-h-[200px] flex-col rounded-2xl border border-border bg-surface/50 p-2.5">
                <header className="flex items-baseline justify-between px-1.5 pt-1 pb-3">
                  <h2 className="text-sm text-foreground">
                    {col.label} <span className="ml-1 font-mono text-xs text-muted">{items.length}</span>
                  </h2>
                  <span className="font-mono text-[10px] text-muted">{col.hint}</span>
                </header>
                <div className="flex flex-col gap-2.5">
                  {items.map((l) => (
                    <LeadCard key={l.id} lead={l} next={nextTask.get(l.id)} onOpen={() => setOpenId(l.id)} onMove={(s) => update(l.id, { status: s }, () => setStatus(l.id, s))} />
                  ))}
                  {!items.length && (
                    <p className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted">
                      <Inbox size={16} /> Nada acá
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <Detail
            key={open.id}
            lead={open}
            onClose={() => setOpenId(null)}
            onStatus={(s) => update(open.id, { status: s }, () => setStatus(open.id, s))}
            onOwner={(o) => update(open.id, { owner: o }, () => setOwner(open.id, o))}
            onNotes={(n) => update(open.id, { notes: n }, () => setNotes(open.id, n))}
            onDelete={() => remove(open.id)}
            onCopied={() => flash("Copiado")}
            followUp={initialTasks ? { api: taskApi, links: initialTasks.links, me } : null}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-border bg-surface px-4 py-2 text-sm text-foreground shadow-xl"
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Orden dentro de cada columna: prioridad primero, después lo más reciente. */
function rank(l: Lead) {
  const p = { alta: 3, media: 2, baja: 1 }[priority(l)];
  return p * 1e13 + new Date(l.created_at).getTime();
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <p className="font-mono text-[10px] tracking-widest text-muted uppercase">{label}</p>
      <p className={`mt-2 text-2xl tabular-nums ${accent ? "text-accent" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function OwnerBadge({ owner }: { owner: LeadOwner | null }) {
  if (!owner) return <span className="font-mono text-[10px] text-muted">sin asignar</span>;
  const o = OWNER_INFO[owner];
  return (
    <span className="flex items-center gap-1.5 text-xs text-foreground">
      {o.image ? (
        <Image src={o.image} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
      ) : (
        <span className="h-5 w-5 rounded-full bg-white/10" />
      )}
      {o.name}
    </span>
  );
}

function LeadCard({ lead, next: task, onOpen, onMove }: { lead: Lead; next?: Task; onOpen: () => void; onMove: (s: LeadStatus) => void }) {
  const p = priority(lead);
  const idx = COLUMNS.findIndex((c) => c.id === lead.status);
  const next = lead.status === "perdido" || lead.status === "ganado" ? null : COLUMNS[idx + 1];
  return (
    <motion.article
      layout
      className="group rounded-xl border border-border bg-background/70 p-3 transition-colors hover:border-foreground/20"
    >
      <button onClick={onOpen} className="focus-ring block w-full text-left">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {lead.name}
            {lead.company && <span className="text-muted"> · {lead.company}</span>}
          </p>
          <span className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] uppercase ${PRIORITY_STYLE[p]}`}>{p}</span>
        </div>
        <p className="mt-2 text-[13px] leading-snug text-foreground/90">{headline(lead.idea)}</p>
        <div className="mt-2.5 flex flex-wrap gap-1">
          {tags(lead).map((t) => (
            <span key={t} className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-muted">
              {t}
            </span>
          ))}
        </div>
        <p className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-snug text-accent/90">
          <ArrowRight size={12} className="mt-px shrink-0" /> {nextStep(lead)}
        </p>
        {task && <FollowUpBadge task={task} />}
      </button>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2.5">
        <OwnerBadge owner={lead.owner} />
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted">{ago(lead.created_at)}</span>
          {next && (
            <button
              onClick={() => onMove(next.id)}
              title={`Mover a ${next.label}`}
              className="focus-ring rounded-full border border-border px-2 py-0.5 text-[10px] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {next.label} →
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function replyMail(l: Lead) {
  const subject = `Tu proyecto con ${SITE.name}`;
  const body = `Hola ${l.name.split(" ")[0]}! Gracias por escribirnos.\n\nLeímos tu idea (${l.project_type || "tu proyecto"}) y nos encantaría charlarla. ¿Te queda bien una llamada de 15 minutos esta semana?\n\nFranco y Federico — ${SITE.name}`;
  return `mailto:${l.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function Detail({
  lead,
  onClose,
  onStatus,
  onOwner,
  onNotes,
  onDelete,
  onCopied,
  followUp,
}: {
  followUp: { api: TasksApi; links: TaskLinks; me: LeadOwner } | null;
  lead: Lead;
  onClose: () => void;
  onStatus: (s: LeadStatus) => void;
  onOwner: (o: LeadOwner | null) => void;
  onNotes: (n: string) => void;
  onDelete: () => void;
  onCopied: () => void;
}) {
  const [notes, setNotesDraft] = useState(lead.notes);
  const [confirm, setConfirm] = useState(false);

  function copyAll() {
    const text = [
      `${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      lead.email && `Email: ${lead.email}`,
      lead.project_type && `Proyecto: ${lead.project_type}`,
      lead.budget && `Presupuesto: ${lead.budget}`,
      lead.timeline && `Plazo: ${lead.timeline}`,
      "\n" + lead.idea,
    ]
      .filter((x): x is string => typeof x === "string" && x !== "")
      .join("\n");
    navigator.clipboard?.writeText(text).then(onCopied, () => {});
  }

  const fields: [string, string][] = [
    ["Proyecto", lead.project_type],
    ["Presupuesto", lead.budget],
    ["Plazo", lead.timeline],
    ["Empresa", lead.company],
    ["Email", lead.email],
    ["Llegó por", [lead.source, lead.channel].filter(Boolean).join(" · ")],
    ["Fecha", new Date(lead.created_at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })],
  ];

  return (
    <motion.div className="fixed inset-0 z-[55] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <button aria-label="Cerrar" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <motion.aside
        initial={{ x: 40 }}
        animate={{ x: 0 }}
        exit={{ x: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-border bg-surface p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-accent uppercase">Prioridad {priority(lead)}</p>
            <h2 className="mt-1.5 text-2xl text-foreground">{lead.name}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="focus-ring rounded-full border border-border p-2 text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <p className="mt-4 rounded-xl border border-accent/25 bg-accent/5 px-3.5 py-3 text-sm text-foreground">
          <span className="font-mono text-[10px] tracking-widest text-accent uppercase">Próximo paso</span>
          <br />
          {nextStep(lead)}
        </p>

        {/* Responder */}
        <div className="mt-4 flex flex-wrap gap-2">
          {lead.email && (
            <a href={replyMail(lead)} className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-background">
              <Mail size={14} /> Responder por mail
            </a>
          )}
          {lead.channel === "whatsapp" && (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/40 px-4 py-2 text-sm text-[#25D366]">
              <WhatsAppLogo size={14} /> Escribió por WhatsApp
            </span>
          )}
          <button onClick={copyAll} className="focus-ring inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
            <Copy size={14} /> Copiar datos
          </button>
        </div>

        {/* Etapa */}
        <p className="mt-6 mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">Etapa</p>
        <div className="flex flex-wrap gap-1.5">
          {COLUMNS.map((c) => (
            <button
              key={c.id}
              onClick={() => onStatus(c.id)}
              className={`focus-ring rounded-full border px-3 py-1.5 text-xs transition-colors ${
                lead.status === c.id ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Responsable */}
        <p className="mt-5 mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">Lo toma</p>
        <div className="flex gap-2">
          {(["franco", "federico"] as LeadOwner[]).map((o) => (
            <button
              key={o}
              onClick={() => onOwner(lead.owner === o ? null : o)}
              className={`focus-ring flex items-center gap-2 rounded-full border py-1 pr-3.5 pl-1 text-sm transition-colors ${
                lead.owner === o ? "border-accent bg-accent/15 text-foreground" : "border-border text-muted hover:text-foreground"
              }`}
            >
              {OWNER_INFO[o].image && (
                <Image src={OWNER_INFO[o].image as string} alt="" width={26} height={26} className="h-[26px] w-[26px] rounded-full object-cover" />
              )}
              {OWNER_INFO[o].name}
            </button>
          ))}
        </div>

        {/* La idea completa */}
        <p className="mt-6 mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">La idea</p>
        <p className="rounded-xl border border-border bg-background/60 p-4 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
          {lead.idea || "Sin descripción."}
        </p>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          {fields
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k}>
                <dt className="font-mono text-[10px] tracking-widest text-muted uppercase">{k}</dt>
                <dd className="mt-0.5 break-words text-foreground">{v}</dd>
              </div>
            ))}
        </dl>

        {followUp && <FollowUps lead={lead} {...followUp} />}

        {/* Notas internas */}
        <label htmlFor="notes" className="mt-6 mb-2 block font-mono text-[10px] tracking-widest text-muted uppercase">
          Notas internas
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={() => notes !== lead.notes && onNotes(notes)}
          rows={4}
          placeholder="Qué hablamos, precio que pasamos, próximos pasos… (se guarda al salir del campo)"
          className="focus-ring w-full rounded-xl border border-border bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
        />

        <div className="mt-auto pt-8">
          {confirm ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted">¿Borrar este pedido?</span>
              <button onClick={onDelete} className="focus-ring rounded-full bg-red-500/90 px-3 py-1.5 text-white">
                Sí, borrar
              </button>
              <button onClick={() => setConfirm(false)} className="focus-ring rounded-full border border-border px-3 py-1.5 text-muted">
                No
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirm(true)} className="focus-ring inline-flex items-center gap-1.5 text-xs text-muted hover:text-red-400">
              <Trash2 size={13} /> Borrar pedido
            </button>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function SetupCard() {
  return (
    <div className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
      <p className="flex items-center gap-2 text-sm text-amber-300">
        <Database size={15} /> Falta conectar la base de datos: por ahora los pedidos no se guardan.
      </p>
      <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-muted">
        <li>Crear un proyecto gratis en supabase.com.</li>
        <li>
          En SQL Editor, pegar y correr <code className="text-foreground">supabase/leads.sql</code> del repo.
        </li>
        <li>
          En Vercel → Settings → Environment Variables, cargar <code className="text-foreground">SUPABASE_URL</code> y{" "}
          <code className="text-foreground">SUPABASE_SERVICE_ROLE_KEY</code> (Supabase → Project Settings → API).
        </li>
        <li>Volver a deployar. Desde ahí, cada pedido de los formularios aparece acá.</li>
      </ol>
    </div>
  );
}

/** En la tarjeta: el próximo seguimiento y para cuándo. */
function FollowUpBadge({ task }: { task: Task }) {
  const b = bucket(task);
  const tone = b === "vencidas" ? "border-red-400/30 text-red-300" : b === "hoy" ? "border-accent/40 text-accent" : "border-border text-muted";
  return (
    <span className={`mt-2 flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[11px] ${tone}`}>
      <CalendarClock size={12} className="shrink-0" />
      <span className="truncate">{task.title}</span>
      {task.due && <span className="ml-auto shrink-0 font-mono text-[10px]">{dueLabel(task.due)}</span>}
    </span>
  );
}

/** En la ficha: las tareas de este pedido y el alta de la próxima. */
function FollowUps({ lead, api, links, me }: { lead: Lead; api: TasksApi; links: TaskLinks; me: LeadOwner }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const mine = api.tasks.filter((t) => t.lead_id === lead.id).sort(compareTasks);
  const open = mine.find((t) => t.id === openId) ?? null;
  return (
    <>
      <p className="mt-6 mb-2 font-mono text-[10px] tracking-widest text-muted uppercase">Seguimiento</p>
      <QuickAdd
        me={me}
        links={links}
        fixed={{ lead_id: lead.id, project_slug: null }}
        defaultAssignee={lead.owner ?? me}
        onAdd={(input) => api.add(input, me)}
        placeholder="Próximo paso… (ej: mandar propuesta)"
      />
      {mine.length > 0 && (
        <ul className="mt-2 rounded-xl border border-border bg-background/60">
          {mine.map((t) => (
            <TaskRow key={t.id} task={t} links={links} hideLink onToggle={(d) => api.toggle(t.id, d)} onOpen={() => setOpenId(t.id)} />
          ))}
        </ul>
      )}
      <AnimatePresence>
        {open && (
          <TaskDrawer
            key={open.id}
            task={open}
            links={links}
            onClose={() => setOpenId(null)}
            onPatch={(p) => api.patch(open.id, p)}
            onToggle={(d) => api.toggle(open.id, d)}
            onDelete={() => {
              api.remove(open.id);
              setOpenId(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
