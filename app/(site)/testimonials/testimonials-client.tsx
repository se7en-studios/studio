"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { testimonials } from "@/data/team";

// Única fuente: data/team.ts. Nada de métricas ni historias que no estén ahí:
// antes esta página tenía su propia lista, con números que no coincidían con
// los del resto del sitio y clientes que no figuran en /work.
const published = testimonials
  .filter((t) => t.published !== false)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

export function TestimonialsClient() {
  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Testimonios
          </p>
          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
            Lo que dicen las marcas con las que trabajamos.
          </h1>
        </div>

        <div className="mt-16 divide-y divide-border border-y border-border">
          {published.map((t) => (
            <blockquote
              key={t.id}
              className="grid gap-6 py-10 md:grid-cols-[1fr_2fr] md:gap-12"
            >
              <footer className="order-last md:order-first">
                <cite className="block font-medium not-italic text-foreground">
                  {t.name}
                </cite>
                <span className="block text-sm text-muted">
                  {t.role} · {t.company}
                </span>
                {t.projectSlug && (
                  <Link
                    href={`/work/${t.projectSlug}`}
                    className="focus-ring mt-3 inline-flex items-center gap-1 font-mono text-xs text-muted transition-colors hover:text-accent"
                  >
                    Ver el proyecto
                    <ArrowRight size={12} />
                  </Link>
                )}
              </footer>
              <p className="text-lg leading-relaxed text-foreground md:text-xl">
                &ldquo;{t.quote}&rdquo;
              </p>
            </blockquote>
          ))}
        </div>

        <Reveal>
          <div className="mt-20 flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
            <h2 className="display text-2xl text-foreground sm:text-3xl">
              ¿Tenés un proyecto en mente?
            </h2>
            <Link
              href="/start"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
            >
              Contanos qué necesitás
              <ArrowRight size={15} />
            </Link>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
