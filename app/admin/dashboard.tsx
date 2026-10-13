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
  MessagesSquare,
  Search,
  Snowflake,
  Trash2,
} from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { ago, headline, nextStep, priority, tags, type Priority } from "@/lib/admin/brief";
import type { Lead, LeadOwner, LeadStatus } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { leadChannel } from "@/lib/admin/message-shared";
import type { PanelEvent } from "@/lib/admin/panel";
import { bucket, compareTasks, dayKey, dueLabel, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { coldDays, isContact, lastContacts, type Activity, type ActivityKind } from "@/lib/admin/activity-shared";
import { dealValue } from "@/lib/admin/metrics";
import { deleteLead, setNotes, setOwner, setStatus } from "./actions";
import { EventList } from "./feed";
import { Chip, Face, Kpi, PageHeader, Segmented, btnDanger, btnGhost, btnSecondary, cn, input, label as sectionLabel, kpiRow, searchInput, usd, usdShort } from "./kit";
import { Chat } from "./mensajes/chat";
import { Drawer, useStoredChoice, useToast } from "./overlay";
import { ActivityLog } from "./pedidos/activity";
import { BulkBar } from "./pedidos/bulk-bar";
import { deleteActivity, logActivity, setContact, setValue, type ContactFields } from "./pedidos/actions";
import { DealFields } from "./pedidos/deal";
import { NewLeadButton } from "./pedidos/new-lead";
import { Reply } from "./pedidos/reply";
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

/** Etapas en las que un pedido todavía se puede ganar. */
const OPEN_STAGES: LeadStatus[] = ["nuevo", "contactado", "propuesta"];
// Chance de cierre por etapa, para el pronóstico. Son supuestos propios, no historial:
// ajustarlos cuando haya suficientes pedidos cerrados para medirlos de verdad.
const STAGE_ODDS: Partial<Record<LeadStatus, number>> = { nuevo: 0.1, contactado: 0.25, propuesta: 0.5 };

// Al pasar un pedido a estas etapas sin ninguna tarea de seguimiento abierta, se crea una sola.
const FOLLOW_UP: Partial<Record<LeadStatus, { days: number; title: (name: string) => string }>> = {
  contactado: { days: 3, title: (name) => `Dar seguimiento a ${name}` },
  propuesta: { days: 2, title: (name) => `Seguimiento de la propuesta a ${name}` },
};

const PRIORITY_DOT: Record<Priority, string> = {
  alta: "bg-accent",
  media: "bg-amber-400",
  baja: "bg-white/20",
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
  const [noStepOnly, setNoStepOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
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

  /** En curso y sin ningún seguimiento abierto: se enfría solo. Falso si no hay tareas (falta tasks.sql). */
  const needsStep = useCallback(
    (l: Lead) => initialTasks !== null && OPEN_STAGES.includes(l.status) && !nextTask.has(l.id),
    [initialTasks, nextTask],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (owner === "sin" ? l.owner : owner !== "todos" && l.owner !== owner) return false;
      if (coldOnly && coldOf(l) === null) return false;
      if (noStepOnly && !needsStep(l)) return false;
      if (!needle) return true;
      return [l.name, l.company, l.email, l.idea, l.project_type, l.phone ?? ""].some((v) => v.toLowerCase().includes(needle));
    });
  }, [leads, q, owner, coldOnly, coldOf, noStepOnly, needsStep]);

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
      forecast: leads.reduce((sum, l) => sum + dealValue(l) * (STAGE_ODDS[l.status] ?? 0), 0),
      noStep: leads.filter(needsStep).length,
    };
  }, [leads, coldOf, needsStep]);

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
          flash(e instanceof Error ? e.message : "No se pudo guardar", "error");
        }
      });
    },
    [flash],
  );

  /** Crea la tarea de seguimiento de la etapa, si hay tareas y el pedido no tiene ninguna abierta. */
  function scheduleFollowUp(lead: Lead, status: LeadStatus) {
    const rule = FOLLOW_UP[status];
    if (!rule || !initialTasks || nextTask.has(lead.id)) return;
    const due = dayKey(rule.days);
    taskApi.add(
      { title: rule.title(lead.name.trim().split(/\s+/)[0] || lead.name), notes: "", assignee: lead.owner ?? me, due, priority: "media", lead_id: lead.id, project_slug: null },
      me,
    );
    flash(`Seguimiento programado para ${dueLabel(due)}`, "ok");
  }
  // move va a las tarjetas (memo): llega a la versión más nueva de scheduleFollowUp por una ref.
  const followUpRef = useRef(scheduleFollowUp);
  useEffect(() => {
    followUpRef.current = scheduleFollowUp;
  });

  const move = useCallback(
    (id: string, s: LeadStatus) => {
      const lead = leadsRef.current.find((l) => l.id === id);
      update(id, { status: s }, () => setStatus(id, s));
      if (lead && lead.status !== s) followUpRef.current(lead, s);
    },
    [update],
  );

  function remove(id: string) {
    const before = leads;
    setLeads((ls) => ls.filter((l) => l.id !== id));
    setOpenId(null);
    startTransition(async () => {
      try {
        await deleteLead(id);
        flash("Pedido borrado", "ok");
      } catch {
        setLeads(before);
        flash("No se pudo borrar", "error");
      }
    });
  }

  function addLead(lead: Lead) {
    setLeads((ls) => [lead, ...ls]);
    setOpenId(lead.id);
    flash("Pedido cargado", "ok");
  }

  /** Registrar un contacto: optimista, y si el pedido era «Nuevo» pasa a «Contactado». */
  function logContact(lead: Lead, kind: ActivityKind, text: string, day: string) {
    const nowIso = new Date().toISOString();
    const temp: Activity = { id: `tmp-${nowIso}`, created_at: nowIso, lead_id: lead.id, kind, text, at: nowIso, actor: me };
    const before = { acts, leads };
    setActs((a) => [temp, ...a]);
    if (lead.status === "nuevo" && isContact(temp)) {
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: "contactado" } : l)));
      scheduleFollowUp(lead, "contactado");
    }
    startTransition(async () => {
      try {
        const { activity } = await logActivity(lead.id, kind, text, day);
        setActs((a) => a.map((x) => (x.id === temp.id ? activity : x)));
      } catch (e) {
        setActs(before.acts);
        setLeads(before.leads);
        flash(e instanceof Error ? e.message : "No se pudo registrar", "error");
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
        flash(e instanceof Error ? e.message : "No se pudo borrar", "error");
      }
    });
  }

  // Lo que se ve y está tildado: así lo que cambia es lo que el usuario tiene delante.
  const picked = visible.filter((l) => selected.includes(l.id));
  const toggleSelected = (id: string) => setSelected((xs) => (xs.includes(id) ? xs.filter((x) => x !== id) : [...xs, id]));

  /** Cambio en varios pedidos: se ve ya y, si alguno falla en el servidor, sólo ese vuelve atrás. */
  function bulk(apply: (l: Lead) => Lead | null, run: (id: string) => Promise<unknown>, done: string) {
    const ids = picked.map((l) => l.id);
    const before = leadsRef.current;
    setLeads((ls) => ls.flatMap((l) => (ids.includes(l.id) ? apply(l) ?? [] : [l])));
    setSelected([]);
    startTransition(async () => {
      const results = await Promise.allSettled(ids.map(run));
      const failed = ids.filter((_, i) => results[i].status === "rejected");
      if (!failed.length) return flash(done, "ok");
      setLeads((ls) => {
        const back = (id: string) => before.find((b) => b.id === id);
        const kept = ls.map((l) => (failed.includes(l.id) ? back(l.id) ?? l : l));
        const deleted = failed.filter((id) => !ls.some((l) => l.id === id)).flatMap((id) => back(id) ?? []);
        return [...kept, ...deleted];
      });
      flash(`${ids.length - failed.length} de ${ids.length} listos; ${failed.length} no se pudieron guardar`, "error");
    });
  }

  const n = picked.length;
  const bulkStage = (s: LeadStatus) => bulk((l) => ({ ...l, status: s }), (id) => setStatus(id, s), `${n} pasados a ${STAGE[s].label.toLowerCase()}`);
  const bulkOwner = (o: LeadOwner | null) => bulk((l) => ({ ...l, owner: o }), (id) => setOwner(id, o), o ? `${n} asignados a ${PEOPLE[o].name}` : `${n} sin responsable`);
  const bulkDelete = () => bulk(() => null, (id) => deleteLead(id), `${n} ${n === 1 ? "pedido borrado" : "pedidos borrados"}`);

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
      <div className={cn(kpiRow, "md:grid-cols-4", initialTasks ? "xl:grid-cols-7" : "xl:grid-cols-6")}>
        <Kpi label="Sin responder" value={stats.fresh} tone={stats.fresh > 0 ? "accent" : undefined} />
        <Kpi label="En curso" value={stats.active} />
        <button
          onClick={() => setColdOnly((v) => !v)}
          aria-pressed={coldOnly}
          title={`En curso y sin contacto hace ${COLD_HINT}. Tocá para filtrarlos.`}
          className={cn("focus-ring rounded-xl text-left", coldOnly && "ring-1 ring-amber-400/60")}
        >
          <Kpi label={coldOnly ? "Fríos · filtrando" : "Fríos"} value={stats.cold} tone={stats.cold > 0 ? "amber" : undefined} icon={<Snowflake size={14} />} />
        </button>
        {initialTasks && (
          <button
            onClick={() => setNoStepOnly((v) => !v)}
            aria-pressed={noStepOnly}
            title="Pedidos en curso sin ninguna tarea de seguimiento abierta. Tocá para filtrarlos."
            className={cn("focus-ring rounded-xl text-left", noStepOnly && "ring-1 ring-accent/60")}
          >
            <Kpi
              label={noStepOnly ? "Sin próximo paso · filtrando" : "Sin próximo paso"}
              value={stats.noStep}
              tone={stats.noStep > 0 ? "accent" : undefined}
              icon={<CalendarClock size={14} />}
            />
          </button>
        )}
        <Kpi label="Valor en juego" value={usd(stats.pipeline)} hint={`Pronóstico ${usd(Math.round(stats.forecast))}`} />
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
            className={searchInput}
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
        /* Etapas como franjas apiladas, igual que el tablero de Proyectos: sin
           scroll al costado para llegar a una columna, y una etapa vacía mide
           dos renglones. Las tarjetas corren a lo ancho dentro de su franja. */
        <div>
          <div className="flex flex-col gap-3">
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
                    "rounded-xl border p-2 transition-colors",
                    dragOver === col.id ? "border-accent/50 bg-accent/[0.05]" : "border-[var(--line)] bg-white/[0.012]",
                  )}
                >
                  <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                    <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                    <h2 className="text-[13px] font-medium">{col.label}</h2>
                    <span className="font-mono text-[11px] text-muted">{items.length}</span>
                    <span className="ml-auto text-[11px] text-muted">{value ? usdShort(value) : col.hint}</span>
                  </header>
                  <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1 empty:hidden">
                    {items.map((l) => (
                      <LeadCard
                        key={l.id}
                        lead={l}
                        next={nextTask.get(l.id)}
                        lastContact={lastContact.get(l.id)}
                        cold={coldOf(l)}
                        noStep={needsStep(l)}
                        onOpen={openLead}
                        onMove={move}
                        onDragEnd={() => setDragOver(null)}
                      />
                    ))}
                  </div>
                  {!items.length && (
                    <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-3.5 text-center text-[12px] text-muted">
                      Soltá un pedido acá para pasarlo a {col.label.toLowerCase()}.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <LeadTable leads={visible} lastContact={lastContact} coldOf={coldOf} onOpen={openLead} selected={selected} onToggle={toggleSelected} onSetSelected={setSelected} />
      )}

      {view === "lista" && picked.length > 0 && (
        <BulkBar
          count={picked.length}
          stages={COLUMNS.map((c) => ({ id: c.id, label: c.label }))}
          onStage={bulkStage}
          onOwner={bulkOwner}
          onExport={() => downloadCsv(picked)}
          onDelete={bulkDelete}
          onClear={() => setSelected([])}
        />
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
          onCopied={() => flash("Copiado", "ok")}
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
  noStep,
  onOpen,
  onMove,
  onDragEnd,
}: {
  lead: Lead;
  next?: Task;
  lastContact?: string;
  cold: number | null;
  /** En curso y sin tarea de seguimiento abierta. */
  noStep: boolean;
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
        e.currentTarget.dataset.dragging = "";
      }}
      onDragEnd={(e) => {
        delete e.currentTarget.dataset.dragging;
        onDragEnd();
      }}
      className="group w-[268px] shrink-0 cursor-grab rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-colors [content-visibility:auto] [contain-intrinsic-size:auto_170px] hover:border-[var(--line-strong)] active:cursor-grabbing"
    >
      <button onClick={() => onOpen(lead.id)} className="focus-ring block w-full text-left">
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 text-[13px] leading-snug font-medium">
            {lead.name}
            {lead.company && <span className="font-normal text-muted"> · {lead.company}</span>}
          </p>
          <span title={`Prioridad ${p}`} className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[p])}>
            <span className="sr-only">Prioridad {p}</span>
          </span>
        </div>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-foreground/75">{headline(lead.idea)}</p>
        {tags(lead).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags(lead).map((t) => (
              <span key={t} className="rounded bg-white/[0.05] px-1.5 py-px text-[11px] text-muted">
                {t}
              </span>
            ))}
          </div>
        )}
        {task && <FollowUpBadge task={task} />}
        {noStep && (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] text-muted">
            <CalendarClock size={12} className="shrink-0" /> Sin próximo paso
          </span>
        )}
        {cold !== null ? (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-400/[0.07] px-2 py-1 text-[11px] text-amber-300">
            <Snowflake size={12} className="shrink-0" /> {lastContact ? `${cold} días sin contacto` : `Sin contacto en ${cold} días`}
          </span>
        ) : (
          lastContact && <span className="mt-2 block text-[11px] text-muted">Último contacto {ago(lastContact)}</span>
        )}
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-muted">
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
  selected,
  onToggle,
  onSetSelected,
}: {
  leads: Lead[];
  lastContact: Map<string, string>;
  coldOf: (l: Lead) => number | null;
  onOpen: (id: string) => void;
  selected: string[];
  onToggle: (id: string) => void;
  onSetSelected: (ids: string[]) => void;
}) {
  const sorted = useMemo(() => [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)), [leads]);
  if (!sorted.length) return <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-12 text-center text-[13px] text-muted">Nada coincide.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <table className="w-full text-left text-[13px] md:min-w-[860px]">
        <thead className="border-b border-[var(--line)] text-[12px] text-muted">
          <tr>
            <th className="w-10 py-2.5 pr-0 pl-4">
              <input
                type="checkbox"
                checked={sorted.length > 0 && sorted.every((l) => selected.includes(l.id))}
                onChange={(e) => onSetSelected(e.target.checked ? sorted.map((l) => l.id) : [])}
                aria-label="Elegir todos los pedidos que se ven"
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </th>
            <th className="px-2 py-2.5 font-medium">Pedido</th>
            <th className="px-3 py-2.5 font-medium">Etapa</th>
            <th className="max-md:hidden px-3 py-2.5 font-medium">Responsable</th>
            <th className="px-3 py-2.5 text-right font-medium">Valor</th>
            <th className="max-md:hidden px-3 py-2.5 font-medium">Último contacto</th>
            <th className="max-md:hidden px-4 py-2.5 font-medium">Llegó</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {sorted.map((l) => {
            const cold = coldOf(l);
            const last = lastContact.get(l.id);
            return (
              <tr key={l.id} onClick={() => onOpen(l.id)} className={cn("cursor-pointer transition-colors hover:bg-white/[0.025]", selected.includes(l.id) && "bg-accent/[0.06]")}>
                <td className="w-10 py-2.5 pr-0 pl-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.includes(l.id)}
                    onChange={() => onToggle(l.id)}
                    aria-label={`Elegir ${l.name}`}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                </td>
                <td className="max-w-[360px] px-2 py-2.5 max-md:max-w-[180px]">
                  <button onClick={() => onOpen(l.id)} className="focus-ring block max-w-full text-left">
                    <span className="block truncate font-medium">
                      {l.name}
                      {l.company && <span className="font-normal text-muted"> · {l.company}</span>}
                    </span>
                    <span className="block truncate text-[12px] text-muted">{headline(l.idea)}</span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[13px]">
                    <span className={cn("h-1.5 w-1.5 rounded-full", STAGE[l.status].dot)} /> {STAGE[l.status].label}
                  </span>
                </td>
                <td className="max-md:hidden px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[13px] text-muted">
                    <Face who={l.owner} size={18} /> {l.owner ? PEOPLE[l.owner].name : "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{dealValue(l) ? usd(dealValue(l)) : "—"}</td>
                <td className={cn("max-md:hidden px-3 py-2.5 text-[13px]", cold !== null ? "text-amber-300" : "text-muted")}>
                  {cold !== null ? `Frío · ${cold} días` : last ? ago(last) : "—"}
                </td>
                <td className="max-md:hidden px-4 py-2.5 text-[13px] text-muted">{ago(l.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type Tab = "ficha" | "chat" | "cambios";


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
    { id: "ficha", label: "Ficha", icon: <Inbox size={14} /> },
    { id: "chat", label: "Conversación", icon: <MessagesSquare size={14} /> },
    { id: "cambios", label: "Cambios", icon: <History size={14} /> },
  ];

  return (
    <Drawer
      onClose={onClose}
      label={`Pedido de ${lead.name}`}
      width="max-w-2xl"
      header={
        <div>
          <p className="flex items-center gap-2 text-[12px] text-muted">
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
            <p className="mt-1 text-[14px]">{nextStep(lead)}</p>
          </div>

          {lead.status === "ganado" && projectSlug !== undefined && <WonProject leadId={lead.id} slug={projectSlug} />}

          {/* Responder */}
          <Reply lead={lead} onSent={(kind, label) => history?.onLog(kind, `Plantilla «${label}»`, dayKey())} />

          <div className="mt-3 flex flex-wrap gap-2">
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
                  <Chip key={c.id} on={lead.status === c.id} onClick={() => onStatus(c.id)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", c.dot)} /> {c.label}
                  </Chip>
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
                      "focus-ring flex items-center gap-1.5 rounded-md border py-0.5 pr-2.5 pl-0.5 text-[13px] transition-colors",
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
          <p className="rounded-lg border border-[var(--line)] bg-[var(--well-soft)] p-3.5 text-[14px] leading-relaxed whitespace-pre-wrap text-foreground/90">
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
            className={`${input} py-2.5 leading-relaxed`}
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
                <Trash2 size={14} /> Borrar pedido
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
        <Database size={16} /> Falta conectar la base de datos: por ahora los pedidos no se guardan.
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
        <ul className="mt-2 divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--well-soft)]">
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
