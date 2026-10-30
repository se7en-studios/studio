import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Scale } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { blogPosts } from "@/data/blog";
import { comparisons } from "@/data/comparisons";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Blog de Ingeniería, Producto & Negocios Digitales | Se7en Studio",
  description:
    "Guías prácticas sobre costos de desarrollo web en Argentina, e-commerce sin comisiones, rendimiento móvil en Next.js 16, arquitectura SaaS y SEO para IA.",
  alternates: {
    canonical: "/blog",
  },
  openGraph: {
    title: "Blog de Ingeniería, Producto & Negocios Digitales | Se7en Studio",
    description:
      "Guías prácticas sobre costos de desarrollo web en Argentina, e-commerce sin comisiones, rendimiento móvil en Next.js 16, arquitectura SaaS y SEO para IA.",
    url: `${SITE.url}/blog`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Blog de Ingeniería, Producto & Negocios Digitales | Se7en Studio",
    description:
      "Guías prácticas sobre costos de desarrollo web en Argentina, e-commerce sin comisiones, rendimiento móvil en Next.js 16, arquitectura SaaS y SEO para IA.",
  },
};

export default function BlogPage() {
  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <BookOpen size={13} className="text-accent" />
            <span>Ingeniería, Diseño & Estrategia</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Respuestas concretas <br />
            <span className="text-accent">desde la trinchera.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            En{" "}
            <Link href="/" className="text-foreground underline decoration-accent/60 underline-offset-4 hover:text-accent">
              Se7en Studio
            </Link>{" "}
            —nuestro estudio de diseño de producto digital y desarrollo de software a medida en Next.js y Supabase— documentamos costos reales, decisiones de arquitectura y guías prácticas para fundadores y comercios.
          </p>
        </div>

        {/* Grilla de Artículos */}
        <div className="mt-16 space-y-8">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-8 transition-all duration-300 hover:border-accent/40 hover:bg-surface-2"
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
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

                  <h2 className="display mt-4 text-2xl text-foreground sm:text-3xl transition-colors group-hover:text-accent">
                    <Link href={`/blog/${post.slug}`} className="focus-ring">
                      {post.title}
                    </Link>
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-foreground/90 md:text-base">
                    {post.directAnswer}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md border border-border bg-background px-2 py-0.5 font-mono text-[11px] text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex lg:flex-col items-center lg:items-end justify-between gap-4 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-border">
                  <div className="text-left lg:text-right">
                    <span className="block font-medium text-xs text-foreground">
                      {post.author.name}
                    </span>
                    <span className="block font-mono text-[11px] text-muted">
                      {post.author.role}
                    </span>
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs text-accent font-semibold group-hover:underline"
                  >
                    <span>Leer artículo</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Bloque de Comparativas */}
        <div className="mt-20 rounded-2xl border border-border bg-surface/60 p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-xs text-accent">
                <Scale size={14} />
                <span>Comparativas honestas</span>
              </div>
              <h2 className="display mt-2 text-2xl text-foreground sm:text-3xl">
                ¿Estás evaluando alternativas antes de decidir?
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted">
                Comparamos punto por punto cuándo te conviene usar una plataforma estándar y cuándo construir a medida con Se7en Studio.
              </p>
            </div>
            <Link
              href="/vs"
              className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent hover:underline"
            >
              <span>Ver todas las comparativas</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {comparisons.slice(0, 4).map((comp) => (
              <Link
                key={comp.slug}
                href={`/vs/${comp.slug}`}
                className="focus-ring rounded-xl border border-border bg-background p-4 transition-colors hover:border-accent/40"
              >
                <span className="block font-mono text-[11px] text-accent">
                  {comp.category}
                </span>
                <span className="mt-1 block text-sm font-medium text-foreground">
                  {comp.shortTitle}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Reveal>
          <div className="mt-20 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Buscás un equipo que ejecute a este nivel de detalle?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Hablemos de tu producto y construyamos algo con ingeniería impecable en 2 a 3 semanas.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Armar Brief de Proyecto</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/pricing"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-foreground hover:border-accent/40"
              >
                <span>Calcular Presupuesto</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
