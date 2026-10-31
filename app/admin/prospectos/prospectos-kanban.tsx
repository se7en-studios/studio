"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Flame,
  Edit3,
  X,
  Send,
  CheckCircle2,
  FileText,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  Phone,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { ProspectLead } from "@/data/prospects";
import type { LeadStatus } from "./prospectos-client";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { useSoundFx } from "@/lib/use-sound-fx";

interface KanbanProps {
  leads: ProspectLead[];
  leadStatuses: Record<string, LeadStatus>;
  leadNotes: Record<string, string>;
  onStatusChange: (id: string, status: LeadStatus) => void;
  onSaveNote: (id: string, note: string) => void;
  onOpenWhatsApp: (lead: ProspectLead) => void;
}

const COLUMNS: {
  id: LeadStatus;
  title: string;
  badge: string;
  accent: string;
  icon: string;
}[] = [
  {
    id: "nuevo",
    title: "Sin Contactar",
    badge: "border-[var(--line)] bg-[var(--well)] text-muted",
    accent: "text-muted",
    icon: "📥",
  },
  {
    id: "contactado",
    title: "Loom / Enviado",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
    accent: "text-amber-600 dark:text-amber-400",
    icon: "🎥",
  },
  {
    id: "en_charla",
    title: "En Conversación",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
    accent: "text-sky-600 dark:text-sky-400",
    icon: "💬",
  },
  {
    id: "ganado",
    title: "¡Cliente Ganado!",
    badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold",
    accent: "text-emerald-600 dark:text-emerald-400",
    icon: "🏆",
  },
  {
    id: "descartado",
    title: "Descartado",
    badge: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
    accent: "text-red-600 dark:text-red-400",
    icon: "❌",
  },
];

const FX_RATE = 1350;

