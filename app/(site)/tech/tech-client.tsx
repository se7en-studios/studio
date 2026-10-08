"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Layers,
  Radio,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Sparkles,
  Code2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { radarItems, RadarRing, RadarCategory, RadarItem } from "@/data/tech-radar";
import { useSoundFx } from "@/components/providers/sound-provider";

const ringConfig: Record<
  RadarRing,
  { label: string; badge: string; color: string; bg: string; border: string; icon: LucideIcon }
> = {
  adopt: {
    label: "Adoptar (Core Stack)",
    badge: "Estándar de Producción",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  trial: {
    label: "En Producción (Trial)",
    badge: "Casos Seleccionados",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/30",
    icon: Sparkles,
  },
  assess: {
    label: "En Evaluación (Assess)",
    badge: "Investigación & I+D",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: HelpCircle,
  },
  avoid: {
    label: "Evitar (Avoid / Legacy)",
    badge: "No Recomendado",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    icon: XCircle,
  },
};

const categories: { id: "all" | RadarCategory; label: string }[] = [
  { id: "all", label: "Todas las categorías" },
  { id: "frontend", label: "Frontend & UI" },
  { id: "backend", label: "Backend & Datos" },
  { id: "ai", label: "Inteligencia Artificial" },
  { id: "infrastructure", label: "Infraestructura" },
  { id: "design", label: "Design Systems" },
];

export function TechRadarClient() {
  const [selectedRing, setSelectedRing] = useState<"all" | RadarRing>("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | RadarCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { playClick, playPop } = useSoundFx();

  const filteredItems = useMemo(() => {
    return radarItems.filter((item) => {
      const matchesRing = selectedRing === "all" || item.ring === selectedRing;
      const matchesCategory = selectedCategory === "all" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.why.toLowerCase().includes(q);

      return matchesRing && matchesCategory && matchesSearch;
    });
  }, [selectedRing, selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Radio size={13} className="text-accent animate-pulse" />
            <span>Radar Tecnológico de Se7en Studio</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Nuestras decisiones <br />
            <span className="text-accent">de ingeniería y stack.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Un mapa transparente de las tecnologías que adoptamos, evaluamos y evitamos conscientemente para garantizar productos rápidos, seguros y escalables.
          </p>
        </div>

        {/* Barra de Filtros */}
        <div className="mt-12 space-y-4 border-y border-border py-6">
          {/* Filtro por Cuadrante / Anillo */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                playClick();
                setSelectedRing("all");
              }}
              className={`focus-ring rounded-lg border px-3.5 py-1.5 font-mono text-xs transition-all ${
                selectedRing === "all"
                  ? "border-accent bg-accent text-background font-medium"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              Todos los anillos ({radarItems.length})
            </button>

            {(["adopt", "trial", "assess", "avoid"] as RadarRing[]).map((ringKey) => {
              const cfg = ringConfig[ringKey];
              const count = radarItems.filter((i) => i.ring === ringKey).length;
              const isSelected = selectedRing === ringKey;
              return (
                <button
                  key={ringKey}
                  type="button"
                  onClick={() => {
                    playClick();
                    setSelectedRing(ringKey);
                  }}
                  className={`focus-ring inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-1.5 font-mono text-xs transition-all ${
                    isSelected
                      ? `${cfg.border} ${cfg.bg} ${cfg.color} font-bold`
                      : "border-border bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  <cfg.icon size={13} />
                  <span>{cfg.label}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Filtro por Categoría & Buscador */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    playPop();
                    setSelectedCategory(cat.id);
                  }}
                  className={`focus-ring rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-foreground/10 text-foreground font-semibold"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-64">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar tecnología..."
                className="focus-ring w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
              />
            </div>
          </div>
        </div>

        {/* Grilla del Radar */}
        <div className="mt-10">
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center text-xs font-mono text-muted">
              No se encontraron tecnologías con los filtros seleccionados.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const ring = ringConfig[item.ring];
                const RingIcon = ring.icon;
                return (
                  <div
                    key={item.id}
                    className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 transition-all hover:border-accent/40"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border ${ring.border} ${ring.bg} ${ring.color} px-2 py-0.5 font-mono text-[10px] font-semibold uppercase`}
                        >
                          <RingIcon size={11} />
                          {ring.badge}
                        </span>

                        <span className="font-mono text-[10px] text-muted uppercase">
                          {item.category}
                        </span>
                      </div>

                      <h3 className="mt-4 font-medium text-foreground text-base">
                        {item.name}
                      </h3>

                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        {item.description}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-border/60 pt-4 space-y-2">
                      <div className="text-[11px] text-muted">
                        <strong className="text-foreground font-mono uppercase text-[10px]">Justificación técnica:</strong>
                        <p className="mt-0.5 leading-relaxed">{item.why}</p>
                      </div>

                      {item.benchmark && (
                        <div className="inline-flex items-center gap-1.5 rounded bg-background px-2 py-1 font-mono text-[10px] text-accent border border-border">
                          <Zap size={11} />
                          <span>{item.benchmark}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CTA pre-footer */}
        <Reveal>
          <div className="mt-20 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Querés construir tu producto con nuestro Core Stack?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Aprovechá la velocidad de Next.js 16 y Supabase para lanzar un producto con 100/100 de velocidad.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Iniciar un proyecto</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/roi"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-muted hover:text-foreground"
              >
                <span>Calculadora de ROI</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
