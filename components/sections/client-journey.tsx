"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Code2,
  MessageSquare,
  Rocket,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { useSoundFx } from "@/components/providers/sound-provider";

interface JourneyPhase {
  phase: string;
  days: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  whatHappens: string[];
  deliverable: string;
}

const journeyPhases: JourneyPhase[] = [
  {
    phase: "Fase 01",
    days: "Días 1 a 3",
    title: "Kickoff & Dirección de Arte",
    tagline: "Alineación de objetivos y prototipado visual",
    icon: MessageSquare,
    whatHappens: [
      "Apertura de canal privado directo de WhatsApp o Slack con los fundadores (Franco & Federico).",
      "Definición del brief estratégico y arquitectura de información.",
      "Prototipo interactivo en Figma con flujos navegables y diseño UI/UX de alta fidelidad.",
    ],
    deliverable: "Figma navegable aprobado y arquitectura técnica definida",
  },
  {
    phase: "Fase 02",
    days: "Días 4 a 10",
    title: "Ingeniería & Staging en Vivo",
    tagline: "Desarrollo en Next.js 16 y bases de datos",
    icon: Code2,
    whatHappens: [
      "Configuración de entorno de pruebas privado (staging.tudominio.com) para ver avances en vivo.",
      "Construcción de componentes atómicos en React 19 y Tailwind CSS v4.",
      "Conexión de PostgreSQL con Supabase, autenticación segura y Server Actions.",
    ],
    deliverable: "Entorno de Staging funcional y código 100% tipado en TypeScript",
  },
  {
    phase: "Fase 03",
    days: "Días 11 a 16",
    title: "Motion, Polish & Optimización",
    tagline: "Animaciones a 60 FPS y rendimiento extremo",
    icon: Sparkles,
    whatHappens: [
      "Implementación de transiciones fluidas y micro-interacciones con Framer Motion.",
      "Auditoría rigurosa de Core Web Vitals para garantizar 95-100 en Google Lighthouse.",
      "Pruebas de estrés y compatibilidad en dispositivos reales (iOS, Android, macOS, Windows).",
    ],
    deliverable: "Lighthouse 100/100 y experiencia fluida a 60 FPS",
  },
  {
    phase: "Fase 04",
    days: "Días 17 a 21",
    title: "Lanzamiento Global & Garantía",
    tagline: "Despliegue perimetral y soporte post-lanzamiento",
    icon: Rocket,
    whatHappens: [
      "Cambio de DNS hacia la red global de Vercel Edge con SSL automático.",
      "Indexación en Google Search Console, OpenGraph dinámico para redes y robots.txt.",
      "Entrega del repositorio GitHub a tu nombre + 30 días de garantía y soporte técnico sin costo.",
    ],
    deliverable: "Producto 100% en producción y código transferido a tu GitHub",
  },
];

export function ClientJourney() {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const { playClick } = useSoundFx();

  const activePhase = journeyPhases[activePhaseIndex];
  const Icon = activePhase.icon;

  return (
    <section className="border-t border-border py-24 md:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="Experiencia del Cliente"
            title="Del Día 1 al Lanzamiento en 2-3 semanas."
            subtitle="Un proceso transparente, con comunicación fluida y acceso continuo a los avances en tiempo real."
          />

          <Link
            href="/start"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-medium text-background hover:bg-accent/90 shrink-0"
          >
            <span>Comenzar mi proyecto</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Selector de Fases */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {journeyPhases.map((phase, idx) => {
            const isSelected = activePhaseIndex === idx;

            return (
              <button
                key={phase.phase}
                type="button"
                onClick={() => {
                  playClick();
                  setActivePhaseIndex(idx);
                }}
                className={`focus-ring relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                  isSelected
                    ? "border-accent bg-surface shadow-[0_0_20px_rgba(255,77,46,0.2)]"
                    : "border-border bg-surface/50 hover:border-foreground/30 hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-accent font-bold">
                    {phase.phase}
                  </span>
                  <span className="font-mono text-[10px] rounded-full border border-border bg-background px-2 py-0.5 text-muted">
                    {phase.days}
                  </span>
                </div>

                <h4 className="mt-3 text-sm font-medium text-foreground">
                  {phase.title}
                </h4>

                <p className="mt-1 text-xs text-muted line-clamp-1">
                  {phase.tagline}
                </p>

                {isSelected && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detalle de la Fase Seleccionada */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 md:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon size={24} />
              </div>
              <div>
                <span className="font-mono text-xs text-accent uppercase font-bold">
                  {activePhase.phase} · {activePhase.days}
                </span>
                <h3 className="display mt-1 text-2xl text-foreground sm:text-3xl">
                  {activePhase.title}
                </h3>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background/80 px-4 py-2 text-xs text-muted font-mono">
              <strong className="text-foreground">Entregable clave:</strong> {activePhase.deliverable}
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h4 className="font-mono text-xs uppercase tracking-wider text-muted font-semibold">
              Qué ocurre en esta etapa:
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {activePhase.whatHappens.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/80 bg-background/60 p-4"
                >
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                    <p className="text-xs leading-relaxed text-muted">
                      {item}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
