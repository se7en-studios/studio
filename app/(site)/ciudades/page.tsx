import { Metadata } from "next";
import Link from "next/link";
import { MapPin, ArrowRight, Sparkles, Building2, Calculator } from "lucide-react";
import { Container } from "@/components/ui/container";
import { cities } from "@/data/cities";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Desarrollo Web por Ciudades en Argentina | Se7en Studio",
  description:
    "Desarrollo de páginas web, tiendas online y software a medida en Neuquén, Catriel, San Rafael y Mendoza. Atención directa con los fundadores, velocidad de carga y posicionamiento local en Google.",
  openGraph: {
    title: "Desarrollo Web por Ciudades en Argentina | Se7en Studio",
    description:
      "Desarrollo de páginas web, tiendas online y software a medida en Neuquén, Catriel, San Rafael y Mendoza.",
    url: `${SITE.url}/ciudades`,
  },
  alternates: {
    canonical: `${SITE.url}/ciudades`,
  },
};

export default function CiudadesIndexPage() {
  return (
    <div className="relative min-h-screen bg-(--ink) text-(--paper) pt-24 pb-20 selection:bg-(--signal) selection:text-(--ink)">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-white/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-(--signal)">
            <MapPin className="h-3.5 w-3.5" />
            Presencia & Desarrollo Regional
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Desarrollo web y software a medida en tu ciudad
          </h1>
          <p className="mt-4 text-base text-(--paper)/70 md:text-lg">
            Somos un estudio fundado en la Patagonia con alcance regional en Neuquén, Río Negro y Cuyo.
            Desarrollamos tecnología de nivel internacional con soporte cercano y comprensión real del mercado local.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/cotizador"
              className="inline-flex items-center gap-2 rounded-xl bg-(--signal) px-5 py-2.5 text-sm font-semibold text-(--ink) transition-colors hover:bg-(--signal)/90"
            >
              <Calculator className="h-4 w-4" />
              Cotizar mi web en 1 minuto
            </Link>
            <Link
              href="/work"
              className="inline-flex items-center gap-2 rounded-xl border border-(--line) bg-white/5 px-5 py-2.5 text-sm font-semibold text-(--paper) transition-colors hover:border-(--paper)/40"
            >
              Ver Casos en Producción →
            </Link>
          </div>
        </div>

        {/* Cities Grid */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {cities.map((city) => (
            <Link
              key={city.slug}
              href={`/ciudades/${city.slug}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-(--line) bg-white/[0.02] p-8 transition-all hover:border-(--signal)/40 hover:bg-white/[0.04]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-(--line) bg-white/5 px-3 py-1 text-xs font-mono text-(--signal)">
                    <MapPin className="h-3.5 w-3.5" />
                    {city.region}
                  </span>
                  <span className="text-xs font-mono text-(--paper)/50">{city.province}</span>
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-tight text-(--paper) group-hover:text-(--signal) transition-colors">
                  {city.name}
                </h2>
                <p className="mt-2 text-sm text-(--paper)/70 line-clamp-3">
                  {city.subtitle}
                </p>
                <div className="mt-4 rounded-xl border border-(--line) bg-black/30 p-3 text-xs text-(--paper)/80 font-mono">
                  <span className="text-(--signal) font-bold">Caso local:</span> {city.localCases[0]?.name ?? "Proyectos regionales"}
                </div>
              </div>

              <div className="mt-6 border-t border-(--line) pt-4 flex items-center justify-between text-xs font-mono">
                <span className="text-(--paper)/50">Entrega: 1 a 3 semanas</span>
                <span className="flex items-center gap-1 font-semibold text-(--signal) group-hover:translate-x-1 transition-transform">
                  Ver desarrollo en {city.name} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}

