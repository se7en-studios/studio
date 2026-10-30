import type { Metadata } from "next";
import Link from "next/link";
import { Scale, ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/ui/container";
import { comparisons } from "@/data/comparisons";
import { SITE } from "@/data/site";
import { breadcrumbJsonLd, jsonLdHtml } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "Comparativas de Software y Alternativas a Medida | Se7en Studio",
  description:
    "Análisis honestos comparando el desarrollo a medida en Next.js y Supabase de Se7en Studio contra WordPress, Tiendanube, Shopify, Webflow, agencias tradicionales, freelancers y plataformas No-Code.",
  alternates: {
    canonical: "/vs",
  },
  openGraph: {
    title: "Comparativas de Software y Alternativas a Medida | Se7en Studio",
    description:
      "Análisis honestos comparando el desarrollo a medida en Next.js y Supabase de Se7en Studio contra WordPress, Tiendanube, Shopify, Webflow, agencias tradicionales, freelancers y plataformas No-Code.",
    url: `${SITE.url}/vs`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Comparativas de Software y Alternativas a Medida | Se7en Studio",
    description:
      "Análisis honestos comparando el desarrollo a medida en Next.js y Supabase de Se7en Studio contra WordPress, Tiendanube, Shopify, Webflow, agencias tradicionales, freelancers y plataformas No-Code.",
  },
};

export default function ComparisonsIndexPage() {
  const breadcrumb = breadcrumbJsonLd([
    { name: "Se7en Studio", path: "/" },
    { name: "Comparativas", path: "/vs" },
  ]);

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(breadcrumb)}
      />
      <Container>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Scale size={13} className="text-accent" />
            <span>Comparativas de Tecnología & Modelos de Trabajo</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Comparativas honestas <br />
            <span className="text-accent">para elegir bien.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            En{" "}
            <Link
              href="/"
              className="text-foreground underline decoration-accent/60 underline-offset-4 hover:text-accent"
            >
              Se7en Studio
            </Link>{" "}
            —estudio argentino de diseño de producto digital e ingeniería de software a medida en Next.js y Supabase— analizamos sin vueltas en qué casos te conviene otra plataforma y en qué casos el desarrollo propio gana por velocidad, costos y conversión.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          {comparisons.map((comp) => (
            <article
              key={comp.slug}
              className="group flex flex-col justify-between rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/40 hover:bg-surface-2"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
                    {comp.category}
                  </span>
                  <span className="font-mono text-xs text-muted">
                    vs {comp.competitor}
                  </span>
                </div>

                <h2 className="display mt-4 text-2xl text-foreground transition-colors group-hover:text-accent">
                  <Link href={`/vs/${comp.slug}`} className="focus-ring">
                    {comp.title}
                  </Link>
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  {comp.leadSentences[0]}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {comp.leadSentences[1]}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
                  <CheckCircle2 size={13} className="text-accent" />
                  Tabla + FAQs incluidas
                </span>
                <Link
                  href={`/vs/${comp.slug}`}
                  className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent group-hover:underline"
                >
                  <span>Ver comparativa completa</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-20 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
          <h2 className="display text-2xl sm:text-3xl text-foreground">
            ¿Todavía tenés dudas sobre qué arquitectura le conviene a tu proyecto?
          </h2>
          <p className="mt-2 text-sm text-muted max-w-lg">
            Escribinos o pedí una auditoría sin cargo: si para tu etapa actual te conviene una herramienta más simple, te lo decimos de frente.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/pricing"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
            >
              <span>Calcular presupuesto a medida</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/audit"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:border-accent/40"
            >
              <span>Pedir diagnóstico gratuito</span>
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}

