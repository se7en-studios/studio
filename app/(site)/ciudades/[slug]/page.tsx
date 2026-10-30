import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Calculator,
  Building2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { cities, getCityBySlug } from "@/data/cities";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { faqJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return cities.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  const url = `${SITE.url}/ciudades/${city.slug}`;

  return {
    title: `${city.title} | Se7en Studio`,
    description: city.metaDescription,
    openGraph: {
      title: `${city.title} | Se7en Studio`,
      description: city.metaDescription,
      url,
      type: "website",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function CityDetailPage({ params }: Props) {
  const { slug } = await params;
  const city = getCityBySlug(slug);

  if (!city) {
    notFound();
  }

  const waMessage = `Hola Franco! Tengo un negocio / empresa en ${city.name} (${city.province}) y me gustaría cotizar una página web o sistema a medida con Se7en Studio.`;
  const waUrl = `${SITE.whatsapp}?text=${encodeURIComponent(waMessage)}`;

  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: `Se7en Studio — Desarrollo Web en ${city.name}`,
    image: `${SITE.url}/logo.png`,
    url: `${SITE.url}/ciudades/${city.slug}`,
    telephone: `+${SITE.whatsapp.replace(/\D/g, "")}`,
    email: SITE.email,
    priceRange: "USD 950 - USD 3600",
    address: {
      "@type": "PostalAddress",
      addressLocality: city.name,
      addressRegion: city.province,
      addressCountry: "AR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: city.geo.latitude,
      longitude: city.geo.longitude,
    },
    areaServed: {
      "@type": "City",
      name: city.name,
    },
    description: city.metaDescription,
  };

  const faqSchema = faqJsonLd(
    city.faqs.map((f, i) => ({
      id: `${city.slug}-faq-${i}`,
      question: f.question,
      answer: f.answer,
    }))
  );

  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Ciudades", path: "/ciudades" },
    { name: city.name, path: `/ciudades/${city.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="relative min-h-screen bg-(--ink) text-(--paper) pt-24 pb-20 selection:bg-(--signal) selection:text-(--ink)">
        <Container>
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-mono text-(--paper)/60">
            <Link href="/" className="hover:text-(--paper)">Inicio</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/ciudades" className="hover:text-(--paper)">Ciudades</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-(--signal)">{city.name}</span>
          </nav>

          {/* Hero Section */}
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-white/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-(--signal)">
              <MapPin className="h-3.5 w-3.5" />
              {city.region} · {city.province}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl lg:text-6xl text-balance">
              {city.title}
            </h1>
            <p className="mt-6 text-lg text-(--paper)/80 md:text-xl leading-relaxed text-balance">
              {city.subtitle}
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-zinc-950 transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
              >
                <WhatsAppLogo className="h-4 w-4 fill-current" />
                <span>Hablar por WhatsApp ({city.name})</span>
              </a>
              <Link
                href="/cotizador"
                className="inline-flex items-center gap-2 rounded-xl border border-(--line) bg-white/5 px-6 py-3.5 text-sm font-semibold text-(--paper) transition-colors hover:border-(--paper)/40"
              >
                <Calculator className="h-4 w-4" />
                <span>Cotizar web en 1 minuto</span>
              </Link>
            </div>

            {/* Local proof callout */}
            <div className="mt-10 rounded-2xl border border-(--signal)/30 bg-(--signal)/5 p-5 text-sm">
              <p className="text-(--paper)/90">
                <strong className="text-(--signal)">Presencia real en la zona:</strong> {city.localProof}
              </p>
            </div>
          </div>

          {/* Key Sectors in this city */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Sectores Clave en {city.name}
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Soluciones digitales adaptadas a la economía de la zona
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {city.sectors.map((sec, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-(--line) bg-white/[0.02] p-6 space-y-3 hover:border-(--signal)/40 transition-colors"
                >
                  <h3 className="text-lg font-bold text-(--paper)">{sec.title}</h3>
                  <p className="text-xs text-(--paper)/70 leading-relaxed">{sec.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Local Case Studies */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Casos Reales en la Región
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Proyectos construidos con clientes de la Patagonia y Cuyo
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {city.localCases.map((cs) => (
                <Link
                  key={cs.slug}
                  href={`/work/${cs.slug}`}
                  className="group rounded-2xl border border-(--line) bg-white/[0.02] p-6 space-y-3 hover:border-(--signal)/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-(--signal)">Caso de estudio</span>
                    <ArrowRight className="h-4 w-4 text-(--paper)/40 group-hover:text-(--signal) group-hover:translate-x-1 transition-all" />
                  </div>
                  <h3 className="text-xl font-bold text-(--paper) group-hover:text-(--signal) transition-colors">
                    {cs.name}
                  </h3>
                  <p className="text-xs text-(--paper)/70 leading-relaxed">{cs.description}</p>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Preguntas Frecuentes en {city.name}
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Todo lo que necesitás saber antes de comenzar
            </p>
            <div className="mt-8 space-y-4 max-w-3xl">
              {city.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-(--line) bg-white/[0.02] p-6 space-y-2"
                >
                  <h3 className="text-base font-semibold text-(--paper)">{faq.question}</h3>
                  <p className="text-sm text-(--paper)/70 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom navigation */}
          <div className="mt-20 border-t border-(--line) pt-10 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/ciudades"
              className="text-xs font-mono text-(--paper)/60 hover:text-(--signal) flex items-center gap-1.5"
            >
              ← Ver todas las ciudades con cobertura
            </Link>
            <Link
              href="/cotizador"
              className="text-xs font-mono text-(--signal) hover:underline flex items-center gap-1.5"
            >
              Cotizar página web para mi negocio en 1 minuto →
            </Link>
          </div>
        </Container>
      </div>
    </>
  );
}

