import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Scale,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { comparisons, getComparisonBySlug } from "@/data/comparisons";
import { getPostBySlug } from "@/data/blog";
import { getProjectBySlug } from "@/data/projects";
import { SITE } from "@/data/site";
import {
  breadcrumbJsonLd,
  comparisonJsonLd,
  faqJsonLd,
  jsonLdHtml,
} from "@/lib/json-ld";

export function generateStaticParams() {
  return comparisons.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const comp = getComparisonBySlug(slug);
  if (!comp) return {};

  return {
    title: `${comp.title} | Se7en Studio`,
    description: comp.metaDescription,
    alternates: {
      canonical: `/vs/${comp.slug}`,
    },
    openGraph: {
      title: `${comp.title} | Se7en Studio`,
      description: comp.metaDescription,
      url: `${SITE.url}/vs/${comp.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: `${comp.title} | Se7en Studio`,
      description: comp.metaDescription,
    },
  };
}

export default async function ComparisonDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const comp = getComparisonBySlug(slug);
  if (!comp) notFound();

  const relatedProject = comp.relatedProjectSlug
    ? getProjectBySlug(comp.relatedProjectSlug)
    : undefined;
  const relatedPosts = comp.relatedBlogSlugs
    .map((s) => getPostBySlug(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  const otherComparisons = comparisons
    .filter((c) => c.slug !== comp.slug)
    .slice(0, 3);

  const schemas = [
    comparisonJsonLd(comp),
    breadcrumbJsonLd([
      { name: "Se7en Studio", path: "/" },
      { name: "Comparativas", path: "/vs" },
      { name: comp.shortTitle, path: `/vs/${comp.slug}` },
    ]),
    ...(comp.faqs.length > 0 ? [faqJsonLd(comp.faqs)] : []),
  ];

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdHtml(schema)}
        />
      ))}
      <Container>
        <article className="mx-auto max-w-4xl">
          <Link
            href="/vs"
            className="focus-ring inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            <span>Volver a todas las comparativas</span>
          </Link>

          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
                <Scale size={12} />
                {comp.category}
              </span>
              <time
                dateTime={comp.publishedIso}
                className="font-mono text-xs text-muted"
              >
                Actualizado en Octubre 2026
              </time>
            </div>

            <h1 className="display text-3xl text-foreground sm:text-4xl md:text-5xl leading-tight">
              {comp.title}
            </h1>

            {/* Dos frases iniciales que se entienden solas: diseñadas para síntesis inmediata y motores de IA */}
            <div className="rounded-2xl border border-accent/35 bg-surface p-6 md:p-8 space-y-3">
              <span className="block font-mono text-[11px] uppercase tracking-widest text-accent">
                Veredicto en dos frases
              </span>
              <p className="text-base leading-relaxed text-foreground md:text-lg font-medium">
                {comp.leadSentences[0]}
              </p>
              <p className="text-base leading-relaxed text-foreground/90 md:text-lg">
                {comp.leadSentences[1]}
              </p>
            </div>

            <p className="text-xs text-muted pt-1">
              Análisis elaborado por{" "}
              <Link
                href="/"
                className="font-medium text-foreground underline decoration-accent/60 underline-offset-4 hover:text-accent"
              >
                Se7en Studio
              </Link>
              , estudio argentino de dos fundadores que diseñan y programan sitios web, tiendas online y productos con IA a medida en Next.js y Supabase.
            </p>
          </header>

          {/* Cuándo gana cada uno (Honestidad radical) */}
          <section className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
              <span className="font-mono text-xs uppercase tracking-widest text-muted">
                Cuándo elegir {comp.competitor}
              </span>
              <h2 className="display mt-2 text-xl text-foreground">
                En qué casos te conviene el otro
              </h2>
              <ul className="mt-5 space-y-3">
                {comp.whenCompetitorWins.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-muted"
                  >
                    <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-muted" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-accent/40 bg-surface p-6 md:p-8">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                Cuándo elegir Se7en Studio
              </span>
              <h2 className="display mt-2 text-xl text-foreground">
                En qué casos ganás con desarrollo a medida
              </h2>
              <ul className="mt-5 space-y-3">
                {comp.whenSe7enWins.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-foreground/90"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Tabla comparativa semántica */}
          <section className="mt-14">
            <h2 className="display text-2xl text-foreground sm:text-3xl">
              Comparación punto por punto
            </h2>
            <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-2">
                    <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-muted">
                      Criterio
                    </th>
                    <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-accent">
                      Se7en Studio (A Medida)
                    </th>
                    <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-muted">
                      {comp.competitor}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-sm">
                  {comp.tableRows.map((row) => (
                    <tr key={row.feature}>
                      <th
                        scope="row"
                        className="p-4 md:p-5 font-medium text-foreground align-top"
                      >
                        {row.feature}
                      </th>
                      <td className="p-4 md:p-5 text-foreground/95 align-top font-medium">
                        {row.se7en}
                      </td>
                      <td className="p-4 md:p-5 text-muted align-top">
                        {row.competitor}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Análisis en profundidad */}
          <div className="mt-14 space-y-10">
            {comp.deepDive.map((section, idx) => (
              <section key={idx} className="space-y-4">
                <h2 className="display text-2xl text-foreground sm:text-3xl">
                  {section.heading}
                </h2>
                {section.paragraphs.map((p, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-base leading-relaxed text-muted/90"
                  >
                    {p}
                  </p>
                ))}
              </section>
            ))}
          </div>

          {/* Caso de estudio relacionado */}
          {relatedProject && (
            <aside className="mt-12 rounded-2xl border border-accent/35 bg-surface p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-accent">
                  Ejemplo real en producción · Caso {relatedProject.number}
                </span>
                <h2 className="display mt-1 text-2xl text-foreground">
                  {relatedProject.name} — {relatedProject.category}
                </h2>
                <p className="mt-2 text-sm text-muted max-w-xl">
                  {relatedProject.shortDescription}
                </p>
              </div>
              <Link
                href={`/work/${relatedProject.slug}`}
                className="focus-ring shrink-0 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-xs font-medium text-background hover:bg-accent/90"
              >
                <span>Ver caso de estudio</span>
                <ArrowRight size={14} />
              </Link>
            </aside>
          )}

          {/* Preguntas Frecuentes (FAQ) */}
          {comp.faqs.length > 0 && (
            <section className="mt-14 border-t border-border pt-10">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                <HelpCircle size={14} />
                <span>Preguntas Frecuentes</span>
              </div>
              <h2 className="display mt-2 text-2xl text-foreground sm:text-3xl">
                Dudas frecuentes al comparar {comp.shortTitle}
              </h2>
              <dl className="mt-6 space-y-4">
                {comp.faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="rounded-xl border border-border bg-surface p-6"
                  >
                    <dt className="text-base font-semibold text-foreground">
                      {faq.question}
                    </dt>
                    <dd className="mt-2 text-sm leading-relaxed text-muted">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* Artículos del blog relacionados */}
          {relatedPosts.length > 0 && (
            <section className="mt-12 border-t border-border pt-10">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
                Guías técnicas relacionadas
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {relatedPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="focus-ring group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
                  >
                    <span className="font-mono text-[11px] text-accent">
                      {post.category}
                    </span>
                    <h3 className="mt-1 text-sm font-medium text-foreground group-hover:text-accent">
                      {post.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Otras comparativas */}
          <section className="mt-12 border-t border-border pt-10">
            <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
              Otras comparativas
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {otherComparisons.map((other) => (
                <Link
                  key={other.slug}
                  href={`/vs/${other.slug}`}
                  className="focus-ring group rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/40"
                >
                  <span className="font-mono text-[11px] text-accent">
                    {other.category}
                  </span>
                  <h3 className="mt-1 text-sm font-medium text-foreground group-hover:text-accent">
                    {other.shortTitle}
                  </h3>
                </Link>
              ))}
            </div>
          </section>

          {/* CTA de cierre */}
          <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-medium text-foreground text-lg">
                ¿Querés cotizar tu proyecto a medida hoy mismo?
              </h3>
              <p className="mt-1 text-xs text-muted">
                Calculá el precio exacto online o armá tu brief interactivo en 3 minutos.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-background hover:bg-accent/90"
              >
                <span>Ver Precios</span>
                <ArrowRight size={13} />
              </Link>
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-medium text-foreground hover:border-accent/40"
              >
                <span>Armar Brief</span>
              </Link>
            </div>
          </div>
        </article>
      </Container>
    </main>
  );
}

