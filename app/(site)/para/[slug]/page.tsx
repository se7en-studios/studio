import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Calculator,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { industries, getIndustryBySlug } from "@/data/industries";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { faqJsonLd, breadcrumbJsonLd } from "@/lib/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return industries.map((ind) => ({ slug: ind.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustryBySlug(slug);
  if (!industry) return {};

  const url = `${SITE.url}/para/${industry.slug}`;

  return {
    title: `${industry.title} | Se7en Studio`,
    description: industry.metaDescription,
    openGraph: {
      title: `${industry.title} | Se7en Studio`,
      description: industry.metaDescription,
      url,
      type: "website",
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function IndustryDetailPage({ params }: Props) {
  const { slug } = await params;
  const industry = getIndustryBySlug(slug);

  if (!industry) {
    notFound();
  }

  const waUrl = `${SITE.whatsapp}?text=${encodeURIComponent(industry.whatsappMessage)}`;

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: industry.title,
    serviceType: "Desarrollo Web & Software",
    provider: {
      "@type": "ProfessionalService",
      name: SITE.name,
      url: SITE.url,
      telephone: `+${SITE.whatsapp.replace(/\D/g, "")}`,
    },
    description: industry.metaDescription,
    areaServed: {
      "@type": "Country",
      name: "Argentina",
    },
  };

  const faqSchema = faqJsonLd(
    industry.faqs.map((f, i) => ({
      id: `${industry.slug}-faq-${i}`,
      question: f.question,
      answer: f.answer,
    }))
  );
  const breadcrumbSchema = breadcrumbJsonLd([
    { name: "Inicio", path: "/" },
    { name: "Soluciones", path: "/para" },
    { name: industry.name, path: `/para/${industry.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
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
            <Link href="/para" className="hover:text-(--paper)">Soluciones</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-(--signal)">{industry.name}</span>
          </nav>

          {/* Hero Section */}
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-white/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-(--signal)">
              <Sparkles className="h-3.5 w-3.5" />
              {industry.heroBadge}
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight md:text-5xl lg:text-6xl text-balance">
              {industry.title}
            </h1>
            <p className="mt-6 text-lg text-(--paper)/80 md:text-xl leading-relaxed text-balance">
              {industry.subtitle}
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
                <span>Consultar por WhatsApp</span>
              </a>
              <Link
                href="/cotizador"
                className="inline-flex items-center gap-2 rounded-xl border border-(--line) bg-white/5 px-6 py-3.5 text-sm font-semibold text-(--paper) transition-colors hover:border-(--paper)/40"
              >
                <Calculator className="h-4 w-4" />
                <span>Cotizar en 1 minuto</span>
              </Link>
            </div>

            {/* Quick stats strip */}
            <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-b border-(--line) py-4 text-xs font-mono text-(--paper)/70">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-(--signal)" />
                <span>Tiempo estimado: <strong>{industry.timeline}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-(--signal)" />
                <span>Inversión: <strong>{industry.priceRange}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Comisión por venta: <strong>0%</strong></span>
              </div>
            </div>
          </div>

          {/* Pain points section */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Los problemas comunes de tu rubro
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              ¿Por qué la mayoría de los sitios en este sector no consiguen clientes?
            </p>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {industry.painPoints.map((pain, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6 space-y-3"
                >
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-mono uppercase font-bold">Problema {idx + 1}</span>
                  </div>
                  <h3 className="text-base font-bold text-(--paper)">{pain.problem}</h3>
                  <p className="text-xs text-(--paper)/70 leading-relaxed">{pain.consequence}</p>
                  <div className="border-t border-(--line) pt-3">
                    <p className="text-xs text-emerald-400 font-medium">
                      <strong>Nuestra solución:</strong> {pain.solution}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Features section */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Funcionalidades pensadas para tu negocio
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Todo lo necesario para operar y vender con fluidez
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {industry.features.map((feat, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-(--line) bg-white/[0.02] p-6 space-y-2 hover:border-(--signal)/30 transition-colors"
                >
                  <h3 className="text-lg font-bold text-(--paper) flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-(--signal) shrink-0" />
                    {feat.title}
                  </h3>
                  <p className="text-sm text-(--paper)/70 leading-relaxed pl-7">
                    {feat.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Comparison table */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Comparativa Técnica & Comercial
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Web genérica vs Solución Se7en Studio
            </p>
            <div className="mt-8 overflow-hidden rounded-2xl border border-(--line) bg-white/[0.02]">
              <div className="grid grid-cols-12 border-b border-(--line) bg-white/5 p-4 text-xs font-mono uppercase text-(--paper)/60">
                <div className="col-span-4">Aspecto</div>
                <div className="col-span-4 text-red-300">Lo habitual / Plantillas</div>
                <div className="col-span-4 text-(--signal) font-bold">Con Se7en Studio</div>
              </div>
              {industry.comparisons.map((comp, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 border-b border-(--line) p-4 text-xs last:border-b-0 hover:bg-white/[0.02]"
                >
                  <div className="col-span-4 font-semibold text-(--paper)">{comp.aspect}</div>
                  <div className="col-span-4 text-(--paper)/60">{comp.traditional}</div>
                  <div className="col-span-4 text-emerald-400 font-medium">{comp.se7en}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Deliverables */}
          <section className="mt-20 rounded-2xl border border-(--signal)/30 bg-(--signal)/5 p-8 md:p-10">
            <div className="max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-wider text-(--signal)">
                Entregables Incluidos
              </span>
              <h2 className="mt-2 text-2xl font-bold text-(--paper)">
                Qué recibís exactamente al finalizar el proyecto
              </h2>
              <ul className="mt-6 space-y-3">
                {industry.deliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-(--paper)/80">
                    <CheckCircle2 className="h-4 w-4 text-(--signal) shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
                >
                  <WhatsAppLogo className="h-4 w-4 fill-current" />
                  <span>Empezar este proyecto por WhatsApp</span>
                </a>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="mt-20">
            <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
              Preguntas Frecuentes
            </h2>
            <p className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
              Dudas habituales de los dueños de negocios
            </p>
            <div className="mt-8 space-y-4 max-w-3xl">
              {industry.faqs.map((faq, idx) => (
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

          {/* Bottom Navigation to other solutions */}
          <div className="mt-20 border-t border-(--line) pt-10 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/para"
              className="text-xs font-mono text-(--paper)/60 hover:text-(--signal) flex items-center gap-1.5"
            >
              ← Ver todas las soluciones por rubro
            </Link>
            <Link
              href="/cotizador"
              className="text-xs font-mono text-(--signal) hover:underline flex items-center gap-1.5"
            >
              Calcular cotización interactiva en 1 minuto →
            </Link>
          </div>
        </Container>
      </div>
    </>
  );
}
