"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Download, Sparkles, Kanban, LayoutGrid, Calculator, FileText, Snowflake } from "lucide-react";
import { prospectLeads, type ProspectLead } from "@/data/prospects";
import { ProspectosKanban } from "./prospectos-kanban";
import { AiQualifier } from "./ai-qualifier";
import { PadelRoiCalculator } from "./padel-roi-calculator";
import { useSoundFx } from "@/lib/use-sound-fx";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import type { ProspectState, ProspectStatus } from "@/lib/admin/prospect-shared";
import { COLD_DAYS, coldDays, contactedToday, daysSinceContact, templateKindFor } from "@/lib/admin/prospect-followup";
import { contactProspect, updateProspectNote, updateProspectStatus } from "./actions";
import { TemplatesDialog } from "./templates-dialog";
import { pickTemplate, renderTemplate, templateVars, type ProspectTemplate } from "@/lib/admin/prospect-template-shared";
import { useStoredChoice } from "../overlay";
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

export function ProspectosClient({
  initialState,
  me,
  templates,
  templatesReady,
}: {
  initialState: Record<string, ProspectState>;
  me: LeadOwner;
  templates: ProspectTemplate[];
  templatesReady: boolean;
}) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [showAiQualifier, setShowAiQualifier] = useState(false);
  const [showRoiCalc, setShowRoiCalc] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
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
  // «Ahora», para los días sin respuesta; se actualiza con cada lectura periódica.
  const [now, setNow] = useState(() => Date.now());
  const [whoFilter, setWhoFilter] = useState<"todos" | LeadOwner>("todos");
  const [coldOnly, setColdOnly] = useState(false);

  // Lo que llega del servidor (lo que cargó el otro) pisa lo local.
  if (seen !== initialState) {
    setSeen(initialState);
    setState(initialState);
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      router.refresh();
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

  // Le escribió: pasa a «contactado» si era nuevo (no pisa una charla ni un cierre) y queda
  // anotado cuándo y quién.
  const touch = (leadId: string) => {
    const before = state[leadId];
    const at = new Date().toISOString();
    save(
      leadId,
      {
        status: !before || before.status === "nuevo" ? "contactado" : before.status,
        last_contact_at: at,
        last_contact_by: me,
        ...(before?.contacted_by ? {} : { contacted_by: me, contacted_at: at }),
      },
      () => contactProspect(leadId),
    );
  };

  const updateNote = (leadId: string, note: string) =>
    save(leadId, { note, note_by: note ? me : null, note_at: note ? new Date().toISOString() : null }, () =>
      updateProspectNote(leadId, note),
    );

  // Qué mensaje se usa al escribir: «auto» elige una plantilla al azar (sin repetir la última),
  // o una fija, o el guion largo que trae cada prospecto.
  const [choice, setChoice] = useStoredChoice<string>("se7en_prospect_msg", "auto", ["auto", "original", ...templates.map((t) => t.id)]);
  const lastTemplate = useRef<string | null>(null);

  // Si todavía no le escribió: una plantilla de primer mensaje. Si ya le escribió: una de seguimiento.
  const buildMessage = (lead: ProspectLead, pick: string = choice): { id: string; text: string } => {
    const st = state[lead.id];
    const kind = templateKindFor(st?.status);
    if (kind === "primero" && pick === "original") return { id: "original", text: lead.pitch };
    const tpl = templates.find((t) => t.id === pick && t.kind === kind) ?? pickTemplate(templates, lastTemplate.current, kind);
    if (!tpl) return { id: "original", text: lead.pitch };
    lastTemplate.current = tpl.id;
    return { id: tpl.id, text: renderTemplate(tpl.body, templateVars(lead, PEOPLE[me].name, daysSinceContact(st, now))) };
  };

  const handleOpenWhatsApp = (lead: ProspectLead, text?: string) => {
    sound.pop();
    const phone = lead.phone.replace(/\D/g, "");
    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text ?? buildMessage(lead).text)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    touch(lead.id);
  };

  const filtered = useMemo(() => {
    return prospectLeads.filter((item) => {
      const matchCity = selectedCity === "Todas" || item.city === selectedCity;
      const matchCategory = selectedCategory === "Todas" || item.category === selectedCategory;
      const leadStatus = leadStatuses[item.id] || "nuevo";
      const matchStatus = statusFilter === "todos" || leadStatus === statusFilter;
      const q = search.toLowerCase().trim();
      const matchWho = whoFilter === "todos" || state[item.id]?.contacted_by === whoFilter;
      const matchCold = !coldOnly || coldDays(state[item.id], now) !== null;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.painPoint.toLowerCase().includes(q);
      return matchCity && matchCategory && matchStatus && matchWho && matchCold && matchSearch;
    });
  }, [search, selectedCity, selectedCategory, statusFilter, leadStatuses, whoFilter, coldOnly, state, now]);

  // Contadores de estado
  const statusCounts = useMemo(() => {
    const counts = { nuevo: 0, contactado: 0, en_charla: 0, ganado: 0, descartado: 0, numero_equivocado: 0 };
    prospectLeads.forEach((lead) => {
      const st = leadStatuses[lead.id] || "nuevo";
      counts[st] = (counts[st] || 0) + 1;
    });
    return counts;
  }, [leadStatuses]);

  const today = useMemo(() => contactedToday(Object.values(state), now), [state, now]);
  const coldCount = useMemo(() => Object.values(state).filter((r) => coldDays(r, now) !== null).length, [state, now]);

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
    navigator.clipboard.writeText(buildMessage(lead).text);
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
            <button type="button" onClick={() => setShowTemplates(true)} className={btnSecondary}>
              <FileText size={14} /> Plantillas
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

      {showTemplates && (
        <TemplatesDialog
          templates={templates}
          ready={templatesReady}
          who={PEOPLE[me].name}
          onClose={() => setShowTemplates(false)}
          onChanged={() => router.refresh()}
        />
      )}

      {showRoiCalc && (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <PadelRoiCalculator />
        </div>
      )}

      {/* Números */}
      <div className={cn(kpiRow, "md:grid-cols-3 xl:grid-cols-6")}>
        <Kpi
          label="Sin contactar"
          value={statusCounts.nuevo}
          tone={statusCounts.nuevo > 0 ? "accent" : undefined}
          hint={`de ${prospectLeads.length} en base`}
        />
        <Kpi label="Contactados" value={contacted.total} hint={contacted.split} />
        <Kpi
          label="Hoy"
          value={Object.values(today).reduce((a, n) => a + n, 0)}
          hint={PEOPLE_IDS.map((id) => `${PEOPLE[id].name} ${today[id]}`).join(" · ")}
        />
        <button
          type="button"
          onClick={() => {
            setColdOnly((v) => !v);
            sound.tick();
          }}
          aria-pressed={coldOnly}
          title={`Contactados sin respuesta hace ${COLD_DAYS} días o más. Tocá para filtrarlos.`}
          className={cn("focus-ring rounded-xl text-left", coldOnly && "ring-1 ring-amber-400/60")}
        >
          <Kpi
            label={coldOnly ? "Para retomar · filtrando" : "Para retomar"}
            value={coldCount}
            tone={coldCount > 0 ? "amber" : undefined}
            hint={`${COLD_DAYS}+ días sin respuesta`}
            icon={<Snowflake size={14} />}
          />
        </button>
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
          <label className="flex items-center gap-2 text-[12px] text-muted">
            Primer mensaje
            <select
              value={choice}
              onChange={(e) => {
                setChoice(e.target.value);
                sound.tick();
              }}
              aria-label="Mensaje de apertura"
              className="focus-ring rounded-full border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-1.5 text-[13px] text-foreground"
            >
              <option value="auto">Variar entre plantillas</option>
              {templates
                .filter((t) => t.kind === "primero")
                .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.active ? "" : " (pausada)"}
                </option>
              ))}
              <option value="original">Guion largo de cada prospecto</option>
            </select>
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
          <span className="mx-1 h-4 w-px bg-[var(--line-strong)]" aria-hidden />
          <span className="text-[12px] text-muted">Contactó</span>
          {(["todos", ...PEOPLE_IDS] as const).map((id) => (
            <Chip
              key={id}
              on={whoFilter === id}
              onClick={() => {
                setWhoFilter(id);
                sound.tick();
              }}
            >
              {id === "todos" ? "Todos" : PEOPLE[id].name}
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
          now={now}
          templates={templates}
          buildMessage={buildMessage}
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
              now={now}
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
