"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Download,
  MapPin,
  Sparkles,
  Edit3,
  Kanban,
  LayoutGrid,
  Calculator,
} from "lucide-react";
import { prospectLeads, type ProspectLead } from "@/data/prospects";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { ProspectosKanban } from "./prospectos-kanban";
import { AiQualifier } from "./ai-qualifier";
import { PadelRoiCalculator } from "./padel-roi-calculator";
import { useSoundFx } from "@/lib/use-sound-fx";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE } from "@/lib/admin/people";
import { whoWhen, type ProspectState, type ProspectStatus } from "@/lib/admin/prospect-shared";
import { updateProspectNote, updateProspectStatus } from "./actions";
import { Chip, Segmented, btn, btnPrimary, btnSecondary, searchInput, kpiRow, cn } from "../kit";

const CITIES = ["Todas", "Catriel", "25 de Mayo", "Neuquén", "Cipolletti", "Plottier", "San Rafael", "Mendoza"] as const;
const CATEGORIES = [
  "Todas",
  "Club de Pádel & Deporte",
  "Gimnasio & Entrenamiento",
  "Inmobiliaria",
  "Bodega & Enoturismo",
  "Hotelería & Cabañas",
  "Gastronomía & Cervecería",
  "Comercio & Gourmet",
  "Servicios Petroleros & Industria",
  "Salud & Estética",
  "Construcción & Corralón",
] as const;

export type LeadStatus = ProspectStatus;

// Cada cuánto se vuelve a leer lo que cargó el otro, con la pestaña a la vista.
const POLL_MS = 20_000;

const STATUS_CONFIG: Record<LeadStatus, { label: string; badge: string; dot: string }> = {
  nuevo: {
    label: "Sin contactar",
    badge: "border-[var(--line)] bg-[var(--well)] text-muted",
    dot: "bg-zinc-400",
  },
  contactado: {
    label: "Mensaje enviado",
    badge: "border adm-badge-amber",
    dot: "bg-amber-400",
  },
  en_charla: {
    label: "En conversación",
    badge: "border adm-badge-sky",
    dot: "bg-sky-400",
  },
  ganado: {
    label: "¡Cliente ganado!",
    badge: "border adm-badge-green font-bold",
    dot: "bg-emerald-400",
  },
  descartado: {
    label: "Descartado",
    badge: "border adm-badge-red",
    dot: "bg-red-400",
  },
  numero_equivocado: {
    label: "Número equivocado",
    badge: "border-[var(--line)] bg-[var(--well)] text-muted",
    dot: "bg-orange-400",
  },
};

const STATUS_FILTER_OPTIONS: { id: "todos" | LeadStatus; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "nuevo", label: "Sin contactar" },
  { id: "contactado", label: "Contactados" },
  { id: "en_charla", label: "En charla" },
  { id: "ganado", label: "Ganados" },
  { id: "descartado", label: "Descartados" },
  { id: "numero_equivocado", label: "Nº equivocado" },
];

