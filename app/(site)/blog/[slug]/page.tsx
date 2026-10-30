import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  HelpCircle,
  Scale,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { blogPosts, getPostBySlug } from "@/data/blog";
import { getComparisonBySlug } from "@/data/comparisons";
import { SITE } from "@/data/site";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  jsonLdHtml,
} from "@/lib/json-ld";

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} | Blog Se7en Studio`,
    description: post.directAnswer,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: `${post.title} | Blog Se7en Studio`,
      description: post.directAnswer,
      url: `${SITE.url}/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedIso,
      authors: [post.author.name],
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} | Blog Se7en Studio`,
      description: post.directAnswer,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = post.relatedSlugs
    .map((s) => getPostBySlug(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const relatedComparisons = (post.relatedComparisonSlugs ?? [])
    .map((s) => getComparisonBySlug(s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const schemas = [
    articleJsonLd(post),
    breadcrumbJsonLd([
      { name: "Se7en Studio", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
    ...(post.faqs.length > 0 ? [faqJsonLd(post.faqs)] : []),
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
        <article className="mx-auto max-w-3xl">
          {/* Navegación de regreso */}
          <Link
            href="/blog"
            className="focus-ring inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            <span>Volver al blog</span>
          </Link>

          {/* Cabecera del Artículo */}
          <header className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs text-accent font-semibold">
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted">
                <Clock size={12} />
                {post.readTime}
              </span>
              <time
                dateTime={post.publishedIso}
                className="font-mono text-xs text-muted"
              >
                · {post.publishedAt}
              </time>
            </div>

            <h1 className="display text-3xl text-foreground sm:text-4xl md:text-5xl leading-tight">
              {post.title}
            </h1>

            {/* Respuesta directa en el primer párrafo: optimizada para lectura rápida y citación por IA */}
            <div className="rounded-2xl border border-accent/30 bg-surface p-6 md:p-7">
              <span className="block font-mono text-[11px] uppercase tracking-widest text-accent mb-2">
                Respuesta directa
              </span>
              <p className="text-base leading-relaxed text-foreground md:text-lg font-medium">
                {post.directAnswer}
              </p>
            </div>

            {/* Autor + mención enlazada a la portada con definición de marca */}
            <div className="flex flex-col gap-3 border-b border-border pt-3 pb-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 border border-border font-mono text-xs font-bold text-accent">
                  {post.author.name[0]}
                </div>
                <div>
                  <span className="block font-medium text-xs text-foreground">
                    {post.author.name}
                  </span>
                  <span className="block font-mono text-[11px] text-muted">
                    {post.author.role}
                  </span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted sm:max-w-xs sm:text-right">
                Publicado por{" "}
                <Link
                  href="/"
                  className="font-medium text-foreground underline decoration-accent/60 underline-offset-4 hover:text-accent"
                >
                  Se7en Studio
                </Link>
                , estudio argentino que diseña y programa webs, tiendas online y plataformas con IA a medida.
              </p>
            </div>
          </header>

          {/* Contenido */}
          <div className="mt-10 space-y-10">
            {post.content.map((section, idx) => (
              <section key={idx} className="space-y-4">
                <h2 className="display text-xl sm:text-2xl text-foreground">
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

                {section.codeSnippet && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-border bg-[#0d0d10] p-4 font-mono text-xs text-[#e4e4e7]">
                    <pre className="overflow-x-auto p-1">
                      <code>{section.codeSnippet}</code>
                    </pre>
                  </div>
                )}
              </section>
            ))}
          </div>

          {/* Enlace a la función / servicio que resuelve el problema */}
          <aside className="mt-12 rounded-2xl border border-accent/35 bg-surface p-6 md:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                Solución aplicada en Se7en Studio
              </span>
              <h2 className="display mt-1 text-xl text-foreground sm:text-2xl">
                {post.ctaService.title}
              </h2>
              <p className="mt-1.5 text-sm text-muted max-w-xl">
                {post.ctaService.description}
              </p>
            </div>
            <Link
              href={post.ctaService.href}
              className="focus-ring shrink-0 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-xs font-medium text-background hover:bg-accent/90"
            >
              <span>{post.ctaService.buttonLabel}</span>
              <ArrowRight size={14} />
            </Link>
          </aside>

          {/* Preguntas Frecuentes (FAQ) al final de la nota */}
          {post.faqs.length > 0 && (
            <section className="mt-14 border-t border-border pt-10">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                <HelpCircle size={14} />
                <span>Preguntas Frecuentes</span>
              </div>
              <h2 className="display mt-2 text-2xl text-foreground sm:text-3xl">
                Dudas comunes sobre este tema
              </h2>
              <dl className="mt-6 space-y-4">
                {post.faqs.map((faq) => (
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

          {/* Comparativas relacionadas */}
          {relatedComparisons.length > 0 && (
            <section className="mt-12 border-t border-border pt-10">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                <Scale size={14} />
                <span>Comparativas relacionadas</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {relatedComparisons.map((comp) => (
                  <Link
                    key={comp.slug}
                    href={`/vs/${comp.slug}`}
                    className="focus-ring group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
                  >
                    <span className="font-mono text-[11px] text-accent">
                      {comp.category}
                    </span>
                    <h3 className="mt-1 font-medium text-foreground group-hover:text-accent">
                      {comp.shortTitle}
                    </h3>
                    <p className="mt-1.5 text-xs text-muted line-clamp-2">
                      {comp.leadSentences[0]}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Otras notas relacionadas del mismo tema */}
          {relatedPosts.length > 0 && (
            <section className="mt-12 border-t border-border pt-10">
              <h2 className="font-mono text-xs uppercase tracking-widest text-muted">
                Artículos relacionados
              </h2>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/blog/${rel.slug}`}
                    className="focus-ring group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
                  >
                    <span className="font-mono text-[11px] text-accent">
                      {rel.category}
                    </span>
                    <h3 className="mt-1 text-sm font-medium text-foreground group-hover:text-accent">
                      {rel.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Tags */}
          <div className="mt-12 border-t border-border pt-6 flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted mr-2">Temas:</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        </article>
      </Container>
    </main>
  );
}
