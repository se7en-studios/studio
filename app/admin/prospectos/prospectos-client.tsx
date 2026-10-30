"use client";

import { useState, useMemo } from "react";
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

export function ProspectosClient() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<(typeof CITIES)[number]>("Todas");
  const [selectedCategory, setSelectedCategory] = useState<(typeof CATEGORIES)[number]>("Todas");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return prospectLeads.filter((item) => {
      const matchCity = selectedCity === "Todas" || item.city === selectedCity;
      const matchCategory = selectedCategory === "Todas" || item.category === selectedCategory;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.painPoint.toLowerCase().includes(q);
      return matchCity && matchCategory && matchSearch;
    });
  }, [search, selectedCity, selectedCategory]);

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
      "Ciudad",
      "Provincia",
      "Rubro",
      "Dirección",
      "Teléfono",
      "WhatsApp",
      "Estado Web",
      "Problema Detectado",
      "Solución Recomendada",
      "Presupuesto Estimado USD",
      "Guión WhatsApp",
    ];
    const rows = filtered.map((l) => [
      `"${l.name.replace(/"/g, '""')}"`,
      `"${l.city}"`,
      `"${l.province}"`,
      `"${l.category}"`,
      `"${l.address.replace(/"/g, '""')}"`,
      `"${l.phone}"`,
      `"${l.whatsapp}"`,
      `"${l.websiteStatus}"`,
      `"${l.painPoint.replace(/"/g, '""')}"`,
      `"${l.recommendedSolution.replace(/"/g, '""')}"`,
      l.estimatedBudgetUsd,
      `"${l.pitch.replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospectos-leads-${selectedCity.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Radar de Prospección Local
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Emprendimientos & Leads Calificados
          </h1>
          <p className="mt-1 text-sm text-muted">
            Negocios reales en Catriel, Neuquén, San Rafael y Mendoza con dolor web detectado y guiones listos para WhatsApp.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Prospectos Activos</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Pipeline Estimado</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400 font-mono">
            USD {totalPipelineUsd.toLocaleString("es-AR")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Zonas Cubiertas</p>
          <p className="mt-1 text-base font-semibold text-foreground">Catriel · NQN · SR · MDZ</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-mono text-muted uppercase">Conversión Promedio</p>
          <p className="mt-1 text-base font-semibold text-amber-400 font-mono">20% - 30% en WA</p>
        </div>
      </div>

      {/* Search & Filters Bar */}
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

      {/* Leads List */}
      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((lead) => {
          const waUrl = `https://wa.me/${lead.whatsapp}?text=${encodeURIComponent(lead.pitch)}`;
          const isCopied = copiedId === lead.id;

          return (
            <div
              key={lead.id}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:shadow-md"
            >
              <div>
                {/* Badges strip */}
                <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-border px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
                      <MapPin size={12} className="text-accent" />
                      {lead.city}, {lead.province}
                    </span>
                    <span className="rounded-md bg-accent/10 border border-accent/20 px-2 py-0.5 text-[11px] font-mono text-accent">
                      {lead.category}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-semibold text-emerald-400">
                    ~USD {lead.estimatedBudgetUsd}
                  </span>
                </div>

                {/* Business Info */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-foreground flex items-center justify-between">
                    <span>{lead.name}</span>
                    {lead.currentSite && (
                      <span className="text-[11px] font-mono text-muted truncate max-w-[140px]">
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
                    <p className="text-foreground/80 mt-0.5">{lead.painPoint}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase font-bold text-accent text-[10px]">
                      Solución Se7en:
                    </span>
                    <p className="text-foreground/80 mt-0.5">{lead.recommendedSolution}</p>
                  </div>
                </div>

                {/* Pitch Preview */}
                <div className="mt-3">
                  <span className="font-mono text-[10px] uppercase text-muted">Guión de apertura:</span>
                  <p className="mt-1 text-[11px] text-muted italic line-clamp-2 bg-black/20 p-2 rounded border border-border/40">
                    &ldquo;{lead.pitch}&rdquo;
                  </p>
                </div>
              </div>

              {/* Actions */}
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

