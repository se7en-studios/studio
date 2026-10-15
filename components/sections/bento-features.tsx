"use client";

import { useState } from "react";
import {
  Globe2,
  Gauge,
  Copy,
  Check,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

import { useSoundFx } from "@/components/providers/sound-provider";

export function BentoFeatures() {
  const [activeCodeTab, setActiveCodeTab] = useState<"action" | "query">("action");
  const [copiedCode, setCopiedCode] = useState(false);
  const { playClick, playSuccess } = useSoundFx();

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
    navigator.clipboard.writeText(codeSnippets[activeCodeTab]);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <section className="border-t border-border py-24 md:py-32">
      <Container>
        <SectionHeading
          kicker="Ingeniería & Craft"
          title="Arquitectura de alto rendimiento."
          subtitle="Diseñado con los estándares de la nueva web: Server Components, Edge Caching y optimización matemática."
        />

        {/* Bento Grid Principal */}
        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* Card 1: Lighthouse 100/100 Gauge (md:col-span-7) */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-accent/40 md:col-span-7 flex flex-col justify-between">
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

            <div className="my-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Performance", score: "100", color: "text-emerald-400" },
                { label: "Accessibility", score: "100", color: "text-emerald-400" },
                { label: "Best Practices", score: "100", color: "text-emerald-400" },
                { label: "SEO Score", score: "100", color: "text-emerald-400" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border/80 bg-background/60 p-3 text-center"
                >
                  <span className={`display text-2xl font-bold ${item.color}`}>
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

          {/* Card 2: Edge Latency Radar (md:col-span-5) */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-colors hover:border-accent/40 md:col-span-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Globe2 size={18} />
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  Vercel Edge Network
                </span>
              </div>
              <span className="font-mono text-xs text-muted">300+ PoPs</span>
            </div>

            <div className="my-6 space-y-3">
              {[
                { city: "Buenos Aires (eze1)", latency: "11 ms", status: "Óptimo" },
                { city: "São Paulo (gru1)", latency: "24 ms", status: "Óptimo" },
                { city: "Washington D.C. (iad1)", latency: "82 ms", status: "Rápido" },
                { city: "Frankfurt (fra1)", latency: "138 ms", status: "Global" },
              ].map((node) => (
                <div
                  key={node.city}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/50 px-3.5 py-2 text-xs"
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
              Distribución global en los bordes para que tus usuarios sientan una respuesta instantánea sin importar su país.
            </p>
          </div>

          {/* Card 3: Interactive Live Terminal (md:col-span-12) */}
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-[#0e0e11] p-6 md:p-8 md:col-span-12">
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

              {/* Pestañas de código */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setActiveCodeTab("action");
                  }}
                  className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                    activeCodeTab === "action"
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
                    setActiveCodeTab("query");
                  }}
                  className={`rounded-lg px-3 py-1 font-mono text-xs transition-colors ${
                    activeCodeTab === "query"
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
                  title="Copiar código"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedCode ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
            </div>

            {/* Editor de Código Visual */}
            <div className="mt-4 overflow-x-auto font-mono text-xs leading-relaxed text-[#eaeaea]">
              <pre className="p-2">
                <code>{codeSnippets[activeCodeTab]}</code>
              </pre>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
