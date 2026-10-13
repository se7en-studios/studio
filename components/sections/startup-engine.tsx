"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gauge,
  Layers,
  Sparkles,
  Globe2,
  Database,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Server,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { useSoundFx } from "@/components/providers/sound-provider";

type EngineTab = "performance" | "blueprint" | "comparison";

interface ArchitectureLayer {
  step: string;
  name: string;
  role: string;
  tech: string;
  icon: LucideIcon;
  specs: string[];
  security: string;
}

const architectureLayers: ArchitectureLayer[] = [
  {
    step: "01",
    name: "Edge CDN & Global Middleware",
    role: "Primera línea de respuesta perimetral",
    tech: "Vercel Edge Network / Cloudflare",
    icon: Globe2,
    specs: [
      "Tiempos de respuesta (TTFB) < 40ms en todo el mundo",
      "SSL automático de grado bancario y mitigación DDoS perimetral",
      "Enrutamiento dinámico y geolocalización en milisegundos",
    ],
    security: "Mitigación perimetral activa 24/7",
  },
  {
    step: "02",
    name: "React 19 Server Components",
    role: "Renderizado ultrarrápido y 0 JS innecesario",
    tech: "Next.js 16 (Turbopack) & Tailwind CSS v4",
    icon: Layers,
    specs: [
      "Streaming SSR: contenido visible antes de finalizar la carga",
      "0 KB de JavaScript cliente innecesario",
      "Micro-interacciones y transiciones fluidas a 60 FPS",
    ],
    security: "Sin credenciales ni lógica sensible expuesta en el cliente",
  },
  {
    step: "03",
    name: "Server Actions & API Layer",
    role: "Mutaciones atómicas y lógica de negocio",
    tech: "TypeScript Strict & Zod Validation",
    icon: Server,
    specs: [
      "Mutaciones tipadas de punta a punta sin endpoints REST públicos",
      "Validación de esquemas estricta y protección contra inyección",
      "Rate Limiting inteligente y mitigación de abuso",
    ],
    security: "Tokens y claves protegidas 100% en el servidor",
  },
  {
    step: "04",
    name: "PostgreSQL & Realtime Sync",
    role: "Persistencia de datos y suscripciones",
    tech: "Supabase Postgres & pgvector",
    icon: Database,
    specs: [
      "Row-Level Security (RLS) para aislamiento estricto de datos",
      "WebSockets en tiempo real para estados instantáneos (<20ms)",
      "Backups automáticos diarios y réplicas geográficas",
    ],
    security: "Aislamiento por usuario a nivel de base de datos",
  },
  {
    step: "05",
    name: "Modelos IA & APIs de Alta Escala",
    role: "Automatizaciones y procesamiento de datos",
    tech: "OpenAI, Anthropic & APIs Satelitales",
    icon: Bot,
    specs: [
      "Integración de agentes conversacionales y búsqueda vectorial",
      "Procesamiento de datos en vivo y webhooks resilientes",
      "Caché de inferencia para optimización de costos",
    ],
    security: "Cifrado AES-256 en tránsito y reposo",
  },
];

const comparisonMetrics = [
  {
    aspect: "Velocidad de Carga (FCP)",
    se7en: "0.4s — Instantáneo en Vercel Edge con 0 JS superfluo",
    traditional: "4.8s — Plugins pesados, constructores visuales lentos",
  },
  {
    aspect: "Google Lighthouse",
    se7en: "98 - 100 / 100 Core Web Vitals en verde",
    traditional: "45 - 65 / 100 penalizaciones en SEO y rebotes",
  },
  {
    aspect: "Seguridad & Vulnerabilidades",
    se7en: "0 Plugins inseguros. TypeScript estricto + RLS",
    traditional: "40+ Plugins de terceros con riesgos de hackeo",
  },
  {
    aspect: "Propiedad & Código",
    se7en: "100% Tuyo en GitHub sin ataduras de software",
    traditional: "Cautivo en plataformas cerradas o plantillas viejas",
  },
  {
    aspect: "Interlocución & Agilidad",
    se7en: "Canal directo con 2 fundadores senior (Diseño & Dev)",
    traditional: "3 a 5 intermediarios (PM, Account, Junior Devs)",
  },
];

