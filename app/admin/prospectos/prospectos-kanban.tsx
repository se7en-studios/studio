"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Building2,
  MapPin,
  DollarSign,
  PhoneCall,
  ExternalLink,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Flame,
  Snowflake,
  Edit3,
  X,
  Send,
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
  border: string;
  accent: string;
  icon: string;
}[] = [
  {
    id: "nuevo",
    title: "Sin Contactar",
    badge: "bg-zinc-800 text-zinc-300 border-zinc-700",
    border: "border-zinc-800",
    accent: "text-zinc-400",
    icon: "📥",
  },
  {
    id: "contactado",
    title: "Loom / Mensaje Enviado",
    badge: "bg-amber-950/40 text-amber-300 border-amber-500/30",
    border: "border-amber-500/20",
    accent: "text-amber-400",
    icon: "🎥",
  },
  {
    id: "en_charla",
    title: "En Conversación",
    badge: "bg-sky-950/40 text-sky-300 border-sky-500/30",
    border: "border-sky-500/20",
    accent: "text-sky-400",
    icon: "💬",
  },
  {
    id: "ganado",
    title: "¡Cliente Ganado!",
    badge: "bg-emerald-950/40 text-emerald-300 border-emerald-500/40 font-bold",
    border: "border-emerald-500/30",
    accent: "text-emerald-400",
    icon: "🏆",
  },
  {
    id: "descartado",
    title: "Descartado",
    badge: "bg-red-950/30 text-red-400/80 border-red-500/20",
    border: "border-red-500/20",
    accent: "text-red-400",
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

  const handleOpenNoteModal = (lead: ProspectLead) => {
    setActiveNoteLead(lead);
    setTempNote(leadNotes[lead.id] || "");
    sound.tick();
  };

  const handleSaveModalNote = () => {
    if (!activeNoteLead) return;
    onSaveNote(activeNoteLead.id, tempNote);
    setActiveNoteLead(null);
    sound.success();
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
      <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => (leadStatuses[l.id] || "nuevo") === col.id);
          const totalUsd = colLeads.reduce((acc, l) => acc + (l.estimatedBudgetUsd || 1200), 0);
          const totalArsMillions = ((totalUsd * FX_RATE) / 1000000).toFixed(1);

          return (
            <div
              key={col.id}
              className={`flex w-80 shrink-0 flex-col rounded-2xl border ${col.border} bg-white/[0.015] p-3 backdrop-blur-md sm:w-88`}
            >
              {/* Cabecera de Columna con Rollup Financiero */}
              <div className="border-b border-white/[0.08] pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{col.icon}</span>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-foreground">
                      {col.title}
                    </h3>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${col.badge}`}>
                    {colLeads.length}
                  </span>
                </div>

                {/* Rollup Financiero en USD y ARS */}
                <div className="mt-2 flex items-baseline justify-between rounded-lg bg-black/40 px-2.5 py-1.5 font-mono text-[11px]">
                  <span className="text-muted/60">Total en juego:</span>
                  <div className="text-right">
                    <span className={`font-bold ${col.accent}`}>
                      USD ${totalUsd.toLocaleString("es-AR")}
                    </span>
                    <span className="ml-1 text-[10px] text-muted/60">
                      (~${totalArsMillions}M ARS)
                    </span>
                  </div>
                </div>
              </div>

              {/* Lista de Tarjetas de Deals */}
              <div className="mt-3 flex-1 space-y-3 overflow-y-auto max-h-[calc(100vh-22rem)] pr-1">
                {colLeads.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] text-center text-[11px] text-muted/40 font-mono">
                    <span>Sin prospectos en esta etapa</span>
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const status = leadStatuses[lead.id] || "nuevo";
                    const note = leadNotes[lead.id];
                    const isHot = status === "contactado" || status === "en_charla";

                    return (
                      <div
                        key={lead.id}
                        className="group relative rounded-xl border border-white/[0.08] bg-black/50 p-3.5 transition-all hover:border-white/20 hover:bg-black/70 hover:shadow-lg hover:shadow-black/50"
                      >
                        {/* Cabecera de la Tarjeta */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors">
                              {lead.name}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1 font-mono text-[11px] text-muted/70">
                              <MapPin size={11} className="text-accent shrink-0" />
                              {lead.city} · {lead.category}
                            </p>
                          </div>

                          {isHot && (
                            <span
                              title="Deal con interacción activa"
                              className="flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] text-amber-300 font-mono"
                            >
                              <Flame size={10} className="fill-amber-400 text-amber-400" />
                              HOT
                            </span>
                          )}
                        </div>

                        {/* Valor del Ticket y Estado Actual */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.06] pt-2 font-mono text-xs">
                          <span className="text-muted/60 text-[10.5px]">Ticket estimado:</span>
                          <span className="font-bold text-foreground">
                            USD ${lead.estimatedBudgetUsd.toLocaleString("es-AR")}
                          </span>
                        </div>

                        {/* Fuga / Diagnóstico rápido */}
                        <p className="mt-2 text-[11px] leading-relaxed text-muted/80 line-clamp-2 bg-white/[0.02] p-2 rounded-lg border border-white/[0.04]">
                          💡 {lead.painPoint}
                        </p>

                        {/* Nota interna si existe */}
                        {note && (
                          <div className="mt-2 rounded-lg bg-sky-950/20 border border-sky-500/20 p-2 text-[11px] text-sky-300 font-mono">
                            <span className="font-bold">Nota:</span> {note}
                          </div>
                        )}

                        {/* Barra de Acciones de la Tarjeta */}
                        <div className="mt-3 flex items-center justify-between gap-1 border-t border-white/[0.06] pt-2">
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
                              className="flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-mono text-emerald-300 transition-colors hover:bg-emerald-500 hover:text-black font-semibold"
                            >
                              <WhatsAppLogo className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </button>

                            {/* Botón Nota */}
                            <button
                              type="button"
                              onClick={() => handleOpenNoteModal(lead)}
                              title={note ? "Editar nota interna" : "Agregar nota interna"}
                              className={`rounded-full p-1 transition-colors ${
                                note
                                  ? "text-sky-400 hover:bg-sky-500/20"
                                  : "text-muted/50 hover:text-foreground hover:bg-white/10"
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
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted hover:border-amber-400 hover:text-amber-300"
                              >
                                Contactar →
                              </button>
                            )}

                            {status === "contactado" && (
                              <button
                                type="button"
                                onClick={() => handleMove(lead.id, "en_charla")}
                                title="Pasar a En conversación"
                                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-mono text-muted hover:border-sky-400 hover:text-sky-300"
                              >
                                En charla →
                              </button>
                            )}

                            {status === "en_charla" && (
                              <button
                                type="button"
                                onClick={() => handleMove(lead.id, "ganado")}
                                title="¡Cerrar como Cliente Ganado!"
                                className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-300 hover:bg-emerald-500 hover:text-black"
                              >
                                🏆 Ganado!
                              </button>
                            )}

                            {status === "ganado" && (
                              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
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

      {/* Modal para editar nota de prospecto */}
      <AnimatePresence>
        {activeNoteLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-white/15 bg-zinc-950 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h4 className="text-base font-bold text-foreground">
                    Bitácora Interna · {activeNoteLead.name}
                  </h4>
                  <p className="text-xs text-muted/60 font-mono mt-0.5">
                    {activeNoteLead.city} · Ticket estimado: USD ${activeNoteLead.estimatedBudgetUsd}
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
                <label className="text-xs font-mono text-muted/80 uppercase tracking-wider">
                  Notas sobre el contacto, objeciones o próximos pasos:
                </label>
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Ej: Hablé con Matías. Le gustó la demo de canchas. Nos juntamos por Meet el jueves 16hs para revisar formas de pago..."
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/60 p-3 text-sm text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent font-sans"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveNoteLead(null)}
                  className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-mono text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalNote}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-mono font-bold text-black transition-colors hover:bg-foreground"
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
