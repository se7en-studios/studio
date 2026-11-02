"use client";

import { useState } from "react";
import { Dialog } from "../overlay";
import {
  MapPin,
  Edit3,
  X,
  Send,
  Copy,
  Check,
  Sparkles,
  Calculator,
  ExternalLink,
  Phone,
  PhoneOff,
  Shuffle,
  Snowflake,
  Zap,
} from "lucide-react";
import type { ProspectLead } from "@/data/prospects";
import type { LeadStatus } from "./prospectos-client";
import { PEOPLE } from "@/lib/admin/people";
import { whoWhen, type ProspectState } from "@/lib/admin/prospect-shared";
import { coldDays, lastContactAt } from "@/lib/admin/prospect-followup";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { PadelRoiCalculator } from "./padel-roi-calculator";
import { useSoundFx } from "@/lib/use-sound-fx";
import { Chip, Face, btnPrimary, btnSecondary, cn, input as inputCls, usd, usdShort } from "../kit";
import { FX_RATE, STAGES } from "./stages";
import type { ProspectTemplate } from "@/lib/admin/prospect-template-shared";

interface KanbanProps {
  leads: ProspectLead[];
  leadStatuses: Record<string, LeadStatus>;
  leadNotes: Record<string, string>;
  leadState: Record<string, ProspectState>;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onSaveNote: (id: string, note: string) => void;
  onOpenWhatsApp: (lead: ProspectLead, text?: string) => void;
  /** «Ahora» (ms), para contar los días sin respuesta. */
  now: number;
  templates: ProspectTemplate[];
  /** Arma el mensaje de un prospecto: `pick` es una plantilla, «auto» (al azar) u «original». */
  buildMessage: (lead: ProspectLead, pick?: string) => { id: string; text: string };
}

const NEXT: Partial<Record<LeadStatus, { to: LeadStatus; label: string }>> = {
  nuevo: { to: "contactado", label: "Contactado" },
  contactado: { to: "en_charla", label: "En charla" },
  en_charla: { to: "ganado", label: "Ganado" },
};

const ICON_BTN = "focus-ring rounded-md p-1.5 transition-colors";

