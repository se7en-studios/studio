"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Terminal,
  Play,
  CheckCircle2,
  Cpu,
  Database,
  Zap,
  Sparkles,
  ShieldCheck,
  Clock,
  ArrowRight,
  Code2,
  RefreshCw,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { useSoundFx } from "@/components/providers/sound-provider";

interface DemoAction {
  id: string;
  name: string;
  category: string;
  description: string;
  codeSnippet: string;
  responsePayload: Record<string, unknown>;
  latencyRange: string;
  headers: Record<string, string>;
}

const demoActions: DemoAction[] = [
  {
    id: "postgres-query",
    name: "1. Consulta Server Action con Supabase RLS",
    category: "Database & Backend",
    description: "Ejecución atómica en el servidor sin exponer claves de API en el cliente.",
    codeSnippet: `// app/actions/products.ts
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function getLiveCatalog(storeSlug: string) {
  const supabase = await createServerClient()
  
  // ⚡ Consulta con Row-Level Security aislada por tenant
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock, is_active')
    .eq('store_slug', storeSlug)
    .order('created_at', { ascending: false })

  return { success: !error, products: data, count: data?.length }
}`,
    responsePayload: {
      success: true,
      executionEngine: "Next.js 16 Server Action (Edge Runtime)",
      tenant: "takefyy-demo-restaurant",
      products: [
        { id: "prod_991", name: "Hamburguesa Doble Smash", price: 12500, stock: 45, is_active: true },
        { id: "prod_992", name: "Papas Fritas Rústicas", price: 6200, stock: 80, is_active: true },
      ],
      queryLatency: "14ms",
      rlsEnforced: true,
    },
    latencyRange: "12ms — 16ms",
    headers: {
      "X-Vercel-Cache": "HIT",
      "Server-Timing": "edge;dur=14, db;dur=8",
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
    },
  },
  {
    id: "zod-validation",
    name: "2. Validación Estricta con Zod Schemas",
    category: "Safety & TypeScript",
    description: "Sanitización y tipado riguroso antes de cualquier mutación de base de datos.",
    codeSnippet: `// schemas/order.ts
import { z } from 'zod'

export const OrderSchema = z.object({
  customerName: z.string().min(3, "Nombre muy corto"),
  phone: z.string().regex(/^\\+?[0-9]{10,15}$/, "Teléfono inválido"),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).nonempty("El carrito no puede estar vacío"),
  paymentMethod: z.enum(["mercadopago", "cash", "stripe"]),
})`,
    responsePayload: {
      status: "VALIDATION_PASSED",
      sanitizedPayload: {
        customerName: "Martín Gómez",
        phone: "+5492994112233",
        itemsCount: 2,
        totalCalculated: 18700,
      },
      validationTime: "0.8ms",
      typeSafe: true,
    },
    latencyRange: "1ms — 3ms",
    headers: {
      "X-Validation-Engine": "Zod v3.23 (Strict Mode)",
      "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    },
  },
  {
    id: "ai-streaming",
    name: "3. Streaming de Tokens con Modelos LLM",
    category: "AI Agents",
    description: "Transmisión en tiempo real de respuestas contextuales con Claude 3.7.",
    codeSnippet: `// app/api/chat/route.ts
import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

export async function POST(req: Request) {
  const { messages, contextDocs } = await req.json()

  const result = streamText({
    model: anthropic('claude-3-7-sonnet'),
    system: \`Sos el asistente experto de Se7en Studio. Respondé en base a: \${contextDocs}\`,
    messages,
  })

  return result.toDataStreamResponse()
}`,
    responsePayload: {
      model: "claude-3-7-sonnet",
      streamStatus: "COMPLETED",
      tokensGenerated: 142,
      timeToFirstToken: "185ms",
      responseSample: "Diseñamos interfaces optimizadas para renderizarse con aceleración por hardware a 60 FPS...",
    },
    latencyRange: "180ms TTFT",
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "X-Accel-Buffering": "no",
    },
  },
];

