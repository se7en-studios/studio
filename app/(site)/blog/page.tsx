import { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Clock, ArrowRight, Sparkles, User, Tag } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { blogPosts } from "@/data/blog";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Blog de Ingeniería & Estrategia Digital | Se7en Studio",
  description:
    "Artículos técnicos, casos de estudio de arquitectura y guías de optimización escritas por los ingenieros y diseñadores de Se7en Studio.",
  openGraph: {
    title: "Blog de Ingeniería & Estrategia Digital | Se7en Studio",
    description:
      "Artículos técnicos, casos de estudio de arquitectura y guías de optimización escritas por los ingenieros y diseñadores de Se7en Studio.",
    url: `${SITE.url}/blog`,
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
            Ideas y arquitectura <br />
            <span className="text-accent">desde la trinchera.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Compartimos nuestras lecciones, benchmarks reales y decisiones de ingeniería construyendo productos para startups y empresas.
          </p>
        </div>

        {/* Grilla de Artículos */}
        <div className="mt-16 space-y-8">
          {blogPosts.map((post, idx) => (
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
                    <span className="font-mono text-xs text-muted">
                      · {post.publishedAt}
                    </span>
                  </div>

                  <h2 className="display mt-4 text-2xl text-foreground sm:text-3xl transition-colors group-hover:text-accent">
                    <Link href={`/blog/${post.slug}`} className="focus-ring">
                      {post.title}
                    </Link>
                  </h2>

                  <p className="mt-3 text-sm leading-relaxed text-muted md:text-base">
                    {post.excerpt}
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

        {/* CTA */}
        <Reveal>
          <div className="mt-20 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Buscás un equipo que ejecute a este nivel de detalle?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Hablemos de tu producto y construyamos algo con ingeniería impecable.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Armar Brief de Proyecto</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