/** Una tarjeta del tablero: lo justo para decidir a quién escribir y ver quién ya lo hizo. */
function BoardCard({
  lead,
  status,
  meta,
  cold,
  onOpen,
  onNote,
  onMove,
  onWhatsApp,
}: {
  lead: ProspectLead;
  status: LeadStatus;
  meta?: ProspectState;
  /** Días sin respuesta si ya es para retomar. */
  cold: number | null;
  onOpen: (lead: ProspectLead) => void;
  onNote: (lead: ProspectLead) => void;
  onMove: (id: string, status: LeadStatus) => void;
  onWhatsApp: (lead: ProspectLead) => void;
}) {
  const next = NEXT[status];
  const note = meta?.note;
  return (
    <article className="group rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--shadow-card)] transition-[border-color,transform] hover:-translate-y-px hover:border-[var(--line-strong)]">
      <button type="button" onClick={() => onOpen(lead)} className="focus-ring block w-full text-left">
        <p className="text-[13px] leading-snug font-medium">{lead.name}</p>
        <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">
            {lead.city} · {lead.category}
          </span>
        </p>
        <p className="mt-1.5 line-clamp-3 text-[13px] leading-snug text-foreground/75">{lead.painPoint}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          <span className="rounded bg-white/[0.05] px-1.5 py-px text-[11px] text-muted">{usd(lead.estimatedBudgetUsd)}</span>
          <span className="rounded bg-white/[0.05] px-1.5 py-px text-[11px] text-muted">{lead.websiteStatus}</span>
        </div>
        {meta?.contacted_by && (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-sky-400/[0.07] px-2 py-1 text-[11px] text-sky-300">
            <Face who={meta.contacted_by} size={14} />
            <span className="truncate">Contactó {whoWhen(meta.contacted_by, meta.contacted_at)}</span>
          </span>
        )}
        {meta?.last_contact_at && meta.last_contact_by && meta.last_contact_at !== meta.contacted_at && (
          <span className="mt-2 block truncate text-[11px] text-muted">Último mensaje: {whoWhen(meta.last_contact_by, meta.last_contact_at)}</span>
        )}
        {cold !== null && (
          <span className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-400/[0.07] px-2 py-1 text-[11px] text-amber-300">
            <Snowflake size={12} className="shrink-0" /> Sin respuesta hace {cold} días
          </span>
        )}
        {note && (
          <span className="mt-2 block line-clamp-2 rounded-md bg-white/[0.05] px-2 py-1 text-[11px] text-muted">
            {meta?.note_by && <span className="text-foreground/85">{PEOPLE[meta.note_by].name}: </span>}
            {note}
          </span>
        )}
      </button>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-[var(--line)] pt-2.5">
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onWhatsApp(lead)}
            title="Abrir WhatsApp con el guion preparado"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
          >
            <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => onNote(lead)}
            title={note ? "Editar la nota" : "Agregar una nota"}
            aria-label={note ? "Editar la nota" : "Agregar una nota"}
            className={cn(ICON_BTN, note ? "bg-sky-400/[0.07] text-sky-300" : "text-muted hover:bg-white/[0.05] hover:text-foreground")}
          >
            <Edit3 size={14} />
          </button>
          {(status === "nuevo" || status === "contactado") && (
            <button
              type="button"
              onClick={() => onMove(lead.id, "numero_equivocado")}
              title="Marcar como número equivocado"
              aria-label="Marcar como número equivocado"
              className={cn(ICON_BTN, "text-muted hover:bg-white/[0.05] hover:text-foreground")}
            >
              <PhoneOff size={14} />
            </button>
          )}
        </div>
        {next && (
          <button
            type="button"
            onClick={() => onMove(lead.id, next.to)}
            title={`Pasar a ${next.label.toLowerCase()}`}
            className="focus-ring shrink-0 rounded-md px-1.5 py-0.5 text-[12px] text-muted transition-colors hover:bg-accent/10 hover:text-accent"
          >
            {next.label} →
          </button>
        )}
        {status === "numero_equivocado" && (
          <button
            type="button"
            onClick={() => onMove(lead.id, "nuevo")}
            title="Volver a Sin contactar con el número corregido"
            className="focus-ring shrink-0 rounded-md px-1.5 py-0.5 text-[12px] text-muted transition-colors hover:bg-accent/10 hover:text-accent"
          >
            ← Reabrir
          </button>
        )}
      </div>
    </article>
  );
}