export function StartupEngine() {
  const [activeTab, setActiveTab] = useState<EngineTab>("performance");
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [codeTab, setCodeTab] = useState<"action" | "query">("action");
  const [copiedCode, setCopiedCode] = useState(false);
  const { playClick, playSwitch, playSuccess } = useSoundFx();

  const currentLayer = architectureLayers[selectedLayerIndex];
  const LayerIcon = currentLayer.icon;

  const codeSnippets = {
    action: `// app/actions/create-order.ts (Next.js 16 Server Action)
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitOrder(formData: OrderSchema) {
  const supabase = await createClient()
  
  // ⚡ Transacción atómica en PostgreSQL con RLS
  const { data, error } = await supabase
    .from('orders')
    .insert(formData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  
  // Instant Edge Revalidation (<10ms)
  revalidatePath('/dashboard/orders')
  return { success: true, orderId: data.id }
}`,
    query: `// lib/queries/get-analytics.ts (Edge Caching con Vercel)
export async function getLiveMetrics() {
  return fetch('https://api.se7enstudios.com/v1/metrics', {
    next: { 
      revalidate: 60, // SWR Cache en 300+ nodos Edge
      tags: ['analytics'] 
    }
  }).then(res => res.json())
}`,
  };

  function copyCode() {
    playSuccess();
    navigator.clipboard.writeText(codeSnippets[codeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  function handleTabChange(tab: EngineTab) {
    playSwitch();
    setActiveTab(tab);
  }

  return (
    <section id="tech-engine" className="border-t border-border py-20 md:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="The Startup Engine"
            title="Ingeniería moderna sin deuda técnica."
            subtitle="El stack que usan las mejores empresas de tecnología: Server Components, Edge Caching y bases de datos relacionales."
          />

          {/* Selector de Pestañas Principal */}
          <div className="inline-flex rounded-full border border-border bg-surface p-1 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("performance")}
              className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs transition-all ${
                activeTab === "performance"
                  ? "bg-accent text-background font-semibold shadow-[0_0_15px_rgba(255,77,46,0.25)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Gauge size={14} />
              <span>Velocidad & Edge</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("blueprint")}
              className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs transition-all ${
                activeTab === "blueprint"
                  ? "bg-accent text-background font-semibold shadow-[0_0_15px_rgba(255,77,46,0.25)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Layers size={14} />
              <span>Blueprint de Capas</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("comparison")}
              className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs transition-all ${
                activeTab === "comparison"
                  ? "bg-accent text-background font-semibold shadow-[0_0_15px_rgba(255,77,46,0.25)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Sparkles size={14} />
              <span>Se7en vs Agencias</span>
            </button>
          </div>
        </div>

        {/* CONTENEDOR CON ANIMACIÓN DE TRANSICIÓN */}
        <div className="mt-12">
          <AnimatePresence mode="wait">
            {/* CONTENIDO DE LA PESTAÑA 1: VELOCIDAD & EDGE */}
            {activeTab === "performance" && (
              <motion.div
                key="tab-performance"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 gap-6 md:grid-cols-12"
              >
                {/* Card Lighthouse Score */}
                <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 md:col-span-7 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <Gauge size={18} />
                      </span>
                      <span className="font-mono text-xs uppercase tracking-widest text-muted">
                        Google Lighthouse
                      </span>
                    </div>
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 font-mono text-xs font-semibold text-emerald-400">
                      100 / 100 Score
                    </span>
                  </div>

                  <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { label: "Performance", score: "100" },
                      { label: "Accessibility", score: "100" },
                      { label: "Best Practices", score: "100" },
                      { label: "SEO Score", score: "100" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border border-border/80 bg-background/60 p-3 text-center"
                      >
                        <span className="display text-2xl font-bold text-emerald-400">
                          {item.score}
                        </span>
                        <p className="mt-1 font-mono text-[10px] text-muted">
                          {item.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border/60 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-muted">
                    <span>First Contentful Paint: <strong className="text-foreground">0.4s</strong></span>
                    <span>Largest Contentful Paint: <strong className="text-foreground">0.7s</strong></span>
                    <span>CLS: <strong className="text-foreground">0.00</strong></span>
                  </div>
                </div>

                {/* Card Edge Radar */}
                <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 md:col-span-5 flex flex-col justify-between shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Globe2 size={18} />
                      </span>
                      <span className="font-mono text-xs uppercase tracking-widest text-muted">
                        Red Perimetral Vercel
                      </span>
                    </div>
                    <span className="font-mono text-xs text-muted">300+ PoPs</span>
                  </div>

                  <div className="my-5 space-y-2.5">
                    {[
                      { city: "Buenos Aires (eze1)", latency: "11 ms" },
                      { city: "São Paulo (gru1)", latency: "24 ms" },
                      { city: "Washington D.C. (iad1)", latency: "82 ms" },
                      { city: "Frankfurt (fra1)", latency: "138 ms" },
                    ].map((node) => (
                      <div
                        key={node.city}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-xs"
                      >
                        <span className="font-mono text-muted">{node.city}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{node.latency}</span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted leading-relaxed">
                    Distribución en los bordes para una respuesta instantánea sin importar dónde esté tu cliente.
                  </p>
                </div>

                {/* Card Terminal de Código */}
                <div className="rounded-2xl border border-border bg-[#0e0e11] p-6 md:p-8 md:col-span-12 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1.5">
                        <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                        <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                        <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                      </div>
                      <span className="font-mono text-xs text-muted">
                        architecture-preview.ts
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setCodeTab("action");
                        }}
                        className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                          codeTab === "action"
                            ? "bg-accent text-background font-bold"
                            : "bg-surface text-muted hover:text-foreground"
                        }`}
                      >
                        Server Action
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          playClick();
                          setCodeTab("query");
                        }}
                        className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                          codeTab === "query"
                            ? "bg-accent text-background font-bold"
                            : "bg-surface text-muted hover:text-foreground"
                        }`}
                      >
                        Edge Cache SWR
                      </button>

                      <button
                        type="button"
                        onClick={copyCode}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1 font-mono text-xs text-muted hover:text-foreground transition-colors ml-2"
                      >
                        {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{copiedCode ? "Copiado" : "Copiar"}</span>
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-[#eaeaea]">
                    <pre className="p-2">
                      <code>{codeSnippets[codeTab]}</code>
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CONTENIDO DE LA PESTAÑA 2: BLUEPRINT DE ARQUITECTURA */}
            {activeTab === "blueprint" && (
              <motion.div
                key="tab-blueprint"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {architectureLayers.map((layer, idx) => {
                    const isSelected = selectedLayerIndex === idx;
                    const Icon = layer.icon;

                    return (
                      <button
                        key={layer.step}
                        type="button"
                        onClick={() => {
                          playClick();
                          setSelectedLayerIndex(idx);
                        }}
                        className={`focus-ring relative text-left rounded-2xl border p-4 transition-all duration-300 ${
                          isSelected
                            ? "border-accent bg-surface shadow-[0_0_20px_rgba(255,77,46,0.18)]"
                            : "border-border bg-surface/50 hover:border-foreground/30 hover:bg-surface"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-accent">
                            Capa {layer.step}
                          </span>
                          <Icon size={16} className={isSelected ? "text-accent" : "text-muted"} />
                        </div>

                        <h4 className="mt-2.5 text-xs font-semibold text-foreground">
                          {layer.name}
                        </h4>

                        <p className="mt-1 font-mono text-[10px] text-muted truncate">
                          {layer.tech}
                        </p>

                        {isSelected && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-accent" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Detalle Expandido de la Capa */}
                <div className="rounded-2xl border border-border bg-surface p-6 md:p-8 shadow-lg">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/80 pb-5">
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent shrink-0">
                        <LayerIcon size={24} />
                      </div>
                      <div>
                        <span className="font-mono text-xs text-accent uppercase font-semibold">
                          Capa {currentLayer.step} — {currentLayer.tech}
                        </span>
                        <h3 className="display mt-0.5 text-2xl text-foreground">
                          {currentLayer.name}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-400 font-mono">
                      <ShieldCheck size={15} />
                      <span>{currentLayer.security}</span>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3.5 md:grid-cols-3">
                    {currentLayer.specs.map((spec, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-border/80 bg-background/60 p-4"
                      >
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={15} className="text-accent shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed text-muted">
                            {spec}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* CONTENIDO DE LA PESTAÑA 3: SE7EN VS AGENCIAS */}
            {activeTab === "comparison" && (
              <motion.div
                key="tab-comparison"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-12 border-b border-border bg-surface-2/60 font-mono text-xs">
                  <div className="p-4 md:col-span-4 text-muted uppercase tracking-wider font-semibold">
                    Criterio de Calidad
                  </div>
                  <div className="p-4 md:col-span-4 border-t md:border-t-0 md:border-l border-border bg-accent/5 text-accent font-bold flex items-center gap-2">
                    <Sparkles size={14} />
                    <span>Se7en Studio (Next.js 16)</span>
                  </div>
                  <div className="p-4 md:col-span-4 border-t md:border-t-0 md:border-l border-border text-muted">
                    <span>Agencias / WordPress / Plantillas</span>
                  </div>
                </div>

                <div className="divide-y divide-border">
                  {comparisonMetrics.map((row) => (
                    <div
                      key={row.aspect}
                      className="grid grid-cols-1 md:grid-cols-12 hover:bg-surface-2/40 transition-colors"
                    >
                      <div className="p-4 md:col-span-4 flex items-center font-medium text-xs text-foreground">
                        {row.aspect}
                      </div>

                      <div className="p-4 md:col-span-4 md:border-l border-border bg-accent/[0.02]">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed text-foreground font-medium">
                            {row.se7en}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 md:col-span-4 md:border-l border-border">
                        <div className="flex items-start gap-2.5">
                          <XCircle size={16} className="text-red-400/80 shrink-0 mt-0.5" />
                          <p className="text-xs leading-relaxed text-muted">
                            {row.traditional}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Container>
    </section>
  );
}
