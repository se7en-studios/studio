import { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  UtensilsCrossed,
  Shirt,
  Briefcase,
  Stethoscope,
  ArrowRight,
  Sparkles,
  Calculator,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { industries } from "@/data/industries";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Páginas Web para Negocios por Rubro en Argentina | Se7en Studio",
  description:
    "Desarrollamos páginas web y tiendas online diseñadas específicamente para cada industria: inmobiliarias, gastronomía, marcas de ropa, estudios profesionales y clínicas médicas.",
  openGraph: {
    title: "Páginas Web para Negocios por Rubro en Argentina | Se7en Studio",
    description:
      "Desarrollamos páginas web y tiendas online diseñadas específicamente para cada industria en Argentina.",
    url: `${SITE.url}/para`,
  },
  alternates: {
    canonical: `${SITE.url}/para`,
  },
};

const INDUSTRY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  inmobiliarias: Building2,
  gastronomia: UtensilsCrossed,
  "marcas-de-ropa": Shirt,
  profesionales: Briefcase,
  "salud-estetica": Stethoscope,
};

export default function ParaIndexPage() {
  return (
    <div className="relative min-h-screen bg-(--ink) text-(--paper) pt-24 pb-20 selection:bg-(--signal) selection:text-(--ink)">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-white/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-(--signal)">
            <Sparkles className="h-3.5 w-3.5" />
            Soluciones Especializadas por Industria
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Páginas web pensadas para el modelo de tu negocio
          </h1>
          <p className="mt-4 text-base text-(--paper)/70 md:text-lg">
            No creemos en páginas web genéricas con plantillas prefabricadas. Diseñamos soluciones
            adaptadas a los dolores reales de tu rubro: comisiones de delivery, portales inmobiliarios,
            guías de talles para indumentaria o captación de clientes corporativos.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/cotizador"
              className="inline-flex items-center gap-2 rounded-xl bg-(--signal) px-5 py-2.5 text-sm font-semibold text-(--ink) transition-colors hover:bg-(--signal)/90"
            >
              <Calculator className="h-4 w-4" />
              Cotizar en 1 minuto
            </Link>
            <Link
              href="/calculadora-comisiones"
              className="inline-flex items-center gap-2 rounded-xl border border-(--line) bg-white/5 px-5 py-2.5 text-sm font-semibold text-(--paper) transition-colors hover:border-(--paper)/40"
            >
              Calculadora de Comisiones →
            </Link>
          </div>
        </div>

        {/* Industry Cards Grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {industries.map((ind) => {
            const Icon = INDUSTRY_ICONS[ind.slug] || Briefcase;
            return (
              <Link
                key={ind.slug}
                href={`/para/${ind.slug}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-(--line) bg-white/[0.02] p-6 transition-all hover:border-(--signal)/40 hover:bg-white/[0.04]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-(--line) bg-white/5 text-(--signal)">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-mono text-(--paper)/50">{ind.timeline}</span>
                  </div>
                  <h2 className="mt-5 text-xl font-bold tracking-tight text-(--paper) group-hover:text-(--signal) transition-colors">
                    {ind.name}
                  </h2>
                  <p className="mt-2 text-sm text-(--paper)/70 line-clamp-3">
                    {ind.subtitle}
                  </p>
                </div>

                <div className="mt-6 border-t border-(--line) pt-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-(--paper)/60">{ind.priceRange}</span>
                    <span className="flex items-center gap-1 font-semibold text-(--signal) group-hover:translate-x-1 transition-transform">
                      Ver solución <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="mt-16 rounded-2xl border border-(--line) bg-white/[0.02] p-8 text-center max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-(--paper)">¿Tu rubro no está en la lista?</h3>
          <p className="mt-2 text-sm text-(--paper)/70">
            Desarrollamos soluciones a medida para todo tipo de empresas, comercios y marcas en Argentina y el exterior.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Link
              href="/cotizador"
              className="rounded-xl bg-(--signal) px-5 py-2 text-xs font-semibold text-(--ink)"
            >
              Usar el Cotizador Web
            </Link>
            <a
              href={`${SITE.whatsapp}?text=${encodeURIComponent("Hola Franco! Tengo un negocio y me gustaría consultarte por una web a medida.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-(--line) bg-white/5 px-5 py-2 text-xs font-semibold text-(--paper) hover:border-(--paper)/40"
            >
              Hablar por WhatsApp
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
}

