"use client";

import Link from "next/link";
import { Quote, ArrowUpRight, Star } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { testimonials } from "@/data/team";

export function Testimonials() {
  const visible = testimonials
    .filter((t) => t.published)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  if (!visible || visible.length === 0) return null;

  return (
    <section className="border-t border-border py-20 md:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="Testimonios & Clientes"
            title="Lo que dicen los fundadores."
            subtitle="Experiencias reales de clientes que confiaron en Se7en para diseñar, programar y lanzar sus productos clave."
          />
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs font-mono text-muted">
            <div className="flex text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} className="fill-amber-400" />
              ))}
            </div>
            <span>100% Satisfacción</span>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          {visible.map((t) => {
            const initials = t.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2);

            return (
              <blockquote
                key={t.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-8 transition-all duration-500 hover:border-accent/40 hover:bg-surface-2 md:p-10"
              >
                {/* Filete de acento que se ilumina al pasar el cursor */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-0.5 w-0 bg-accent transition-all duration-500 group-hover:w-full"
                />

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <Quote size={24} aria-hidden className="text-accent" />
                    {t.highlight && (
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent">
                        {t.highlight}
                      </span>
                    )}
                  </div>

                  <p className="mt-6 text-lg leading-relaxed text-foreground md:text-xl">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-2 font-mono text-sm font-semibold text-accent shadow-sm">
                      {initials}
                    </div>
                    <div>
                      <cite className="not-italic block font-medium text-foreground">
                        {t.name}
                      </cite>
                      <span className="block text-xs text-muted">
                        {t.role} · <span className="text-foreground/90 font-medium">{t.company}</span>
                      </span>
                    </div>
                  </div>

                  {t.projectSlug && (
                    <Link
                      href={`/work/${t.projectSlug}`}
                      className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs text-muted transition-colors hover:text-accent"
                    >
                      <span>Ver caso</span>
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                </footer>
              </blockquote>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