export function ProspectosKanban({
  leads,
  leadStatuses,
  leadNotes,
  onStatusChange,
  onSaveNote,
  onOpenWhatsApp,
}: KanbanProps) {
  const sound = useSoundFx();
  const [activeNoteLead, setActiveNoteLead] = useState<ProspectLead | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [activeDossierLead, setActiveDossierLead] = useState<ProspectLead | null>(null);
  const [dossierTab, setDossierTab] = useState<"estrategia" | "guion" | "bitacora">("estrategia");
  const [copiedPitch, setCopiedPitch] = useState(false);

  const handleOpenDossier = (lead: ProspectLead) => {
    setActiveDossierLead(lead);
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
      {/* Tablero Kanban Scrollable Horizontal */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x admin-scroll">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => (leadStatuses[l.id] || "nuevo") === col.id);
          const totalUsd = colLeads.reduce((acc, l) => acc + (l.estimatedBudgetUsd || 1200), 0);
          const totalArsMillions = ((totalUsd * FX_RATE) / 1000000).toFixed(1);

          return (
            <div
              key={col.id}
              className="flex w-80 shrink-0 flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5 sm:w-88"
            >
              {/* Cabecera de Columna con Rollup Financiero */}
              <div className="border-b border-[var(--line)] pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.icon}</span>
                    <h3 className="adm-title text-[12px] text-foreground">
                      {col.title}
                    </h3>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 adm-label ${col.badge}`}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Rollup Financiero en USD y ARS */}
                <div className="mt-2 flex items-baseline justify-between rounded-lg bg-[var(--well)] px-2.5 py-1.5 text-[11px] border border-[var(--line)]">
                  <span className="adm-label text-[10px]">Total:</span>
                  <div className="text-right">
                    <span className={`adm-num font-bold ${col.accent}`}>
                      USD ${totalUsd.toLocaleString("es-AR")}
                    </span>
                    <span className="ml-1 adm-num text-[10px] text-muted">
                      (~${totalArsMillions}M ARS)
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Tarjetas de Deals */}
              <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-22rem)] pr-1 admin-scroll">
                {colLeads.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--line)] text-center adm-label text-[10px] text-muted/60">
                    <span>Sin prospectos</span>
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const status = leadStatuses[lead.id] || "nuevo";
                    const note = leadNotes[lead.id];
                    const isHot = status === "contactado" || status === "en_charla";

                    return (
                      <div
                        key={lead.id}
                        className="group relative rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5 transition-all hover:border-[var(--line-strong)] hover:bg-[var(--panel-3)]"
                      >
                        {/* Cabecera de la Tarjeta */}
                        <div
                          onClick={() => handleOpenDossier(lead)}
                          className="flex items-start justify-between gap-2 cursor-pointer"
                        >
                          <div>
                            <p className="adm-title text-[13px] text-foreground group-hover:text-accent transition-colors">
                              {lead.name}
                            </p>
                            <p className="mt-1 flex items-center gap-1 adm-label text-[10px] text-muted">
                              <MapPin size={11} className="text-accent shrink-0" />
                              {lead.city} · {lead.category}
                            </p>
                          </div>

                          {isHot && (
                            <span
                              title="Deal con interacción activa"
                              className="flex items-center gap-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 adm-label text-[9px] text-amber-600 dark:text-amber-300"
                            >
                              <Flame size={10} className="fill-current" />
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Valor del Ticket y Estado Actual */}
                        <div
                          onClick={() => handleOpenDossier(lead)}
                          className="mt-2.5 flex items-center justify-between border-t border-[var(--line)] pt-2 text-xs cursor-pointer"
                        >
                          <span className="adm-label text-[10px]">Ticket est.:</span>
                          <span className="adm-num text-sm text-foreground">
                            USD ${lead.estimatedBudgetUsd.toLocaleString("es-AR")}
                          </span>
                        </div>

                        {/* Fuga / Diagnóstico rápido */}
                        <p
                          onClick={() => handleOpenDossier(lead)}
                          className="mt-2 text-[12px] leading-relaxed text-muted bg-[var(--well)] p-2 rounded-lg border border-[var(--line)] cursor-pointer hover:border-[var(--line-strong)] transition-colors"
                        >
                          💡 {lead.painPoint}
                        </p>

                        {/* Nota interna si existe */}
                        {note && (
                          <div className="mt-2 rounded-lg bg-[var(--well)] border border-sky-500/20 p-2 text-[11px] text-sky-600 dark:text-sky-300">
                            <span className="adm-label text-[9.5px] text-sky-500 font-bold">Nota:</span> {note}
                          </div>
                        )}

                        {/* Barra de Acciones de la Tarjeta */}
                        <div className="mt-3 flex items-center justify-between gap-1 border-t border-[var(--line)] pt-2">
                          <div className="flex items-center gap-1">
                            {/* Botón WhatsApp */}
                            <button
                              type="button"
                              onClick={() => {
                                onOpenWhatsApp(lead);
                                if (status === "nuevo") {
                                  handleMove(lead.id, "contactado");
                                }
                              }}
                              title="Abrir chat de WhatsApp con pitch preparado"
                              className="flex items-center gap-1 rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black px-2.5 py-1 text-[11px] font-semibold transition-opacity hover:opacity-90"
                            >
                              <WhatsAppLogo className="h-3 w-3 fill-current" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Botón Ficha Completa */}
                            <button
                              type="button"
                              onClick={() => handleOpenDossier(lead)}
                              title="Abrir Ficha de Inteligencia B2B completa"
                              className="flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--well)] px-2 py-1 text-[10.5px] text-muted hover:text-foreground hover:border-foreground transition-colors"
                            >
                              <FileText size={12} />
                              <span className="hidden sm:inline">Ficha</span>
                            </button>

                            {/* Botón Nota */}
                            <button
                              type="button"
                              onClick={() => handleOpenNoteModal(lead)}
                              title={note ? "Editar nota interna" : "Agregar nota interna"}
                              className={`rounded-full p-1 transition-colors ${
                                note
                                  ? "text-sky-600 dark:text-sky-400 bg-sky-500/10"
                                  : "text-muted hover:text-foreground hover:bg-[var(--well)]"
                              }`}
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>

                          {/* Selector rápido para mover de etapa */}
                          <div className="flex items-center gap-1">
                            {status === "nuevo" && (
                              <button
                                type="button"
                                onClick={() => handleMove(lead.id, "contactado")}
                                title="Marcar como Contactado"
                                className="rounded-full border border-[var(--line-strong)] bg-[var(--well)] px-2 py-0.5 adm-label text-[9.5px] text-muted hover:text-foreground hover:border-foreground"
                              >
                                Contactar →
                              </button>
                            )}

                            {status === "contactado" && (
                              <button
                                type="button"
                                onClick={() => handleMove(lead.id, "en_charla")}
                                title="Pasar a En conversación"
                                className="rounded-full border border-[var(--line-strong)] bg-[var(--well)] px-2 py-0.5 adm-label text-[9.5px] text-muted hover:text-foreground hover:border-foreground"
                              >
                                En charla →
                              </button>
                            )}

                            {status === "en_charla" && (
                              <button
                                type="button"
                                onClick={() => handleMove(lead.id, "ganado")}
                                title="¡Cerrar como Cliente Ganado!"
                                className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 adm-label text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-black"
                              >
                                🏆 Ganado!
                              </button>
                            )}

                            {status === "ganado" && (
                              <span className="adm-label text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Cerrado
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Ficha de Inteligencia B2B Completa (Quick Peek Dossier) */}
      <AnimatePresence>
        {activeDossierLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-3xl rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Cabecera del Dossier */}
              <div className="border-b border-[var(--line)] bg-[var(--well)] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 adm-label text-[10px] text-accent">
                        {activeDossierLead.category}
                      </span>
                      <span className="adm-label text-[11px] text-muted flex items-center gap-1">
                        <MapPin size={11} className="text-accent" />
                        {activeDossierLead.city}, {activeDossierLead.province}
                      </span>
                    </div>
                    <h3 className="adm-title mt-1.5 text-xl text-foreground flex items-center gap-2">
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
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <span className="adm-label text-[10px] block text-muted">Ticket Estimado</span>
                      <span className="adm-num text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        USD ${activeDossierLead.estimatedBudgetUsd.toLocaleString("es-AR")}
                      </span>
                      <span className="adm-label text-[10px] block text-muted">
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

                {/* Stepper del Ciclo de Ventas */}
                <div className="mt-4 pt-4 border-t border-[var(--line)]">
                  <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1 admin-scroll">
                    {COLUMNS.map((col) => {
                      const currentStatus = leadStatuses[activeDossierLead.id] || "nuevo";
                      const isCurrent = currentStatus === col.id;

                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => handleMove(activeDossierLead.id, col.id)}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] transition-all shrink-0 ${
                            isCurrent
                              ? "bg-foreground text-background font-bold shadow-sm"
                              : "border border-[var(--line)] bg-[var(--panel)] text-muted hover:text-foreground hover:border-[var(--line-strong)]"
                          }`}
                        >
                          <span>{col.icon}</span>
                          <span>{col.title}</span>
                          {isCurrent && <CheckCircle2 size={12} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selector de Pestañas */}
              <div className="flex border-b border-[var(--line)] bg-[var(--panel)] px-6">
                <button
                  type="button"
                  onClick={() => {
                    setDossierTab("estrategia");
                    sound.tick();
                  }}
                  className={`flex items-center gap-1.5 border-b-2 py-3 px-3 adm-label text-xs transition-colors ${
                    dossierTab === "estrategia"
                      ? "border-accent text-accent font-bold"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <Sparkles size={13} />
                  <span>Diagnóstico & Solución</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDossierTab("guion");
                    sound.tick();
                  }}
                  className={`flex items-center gap-1.5 border-b-2 py-3 px-3 adm-label text-xs transition-colors ${
                    dossierTab === "guion"
                      ? "border-accent text-accent font-bold"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <Zap size={13} />
                  <span>Outreach & WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDossierTab("bitacora");
                    sound.tick();
                  }}
                  className={`flex items-center gap-1.5 border-b-2 py-3 px-3 adm-label text-xs transition-colors ${
                    dossierTab === "bitacora"
                      ? "border-accent text-accent font-bold"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  <Edit3 size={13} />
                  <span>Bitácora Interna</span>
                </button>
              </div>

              {/* Contenido de la Pestaña Activa */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-17rem)] admin-scroll space-y-4">
                {dossierTab === "estrategia" && (
                  <div className="space-y-4">
                    {/* Estado Digital Actual */}
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4">
                      <span className="adm-label text-[10px] text-muted uppercase tracking-wider block mb-1">
                        Estado Digital Detectado
                      </span>
                      <p className="adm-title text-sm text-foreground">
                        {activeDossierLead.websiteStatus}
                      </p>
                    </div>

                    {/* Fuga de Dinero & Dolor */}
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <span className="adm-label text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Sparkles size={12} />
                        Dolor Crítico & Fuga de Ventas
                      </span>
                      <p className="text-[13px] leading-relaxed text-foreground">
                        {activeDossierLead.painPoint}
                      </p>
                    </div>

                    {/* Solución Arquitectónica Se7en */}
                    <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                      <span className="adm-label text-[10px] text-accent font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                        <Zap size={12} />
                        Propuesta de Valor & Solución Se7en
                      </span>
                      <p className="text-[13px] leading-relaxed text-foreground">
                        {activeDossierLead.recommendedSolution}
                      </p>
                      <div className="mt-3 pt-3 border-t border-[var(--line)] flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="adm-label text-[10px]">Stack Sugerido:</span>
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
                    <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="adm-label text-[10.5px] text-muted uppercase tracking-wider">
                          Guión de Mensaje de Apertura (WhatsApp Hook)
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyPitch(activeDossierLead.pitch)}
                          className="flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 py-1 text-xs adm-label text-foreground hover:bg-[var(--panel-2)] transition-colors"
                        >
                          {copiedPitch ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          <span>{copiedPitch ? "¡Copiado!" : "Copiar"}</span>
                        </button>
                      </div>
                      <div className="rounded-lg bg-[var(--panel)] border border-[var(--line)] p-3 text-xs leading-relaxed text-foreground font-mono whitespace-pre-wrap">
                        {activeDossierLead.pitch}
                      </div>
                    </div>

                    {/* Disparadores Directos */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenWhatsApp(activeDossierLead);
                          const current = leadStatuses[activeDossierLead.id] || "nuevo";
                          if (current === "nuevo") {
                            handleMove(activeDossierLead.id, "contactado");
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black py-3 px-4 text-xs font-bold transition-opacity hover:opacity-90 shadow-sm"
                      >
                        <WhatsAppLogo className="h-4 w-4 fill-current" />
                        <span>Abrir WhatsApp con Pitch Preparado</span>
                      </button>

                      {activeDossierLead.phone && (
                        <a
                          href={`tel:${activeDossierLead.phone}`}
                          className="flex items-center gap-1.5 rounded-xl border border-[var(--line-strong)] bg-[var(--well)] py-3 px-4 text-xs font-semibold text-foreground hover:bg-[var(--panel-2)] transition-colors"
                        >
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
                    <textarea
                      value={tempNote}
                      onChange={(e) => setTempNote(e.target.value)}
                      placeholder="Ej: Conversé con el gerente. Le interesa armar un turnero similar a Muzzaga Pádel. Coordinamos demo para este viernes..."
                      rows={5}
                      className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--well)] p-3 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveModalNote}
                        className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-bold text-background transition-colors hover:bg-foreground"
                      >
                        <Send size={13} />
                        <span>Guardar Bitácora</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para editar nota de prospecto */}
      <AnimatePresence>
        {activeNoteLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-[var(--line-strong)] bg-[var(--panel)] p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <div>
                  <h4 className="adm-title text-base text-foreground">
                    Bitácora Interna · {activeNoteLead.name}
                  </h4>
                  <p className="adm-label text-[10.5px] text-muted mt-1">
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

              <div className="mt-4">
                <label className="adm-label block mb-1.5">
                  Notas sobre el contacto, objeciones o próximos pasos:
                </label>
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Ej: Hablé con Matías. Le gustó la demo de canchas. Nos juntamos por Meet el jueves 16hs para revisar formas de pago..."
                  rows={4}
                  className="w-full rounded-xl border border-[var(--line-strong)] bg-[var(--well)] p-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveNoteLead(null)}
                  className="rounded-full border border-[var(--line-strong)] px-4 py-1.5 adm-label text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalNote}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-background transition-colors hover:bg-foreground"
                >
                  <Send size={13} />
                  Guardar Nota
                </button>
              </div>
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
