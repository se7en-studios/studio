"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Copy,
  Check,
  ExternalLink,
  Download,
  Building2,
  MapPin,
  Sparkles,
  PhoneCall,
  DollarSign,
  TrendingUp,
  MessageSquare,
  ChevronDown,
  Edit3,
  Kanban,
  LayoutGrid,
  Zap,
} from "lucide-react";
import { prospectLeads, type ProspectLead } from "@/data/prospects";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { ProspectosKanban } from "./prospectos-kanban";
import { AiQualifier } from "./ai-qualifier";
import { useSoundFx } from "@/lib/use-sound-fx";

const CITIES = ["Todas", "Catriel", "Neuquén", "Cipolletti", "Plottier", "San Rafael", "Mendoza"] as const;
const CATEGORIES = [
  "Todas",
  "Club de Pádel & Deporte",
  "Gimnasio & Entrenamiento",
  "Inmobiliaria",
  "Bodega & Enoturismo",
  "Hotelería & Cabañas",
  "Gastronomía & Cervecería",
  "Comercio & Gourmet",
] as const;

export type LeadStatus = "nuevo" | "contactado" | "en_charla" | "ganado" | "descartado";

const STATUS_CONFIG: Record<LeadStatus, { label: string; badge: string; dot: string }> = {
  nuevo: {
    label: "Sin contactar",
    badge: "border-zinc-700 bg-zinc-800/80 text-zinc-300",
    dot: "bg-zinc-400",
  },
  contactado: {
    label: "Mensaje enviado",
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-300",
    dot: "bg-amber-400",
  },
  en_charla: {
    label: "En conversación",
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    dot: "bg-sky-400",
  },
  ganado: {
    label: "¡Cliente ganado!",
    badge: "border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-bold",
    dot: "bg-emerald-400",
  },
  descartado: {
    label: "Descartado",
    badge: "border-red-500/30 bg-red-500/10 text-red-400/80",
    dot: "bg-red-400",
  },
};

const STATUS_FILTER_OPTIONS: { id: "todos" | LeadStatus; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "nuevo", label: "Sin contactar" },
  { id: "contactado", label: "Contactados" },
  { id: "en_charla", label: "En charla" },
  { id: "ganado", label: "Ganados" },
  { id: "descartado", label: "Descartados" },
];

