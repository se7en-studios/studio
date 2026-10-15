"use client";

// Ficha de un pedido: datos, etapa, responder, seguimiento, historial y notas,
// más la conversación interna y el registro de cambios.
import { useEffect, useState } from "react";
import { ArrowRight, CalendarClock, ClipboardList, Copy, History, Inbox, MessagesSquare, Trash2, Video } from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { nextStep, priority } from "@/lib/admin/brief";
import type { Lead, LeadOwner, LeadStatus } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { leadChannel } from "@/lib/admin/message-shared";
import { MEET_NEW } from "@/lib/admin/calls";
import { meetingLabel } from "@/lib/admin/sales-shared";
import type { PanelEvent } from "@/lib/admin/panel";
import { compareTasks, dayKey, type TaskLinks } from "@/lib/admin/task-shared";
import type { Activity, ActivityKind } from "@/lib/admin/activity-shared";
import { EventList } from "../feed";
import { Chip, Face, btnDanger, btnGhost, btnSecondary, cn, input, label as sectionLabel } from "../kit";
import { Chat } from "../mensajes/chat";
import { Drawer } from "../overlay";
import { ActivityLog } from "./activity";
import type { ContactFields } from "./actions";
import { DealFields } from "./deal";
import { LostReason } from "./lost";
import { Proposals } from "./proposals";
import { Reply } from "./reply";
import { WonProject } from "./won-project";
import { COLUMNS, STAGE } from "./stages";
import { QuickAdd, TaskDrawer, TaskRow } from "../tareas/task-ui";
import type { TasksApi } from "../tareas/use-tasks";

type Tab = "ficha" | "chat" | "cambios";

export function Detail({
  lead,
  me,
  room,
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
  deal: {
    onContact: (f: ContactFields) => void;
    onValue: (v: number | null) => void;
    onExpectedClose: (d: string | null) => void;
    onLost: (reason: string | null, note: string) => void;
  };
  history: {
    items: Activity[];
    onLog: (kind: ActivityKind, text: string, day: string) => void;
    onDelete: (id: string) => void;
  } | null;
  lead: Lead;
  me: LeadOwner;
  /** Sala fija de Meet de quien mira; null: se abre una nueva. */
  room: string | null;
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
  const [now] = useState(() => Date.now());
  // Una hora de gracia: la reunión que está en curso sigue figurando como agendada.
  const upcoming = !!lead.meeting_at && Date.parse(lead.meeting_at) >= now - 3_600_000;

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
          <h2 className="mt-1 truncate text-[22px] font-semibold tracking-[-0.02em]">
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
                {tab === t.id && <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
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
          <div className="rounded-lg border border-l-[3px] border-accent/20 border-l-accent bg-accent/[0.05] px-3.5 py-3">
            <p className="text-[11px] font-medium tracking-wide text-accent uppercase">Próximo paso</p>
            <p className="mt-1 text-[14px]">{nextStep(lead)}</p>
          </div>

          {lead.status === "ganado" && projectSlug !== undefined && <WonProject leadId={lead.id} slug={projectSlug} />}

          {lead.status === "perdido" && <LostReason key={lead.id} lead={lead} onSave={deal.onLost} />}

          {lead.meeting_at && (
            <p
              className={cn(
                "mt-3 flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-[13px]",
                upcoming ? "border-sky-400/30 bg-sky-400/[0.06] text-sky-300" : "border-[var(--line)] text-muted",
              )}
            >
              <CalendarClock size={14} className="shrink-0" />
              {upcoming ? "Reunión agendada" : "Tuvo reunión"} · {meetingLabel(lead.meeting_at)}
            </p>
          )}

          {/* Responder: el contacto se anota cuando se confirma que se mandó. */}
          <Reply lead={lead} onSent={history ? (kind, label) => history.onLog(kind, `Plantilla «${label}»`, dayKey()) : null} />

          <div className="mt-3 flex flex-wrap gap-2">
            {lead.channel === "whatsapp" && (
              <span className="inline-flex items-center gap-2 rounded-lg border border-[#25D366]/40 px-3 py-1.5 text-[13px] text-[#25D366]">
                <WhatsAppLogo size={14} /> Escribió por WhatsApp
              </span>
            )}
            <button onClick={copyAll} className={btnSecondary}>
              <Copy size={14} /> Copiar datos
            </button>
            {/* La sala se abre en otra pestaña y la reunión queda en el historial del pedido. */}
            <a
              href={room ?? MEET_NEW}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => history?.onLog("reunion", "Reunión por Meet desde el panel", dayKey())}
              title={history ? "Abre la sala de Meet y anota la reunión en el historial" : "Abre la sala de Meet"}
              className={btnSecondary}
            >
              <Video size={14} /> Reunión por Meet
            </a>
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
                  <dt className="text-[11px] font-medium tracking-[0.1em] text-muted uppercase">{k}</dt>
                  <dd className="mt-0.5 text-[13px] break-words">{v}</dd>
                </div>
              ))}
          </dl>

          {lead.kickoff && (
            <>
              <p className={cn(sectionLabel, "mt-6 flex items-center gap-1.5")}>
                <ClipboardList size={12} /> Kickoff que mandó el cliente
              </p>
              <p className="rounded-lg border border-[var(--line)] bg-[var(--well-soft)] p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                {lead.kickoff}
              </p>
            </>
          )}

          <DealFields lead={lead} onContact={deal.onContact} onValue={deal.onValue} onExpectedClose={deal.onExpectedClose} />

          <Proposals key={lead.id} lead={lead} onStatus={onStatus} />

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
