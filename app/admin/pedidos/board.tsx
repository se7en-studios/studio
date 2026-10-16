"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CalendarClock, Database, Download, LayoutGrid, List, RotateCcw, Search, Snowflake } from "lucide-react";
import type { Lead, LeadOwner, LeadStatus } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { compareTasks, dayKey, dueLabel, type Task, type TaskLinks } from "@/lib/admin/task-shared";
import { coldDays, isContact, lastContacts, type Activity, type ActivityKind } from "@/lib/admin/activity-shared";
import { dealValue, pipelineValue, weightedPipeline, winRate } from "@/lib/admin/metrics";
import { RETAKE_AFTER_DAYS, toRetake } from "@/lib/admin/sales-shared";
import { deleteLead, setNotes, setOwner, setStatus } from "../actions";
import { Kpi, PageHeader, Segmented, btnSecondary, cn, kpiRow, searchInput, usd, usdShort } from "../kit";
import { useStoredChoice, useToast } from "../overlay";
import { BulkBar } from "./bulk-bar";
import { deleteActivity, logActivity, setContact, setExpectedClose, setLost, setValue } from "./actions";
import { NewLeadButton } from "./new-lead";
import { downloadCsv } from "./csv";
import { Detail } from "./detail";
import { LeadCard } from "./lead-card";
import { LeadTable } from "./lead-table";
import { COLD_HINT, COLUMNS, DRAG_TYPE, FOLLOW_UP, OPEN_STAGES, STAGE, rank } from "./stages";
import { useTasks } from "../tareas/use-tasks";

// Tablero de pedidos: una columna por etapa (Nuevo → Ganado/Perdido), o una
// lista. Cada tarjeta resume el pedido para decidir rápido: qué quiere, cuánto
// vale, quién lo toma y cuál es el próximo paso. Los cambios se ven al
// instante y se guardan en segundo plano; si el servidor falla, se deshacen.

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
  room,
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
  /** Sala fija de Meet de quien mira (MEET_LINK_<NOMBRE>); null: se abre una nueva. */
  room: string | null;
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
  const [retakeOnly, setRetakeOnly] = useState(false);
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
      if (retakeOnly && !toRetake(l, now)) return false;
      if (!needle) return true;
      return [l.name, l.company, l.email, l.idea, l.project_type, l.phone ?? ""].some((v) => v.toLowerCase().includes(needle));
    });
  }, [leads, q, owner, coldOnly, coldOf, noStepOnly, needsStep, retakeOnly, now]);

  const byStage = useMemo(() => {
    const out = Object.fromEntries(COLUMNS.map((c) => [c.id, [] as Lead[]])) as Record<LeadStatus, Lead[]>;
    for (const l of visible) out[l.status]?.push(l);
    for (const k of Object.keys(out) as LeadStatus[]) out[k].sort((a, b) => rank(b) - rank(a));
    return out;
  }, [visible]);

  const stats = useMemo(() => {
    const rate = winRate(leads);
    return {
      fresh: leads.filter((l) => l.status === "nuevo").length,
      active: leads.filter((l) => l.status === "contactado" || l.status === "propuesta").length,
      pipeline: pipelineValue(leads),
      won: leads.filter((l) => l.status === "ganado").reduce((sum, l) => sum + dealValue(l), 0),
      cold: leads.filter((l) => coldOf(l) !== null).length,
      winRate: rate === null ? null : Math.round(rate * 100),
      forecast: weightedPipeline(leads),
      noStep: leads.filter(needsStep).length,
      retake: leads.filter((l) => toRetake(l, now)).length,
    };
  }, [leads, coldOf, needsStep, now]);

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
      // Al perderlo se abre la ficha, que pide el motivo.
      if (lead && lead.status !== s && s === "perdido") setOpenId(id);
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
        {(stats.retake > 0 || retakeOnly) && (
          <button
            onClick={() => setRetakeOnly((v) => !v)}
            aria-pressed={retakeOnly}
            title={`Perdidos hace más de ${RETAKE_AFTER_DAYS} días, salvo los que no eran clientes. Tocá para filtrarlos.`}
            className={cn(btnSecondary, retakeOnly && "border-accent/60 text-foreground")}
          >
            <RotateCcw size={14} /> Para retomar · {stats.retake}
          </button>
        )}
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
                    <h2 className="adm-title text-[12px]">{col.label}</h2>
                    <span className="rounded-full bg-white/[0.06] px-1.5 py-px font-mono text-[11px] text-muted">{items.length}</span>
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
                        retake={toRetake(l, now)}
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
          room={room}
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
            onExpectedClose: (d) => update(open.id, { expected_close: d }, () => setExpectedClose(open.id, d)),
            onLost: (reason, note) => update(open.id, { lost_reason: reason, lost_note: note }, () => setLost(open.id, reason, note)),
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
