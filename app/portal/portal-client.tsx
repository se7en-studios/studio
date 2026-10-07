"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Clock,
  ExternalLink,
  GitBranch,
  GitCommit,
  Layers,
  Play,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  ArrowRight,
  Terminal,
  Smartphone,
  Laptop,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { useSoundFx } from "@/components/providers/sound-provider";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

interface SprintTask {
  id: string;
  title: string;
  category: "Design" | "Engineering" | "Database" | "QA & Polish";
  status: "completed" | "in-progress" | "pending";
  date: string;
}

const mockTasks: SprintTask[] = [
  {
    id: "task-1",
    title: "Dirección de arte y Wireframes interactivos en Figma",
    category: "Design",
    status: "completed",
    date: "Hace 6 días",
  },
  {
    id: "task-2",
    title: "Esquema relacional en PostgreSQL con Supabase & Row-Level Security",
    category: "Database",
    status: "completed",
    date: "Hace 4 días",
  },
  {
    id: "task-3",
    title: "Arquitectura Server Components en Next.js 16 con Turbopack",
    category: "Engineering",
    status: "completed",
    date: "Hace 2 días",
  },
  {
    id: "task-4",
    title: "Animaciones cinemáticas a 60 FPS con Framer Motion",
    category: "QA & Polish",
    status: "in-progress",
    date: "En curso hoy",
  },
  {
    id: "task-5",
    title: "Despliegue perimetral en Vercel Edge y auditoría SEO Core Web Vitals",
    category: "Engineering",
    status: "pending",
    date: "Próximo hito",
  },
];

const mockCommits = [
  { hash: "f7a29e1", message: "feat: streaming server actions con validación zod", time: "Hace 12 min" },
  { hash: "8b14c02", message: "perf: optimización avif y precache de rutas en edge", time: "Hace 45 min" },
  { hash: "3e99d81", message: "style: micro-interacciones hapticas de sonido", time: "Hace 2 horas" },
];

