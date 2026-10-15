"use client";

import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";

interface MetricRow {
  aspect: string;
  se7en: {
    title: string;
    description: string;
    positive: boolean;
  };
  traditional: {
    title: string;
    description: string;
    positive: boolean;
  };
}

const comparisonMetrics: MetricRow[] = [
  {
    aspect: "Velocidad de Carga Móvil (FCP)",
    se7en: {
      title: "0.4s — Carga Instantánea",
      description: "Server Components compilados en Edge con Turbopack y 0 JS innecesario.",
      positive: true,
    },
    traditional: {
      title: "4.8s — Lentitud y Rebotes",
      description: "Sobrecarga de plugins pesados, constructores visuales lentos y jQuery.",
      positive: false,
    },
  },
  {
    aspect: "Puntaje Google Lighthouse",
    se7en: {
      title: "98 - 100 / 100",
      description: "Core Web Vitals óptimos que garantizan mejor posicionamiento orgánico en Google.",
      positive: true,
    },
    traditional: {
      title: "45 - 65 / 100",
      description: "Pérdida de tráfico y penalizaciones en SEO por lentitud y cambios de diseño bruscos.",
      positive: false,
    },
  },
  {
    aspect: "Seguridad & Vulnerabilidades",
    se7en: {
      title: "0 Plugins Inseguros",
      description: "Código TypeScript estricto, APIs cifradas y PostgreSQL con Row-Level Security.",
      positive: true,
    },
    traditional: {
      title: "40+ Plugins Expuestos",
      description: "Riesgo constante de hackeos por extensiones desactualizadas y bases vulnerables.",
      positive: false,
    },
  },
  {
    aspect: "Propiedad & Flexibilidad",
    se7en: {
      title: "100% Tuyo en GitHub",
      description: "Sos dueño de tu código fuente completo. Sin suscripciones ni ataduras a plataformas.",
      positive: true,
    },
    traditional: {
      title: "Cautivo en Plataforma",
      description: "Dependencia de constructores cerrados donde cambiar de proveedor es rehacer de cero.",
      positive: false,
    },
  },
  {
    aspect: "Experiencia de Usuario (Motion)",
    se7en: {
      title: "Transiciones a 60 FPS",
      description: "Micro-interacciones fluidas y transiciones instantáneas sin recargar la pantalla.",
      positive: true,
    },
    traditional: {
      title: "Parpadeos y Recargas",
      description: "Pantallazos blancos entre enlaces y sensación de web antigua y pesada.",
      positive: false,
    },
  },
];

export function StackComparison() {

  return (
    <section className="border-t border-border py-24 md:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="Rendimiento & Transparencia"
            title="Next.js moderno vs. Plantillas infladas."
            subtitle="Por qué invertir en código limpio a medida genera un retorno superior en ventas, velocidad y reputación de marca."
          />

          <Link
            href="/start"
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-medium text-background hover:bg-accent/90 shrink-0"
          >
            <span>Iniciar con stack moderno</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Tabla Comparativa Visual */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-border bg-surface">
          {/* Header de Columnas */}
          <div className="grid grid-cols-1 md:grid-cols-12 border-b border-border bg-surface-2/60 font-mono text-xs">
            <div className="p-4 md:col-span-4 text-muted uppercase tracking-wider font-semibold">
              Criterio de Ingeniería
            </div>
            <div className="p-4 md:col-span-4 border-t md:border-t-0 md:border-l border-border bg-accent/5 text-accent font-bold flex items-center gap-2">
              <Sparkles size={14} />
              <span>Se7en Studio (Next.js 16)</span>
            </div>
            <div className="p-4 md:col-span-4 border-t md:border-t-0 md:border-l border-border text-muted">
              <span>Agencias / WordPress / Wix</span>
            </div>
          </div>

          {/* Filas */}
          <div className="divide-y divide-border">
            {comparisonMetrics.map((row) => (
              <div
                key={row.aspect}
                className="grid grid-cols-1 md:grid-cols-12 hover:bg-surface-2/40 transition-colors"
              >
                {/* Nombre del aspecto */}
                <div className="p-5 md:col-span-4 flex items-center font-medium text-xs text-foreground">
                  {row.aspect}
                </div>

                {/* Columna Se7en */}
                <div className="p-5 md:col-span-4 md:border-l border-border bg-accent/[0.02]">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">
                        {row.se7en.title}
                      </h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted">
                        {row.se7en.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Columna Tradicional */}
                <div className="p-5 md:col-span-4 md:border-l border-border">
                  <div className="flex items-start gap-2.5">
                    <XCircle size={16} className="text-red-400/80 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-semibold text-muted">
                        {row.traditional.title}
                      </h4>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted/70">
                        {row.traditional.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
