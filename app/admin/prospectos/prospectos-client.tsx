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
} from "lucide-react";
import { prospectLeads, type ProspectLead } from "@/data/prospects";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

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
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<(typeof CITIES)[number]>("Todas");
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>("Todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | LeadStatus>("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadCsv = () => {
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
      `"${l.currentSite ?? "Sin sitio propio"}"`,
      l.estimatedBudgetUsd,
      `"${l.painPoint.replace(/"/g, '""')}"`,
      `"${l.recommendedSolution.replace(/"/g, '""')}"`,
      `"${(leadNotes[l.id] || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `se7en-prospectos-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-mono text-foreground hover:bg-surface-2 transition-colors shadow-sm"
          >
            <Download size={14} />
            Exportar CSV ({filtered.length})
          </button>
        </div>
      </div>

      {/* KPI Cards & Pipeline Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Prospectos Filtrados</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Pipeline en Juego</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400 font-mono">
            USD {totalPipelineUsd.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Contactados / Charla</p>
          <p className="mt-1 text-2xl font-bold text-sky-400 font-mono">
            {statusCounts.contactado + statusCounts.en_charla}{" "}
            <span className="text-xs font-normal text-muted">de {prospectLeads.length}</span>
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Clientes Ganados</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400 font-mono">
            {statusCounts.ganado}{" "}
            <span className="text-xs font-normal text-muted">cerrados</span>
          </p>
        </div>
      </div>

      {/* Selector de Estado tipo CRM */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <span className="text-xs font-mono text-muted mr-1">Filtrar por estado:</span>
        {STATUS_FILTER_OPTIONS.map((opt) => {
          const isSelected = statusFilter === opt.id;
          const count = opt.id === "todos" ? prospectLeads.length : statusCounts[opt.id];
          return (
            <button
              key={opt.id}
              onClick={() => setStatusFilter(opt.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono transition-colors ${
                isSelected
                  ? "bg-foreground text-background font-bold shadow-sm"
                  : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              <span>{opt.label}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${isSelected ? "bg-background/20" : "bg-surface-2"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & City Filter Bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por negocio, dirección o problema..."
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>

        {/* City Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CITIES.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCity(c)}
              className={`rounded-lg px-3 py-1.5 text-xs font-mono transition-colors ${
                selectedCity === c
                  ? "bg-accent text-accent-foreground font-semibold"
                  : "bg-surface border border-border text-muted hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Category Filter Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as (typeof CATEGORIES)[number])}
          className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-mono text-foreground focus:border-accent focus:outline-none"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lead) => {
          const isCopied = copiedId === lead.id;
          const currentStatus = leadStatuses[lead.id] || "nuevo";
          const statusMeta = STATUS_CONFIG[currentStatus];
          const leadNote = leadNotes[lead.id] || "";
          const isEditingNote = editingNoteId === lead.id;

          const waUrl = `https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
            lead.pitch
          )}`;

          return (
            <div
              key={lead.id}
              className={`flex flex-col justify-between rounded-xl border p-5 transition-all shadow-sm ${
                currentStatus === "ganado"
                  ? "border-emerald-500/50 bg-emerald-950/10"
                  : currentStatus === "en_charla"
                  ? "border-sky-500/40 bg-sky-950/10"
                  : "border-border bg-surface hover:border-border/80"
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
                <div className="mt-3 flex items-center justify-between gap-2 border-y border-border/40 py-2">
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
                    <option value="descartado">⚫ Descartado</option>
                  </select>
                </div>

                {/* Business Info */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-foreground flex items-center justify-between">
                    <span>{lead.name}</span>
                    {lead.currentSite && (
                      <span className="text-[11px] font-mono text-muted truncate max-w-[130px]">
                        {lead.currentSite}
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-muted flex items-center gap-1.5">
                    <Building2 size={13} className="shrink-0" />
                    <span>{lead.address}</span>
                  </p>
                </div>

                {/* Diagnosis & Solution */}
                <div className="mt-4 rounded-lg bg-surface-2 p-3 text-xs space-y-2 border border-border/50">
                  <div>
                    <span className="font-mono uppercase font-bold text-amber-400 text-[10px]">
                      Dolor Detectado:
                    </span>
                    <p className="text-foreground/80 mt-0.5 leading-relaxed">{lead.painPoint}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase font-bold text-accent text-[10px]">
                      Solución Se7en:
                    </span>
                    <p className="text-foreground/80 mt-0.5 leading-relaxed">{lead.recommendedSolution}</p>
                  </div>
                </div>

                {/* Pitch Preview */}
                <div className="mt-3">
                  <span className="font-mono text-[10px] uppercase text-muted">Guión de apertura:</span>
                  <p className="mt-1 text-[11px] text-muted italic line-clamp-2 bg-black/20 p-2 rounded border border-border/40">
                    &ldquo;{lead.pitch}&rdquo;
                  </p>
                </div>

                {/* Quick Note (Bitácora) */}
                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-muted flex items-center gap-1">
                      <Edit3 size={10} />
                      Nota interna:
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(isEditingNote ? null : lead.id)}
                      className="text-[10px] font-mono text-accent hover:underline"
                    >
                      {isEditingNote ? "Listo" : leadNote ? "Editar" : "+ Agregar"}
                    </button>
                  </div>
                  {isEditingNote ? (
                    <input
                      type="text"
                      defaultValue={leadNote}
                      autoFocus
                      onBlur={(e) => {
                        updateNote(lead.id, e.target.value);
                        setEditingNoteId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateNote(lead.id, (e.target as HTMLInputElement).value);
                          setEditingNoteId(null);
                        }
                      }}
                      placeholder="Ej: le mandé el Loom, me responde el lunes..."
                      className="mt-1 w-full rounded border border-accent bg-surface-2 px-2 py-1 text-xs text-foreground focus:outline-none"
                    />
                  ) : leadNote ? (
                    <p className="mt-1 rounded bg-accent/5 border border-accent/20 px-2 py-1 text-xs text-accent">
                      {leadNote}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Actions Bar */}
              <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => handleCopyPitch(lead)}
                  className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border py-2 px-3 text-xs font-medium transition-colors ${
                    isCopied
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                      : "border-border bg-surface-2 text-foreground hover:bg-border"
                  }`}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopied ? "¡Copiado!" : "Copiar Guión"}</span>
                </button>

                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (currentStatus === "nuevo") {
                      updateStatus(lead.id, "contactado");
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 py-2 px-4 text-xs font-semibold text-zinc-950 transition-colors shadow-sm"
                >
                  <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
                  <span>Abrir WhatsApp</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted">
          No se encontraron prospectos con esos filtros.
        </div>
      )}
    </div>
  );
}