export function PortalClient() {
  const [activeTab, setActiveTab] = useState<"sprints" | "staging" | "metrics">("sprints");
  const { playClick, playPop } = useSoundFx();

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Portal de Cliente & Transparencia en Vivo</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
            Tu proyecto en tiempo real. <br />
            <span className="text-accent">Cero incertidumbre.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Así es la experiencia de trabajar con Se7en Studio: acceso directo a tu entorno de Staging privado, commits en vivo, avance de sprints y comunicación continua.
          </p>
        </div>

        {/* Dashboard Frame */}
        <div className="mt-12 overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
          {/* Barra Superior del Proyecto */}
          <div className="flex flex-col gap-4 border-b border-border bg-surface-2/60 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-background font-mono font-bold text-lg">
                7S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground text-base">
                    Proyecto Demo: Sentinel Cloud v2
                  </h3>
                  <span className="rounded-full bg-accent/15 border border-accent/30 px-2 py-0.5 font-mono text-[10px] text-accent font-bold">
                    SPRINT 2 / 3
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Tech Lead: Franco Riquero · Product Lead: Federico
                </p>
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="flex items-center gap-3">
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-1.5 font-mono text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
              >
                <WhatsAppLogo size={14} />
                <span>Canal Directo</span>
              </a>

              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 font-mono text-xs text-muted hover:text-foreground transition-colors"
              >
                <GitBranch size={13} />
                <span>staging-nextjs16</span>
              </a>
            </div>
          </div>

          {/* Navegación por Pestañas */}
          <div className="flex border-b border-border bg-surface px-6 font-mono text-xs">
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab("sprints");
              }}
              className={`border-b-2 py-3 px-4 font-semibold transition-colors ${
                activeTab === "sprints"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Feed de Sprints & Entregables
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab("staging");
              }}
              className={`border-b-2 py-3 px-4 font-semibold transition-colors ${
                activeTab === "staging"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Staging URL & Commits en Vivo
            </button>
            <button
              type="button"
              onClick={() => {
                playClick();
                setActiveTab("metrics");
              }}
              className={`border-b-2 py-3 px-4 font-semibold transition-colors ${
                activeTab === "metrics"
                  ? "border-accent text-accent"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Auditoría Lighthouse 100/100
            </button>
          </div>

          {/* Contenido de Pestañas */}
          <div className="p-6 md:p-8">
            {activeTab === "sprints" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3 text-xs font-mono text-muted">
                  <span>Hito / Tarea de Ingeniería</span>
                  <span>Estado de Validación</span>
                </div>

                <div className="space-y-3">
                  {mockTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border/80 bg-background/60 p-4 transition-all hover:border-foreground/30"
                    >
                      <div className="flex items-start gap-3">
                        {task.status === "completed" ? (
                          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
                        ) : task.status === "in-progress" ? (
                          <Activity size={18} className="text-accent shrink-0 mt-0.5 animate-spin" />
                        ) : (
                          <Clock size={18} className="text-muted shrink-0 mt-0.5" />
                        )}

                        <div>
                          <h4 className="font-medium text-foreground text-sm">
                            {task.title}
                          </h4>
                          <span className="font-mono text-[11px] text-muted">
                            Categoría: {task.category} · {task.date}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider shrink-0 text-center ${
                          task.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                            : task.status === "in-progress"
                            ? "bg-accent/15 text-accent border border-accent/40 animate-pulse"
                            : "bg-surface-2 text-muted border border-border"
                        }`}
                      >
                        {task.status === "completed"
                          ? "Completado & Aprobado"
                          : task.status === "in-progress"
                          ? "En Desarrollo Activo"
                          : "Próximo en Roadmap"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "staging" && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-background p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                      <Rocket size={18} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">
                        Entorno Privado de Staging Activo
                      </h4>
                      <p className="font-mono text-xs text-muted">
                        https://staging-sentinel.se7enstudios.com
                      </p>
                    </div>
                  </div>

                  <a
                    href="/work/sentinel"
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-background hover:bg-accent/90"
                  >
                    <span>Abrir Demo en Vivo</span>
                    <ExternalLink size={13} />
                  </a>
                </div>

                {/* Commits */}
                <div className="rounded-2xl border border-border bg-[#0d0d10] p-6 font-mono text-xs">
                  <h4 className="text-muted uppercase tracking-wider text-[11px] mb-4 flex items-center gap-2">
                    <Terminal size={14} className="text-accent" />
                    <span>Registro de Despliegues Continuos (CI/CD)</span>
                  </h4>

                  <div className="space-y-3">
                    {mockCommits.map((c) => (
                      <div key={c.hash} className="flex items-center justify-between border-b border-white/5 pb-2 text-muted">
                        <div className="flex items-center gap-3">
                          <GitCommit size={14} className="text-accent" />
                          <span className="text-foreground">{c.message}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-muted">{c.time}</span>
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-accent">
                            {c.hash}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "metrics" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Performance", score: 100, desc: "Carga First Contentful Paint en 0.4s" },
                  { label: "Accessibility", score: 100, desc: "100% compatible con lectores y ARIA" },
                  { label: "Best Practices", score: 100, desc: "HTTPS, CSP y cabeceras de seguridad" },
                  { label: "SEO Score", score: 100, desc: "Metadatos OpenGraph y schema.org" },
                ].map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-2xl border border-border bg-background p-6 text-center"
                  >
                    <div className="display mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-500 bg-emerald-500/10 text-3xl font-bold text-emerald-400">
                      {metric.score}
                    </div>
                    <h4 className="mt-4 font-semibold text-foreground text-sm">
                      {metric.label}
                    </h4>
                    <p className="mt-1 text-[11px] text-muted leading-relaxed">
                      {metric.desc}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CTA */}
        <Reveal>
          <div className="mt-20 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Querés construir tu próximo producto con este nivel de claridad?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Empecemos armando el brief de tu proyecto en 3 minutos.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Armar Brief Interactivo</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
