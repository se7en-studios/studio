"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Palette,
  Type,
  Layers,
  Sparkles,
  Copy,
  Check,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { TiltCard } from "@/components/ui/tilt-card";
import { ScrambleText } from "@/components/ui/scramble-text";
import { Magnetic } from "@/components/ui/magnetic";
import { useSoundFx } from "@/components/providers/sound-provider";

interface ColorToken {
  name: string;
  variable: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  role: string;
}

const colorTokens: ColorToken[] = [
  { name: "Background OLED", variable: "--background", hex: "#0a0a0c", bgClass: "bg-[#0a0a0c]", borderClass: "border-white/10", role: "Lienzo principal profundo" },
  { name: "Surface Level 1", variable: "--surface", hex: "#121216", bgClass: "bg-[#121216]", borderClass: "border-white/10", role: "Tarjetas y paneles base" },
  { name: "Surface Level 2", variable: "--surface-2", hex: "#1a1a20", bgClass: "bg-[#1a1a20]", borderClass: "border-white/10", role: "Estados de hover y modales" },
  { name: "Electric Accent", variable: "--accent", hex: "#ff4d2e", bgClass: "bg-[#ff4d2e]", borderClass: "border-[#ff4d2e]", role: "Llamadas a la acción y estados activos" },
  { name: "Foreground White", variable: "--foreground", hex: "#f4f4f5", bgClass: "bg-[#f4f4f5]", borderClass: "border-white", role: "Titulares y textos de alto contraste" },
  { name: "Zinc Muted", variable: "--muted", hex: "#a1a1aa", bgClass: "bg-[#a1a1aa]", borderClass: "border-zinc-500", role: "Párrafos secundarios y metadatos" },
];

export function DesignSystemClient() {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const { playClick, playPop, playSuccess } = useSoundFx();

  function handleCopy(hex: string) {
    playSuccess();
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  }

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Palette size={13} className="text-accent" />
            <span>Sistema de Diseño Atómico & Tokens</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            La anatomía visual <br />
            <span className="text-accent">de Se7en Studio.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Nuestros tokens de color calibrados, tipografía cinemática y componentes con aceleración por hardware que garantizan 60 FPS consistentes.
          </p>
        </div>

        {/* Sección 1: Tokens de Color */}
        <section className="mt-16 border-t border-border pt-12">
          <div className="flex items-center gap-2.5 mb-6">
            <Palette size={18} className="text-accent" />
            <h2 className="display text-2xl text-foreground">
              1. Tokens de Color & Superficies
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colorTokens.map((token) => (
              <button
                key={token.variable}
                type="button"
                onClick={() => handleCopy(token.hex)}
                className="focus-ring group rounded-2xl border border-border bg-surface p-5 text-left transition-all hover:border-accent/40"
              >
                <div className="flex items-center justify-between">
                  <div className={`h-12 w-12 rounded-xl border ${token.borderClass} ${token.bgClass} shadow-md`} />
                  <span className="font-mono text-xs text-muted group-hover:text-accent transition-colors flex items-center gap-1">
                    {copiedHex === token.hex ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                    <span>{copiedHex === token.hex ? "¡Copiado!" : token.hex}</span>
                  </span>
                </div>

                <h4 className="mt-4 font-semibold text-foreground text-sm">
                  {token.name}
                </h4>

                <p className="font-mono text-[11px] text-accent mt-0.5">
                  {token.variable}
                </p>

                <p className="mt-2 text-xs text-muted leading-relaxed">
                  {token.role}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* Sección 2: Escalas Tipográficas */}
        <section className="mt-16 border-t border-border pt-12">
          <div className="flex items-center gap-2.5 mb-6">
            <Type size={18} className="text-accent" />
            <h2 className="display text-2xl text-foreground">
              2. Jerarquía Tipográfica
            </h2>
          </div>

          <div className="space-y-4 rounded-3xl border border-border bg-surface p-6 sm:p-8">
            <div className="border-b border-border/80 pb-4">
              <span className="font-mono text-[10px] text-accent uppercase">Display Heading (Archivo)</span>
              <p className="display text-3xl sm:text-5xl text-foreground font-bold tracking-tight mt-1">
                Experiencias digitales de alta fidelidad.
              </p>
            </div>

            <div className="border-b border-border/80 pb-4">
              <span className="font-mono text-[10px] text-accent uppercase">Section Heading H2 (2xl/3xl)</span>
              <p className="display text-xl sm:text-2xl text-foreground font-semibold mt-1">
                Arquitectura moderna de Server Components en el Edge.
              </p>
            </div>

            <div className="border-b border-border/80 pb-4">
              <span className="font-mono text-[10px] text-accent uppercase">Body Text (15px / 16px)</span>
              <p className="text-sm sm:text-base text-muted leading-relaxed mt-1">
                Diseñamos interfaces atómicas en Figma optimizadas para renderizarse con aceleración por GPU y tiempos de carga inferiores a 400ms.
              </p>
            </div>

            <div>
              <span className="font-mono text-[10px] text-accent uppercase">Monospace Code (Chivo Mono 12px)</span>
              <p className="font-mono text-xs text-emerald-400 mt-1">
                {`const studio = new Se7enStudio({ latency: "14ms", lighthouse: 100 });`}
              </p>
            </div>
          </div>
        </section>

        {/* Sección 3: Laboratorio de Componentes Vivos */}
        <section className="mt-16 border-t border-border pt-12">
          <div className="flex items-center gap-2.5 mb-6">
            <Layers size={18} className="text-accent" />
            <h2 className="display text-2xl text-foreground">
              3. Laboratorio de Componentes Vivos
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Componente 1: 3D Tilt Card */}
            <div className="rounded-3xl border border-border bg-surface p-6">
              <span className="font-mono text-xs text-accent uppercase font-semibold">
                Componente: TiltCard con Reflejo Especular
              </span>
              <p className="mt-1 text-xs text-muted mb-4">
                Pasá el mouse por encima para probar la perspectiva giroscópica
              </p>

              <TiltCard className="w-full h-48 rounded-2xl border border-border bg-[#0d0d10] p-6 flex flex-col justify-between shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="h-3 w-3 rounded-full bg-accent animate-pulse" />
                  <span className="font-mono text-[10px] text-muted">PERSPECTIVE 1000px</span>
                </div>
                <div>
                  <h4 className="display text-lg font-bold text-foreground">
                    Giroscopio Interactivo
                  </h4>
                  <p className="text-xs text-muted mt-1">
                    Calculado con física de resortes a 60 FPS
                  </p>
                </div>
              </TiltCard>
            </div>

            {/* Componente 2: Scramble Text */}
            <div className="rounded-3xl border border-border bg-surface p-6 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs text-accent uppercase font-semibold">
                  Componente: ScrambleText Cinético
                </span>
                <p className="mt-1 text-xs text-muted mb-4">
                  Pasá el mouse para disparar la decodificación de glifos en tiempo real
                </p>

                <div className="rounded-2xl border border-border bg-background p-6 text-center">
                  <ScrambleText
                    text="SE7EN STUDIO // HIGH PERFORMANCE"
                    className="font-mono text-base font-bold text-accent cursor-pointer"
                  />
                </div>
              </div>

              <p className="mt-4 font-mono text-[11px] text-muted text-center">
                Efecto tipográfico para kickers y métricas de impacto
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        <Reveal>
          <div className="mt-20 rounded-3xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Querés que diseñemos el Design System de tu producto?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Construimos sistemas de diseño consistentes, documentados y listos para escalar.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Iniciar Briefing</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