export function ProspectosClient() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showAiQualifier, setShowAiQualifier] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<(typeof CITIES)[number]>("Todas");
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>("Todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | LeadStatus>("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sound = useSoundFx();

  // Estados persistidos en localStorage
  const [leadStatuses, setLeadStatuses] = useState<Record<string, LeadStatus>>({});
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Carga inicial de localStorage
  useEffect(() => {
    try {
      const savedStatuses = localStorage.getItem("se7en_leads_status");
      if (savedStatuses) setLeadStatuses(JSON.parse(savedStatuses));
      const savedNotes = localStorage.getItem("se7en_leads_notes");
      if (savedNotes) setLeadNotes(JSON.parse(savedNotes));
    } catch (e) {
      console.error("Error reading lead data from localStorage", e);
    }
  }, []);

  const updateStatus = (leadId: string, status: LeadStatus) => {
    setLeadStatuses((prev) => {
      const next = { ...prev, [leadId]: status };
      try {
        localStorage.setItem("se7en_leads_status", JSON.stringify(next));
      } catch (e) {
        console.error("Error saving lead status", e);
      }
      return next;
    });
  };

  const updateNote = (leadId: string, note: string) => {
    setLeadNotes((prev) => {
      const next = { ...prev, [leadId]: note };
      try {
        localStorage.setItem("se7en_leads_notes", JSON.stringify(next));
      } catch (e) {
        console.error("Error saving lead note", e);
      }
      return next;
    });
  };

  const handleOpenWhatsApp = (lead: ProspectLead) => {
    sound.pop();
    const phone = lead.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(lead.pitch)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    updateStatus(lead.id, "contactado");
  };

  const filtered = useMemo(() => {
    return prospectLeads.filter((item) => {
      const matchCity = selectedCity === "Todas" || item.city === selectedCity;
      const matchCategory = selectedCategory === "Todas" || item.category === selectedCategory;
      const leadStatus = leadStatuses[item.id] || "nuevo";
      const matchStatus = statusFilter === "todos" || leadStatus === statusFilter;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.painPoint.toLowerCase().includes(q);
      return matchCity && matchCategory && matchStatus && matchSearch;
    });
  }, [search, selectedCity, selectedCategory, statusFilter, leadStatuses]);

  // Contadores de estado
  const statusCounts = useMemo(() => {
    const counts = { nuevo: 0, contactado: 0, en_charla: 0, ganado: 0, descartado: 0 };
    prospectLeads.forEach((lead) => {
      const st = leadStatuses[lead.id] || "nuevo";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [leadStatuses]);

  const totalPipelineUsd = useMemo(() => {
    return filtered.reduce((acc, curr) => acc + curr.estimatedBudgetUsd, 0);
  }, [filtered]);

  const handleCopyPitch = (lead: ProspectLead) => {
    navigator.clipboard.writeText(lead.pitch);
    setCopiedId(lead.id);
    sound.tick();
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadCsv = () => {
    sound.tick();
    const headers = [
      "Nombre",
      "Estado",
      "Ciudad",
      "Provincia",
      "Rubro",
      "Dirección",
      "Teléfono",
      "Sitio Actual",
      "Presupuesto Estimado USD",
      "Problema Detectado",
      "Solución Recomendada",
      "Notas Internas",
    ];

    const rows = filtered.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${STATUS_CONFIG[leadStatuses[l.id] || "nuevo"].label}"`,
      `"${l.city}"`,
      `"${l.province}"`,
      `"${l.category}"`,
      `"${l.address.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.currentSite || "Sin sitio"}"`,
      l.estimatedBudgetUsd,
      `"${l.painPoint.replace(/"/g, '""')}"`,
      `"${l.recommendedSolution.replace(/"/g, '""')}"`,
      `"${(leadNotes[l.id] || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `se7en-prospectos-crm-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span>Radar de Prospectos Locales</span>
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-mono text-accent">
              {prospectLeads.length} leads calificados
            </span>
          </h2>
          <p className="mt-1 text-xs text-muted">
            Empresas y clubes de Catriel, Neuquén, San Rafael y Mendoza analizados con dolores concretos y guión de apertura.
          </p>
        </div>

        {/* Action Controls: AI Copilot, View Switcher, CSV Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* AI Qualifier Button */}
          <button
            type="button"
            onClick={() => {
              setShowAiQualifier((v) => !v);
              sound.pop();
            }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-mono transition-all ${
              showAiQualifier
                ? "border-accent bg-accent text-black font-bold shadow-md shadow-accent/20"
                : "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
            }`}
          >
            <Sparkles size={13} />
            <span>AI Copilot</span>
          </button>

          {/* View Mode Toggle: Kanban vs Table */}
          <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => {
                setViewMode("kanban");
                sound.tick();
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                viewMode === "kanban"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Kanban size={13} />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("table");
                sound.tick();
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${
                viewMode === "table"
                  ? "bg-foreground text-background font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <LayoutGrid size={13} />
              <span>Grilla</span>
            </button>
          </div>

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-mono text-foreground hover:bg-white/10 transition-colors"
          >
            <Download size={13} />
            <span>CSV ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* AI Copilot Drawer (si está activo) */}
      {showAiQualifier && (
        <div className="animate-in fade-in duration-300">
          <AiQualifier />
        </div>
      )}

      {/* KPI Cards & Pipeline Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-sm">
          <p className="text-xs font-mono text-muted uppercase">Prospectos Filtrados</p>
          <p className="mt-1 text-2xl font-bold text-foreground font-mono">{filtered.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 backdrop-blur-sm">
          <p className="text-xs font-mono text-emerald-400 uppercase">Pipeline en Juego</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300 font-mono">
            USD ${totalPipelineUsd.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-sky-950/10 p-4 backdrop-blur-sm">
          <p className="text-xs font-mono text-sky-400 uppercase">Contactados / Charla</p>
          <p className="mt-1 text-2xl font-bold text-sky-300 font-mono">
            {statusCounts.contactado + statusCounts.en_charla}{" "}
            <span className="text-xs font-normal text-muted">de {prospectLeads.length}</span>
          </p>
        </div>
        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4 backdrop-blur-sm">
          <p className="text-xs font-mono text-accent uppercase">Clientes Ganados</p>
          <p className="mt-1 text-2xl font-bold text-foreground font-mono">
            {statusCounts.ganado}{" "}
            <span className="text-xs font-normal text-muted">cerrados</span>
          </p>
        </div>
      </div>

      {/* Selector de Estado tipo CRM (para filtrar la vista grilla o kanban) */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-3">
        <span className="text-xs font-mono text-muted mr-1">Filtrar estado:</span>
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const isSelected = statusFilter === opt.id;
          const count = opt.id === "todos" ? prospectLeads.length : statusCounts[opt.id];
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setStatusFilter(opt.id);
                sound.tick();
              }}
              className={`rounded-full px-3 py-1 text-xs font-mono transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? "bg-foreground text-background font-semibold"
                  : "border border-white/10 bg-white/5 text-muted hover:text-foreground"
              }`}
            >
              <span>{opt.label}</span>
              <span className="text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, dirección o problema..."
            className="w-full rounded-full border border-white/10 bg-black/40 py-2 pr-4 pl-10 text-xs font-mono text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => {
                setSelectedCity(city);
                sound.tick();
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-mono whitespace-nowrap transition-colors ${
                selectedCity === city
                  ? "bg-accent text-black font-semibold"
                  : "border border-white/10 bg-white/5 text-muted hover:text-foreground"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Category Filter Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value as (typeof CATEGORIES)[number]);
            sound.tick();
          }}
          className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* VISTA 1: PIPELINE KANBAN (Linear / Attio) */}
      {viewMode === "kanban" && (
        <ProspectosKanban
          leads={filtered}
          leadStatuses={leadStatuses}
          leadNotes={leadNotes}
          onStatusChange={updateStatus}
          onSaveNote={updateNote}
          onOpenWhatsApp={handleOpenWhatsApp}
        />
      )}

      {/* VISTA 2: GRILLA DETALLADA */}
      {viewMode === "table" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((lead) => {
            const isCopied = copiedId === lead.id;
            const currentStatus = leadStatuses[lead.id] || "nuevo";
            const statusMeta = STATUS_CONFIG[currentStatus];
            const leadNote = leadNotes[lead.id] || "";
            const isEditingNote = editingNoteId === lead.id;

            return (
              <div
                key={lead.id}
                className={`flex flex-col justify-between rounded-2xl border p-5 transition-all shadow-sm ${
                  currentStatus === "ganado"
                    ? "border-emerald-500/50 bg-emerald-950/10"
                    : currentStatus === "en_charla"
                    ? "border-sky-500/40 bg-sky-950/10"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
              >
                <div>
                  {/* Header: Location & Category */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      <MapPin size={13} className="text-accent shrink-0" />
                      <span className="font-medium text-foreground">
                        {lead.city}, {lead.province}
                      </span>
                      <span>·</span>
                      <span className="truncate max-w-[120px]">{lead.category}</span>
                    </div>
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      ~USD {lead.estimatedBudgetUsd}
                    </span>
                  </div>

                  {/* Status Switcher Bar */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-y border-white/10 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
                      <span className="text-[11px] font-mono text-muted uppercase">Estado:</span>
                    </div>
                    <select
                      value={currentStatus}
                      onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                      className={`rounded-md border px-2 py-0.5 text-xs font-mono focus:outline-none ${statusMeta.badge}`}
                    >
                      <option value="nuevo">⚪ Sin contactar</option>
                      <option value="contactado">🟡 Mensaje enviado</option>
                      <option value="en_charla">🔵 En conversación</option>
                      <option value="ganado">🟢 ¡Cliente ganado!</option>
                      <option value="descartado">🔴 Descartado</option>
                    </select>
                  </div>

                  {/* Business Name */}
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                      <span>{lead.name}</span>
                      {lead.currentSite && (
                        <a
                          href={lead.currentSite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-accent transition-colors"
                          title="Visitar web actual"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted font-mono">{lead.address}</p>
                  </div>

                  {/* Pain Point & Diagnosis */}
                  <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-3 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-300 font-mono">
                      <Sparkles size={13} />
                      <span>Problema detectado:</span>
                    </div>
                    <p className="mt-1 text-muted/90 leading-relaxed font-sans">{lead.painPoint}</p>
                    <div className="mt-2.5 pt-2 border-t border-white/5 text-[11px] text-accent/90">
                      <strong>Propuesta Se7en:</strong> {lead.recommendedSolution}
                    </div>
                  </div>

                  {/* Bitácora / Notas Internas */}
                  <div className="mt-3">
                    {isEditingNote ? (
                      <div className="space-y-2">
                        <textarea
                          defaultValue={leadNote}
                          id={`note-input-${lead.id}`}
                          placeholder="Anotá acá feedback, objeciones o fecha de reunión..."
                          className="w-full rounded-lg border border-white/10 bg-black/60 p-2 text-xs text-foreground placeholder:text-muted/40 focus:border-accent focus:outline-none font-mono"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="rounded-md px-2 py-1 text-[11px] font-mono text-muted hover:text-foreground"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(
                                `note-input-${lead.id}`
                              ) as HTMLTextAreaElement | null;
                              if (el) updateNote(lead.id, el.value.trim());
                              setEditingNoteId(null);
                            }}
                            className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-mono text-black font-semibold"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingNoteId(lead.id)}
                        className="group flex cursor-pointer items-start justify-between rounded-lg border border-dashed border-white/10 bg-black/30 p-2 text-[11px] hover:border-white/20 transition-colors"
                      >
                        <div className="flex-1 pr-2">
                          {leadNote ? (
                            <p className="font-mono text-sky-300">
                              <span className="font-bold">Nota:</span> {leadNote}
                            </p>
                          ) : (
                            <p className="font-mono text-muted/40 italic">
                              + Agregar nota interna (click acá)...
                            </p>
                          )}
                        </div>
                        <Edit3
                          size={12}
                          className="text-muted/40 group-hover:text-muted shrink-0 mt-0.5"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons: Copy Pitch & WhatsApp */}
                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => handleCopyPitch(lead)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border py-1.5 px-3 text-xs font-mono transition-colors ${
                      isCopied
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                        : "border-white/10 bg-white/5 text-foreground hover:bg-white/10"
                    }`}
                  >
                    {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    <span>{isCopied ? "¡Copiado!" : "Copiar Guión"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(lead)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 py-1.5 px-4 text-xs font-mono font-bold text-black transition-colors shadow-sm"
                  >
                    <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-muted font-mono text-xs">
          No se encontraron prospectos con esos filtros.
        </div>
      )}
    </div>
  );
}