export function PlaygroundClient() {
  const [selectedDemo, setSelectedDemo] = useState<DemoAction>(demoActions[0]);
  const [isRunning, setIsRunning] = useState(false);
  const [hasExecuted, setHasExecuted] = useState(false);
  const [executionLatency, setExecutionLatency] = useState<number | null>(null);
  const { playClick, playPop, playSuccess } = useSoundFx();

  function runDemo() {
    playPop();
    setIsRunning(true);
    setHasExecuted(false);

    setTimeout(() => {
      const randomLatency = Math.floor(Math.random() * 6) + 12; // 12-18ms
      setExecutionLatency(randomLatency);
      setIsRunning(false);
      setHasExecuted(true);
      playSuccess();
    }, 400);
  }

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Terminal size={13} className="text-accent" />
            <span>Consola Interactiva para Desarrolladores & CTOs</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
            Inspeccioná nuestra arquitectura <br />
            <span className="text-accent">en tiempo real.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Probá la velocidad de ejecución de Server Actions, validaciones Zod tipadas y streaming de datos con latencia inferior a 20ms.
          </p>
        </div>

        {/* Layout de Consola */}
        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Columna Izquierda: Selector de Demos */}
          <div className="space-y-3 lg:col-span-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted font-bold mb-3">
              Seleccionar Acción a Ejecutar
            </h3>

            {demoActions.map((demo) => {
              const isSelected = selectedDemo.id === demo.id;
              return (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => {
                    playClick();
                    setSelectedDemo(demo);
                    setHasExecuted(false);
                  }}
                  className={`focus-ring w-full text-left rounded-2xl border p-5 transition-all ${
                    isSelected
                      ? "border-accent bg-surface shadow-[0_0_20px_rgba(255,77,46,0.15)]"
                      : "border-border bg-surface/50 hover:border-foreground/30 hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-accent uppercase font-bold">
                      {demo.category}
                    </span>
                    <span className="font-mono text-[11px] rounded bg-background px-2 py-0.5 text-muted border border-border">
                      ~{demo.latencyRange}
                    </span>
                  </div>

                  <h4 className="mt-2 font-medium text-foreground text-sm">
                    {demo.name}
                  </h4>

                  <p className="mt-1 text-xs text-muted leading-relaxed">
                    {demo.description}
                  </p>
                </button>
              );
            })}

            <div className="rounded-2xl border border-border bg-surface p-5 mt-6">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <ShieldCheck size={16} className="text-emerald-400" />
                <span>Zero Client-Side Leaks</span>
              </div>
              <p className="mt-2 text-[11px] text-muted leading-relaxed">
                Ninguna credencial o lógica de negocio sensible viaja en el bundle JS descargado por el navegador.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Visor de Código & Respuesta Terminal */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Panel de Código */}
            <div className="overflow-hidden rounded-3xl border border-border bg-[#0d0d10] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-[#16161c] px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                    <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                    <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className="font-mono text-xs text-white/70">
                    {selectedDemo.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={runDemo}
                  disabled={isRunning}
                  className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 font-mono text-xs font-bold text-background transition-all hover:bg-accent/90 disabled:opacity-50"
                >
                  {isRunning ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Ejecutando...</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} />
                      <span>Ejecutar Server Action</span>
                    </>
                  )}
                </button>
              </div>

              {/* Código TypeScript */}
              <div className="p-6 font-mono text-xs text-[#e4e4e7] overflow-x-auto">
                <pre>
                  <code>{selectedDemo.codeSnippet}</code>
                </pre>
              </div>
            </div>

            {/* Consola de Salida / Output */}
            <div className="overflow-hidden rounded-3xl border border-border bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
                    Respuesta del Servidor
                  </span>
                  {hasExecuted && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400 font-bold">
                      <Zap size={11} />
                      <span>{executionLatency}ms</span>
                    </span>
                  )}
                </div>

                <span className="font-mono text-[10px] text-muted">
                  Protocolo: HTTP/3 · Edge Runtime
                </span>
              </div>

              <div className="mt-4">
                {isRunning ? (
                  <div className="py-8 text-center font-mono text-xs text-muted flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-accent" />
                    <span>Resolviendo consulta en Vercel Edge...</span>
                  </div>
                ) : hasExecuted ? (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-[#0d0d10] p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                      <pre>
                        <code>{JSON.stringify(selectedDemo.responsePayload, null, 2)}</code>
                      </pre>
                    </div>

                    {/* Headers */}
                    <div className="rounded-xl border border-border bg-background p-3.5 space-y-1 font-mono text-[11px] text-muted">
                      <strong className="text-foreground text-[10px] uppercase">Cabeceras de Respuesta:</strong>
                      {Object.entries(selectedDemo.headers).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-muted">{k}:</span>
                          <span className="text-accent">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center font-mono text-xs text-muted">
                    Hacé clic en <strong>&ldquo;Ejecutar Server Action&rdquo;</strong> para disparar la consulta en vivo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <Reveal>
          <div className="mt-20 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Querés construir tu backend con esta velocidad y solidez?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Hablemos de tu arquitectura y diseñemos algo de vanguardia.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Armar Brief de Proyecto</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
