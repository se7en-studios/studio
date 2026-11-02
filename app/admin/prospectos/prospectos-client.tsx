"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, Sparkles, Kanban, LayoutGrid, Calculator } from "lucide-react";
import { prospectLeads, type ProspectLead } from "@/data/prospects";
import { ProspectosKanban } from "./prospectos-kanban";
import { AiQualifier } from "./ai-qualifier";
import { PadelRoiCalculator } from "./padel-roi-calculator";
import { useSoundFx } from "@/lib/use-sound-fx";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import type { ProspectState, ProspectStatus } from "@/lib/admin/prospect-shared";
import { updateProspectNote, updateProspectStatus } from "./actions";
import { Chip, Kpi, PageHeader, Segmented, btnSecondary, cn, kpiRow, searchInput, usdShort } from "../kit";
import { ProspectListCard } from "./prospect-list-card";
import { FX_RATE, STAGE, STAGES } from "./stages";

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

  const contacted = useMemo(() => {
    const rows = Object.values(state).filter((r) => r.contacted_by);
    return {
      total: rows.length,
      split: PEOPLE_IDS.map((id) => `${PEOPLE[id].name} ${rows.filter((r) => r.contacted_by === id).length}`).join(" · "),
    };
  }, [state]);

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
      `"${STAGE[leadStatuses[l.id] || "nuevo"].label}"`,
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
      <PageHeader
        title="Prospectos"
        right={
          <>
            <button
              type="button"
              onClick={() => {
                setShowRoiCalc((v) => !v);
                sound.pop();
              }}
              aria-pressed={showRoiCalc}
              className={cn(btnSecondary, showRoiCalc && "border-foreground")}
            >
              <Calculator size={14} /> Calculadora ROI
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAiQualifier((v) => !v);
                sound.pop();
              }}
              aria-pressed={showAiQualifier}
              className={cn(btnSecondary, showAiQualifier && "border-foreground")}
            >
              <Sparkles size={14} /> AI Copilot
            </button>
            <button type="button" onClick={handleDownloadCsv} className={btnSecondary}>
              <Download size={14} /> CSV
            </button>
          </>
        }
      >
        Clubes, comercios y empresas de la región con el dolor detectado y el guion para escribirles. Franco y Federico ven lo mismo.
      </PageHeader>

      {saveError && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
          No se pudo guardar el último cambio: {saveError}
        </p>
      )}

      {showAiQualifier && <AiQualifier />}

      {showRoiCalc && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <PadelRoiCalculator />
        </div>
      )}

      {/* Números */}
      <div className={cn(kpiRow, "md:grid-cols-4")}>
        <Kpi
          label="Sin contactar"
          value={statusCounts.nuevo}
          tone={statusCounts.nuevo > 0 ? "accent" : undefined}
          hint={`de ${prospectLeads.length} en base`}
        />
        <Kpi label="Contactados" value={contacted.total} hint={contacted.split} />
        <Kpi label="Ganados" value={statusCounts.ganado} tone={statusCounts.ganado ? "green" : undefined} hint="Cerrados con seña" />
        <Kpi
          label="Valor en juego"
          value={usdShort(totalPipelineUsd)}
          hint={`~$${((totalPipelineUsd * FX_RATE) / 1_000_000).toFixed(1)}M ARS · ${filtered.length} prospectos`}
        />
      </div>

      {/* Filtros */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex min-w-[220px] flex-1 items-center">
            <Search size={14} className="pointer-events-none absolute left-3 text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, rubro, dirección o problema…"
              className={searchInput}
            />
          </label>
          <Segmented
            value={viewMode}
            onChange={(v) => {
              setViewMode(v);
              sound.tick();
            }}
            label="Vista"
            options={[
              { id: "kanban", label: <span className="flex items-center gap-1.5"><Kanban size={14} /> Tablero</span> },
              { id: "table", label: <span className="flex items-center gap-1.5"><LayoutGrid size={14} /> Lista</span> },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            on={statusFilter === "todos"}
            onClick={() => {
              setStatusFilter("todos");
              sound.tick();
            }}
          >
            Todos
            <span className="font-mono text-[11px] opacity-70">{prospectLeads.length}</span>
          </Chip>
          {STAGES.map((st) => (
            <Chip
              key={st.id}
              on={statusFilter === st.id}
              onClick={() => {
                setStatusFilter(st.id);
                sound.tick();
              }}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
              {st.label}
              <span className="font-mono text-[11px] opacity-70">{statusCounts[st.id]}</span>
            </Chip>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
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
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as (typeof CATEGORIES)[number]);
              sound.tick();
            }}
            aria-label="Rubro"
            className="focus-ring ml-auto rounded-full border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-1 text-[12px] text-foreground"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "Todas" ? "Todos los rubros" : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

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

      {viewMode === "table" && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((lead) => (
            <ProspectListCard
              key={lead.id}
              lead={lead}
              status={leadStatuses[lead.id] || "nuevo"}
              meta={state[lead.id]}
              copied={copiedId === lead.id}
              onStatus={updateStatus}
              onNote={updateNote}
              onWhatsApp={handleOpenWhatsApp}
              onCopy={handleCopyPitch}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--line)] px-4 py-10 text-center text-[13px] text-muted">
          No hay prospectos con esos filtros.
        </p>
      )}
    </div>
  );
}
