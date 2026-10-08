import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  User,
  Share2,
  Sparkles,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { blogPosts, getPostBySlug } from "@/data/blog";
import { SITE } from "@/data/site";

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
    description: post.excerpt,
    openGraph: {
      title: `${post.title} | Blog Se7en Studio`,
      description: post.excerpt,
      url: `${SITE.url}/blog/${post.slug}`,
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

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="mx-auto max-w-3xl">
          {/* Navegación de regreso */}
          <Link
            href="/blog"
            className="focus-ring inline-flex items-center gap-2 font-mono text-xs text-muted hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={14} />
            <span>Volver al blog</span>
          </Link>

          {/* Cabecera del Artículo */}
          <div className="space-y-4">
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

            <h1 className="display text-3xl text-foreground sm:text-4xl md:text-5xl leading-tight">
              {post.title}
            </h1>

            <p className="text-lg leading-relaxed text-muted border-b border-border pb-8">
              {post.excerpt}
            </p>

            {/* Autor */}
            <div className="flex items-center gap-3 pt-2">
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
          </div>

          {/* Contenido */}
          <div className="mt-12 space-y-10 border-t border-border pt-10">
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

          {/* Pre-footer Banner */}
          <div className="mt-16 rounded-2xl border border-border bg-surface p-8 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="font-medium text-foreground text-lg">
                ¿Querés aplicar esta arquitectura en tu producto?
              </h3>
              <p className="mt-1 text-xs text-muted">
                Agendá una llamada de 15 min o armá tu brief interactivo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-medium text-background hover:bg-accent/90"
              >
                <span>Armar Brief</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
