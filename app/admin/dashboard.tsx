"use client";

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  CalendarClock,
  Copy,
  Database,
  Download,
  History,
  Inbox,
  LayoutGrid,
  List,
  Mail,
  MessagesSquare,
  Search,
  Snowflake,
  Trash2,
} from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { SITE } from "@/data/site";
import { ago, headline, nextStep, priority, tags, type Priority } from "@/lib/admin/brief";
import type { Lead, LeadOwner, LeadStatus } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { leadChannel } from "@/lib/admin/message-shared";
import type { PanelEvent } from "@/lib/admin/panel";
import { bucket, compareTasks, dueLabel, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { coldDays, isContact, lastContacts, type Activity, type ActivityKind } from "@/lib/admin/activity-shared";
import { dealValue } from "@/lib/admin/metrics";
import { deleteLead, setNotes, setOwner, setStatus } from "./actions";
import { EventList } from "./feed";
import { Face, Kpi, PageHeader, btnDanger, btnGhost, btnPrimary, btnSecondary, cn, usd } from "./kit";
import { Chat } from "./mensajes/chat";
import { Drawer, useStoredChoice, useToast } from "./overlay";
import { ActivityLog } from "./pedidos/activity";
import { deleteActivity, logActivity, setContact, setValue, type ContactFields } from "./pedidos/actions";
import { DealFields } from "./pedidos/deal";
import { NewLeadButton } from "./pedidos/new-lead";
import { WonProject } from "./pedidos/won-project";
import { downloadCsv } from "./pedidos/csv";
import { QuickAdd, TaskDrawer, TaskRow } from "./tareas/task-ui";
import { useTasks, type TasksApi } from "./tareas/use-tasks";

// Tablero de pedidos: una columna por etapa (Nuevo → Ganado/Perdido), o una
// lista. Cada tarjeta resume el pedido para decidir rápido: qué quiere, cuánto
// vale, quién lo toma y cuál es el próximo paso. Los cambios se ven al
// instante y se guardan en segundo plano; si el servidor falla, se deshacen.

const COLUMNS: { id: LeadStatus; label: string; hint: string; dot: string }[] = [
  { id: "nuevo", label: "Nuevos", hint: "Sin responder", dot: "bg-accent" },
  { id: "contactado", label: "Contactados", hint: "Charla en curso", dot: "bg-sky-400" },
  { id: "propuesta", label: "Propuesta", hint: "Esperando respuesta", dot: "bg-amber-400" },
  { id: "ganado", label: "Ganados", hint: "En producción", dot: "bg-emerald-400" },
  { id: "perdido", label: "Perdidos", hint: "Cerrados", dot: "bg-zinc-500" },
];
const STAGE = Object.fromEntries(COLUMNS.map((c) => [c.id, c])) as Record<LeadStatus, (typeof COLUMNS)[number]>;

const PRIORITY_STYLE: Record<Priority, string> = {
  alta: "bg-accent/15 text-accent ring-accent/25",
  media: "bg-amber-400/10 text-amber-300 ring-amber-400/20",
  baja: "bg-white/[0.04] text-muted ring-white/10",
};

type OwnerFilter = "todos" | LeadOwner | "sin";
type View = "tablero" | "lista";
const VIEWS: readonly View[] = ["tablero", "lista"];

export function Dashboard({
  leads: initial,
  dbReady,
  error,
  tasks: initialTasks,
  activities: initialActivities,
  projectOf,
  me,
  initialOpen = null,
  initialCold = false,
  initialNew = false,
}: {
  leads: Lead[];
  dbReady: boolean;
  error: string | null;
  /** null si falta la tabla de tareas: el tablero anda igual sin seguimientos. */
  tasks: { list: Task[]; links: TaskLinks } | null;
  /** null si falta la tabla del historial (crm.sql): la ficha lo oculta. */
  activities: Activity[] | null;
  /** pedido → slug de su proyecto. null si falta panel-v2.sql: la ficha no ofrece crear proyecto. */
  projectOf: Record<string, string> | null;
  me: LeadOwner;
  /** Desde un link (?pedido=<id>): abre esa ficha. */
  initialOpen?: string | null;
  /** Desde un link (?frios=1): arranca filtrando los fríos. */
  initialCold?: boolean;
  /** Desde un link (?nuevo=1): abre el alta. */
  initialNew?: boolean;
}) {
  const flash = useToast();
  const [leads, setLeads] = useState(initial);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const [owner, setOwnerFilter] = useState<OwnerFilter>("todos");
  const [openId, setOpenId] = useState<string | null>(initialOpen);
  const [dragOver, setDragOver] = useState<LeadStatus | null>(null);
  const [view, pickView] = useStoredChoice<View>("panel:pedidos:vista", "tablero", VIEWS);
  const [, startTransition] = useTransition();
  const taskApi = useTasks(initialTasks?.list ?? [], flash);
  const [acts, setActs] = useState(initialActivities ?? []);
  const [coldOnly, setColdOnly] = useState(initialCold);
  const [now] = useState(() => Date.now());

  const lastContact = useMemo(() => lastContacts(acts), [acts]);
  const coldOf = useCallback((l: Lead) => coldDays(l, lastContact.get(l.id), now), [lastContact, now]);

  /** Próximo seguimiento abierto de cada pedido, para la tarjeta. */
  const nextTask = useMemo(() => {
    const out = new Map<string, Task>();
    for (const t of [...taskApi.tasks].sort(compareTasks)) {
      if (t.lead_id && !t.done_at && !out.has(t.lead_id)) out.set(t.lead_id, t);
    }
    return out;
  }, [taskApi.tasks]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (owner === "sin" ? l.owner : owner !== "todos" && l.owner !== owner) return false;
      if (coldOnly && coldOf(l) === null) return false;
      if (!needle) return true;
      return [l.name, l.company, l.email, l.idea, l.project_type, l.phone ?? ""].some((v) => v.toLowerCase().includes(needle));
    });
  }, [leads, q, owner, coldOnly, coldOf]);

  const byStage = useMemo(() => {
    const out = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Lead[]])) as Record<LeadStatus, Lead[]>;
    for (const l of visible) out[l.status]?.push(l);
    for (const k of Object.keys(out) as LeadStatus[]) out[k].sort((a, b) => rank(b) - rank(a));
    return out;
  }, [visible]);

  const stats = useMemo(() => {
    const active = leads.filter((l) => l.status === "contactado" || l.status === "propuesta");
    const won = leads.filter((l) => l.status === "ganado");
    const closed = won.length + leads.filter((l) => l.status === "perdido").length;
    return {
      fresh: leads.filter((l) => l.status === "nuevo").length,
      active: active.length,
      pipeline: active.reduce((sum, l) => sum + dealValue(l), 0),
      won: won.reduce((sum, l) => sum + dealValue(l), 0),
      cold: leads.filter((l) => coldOf(l) !== null).length,
      winRate: closed ? Math.round((won.length / closed) * 100) : null,
    };
  }, [leads, coldOf]);

  /** Cambio optimista: se ve ya, se guarda después, se deshace si falla. */
  const leadsRef = useRef(leads);
  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);
  const update = useCallback(
    (id: string, patch: Partial<Lead>, save: () => Promise<void>) => {
      const before = leadsRef.current;
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
      startTransition(async () => {
        try {
          await save();
        } catch (e) {
          setLeads(before);
          flash(e instanceof Error ? e.message : "No se pudo guardar");
        }
      });
    },
    [flash],
  );

  const move = useCallback((id: string, s: LeadStatus) => update(id, { status: s }, () => setStatus(id, s)), [update]);

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

  function addLead(lead: Lead) {
    setLeads((ls) => [lead, ...ls]);
    setOpenId(lead.id);
    flash("Pedido cargado");
  }

  /** Registrar un contacto: optimista, y si el pedido era «Nuevo» pasa a «Contactado». */
  function logContact(lead: Lead, kind: ActivityKind, text: string, day: string) {
    const nowIso = new Date().toISOString();
    const temp: Activity = { id: `tmp-${nowIso}`, created_at: nowIso, lead_id: lead.id, kind, text, at: nowIso, actor: me };
    const before = { acts, leads };
    setActs((a) => [temp, ...a]);
    if (lead.status === "nuevo" && isContact(temp)) {
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: "contactado" } : l)));
    }
    startTransition(async () => {
      try {
        const { activity } = await logActivity(lead.id, kind, text, day);
        setActs((a) => a.map((x) => (x.id === temp.id ? activity : x)));
      } catch (e) {
        setActs(before.acts);
        setLeads(before.leads);
        flash(e instanceof Error ? e.message : "No se pudo registrar");
      }
    });
  }

  function dropActivity(id: string) {
    if (id.startsWith("tmp-")) return;
    const before = acts;
    setActs((a) => a.filter((x) => x.id !== id));
    startTransition(async () => {
      try {
        await deleteActivity(id);
      } catch (e) {
        setActs(before);
        flash(e instanceof Error ? e.message : "No se pudo borrar");
      }
    });
  }

  const openLead = useCallback((id: string) => setOpenId(id), []);
  const open = leads.find((l) => l.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pedidos"
        right={
          dbReady && (
            <>
              <button
                onClick={() => downloadCsv(visible)}
                disabled={!visible.length}
                title="Descarga los pedidos que se ven ahora (con filtros y búsqueda)"
                className={btnSecondary}
              >
                <Download size={14} /> CSV
              </button>
              <NewLeadButton me={me} onCreated={addLead} initialOpen={initialNew} />
            </>
          )
        }
      >
        Los pedidos que llegan por la web y los que se cargan a mano, del primer mensaje al cierre.
      </PageHeader>

      {!dbReady && <SetupCard />}
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          No se pudieron leer los pedidos: {error}
        </p>
      )}

      {/* Números */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Sin responder" value={stats.fresh} tone={stats.fresh > 0 ? "accent" : undefined} />
        <Kpi label="En curso" value={stats.active} />
        <button
          onClick={() => setColdOnly((v) => !v)}
          aria-pressed={coldOnly}
          title={`En curso y sin contacto hace ${COLD_HINT}. Tocá para filtrarlos.`}
          className={cn("focus-ring rounded-xl text-left", coldOnly && "ring-1 ring-amber-400/60")}
        >
          <Kpi label={coldOnly ? "Fríos · filtrando" : "Fríos"} value={stats.cold} tone={stats.cold > 0 ? "amber" : undefined} icon={<Snowflake size={13} />} />
        </button>
        <Kpi label="Valor en juego" value={usd(stats.pipeline)} />
        <Kpi label="Ganado" value={usd(stats.won)} tone={stats.won ? "green" : undefined} />
        <Kpi label="Tasa de cierre" value={stats.winRate == null ? "—" : `${stats.winRate}%`} />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[220px] flex-1 items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, empresa, idea o teléfono…"
            className="focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] py-2 pr-3 pl-9 text-[13px] text-foreground placeholder:text-muted/70 focus:border-accent/60"
          />
        </label>
        <Segmented
          value={owner}
          onChange={setOwnerFilter}
          options={[
            { id: "todos", label: "Todos" },
            ...PEOPLE_IDS.map((o) => ({ id: o as OwnerFilter, label: PEOPLE[o].name })),
            { id: "sin", label: "Sin asignar" },
          ]}
        />
        <Segmented
          value={view}
          onChange={pickView}
          options={[
            { id: "tablero", label: <LayoutGrid size={14} aria-label="Tablero" /> },
            { id: "lista", label: <List size={14} aria-label="Lista" /> },
          ]}
        />
      </div>

      {view === "tablero" ? (
        <div className="-mx-4 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0">
          <div className="grid min-w-[1150px] grid-cols-5 gap-3">
            {COLUMNS.map((col) => {
              const items = byStage[col.id];
              const value = items.reduce((s, l) => s + dealValue(l), 0);
              return (
                <section
                  key={col.id}
                  aria-label={col.label}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOver !== col.id) setDragOver(col.id);
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData(DRAG_TYPE);
                    const lead = leads.find((l) => l.id === id);
                    if (lead && lead.status !== col.id) move(id, col.id);
                  }}
                  className={cn(
                    "flex min-h-[220px] flex-col rounded-xl border p-2 transition-colors",
                    dragOver === col.id ? "border-accent/50 bg-accent/[0.05]" : "border-[var(--line)] bg-white/[0.012]",
                  )}
                >
                  <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                    <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                    <h2 className="text-[13px] font-medium">{col.label}</h2>
                    <span className="font-mono text-[11px] text-muted">{items.length}</span>
                    <span className="ml-auto text-[11px] text-muted">{value ? usd(value) : col.hint}</span>
                  </header>
                  <div className="flex flex-col gap-2">
                    {items.map((l) => (
                      <LeadCard
                        key={l.id}
                        lead={l}
                        next={nextTask.get(l.id)}
                        lastContact={lastContact.get(l.id)}
                        cold={coldOf(l)}
                        onOpen={openLead}
                        onMove={move}
                        onDragEnd={() => setDragOver(null)}
                      />
                    ))}
                    {!items.length && (
                      <p className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-8 text-center text-[12px] text-muted">
                        <Inbox size={15} /> Nada acá
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <LeadTable leads={visible} lastContact={lastContact} coldOf={coldOf} onOpen={openLead} />
      )}

      {open && (
        <Detail
          key={open.id}
          lead={open}
          me={me}
          onClose={() => setOpenId(null)}
          onStatus={(s) => move(open.id, s)}
          onOwner={(o) => update(open.id, { owner: o }, () => setOwner(open.id, o))}
          onNotes={(n) => update(open.id, { notes: n }, () => setNotes(open.id, n))}
          onDelete={() => remove(open.id)}
          onCopied={() => flash("Copiado")}
          projectSlug={projectOf ? projectOf[open.id] ?? null : undefined}
          followUp={initialTasks ? { api: taskApi, links: initialTasks.links, me } : null}
          deal={{
            onContact: (f) => update(open.id, f, () => setContact(open.id, f)),
            onValue: (v) => update(open.id, { value: v }, () => setValue(open.id, v)),
          }}
          history={
            initialActivities
              ? {
                  items: acts.filter((a) => a.lead_id === open.id).sort((a, b) => b.at.localeCompare(a.at)),
                  onLog: (kind, text, day) => logContact(open, kind, text, day),
                  onDelete: dropActivity,
                }
              : null
          }
        />
      )}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: React.ReactNode }[];
}) {
  return (
    <div className="flex rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5 text-[13px]" role="group">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={cn(
            "focus-ring flex items-center rounded-md px-2.5 py-1.5 whitespace-nowrap transition-colors",
            value === o.id ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Orden dentro de cada columna: prioridad primero, después lo más reciente. */
function rank(l: Lead) {
  const p = { alta: 3, media: 2, baja: 1 }[priority(l)];
  return p * 1e13 + new Date(l.created_at).getTime();
}

const COLD_HINT = "7 días o más";
/** Tipo propio del drag: así una columna sólo acepta tarjetas, no texto ni archivos. */
const DRAG_TYPE = "application/x-se7en-lead";

// memo: al escribir en la búsqueda o mover una tarjeta, las demás no se
// vuelven a dibujar.
const LeadCard = memo(function LeadCard({
  lead,
  next: task,
  lastContact,
  cold,
  onOpen,
  onMove,
  onDragEnd,
}: {
  lead: Lead;
  next?: Task;
  lastContact?: string;
  cold: number | null;
  onOpen: (id: string) => void;
  onMove: (id: string, s: LeadStatus) => void;
  onDragEnd: () => void;
}) {
  const p = priority(lead);
  const idx = COLUMNS.findIndex((c) => c.id === lead.status);
  const next = lead.status === "perdido" || lead.status === "ganado" ? null : COLUMNS[idx + 1];
  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      className="group cursor-grab rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_170px] hover:border-[var(--line-strong)] active:cursor-grabbing"
    >
      <button onClick={() => onOpen(lead.id)} className="focus-ring block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[13px] leading-snug font-medium">
            {lead.name}
            {lead.company && <span className="font-normal text-muted"> · {lead.company}</span>}
          </p>
          <span className={cn("shrink-0 rounded px-1.5 py-px text-[10px] font-medium uppercase ring-1 ring-inset", PRIORITY_STYLE[p])}>{p}</span>
        </div>
        <p className="mt-1.5 line-clamp-3 text-[12.5px] leading-snug text-foreground/75">{headline(lead.idea)}</p>
        {tags(lead).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags(lead).map((t) => (
              <span key={t} className="rounded bg-white/[0.05] px-1.5 py-px text-[10.5px] text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
        {task && <FollowUpBadge task={task} />}
        {cold !== null ? (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-400/[0.07] px-2 py-1 text-[11px] text-amber-300">
            <Snowflake size={12} className="shrink-0" /> {lastContact ? `${cold} días sin contacto` : `Sin contacto en ${cold} días`}
          </span>
        ) : (
          lastContact && <span className="mt-2 block text-[11px] text-muted">Último contacto {ago(lastContact)}</span>
        )}
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] text-muted">
          <Face who={lead.owner} size={18} />
          {lead.value != null ? <span className="truncate text-foreground/85">{usd(lead.value)}</span> : <span>{ago(lead.created_at)}</span>}
        </span>
        {next && (
          <button
            onClick={() => onMove(lead.id, next.id)}
            title={`Mover a ${next.label}`}
            className="focus-ring shrink-0 rounded-md px-1.5 py-0.5 text-[11px] text-muted opacity-0 transition-all group-hover:opacity-100 hover:bg-accent/10 hover:text-accent focus-visible:opacity-100"
          >
            {next.label} →
          </button>
        )}
      </div>
    </article>
  );
});

function LeadTable({
  leads,
  lastContact,
  coldOf,
  onOpen,
}: {
  leads: Lead[];
  lastContact: Map<string, string>;
  coldOf: (l: Lead) => number | null;
  onOpen: (id: string) => void;
}) {
  const sorted = useMemo(() => [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)), [leads]);
  if (!sorted.length) return <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-12 text-center text-[13px] text-muted">Nada coincide.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <table className="w-full min-w-[860px] text-left text-[13px]">
        <thead className="border-b border-[var(--line)] text-[11.5px] text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Pedido</th>
            <th className="px-3 py-2.5 font-medium">Etapa</th>
            <th className="px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 text-right font-medium">Valor</th>
            <th className="px-3 py-2.5 font-medium">Último contacto</th>
            <th className="px-4 py-2.5 font-medium">Llegó</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {sorted.map((l) => {
            const cold = coldOf(l);
            const last = lastContact.get(l.id);
            return (
              <tr key={l.id} onClick={() => onOpen(l.id)} className="cursor-pointer transition-colors hover:bg-white/[0.025]">
                <td className="max-w-[360px] px-4 py-2.5">
                  <button onClick={() => onOpen(l.id)} className="focus-ring block max-w-full text-left">
                    <span className="block truncate font-medium">
                      {l.name}
                      {l.company && <span className="font-normal text-muted"> · {l.company}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{headline(l.idea)}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[12.5px]">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STAGE[l.status].dot)} /> {STAGE[l.status].label}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[12.5px] text-muted">
                    <Face who={l.owner} size={18} /> {l.owner ? PEOPLE[l.owner].name : "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{dealValue(l) ? usd(dealValue(l)) : "—"}</td>
                <td className={cn("px-3 py-2.5 text-[12.5px]", cold !== null ? "text-amber-300" : "text-muted")}>
                  {cold !== null ? `Frío · ${cold} días` : last ? ago(last) : "—"}
                </td>
                <td className="px-4 py-2.5 text-[12.5px] text-muted">{ago(l.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function replyMail(l: Lead) {
  const subject = `Tu proyecto con ${SITE.name}`;
  const body = `Hola ${l.name.split(" ")[0]}! Gracias por escribirnos.\n\nLeímos tu idea (${l.project_type || "tu proyecto"}) y nos encantaría charlarla. ¿Te queda bien una llamada de 15 minutos esta semana?\n\nFranco y Federico — ${SITE.name}`;
  return `mailto:${l.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type Tab = "ficha" | "chat" | "cambios";

const sectionLabel = "mb-2 text-[11px] font-medium tracking-wide text-muted uppercase";

function Detail({
  lead,
  me,
  onClose,
  onStatus,
  onOwner,
  onNotes,
  onDelete,
  onCopied,
  projectSlug,
  followUp,
  deal,
  history,
}: {
  /** undefined: no se puede crear proyecto (falta panel-v2.sql). */
  projectSlug?: string | null;
  followUp: { api: TasksApi; links: TaskLinks; me: LeadOwner } | null;
  deal: { onContact: (f: ContactFields) => void; onValue: (v: number | null) => void };
  history: {
    items: Activity[];
    onLog: (kind: ActivityKind, text: string, day: string) => void;
    onDelete: (id: string) => void;
  } | null;
  lead: Lead;
  me: LeadOwner;
  onClose: () => void;
  onStatus: (s: LeadStatus) => void;
  onOwner: (o: LeadOwner | null) => void;
  onNotes: (n: string) => void;
  onDelete: () => void;
  onCopied: () => void;
}) {
  const [notes, setNotesDraft] = useState(lead.notes);
  const [confirm, setConfirm] = useState(false);
  const [tab, setTab] = useState<Tab>("ficha");

  function copyAll() {
    const text = [
      `${lead.name}${lead.company ? ` (${lead.company})` : ""}`,
      lead.email && `Email: ${lead.email}`,
      lead.phone && `Teléfono: ${lead.phone}`,
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
    ["Llegó por", [lead.source, lead.channel].filter(Boolean).join(" · ")],
    ["Fecha", new Date(lead.created_at).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })],
  ];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "ficha", label: "Ficha", icon: <Inbox size={13} /> },
    { id: "chat", label: "Conversación", icon: <MessagesSquare size={13} /> },
    { id: "cambios", label: "Cambios", icon: <History size={13} /> },
  ];

  return (
    <Drawer
      onClose={onClose}
      label={`Pedido de ${lead.name}`}
      width="max-w-2xl"
      header={
        <div>
          <p className="flex items-center gap-2 text-[11.5px] text-muted">
            <span className={cn("h-1.5 w-1.5 rounded-full", STAGE[lead.status].dot)} />
            {STAGE[lead.status].label} · prioridad {priority(lead)}
          </p>
          <h2 className="mt-1 truncate text-[20px] font-semibold tracking-[-0.01em]">
            {lead.name}
            {lead.company && <span className="font-normal text-muted"> · {lead.company}</span>}
          </h2>
          <div className="mt-3 -mb-4 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-pressed={tab === t.id}
                className={cn(
                  "focus-ring relative flex items-center gap-1.5 px-2.5 pt-1 pb-2.5 text-[13px] transition-colors",
                  tab === t.id ? "text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {t.icon} {t.label}
                {tab === t.id && <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-accent" />}
              </button>
            ))}
          </div>
        </div>
      }
    >
      {tab === "chat" ? (
        <Chat channel={leadChannel(lead.id)} me={me} className="h-full" placeholder={`Escribí sobre ${lead.name}…`} />
      ) : tab === "cambios" ? (
        <LeadEvents id={lead.id} />
      ) : (
        <div className="flex min-h-full flex-col p-5">
          <div className="rounded-lg border border-accent/20 bg-accent/[0.05] px-3.5 py-3">
            <p className="text-[11px] font-medium tracking-wide text-accent uppercase">Próximo paso</p>
            <p className="mt-1 text-[13.5px]">{nextStep(lead)}</p>
          </div>

          {lead.status === "ganado" && projectSlug !== undefined && <WonProject leadId={lead.id} slug={projectSlug} />}

          {/* Responder */}
          <div className="mt-4 flex flex-wrap gap-2">
            {lead.email && (
              <a href={replyMail(lead)} className={btnPrimary}>
                <Mail size={14} /> Responder por mail
              </a>
            )}
            {lead.channel === "whatsapp" && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#25D366]/40 px-3 py-1.5 text-[13px] text-[#25D366]">
                <WhatsAppLogo size={14} /> Escribió por WhatsApp
              </span>
            )}
            <button onClick={copyAll} className={btnSecondary}>
              <Copy size={14} /> Copiar datos
            </button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className={sectionLabel}>Etapa</p>
              <div className="flex flex-wrap gap-1.5">
                {COLUMNS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => onStatus(c.id)}
                    aria-pressed={lead.status === c.id}
                    className={cn(
                      "focus-ring inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors",
                      lead.status === c.id ? "border-accent/60 bg-accent/15 text-foreground" : "border-[var(--line-strong)] text-muted hover:text-foreground",
                    )}
                  >
                    <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} /> {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={sectionLabel}>Lo toma</p>
              <div className="flex flex-wrap gap-1.5">
                {PEOPLE_IDS.map((o) => (
                  <button
                    key={o}
                    onClick={() => onOwner(lead.owner === o ? null : o)}
                    aria-pressed={lead.owner === o}
                    className={cn(
                      "focus-ring flex items-center gap-1.5 rounded-md border py-0.5 pr-2.5 pl-0.5 text-[12.5px] transition-colors",
                      lead.owner === o ? "border-accent/60 bg-accent/15 text-foreground" : "border-[var(--line-strong)] text-muted hover:text-foreground",
                    )}
                  >
                    <Face who={o} size={22} /> {PEOPLE[o].name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* La idea completa */}
          <p className={cn(sectionLabel, "mt-6")}>La idea</p>
          <p className="rounded-lg border border-[var(--line)] bg-black/20 p-3.5 text-[13.5px] leading-relaxed whitespace-pre-wrap text-foreground/90">
            {lead.idea || "Sin descripción."}
          </p>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            {fields
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-muted">{k}</dt>
                  <dd className="mt-0.5 text-[13px] break-words">{v}</dd>
                </div>
              ))}
          </dl>

          <DealFields lead={lead} onContact={deal.onContact} onValue={deal.onValue} />

          {followUp && <FollowUps lead={lead} {...followUp} />}

          {history && <ActivityLog items={history.items} onLog={history.onLog} onDelete={history.onDelete} />}

          {/* Notas internas */}
          <label htmlFor="notes" className={cn(sectionLabel, "mt-6 block")}>
            Notas internas
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotesDraft(e.target.value)}
            onBlur={() => notes !== lead.notes && onNotes(notes)}
            rows={4}
            placeholder="Qué hablamos, precio que pasamos, próximos pasos… (se guarda al salir del campo)"
            className="focus-ring w-full rounded-lg border border-[var(--line-strong)] bg-black/30 px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted/60 focus:border-accent/70"
          />

          <div className="mt-auto pt-8">
            {confirm ? (
              <div className="flex items-center gap-2 text-[13px]">
                <span className="text-muted">¿Borrar este pedido?</span>
                <button onClick={onDelete} className={btnDanger}>
                  Sí, borrar
                </button>
                <button onClick={() => setConfirm(false)} className={btnGhost}>
                  No
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)} className="focus-ring inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-red-400">
                <Trash2 size={13} /> Borrar pedido
              </button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/** Todo lo que se cambió de este pedido, con el antes y el después. */
function LeadEvents({ id }: { id: string }) {
  const [events, setEvents] = useState<PanelEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(`/admin/api/events?lead=${id}`, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) setError(d.error ?? "No se pudo leer el registro");
        else setEvents(d.events);
      })
      .catch(() => alive && setError("Sin conexión"));
    return () => {
      alive = false;
    };
  }, [id]);
  if (error) return <p className="p-5 text-[13px] text-amber-300">{error}</p>;
  if (!events)
    return (
      <div className="space-y-3 p-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="admin-skeleton h-12 rounded-lg" />
        ))}
      </div>
    );
  return <EventList events={events} names={{}} />;
}

function SetupCard() {
  return (
    <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
      <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
        <Database size={15} /> Falta conectar la base de datos: por ahora los pedidos no se guardan.
      </p>
      <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
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
  const tone = b === "vencidas" ? "bg-red-500/[0.08] text-red-300" : b === "hoy" ? "bg-accent/[0.08] text-accent" : "bg-white/[0.04] text-muted";
  return (
    <span className={cn("mt-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px]", tone)}>
      <CalendarClock size={12} className="shrink-0" />
      <span className="truncate">{task.title}</span>
      {task.due && <span className="ml-auto shrink-0">{dueLabel(task.due)}</span>}
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
      <p className={cn(sectionLabel, "mt-6 flex items-center gap-1.5")}>
        <ArrowRight size={12} /> Seguimiento
      </p>
      <QuickAdd
        me={me}
        links={links}
        fixed={{ lead_id: lead.id, project_slug: null }}
        defaultAssignee={lead.owner ?? me}
        onAdd={(input) => api.add(input, me)}
        placeholder="Próximo paso… (ej: mandar propuesta)"
      />
      {mine.length > 0 && (
        <ul className="mt-2 divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-[var(--line)] bg-black/20">
          {mine.map((t) => (
            <TaskRow key={t.id} task={t} links={links} hideLink onToggle={(d) => api.toggle(t.id, d)} onOpen={() => setOpenId(t.id)} />
          ))}
        </ul>
      )}
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
    </>
  );
}