export function ProspectosKanban({
  leads,
  leadStatuses,
  leadNotes,
  leadState,
  onStatusChange,
  onSaveNote,
  onOpenWhatsApp,
  now,
  templates,
  buildMessage,
}: KanbanProps) {
  const sound = useSoundFx();
  const [activeNoteLead, setActiveNoteLead] = useState<ProspectLead | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [activeDossierLead, setActiveDossierLead] = useState<ProspectLead | null>(null);
  const [dossierTab, setDossierTab] = useState<"estrategia" | "guion" | "bitacora">("estrategia");
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [dossierMsg, setDossierMsg] = useState<{ id: string; text: string } | null>(null);
  const [showDossierRoiCalc, setShowDossierRoiCalc] = useState(false);

  const handleOpenDossier = (lead: ProspectLead) => {
    setActiveDossierLead(lead);
    setDossierMsg(buildMessage(lead));
    setTempNote(leadNotes[lead.id] || "");
    sound.tick();
  };

  const handleOpenNoteModal = (lead: ProspectLead) => {
    setActiveNoteLead(lead);
    setTempNote(leadNotes[lead.id] || "");
    sound.tick();
  };

  const handleSaveModalNote = () => {
    if (activeNoteLead) {
      onSaveNote(activeNoteLead.id, tempNote);
      setActiveNoteLead(null);
      sound.success();
    } else if (activeDossierLead) {
      onSaveNote(activeDossierLead.id, tempNote);
      sound.success();
    }
  };

  const handleCopyPitch = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPitch(true);
    sound.tick();
    setTimeout(() => setCopiedPitch(false), 2000);
  };

  const handleMove = (id: string, newStatus: LeadStatus) => {
    if (newStatus === "ganado") {
      sound.success();
    } else {
      sound.pop();
    }
    onStatusChange(id, newStatus);
  };

  return (
    <div className="relative">
      {/* Tablero: todas las etapas a la vista, se acomodan según el ancho */}
      <div className="grid grid-cols-1 gap-3 pb-6 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-6">
        {STAGES.map((col) => {
          const colLeads = leads.filter((l) => (leadStatuses[l.id] || "nuevo") === col.id);
          // Los contactados: arriba los que llevan más tiempo sin respuesta.
          if (col.id === "contactado") {
            colLeads.sort((a, b) => (lastContactAt(leadState[a.id]) ?? "").localeCompare(lastContactAt(leadState[b.id]) ?? ""));
          }
          const totalUsd = colLeads.reduce((acc, l) => acc + l.estimatedBudgetUsd, 0);
          return (
            <section key={col.id} className="min-w-0 rounded-xl border border-[var(--line)] bg-white/[0.012] p-2">
              <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                <span className={cn("h-2 w-2 rounded-full", col.dot)} />
                <h2 className="adm-title text-[12px]">{col.label}</h2>
                <span className="rounded-full bg-white/[0.06] px-1.5 py-px font-mono text-[11px] text-muted">{colLeads.length}</span>
                <span className="ml-auto text-[11px] text-muted">{totalUsd ? usdShort(totalUsd) : col.hint}</span>
              </header>
              <div className="admin-scroll max-h-[calc(100vh-20rem)] space-y-2 overflow-y-auto pr-0.5">
                {colLeads.map((lead) => (
                  <BoardCard
                    key={lead.id}
                    lead={lead}
                    status={col.id}
                    meta={leadState[lead.id]}
                    cold={coldDays(leadState[lead.id], now)}
                    onOpen={handleOpenDossier}
                    onNote={handleOpenNoteModal}
                    onMove={handleMove}
                    onWhatsApp={onOpenWhatsApp}
                  />
                ))}
              </div>
              {!colLeads.length && (
                <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-3.5 text-center text-[12px] text-muted">
                  Sin prospectos en esta etapa.
                </p>
              )}
            </section>
          );
        })}
      </div>

      {/* Modal Ficha de Inteligencia B2B Completa (Quick Peek Dossier) */}
      {activeDossierLead && (
        <Dialog
          onClose={() => setActiveDossierLead(null)}
          label={`Ficha · ${activeDossierLead.name}`}
          width="max-w-3xl"
        >
          {/* Cabecera del Dossier */}
          <div className="border-b border-[var(--line)] bg-[var(--well)] px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 adm-label text-[11px] text-accent">
                    {activeDossierLead.category}
                  </span>
                  <span className="adm-label text-[11px] text-muted flex items-center gap-1">
                    <MapPin size={11} className="text-accent" />
                    {activeDossierLead.city}, {activeDossierLead.province}
                  </span>
                </div>
                <h3 className="adm-title mt-1.5 text-[20px] text-foreground flex items-center gap-2">
                  <span>{activeDossierLead.name}</span>
                  {activeDossierLead.currentSite && (
                    <a
                      href={activeDossierLead.currentSite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted hover:text-accent transition-colors"
                      title="Visitar web actual"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </h3>
                <p className="adm-label mt-1 text-[11px] text-muted">
                  {activeDossierLead.address} · Tel: {activeDossierLead.phone}
                  {leadState[activeDossierLead.id]?.contacted_by && (
                    <> · Contactó {whoWhen(leadState[activeDossierLead.id].contacted_by, leadState[activeDossierLead.id].contacted_at)}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/admin/pedidos"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(btnSecondary, "hidden md:inline-flex")}
                  title="Crear borrador de propuesta interactiva para este cliente"
                >
                  <Sparkles size={12} />
                  <span>Crear Propuesta</span>
                </a>
                <div className="text-right hidden sm:block">
                  <span className="adm-label text-[11px] block text-muted">Ticket Estimado</span>
                  <span className="adm-num text-[20px] text-emerald-400">
                    USD ${activeDossierLead.estimatedBudgetUsd.toLocaleString("es-AR")}
                  </span>
                  <span className="adm-label text-[11px] block text-muted">
                    ~${((activeDossierLead.estimatedBudgetUsd * FX_RATE) / 1000000).toFixed(2)}M ARS
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveDossierLead(null)}
                  className="rounded-full p-1.5 text-muted hover:text-foreground hover:bg-[var(--panel-2)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Etapa: se cambia desde acá */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-4">
              {STAGES.map((col) => (
                <Chip
                  key={col.id}
                  on={(leadStatuses[activeDossierLead.id] || "nuevo") === col.id}
                  onClick={() => handleMove(activeDossierLead.id, col.id)}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", col.dot)} />
                  {col.label}
                </Chip>
              ))}
            </div>
          </div>

          {/* Pestañas */}
          <div className="flex gap-1 border-b border-[var(--line)] px-6">
            {(
              [
                { id: "estrategia", label: "Diagnóstico y solución", icon: <Sparkles size={14} /> },
                { id: "guion", label: "Guion y WhatsApp", icon: <Zap size={14} /> },
                { id: "bitacora", label: "Notas", icon: <Edit3 size={14} /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setDossierTab(t.id);
                  sound.tick();
                }}
                aria-pressed={dossierTab === t.id}
                className={cn(
                  "focus-ring relative flex items-center gap-1.5 px-3 pt-3 pb-2.5 text-[13px] transition-colors",
                  dossierTab === t.id ? "font-semibold text-foreground" : "text-muted hover:text-foreground",
                )}
              >
                {t.icon}
                {t.label}
                {dossierTab === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-foreground" />}
              </button>
            ))}
          </div>

          {/* Contenido de la Pestaña Activa */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-16rem)] admin-scroll space-y-4">
            {dossierTab === "estrategia" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4">
                  <span className="adm-label text-[11px] text-muted uppercase tracking-wider block mb-1">
                    Estado Digital Detectado
                  </span>
                  <p className="adm-title text-sm text-foreground">
                    {activeDossierLead.websiteStatus}
                  </p>
                </div>

                <div className="rounded-xl border adm-badge-amber p-4">
                  <span className="adm-label text-[11px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Sparkles size={12} />
                    Dolor Crítico & Fuga de Ventas
                  </span>
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {activeDossierLead.painPoint}
                  </p>
                </div>

                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <span className="adm-label text-[11px] text-accent font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                    <Zap size={12} />
                    Propuesta de Valor & Solución Se7en
                  </span>
                  <p className="text-[13px] leading-relaxed text-foreground">
                    {activeDossierLead.recommendedSolution}
                  </p>
                  <div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="adm-label text-[11px]">Stack Sugerido:</span>
                    <span className="rounded-md bg-[var(--well)] px-2 py-0.5 border border-[var(--line)]">Next.js 16</span>
                    <span className="rounded-md bg-[var(--well)] px-2 py-0.5 border border-[var(--line)]">Tailwind CSS</span>
                    <span className="rounded-md bg-[var(--well)] px-2 py-0.5 border border-[var(--line)]">Cloudflare Edge</span>
                    <span className="rounded-md bg-[var(--well)] px-2 py-0.5 border border-[var(--line)]">WhatsApp Direct API</span>
                  </div>
                </div>
              </div>
            )}

            {dossierTab === "guion" && (
              <div className="space-y-4">
                {/* Qué plantilla se usa para este prospecto */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="adm-label">Plantilla del mensaje</span>
                    {activeDossierLead.category === "Club de Pádel & Deporte" && (
                      <Chip
                        on={showDossierRoiCalc}
                        onClick={() => {
                          setShowDossierRoiCalc((v) => !v);
                          sound.pop();
                        }}
                      >
                        <Calculator size={12} />
                        {showDossierRoiCalc ? "Ocultar ROI" : "Simular ROI de canchas"}
                      </Chip>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Chip
                      on={false}
                      onClick={() => {
                        setDossierMsg(buildMessage(activeDossierLead, "auto"));
                        sound.tick();
                      }}
                    >
                      <Shuffle size={12} /> Otra variante
                    </Chip>
                    {templates
                      .filter((t) => t.active)
                      .map((t) => (
                        <Chip
                          key={t.id}
                          on={dossierMsg?.id === t.id}
                          onClick={() => {
                            setDossierMsg(buildMessage(activeDossierLead, t.id));
                            sound.tick();
                          }}
                        >
                          {t.name}
                        </Chip>
                      ))}
                    <Chip
                      on={dossierMsg?.id === "original"}
                      onClick={() => {
                        setDossierMsg(buildMessage(activeDossierLead, "original"));
                        sound.tick();
                      }}
                    >
                      Guion largo
                    </Chip>
                  </div>
                </div>

                {showDossierRoiCalc && (
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4">
                    <PadelRoiCalculator initialClubName={activeDossierLead.name} initialPhone={activeDossierLead.phone} />
                  </div>
                )}

                {/* El mensaje tal como va a salir */}
                <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="adm-label flex items-center gap-1">
                      <Zap size={11} className="text-accent" />
                      Mensaje
                    </span>
                    <button
                      type="button"
                      onClick={() => dossierMsg && handleCopyPitch(dossierMsg.text)}
                      className={cn(btnSecondary, "px-2.5 py-1 text-[12px]")}
                    >
                      {copiedPitch ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedPitch ? "Copiado" : "Copiar"}</span>
                    </button>
                  </div>
                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground">{dossierMsg?.text}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => dossierMsg && onOpenWhatsApp(activeDossierLead, dossierMsg.text)}
                    className="focus-ring flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-[13px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
                  >
                    <WhatsAppLogo className="h-4 w-4 fill-current" />
                    <span>Abrir WhatsApp con este mensaje</span>
                  </button>

                  {activeDossierLead.phone && (
                    <a href={`tel:${activeDossierLead.phone}`} className={btnSecondary}>
                      <Phone size={14} />
                      <span>Llamar</span>
                    </a>
                  )}
                </div>
              </div>
            )}

            {dossierTab === "bitacora" && (
              <div className="space-y-4">
                <label className="adm-label block text-xs">
                  Notas internas, objeciones y compromisos de reunión:
                </label>
                {leadState[activeDossierLead.id]?.note_by && (
                  <p className="adm-label text-[11px] text-muted">
                    Última nota: {whoWhen(leadState[activeDossierLead.id].note_by, leadState[activeDossierLead.id].note_at)}
                  </p>
                )}
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Ej: Conversé con el gerente. Le interesa armar un turnero similar a Muzzaga Pádel. Coordinamos demo para este viernes..."
                  rows={5}
                  className={inputCls}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleSaveModalNote}
                    className={btnPrimary}
                  >
                    <Send size={13} />
                    <span>Guardar Bitácora</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Modal para editar nota de prospecto */}
      {activeNoteLead && (
        <Dialog
          onClose={() => setActiveNoteLead(null)}
          label={`Bitácora · ${activeNoteLead.name}`}
          width="max-w-lg"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--well)] px-6 py-4">
            <div>
              <h4 className="adm-title text-base text-foreground">
                Bitácora Interna · {activeNoteLead.name}
              </h4>
              <p className="adm-label text-[11px] text-muted mt-0.5">
                {activeNoteLead.city} · Ticket est: USD ${activeNoteLead.estimatedBudgetUsd}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveNoteLead(null)}
              className="rounded-full p-1 text-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-6">
            <label className="adm-label block mb-1.5 text-xs">
              Notas sobre el contacto, objeciones o próximos pasos:
            </label>
            <textarea
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Ej: Hablé con Matías. Le gustó la demo de canchas. Nos juntamos por Meet el jueves 16hs para revisar formas de pago..."
              rows={4}
              className={inputCls}
            />

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setActiveNoteLead(null)}
                className={btnSecondary}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModalNote}
                className={btnPrimary}
              >
                <Send size={13} />
                Guardar Nota
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