export function ProspectosClient({ initialState, me }: { initialState: Record<string, ProspectState>; me: LeadOwner }) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showAiQualifier, setShowAiQualifier] = useState(false);
  const [showRoiCalc, setShowRoiCalc] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<(typeof CITIES)[number]>("Todas");
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>("Todas");
  const [statusFilter, setStatusFilter] = useState<"todos" | LeadStatus>("todos");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sound = useSoundFx();

  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [seen, setSeen] = useState(initialState);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Lo que llega del servidor (lo que cargó el otro) pisa lo local.
  if (seen !== initialState) {
    setSeen(initialState);
    setState(initialState);
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [router]);

  const leadStatuses = useMemo(
    () => Object.fromEntries(Object.entries(state).map(([id, s]) => [id, s.status])) as Record<string, LeadStatus>,
    [state],
  );
  const leadNotes = useMemo(() => Object.fromEntries(Object.entries(state).map(([id, s]) => [id, s.note])), [state]);

  // Optimista: se ve al instante y, si el servidor falla, vuelve a lo anterior.
  const save = (leadId: string, optimistic: Partial<ProspectState>, run: () => Promise<ProspectState>) => {
    const before = state[leadId];
    const blank: ProspectState = {
      lead_id: leadId,
      status: "nuevo",
      contacted_by: null,
      contacted_at: null,
      note: "",
      note_by: null,
      note_at: null,
      updated_by: null,
      updated_at: new Date().toISOString(),
    };
    setSaveError(null);
    setState((s) => ({ ...s, [leadId]: { ...blank, ...s[leadId], ...optimistic } }));
    run()
      .then((row) => setState((s) => ({ ...s, [leadId]: row })))
      .catch((e: unknown) => {
        setState((s) => {
          const rest = Object.fromEntries(Object.entries(s).filter(([id]) => id !== leadId));
          return before ? { ...rest, [leadId]: before } : rest;
        });
        setSaveError(e instanceof Error ? e.message : "No se pudo guardar.");
      });
  };

  const updateStatus = (leadId: string, status: LeadStatus) => {
    const first = status !== "nuevo" && !state[leadId]?.contacted_by;
    save(
      leadId,
      { status, ...(first ? { contacted_by: me, contacted_at: new Date().toISOString() } : {}) },
      () => updateProspectStatus(leadId, status),
    );
  };

  const updateNote = (leadId: string, note: string) =>
    save(leadId, { note, note_by: note ? me : null, note_at: note ? new Date().toISOString() : null }, () =>
      updateProspectNote(leadId, note),
    );

  const handleOpenWhatsApp = (lead: ProspectLead) => {
    sound.pop();
    const phone = lead.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(lead.pitch)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    // Sólo avanza si todavía no estaba contactado: no pisa una charla ni un cierre.
    if ((leadStatuses[lead.id] || "nuevo") === "nuevo") updateStatus(lead.id, "contactado");
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
    const counts = { nuevo: 0, contactado: 0, en_charla: 0, ganado: 0, descartado: 0, numero_equivocado: 0 };
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
      "Contactó",
      "Fecha de contacto",
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
      "Nota de",
    ];

    const rows = filtered.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${STATUS_CONFIG[leadStatuses[l.id] || "nuevo"].label}"`,
      `"${state[l.id]?.contacted_by ? PEOPLE[state[l.id].contacted_by!].name : ""}"`,
      `"${state[l.id]?.contacted_at ? state[l.id].contacted_at!.slice(0, 10) : ""}"`,
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
      `"${state[l.id]?.note_by ? PEOPLE[state[l.id].note_by!].name : ""}"`,
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
      {saveError && (
        <div role="alert" className="rounded-lg border adm-badge-red px-3 py-2 text-[12px]">
          No se pudo guardar el último cambio: {saveError}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="adm-title text-[20px] text-foreground">Radar de Prospectos Locales</h2>
            <span className="rounded-full border border-[var(--line-strong)] px-2 py-px font-mono text-[10.5px] text-muted">
              {prospectLeads.length} analizados
            </span>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Empresas, clubes y emprendimientos de Catriel, 25 de Mayo, Neuquén, San Rafael y Mendoza con diagnósticos de dolor y propuestas a medida.
          </p>
        </div>

        {/* Action Controls: AI Copilot, View Switcher, CSV Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* ROI Pádel Calculator Button */}
          <button
            type="button"
            onClick={() => {
              setShowRoiCalc((v) => !v);
              sound.pop();
            }}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors",
              showRoiCalc
                ? "bg-accent text-background"
                : "border border-[var(--line-strong)] text-foreground hover:border-foreground"
            )}
          >
            <Calculator size={13} className={showRoiCalc ? "fill-current" : "text-accent"} />
            <span>Calculadora ROI Pádel</span>
          </button>

          {/* AI Qualifier Button */}
          <button
            type="button"
            onClick={() => {
              setShowAiQualifier((v) => !v);
              sound.pop();
            }}
            className={cn(
              "focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold whitespace-nowrap transition-colors",
              showAiQualifier
                ? "bg-accent text-background"
                : "border border-[var(--line-strong)] text-foreground hover:border-foreground"
            )}
          >
            <Sparkles size={13} className={showAiQualifier ? "fill-current" : "text-accent"} />
            <span>AI Copilot</span>
          </button>

          {/* View Mode Toggle: Kanban vs Table */}
          <Segmented
            value={viewMode}
            onChange={(v) => {
              setViewMode(v);
              sound.tick();
            }}
            options={[
              { id: "kanban", label: <span className="flex items-center gap-1.5"><Kanban size={13} /> Tablero</span> },
              { id: "table", label: <span className="flex items-center gap-1.5"><LayoutGrid size={13} /> Lista</span> },
            ]}
          />

          {/* CSV Export */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className={btnSecondary}
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

      {/* Padel ROI Calculator Drawer */}
      {showRoiCalc && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 animate-in fade-in duration-300">
          <PadelRoiCalculator />
        </div>
      )}

      {/* KPI Cards & Pipeline Overview */}
      <div className={kpiRow}>
        <div className="adm-in block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">Prospectos Filtrados</p>
          <p className="adm-num mt-3 text-[36px] leading-[0.9] text-foreground tabular-nums">{filtered.length}</p>
          <p className="mt-2 text-[12px] text-muted">de {prospectLeads.length} en base</p>
        </div>
        <div className="adm-in block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">Pipeline en Juego</p>
          <p className="adm-num mt-3 text-[36px] leading-[0.9] text-emerald-600 dark:text-emerald-400 tabular-nums">
            ${Math.round(totalPipelineUsd / 1000)}k <span className="text-[15px] font-normal text-muted">USD</span>
          </p>
          <p className="mt-2 text-[12px] text-muted">~${((totalPipelineUsd * 1350) / 1000000).toFixed(1)}M ARS</p>
        </div>
        <div className="adm-in block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-muted">En Contacto Activo</p>
          <p className="adm-num mt-3 text-[36px] leading-[0.9] text-sky-600 dark:text-sky-400 tabular-nums">
            {statusCounts.contactado + statusCounts.en_charla}
          </p>
          <p className="mt-2 text-[12px] text-muted">Loom enviado o en charla</p>
        </div>
        <div className="adm-in block rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.13em] text-accent">Clientes Ganados</p>
          <p className="adm-num mt-3 text-[36px] leading-[0.9] text-accent tabular-nums">
            {statusCounts.ganado}
          </p>
          <p className="mt-2 text-[12px] text-muted">deals cerrados con seña</p>
        </div>
      </div>

      {/* Selector de Estado tipo CRM */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line)] pb-3">
        <span className="adm-label text-[10.5px] mr-1 text-muted">Etapa:</span>
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <Chip
            key={opt.id}
            on={statusFilter === opt.id}
            onClick={() => {
              setStatusFilter(opt.id);
              sound.tick();
            }}
          >
            <span>{opt.label}</span>
            <span className="font-mono text-[10px] opacity-70">
              ({opt.id === "todos" ? prospectLeads.length : statusCounts[opt.id]})
            </span>
          </Chip>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search */}
        <label className="relative flex min-w-[200px] flex-1 items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, rubro, dirección o problema…"
            className={searchInput}
          />
        </label>

        {/* City Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 admin-scroll">
          {CITIES.map((city) => (
            <Chip
              key={city}
              on={selectedCity === city}
              onClick={() => {
                setSelectedCity(city);
                sound.tick();
              }}
            >
              {city}
            </Chip>
          ))}
        </div>

        {/* Category Filter Dropdown */}
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value as (typeof CATEGORIES)[number]);
            sound.tick();
          }}
          aria-label="Rubro"
          className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-[12px] text-foreground"
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
          leadState={state}
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
            const meta = state[lead.id];
            const isEditingNote = editingNoteId === lead.id;

            return (
              <div
                key={lead.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  currentStatus === "ganado"
                    ? "border-emerald-500/40 bg-emerald-500/5"
                    : currentStatus === "en_charla"
                    ? "border-sky-500/40 bg-sky-500/5"
                    : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]"
                }`}
              >
                <div>
                  {/* Header: Location & Category */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 adm-label text-[10px]">
                      <MapPin size={12} className="text-accent shrink-0" />
                      <span className="font-medium text-foreground">
                        {lead.city}, {lead.province}
                      </span>
                      <span>·</span>
                      <span className="truncate max-w-[120px]">{lead.category}</span>
                    </div>
                    <span className="adm-num text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      ~USD {lead.estimatedBudgetUsd}
                    </span>
                  </div>

                  {/* Status Switcher Bar */}
                  <div className="mt-3 flex items-center justify-between gap-2 border-y border-[var(--line)] py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />
                      <span className="adm-label text-[9.5px]">Estado:</span>
                    </div>
                    <select
                      value={currentStatus}
                      onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                      aria-label="Estado del prospecto"
                      className={`rounded-full border px-2.5 py-0.5 adm-label text-[10px] focus:outline-none ${statusMeta.badge}`}
                    >
                      <option value="nuevo">Sin contactar</option>
                      <option value="contactado">Mensaje enviado</option>
                      <option value="en_charla">En conversación</option>
                      <option value="ganado">¡Cliente ganado!</option>
                      <option value="descartado">Descartado</option>
                      <option value="numero_equivocado">Número equivocado</option>
                    </select>
                  </div>
                  {meta?.contacted_by && (
                    <p className="mt-2 adm-label text-[10px] text-muted">
                      Contactó: <span className="text-foreground">{whoWhen(meta.contacted_by, meta.contacted_at)}</span>
                    </p>
                  )}

                  {/* Business Name */}
                  <div className="mt-3">
                    <h3 className="adm-title text-sm text-foreground flex items-center gap-2">
                      <span>{lead.name}</span>
                      {lead.currentSite && (
                        <a
                          href={lead.currentSite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-accent transition-colors"
                          title="Visitar web actual"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </h3>
                    <p className="mt-0.5 adm-label text-[10px] text-muted">{lead.address}</p>
                  </div>

                  {/* Pain Point & Diagnosis */}
                  <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--well)] p-2.5 text-xs">
                    <div className="flex items-center gap-1.5 adm-label text-[10px] text-amber-600 dark:text-amber-300">
                      <Sparkles size={12} />
                      <span>Problema detectado:</span>
                    </div>
                    <p className="mt-1 text-muted text-[11.5px] leading-relaxed">{lead.painPoint}</p>
                    <div className="mt-2 pt-2 border-t border-[var(--line)] text-[11px] text-accent">
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
                          className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--well)] p-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="rounded-md px-2 py-1 adm-label text-muted hover:text-foreground"
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
                            className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-background"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => setEditingNoteId(lead.id)}
                        className="group flex cursor-pointer items-start justify-between rounded-lg border border-dashed border-[var(--line)] bg-[var(--well)] p-2 text-[11px] hover:border-[var(--line-strong)] transition-colors"
                      >
                        <div className="flex-1 pr-2">
                          {leadNote ? (
                            <p className="text-sky-600 dark:text-sky-300 text-xs">
                              <span className="adm-label text-[9.5px] text-sky-500 font-bold">Nota{meta?.note_by ? ` de ${PEOPLE[meta.note_by].name}` : ""}:</span> {leadNote}
                            </p>
                          ) : (
                            <p className="adm-label text-[10px] text-muted/60 italic">
                              + Agregar nota interna...
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
                <div className="mt-4 flex items-center gap-2 border-t border-[var(--line)] pt-3">
                  <button
                    type="button"
                    onClick={() => handleCopyPitch(lead)}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border py-1.5 px-3 adm-label text-[10px] transition-colors ${
                      isCopied
                        ? "border-emerald-500 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                        : "border-[var(--line-strong)] bg-[var(--well)] text-foreground hover:bg-[var(--panel-2)]"
                    }`}
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    <span>{isCopied ? "¡Copiado!" : "Copiar Guión"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenWhatsApp(lead)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black hover:opacity-90 py-1.5 px-4 text-xs font-semibold transition-opacity shadow-sm"
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
        <div className="rounded-xl border border-dashed border-[var(--line)] p-12 text-center text-muted adm-label">
          No se encontraron prospectos con esos filtros.
        </div>
      )}
    </div>
  );
}
