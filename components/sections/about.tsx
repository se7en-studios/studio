"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Calendar } from "lucide-react";
import { LinkedinIcon } from "@/components/ui/brand-icons";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { RevealText } from "@/components/ui/reveal-text";
import { team } from "@/data/team";

export function About() {
  return (
    <section id="about" className="border-t border-border py-20 md:py-28">
      <Container>
        {/* Misma escala que el resto de las secciones. A 2.6rem "DOS
            FUNDADORES" no entraba en los 342px útiles de un celular de 390. */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs tracking-widest text-muted uppercase">
              <span className="text-accent">●</span> Estudio
            </p>
            <h2 className="display text-4xl text-balance uppercase text-foreground md:text-6xl">
              <RevealText index={0}>Dos fundadores senior.</RevealText>
              <RevealText index={1}>
                <span className="text-accent">Cero burocracia.</span>
              </RevealText>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Hablás directo con quien diseña y con quien programa tu proyecto.
              Sin ejecutivos de cuenta ni intermediarios.
            </p>
          </div>

          {/* Mismo evento que el resto de los CTA de agenda: el modal vive en
            app/layout.tsx y escucha "open-booking-modal". */}
          <button
            type="button"
            onClick={() =>
              window.dispatchEvent(new CustomEvent("open-booking-modal"))
            }
            className="focus-ring group/cta inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:border-accent hover:bg-accent hover:text-background md:self-auto"
          >
            <Calendar size={16} aria-hidden />
            <span>Hablá con los dos</span>
            <ArrowRight
              size={16}
              aria-hidden
              className="transition-transform duration-300 group-hover/cta:translate-x-0.5"
            />
          </button>
        </div>

        {/* Una tarjeta por fundador: foto + nombre + rol + bio + LinkedIn,
            cada dato una sola vez. La foto es el argumento de la sección
            (hablás con personas, no con una agencia), así que en desktop
            ocupa una columna propia; en mobile va al lado del nombre para
            no quedar sola arriba de la tarjeta. */}
        <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 xl:grid-cols-2 xl:gap-6">
          {team.map((member, i) => (
            <Reveal key={member.id} index={i} className="h-full">
              <article className="group grid h-full content-start grid-cols-[5rem_1fr] gap-x-4 gap-y-5 rounded-2xl border border-border bg-surface/40 p-5 transition-colors duration-300 hover:border-foreground/20 hover:bg-surface sm:grid-cols-[9rem_1fr] sm:gap-x-6 sm:p-6 md:p-8 xl:grid-cols-[11rem_1fr]">
                {member.imageUrl && (
                  <div className="relative aspect-square overflow-hidden rounded-xl border border-border sm:row-span-2">
                    <Image
                      src={member.imageUrl}
                      alt={member.name ?? ""}
                      fill
                      sizes="(min-width: 1280px) 176px, (min-width: 640px) 144px, 80px"
                      className="object-cover transition-transform duration-700 ease-(--ease) group-hover:scale-[1.04]"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between gap-3 self-center sm:self-start">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground md:text-2xl">
                      {member.name}
                    </h3>
                    <p className="mt-1.5 font-mono text-xs uppercase tracking-widest text-accent">
                      {member.role}
                    </p>
                  </div>
                  {member.linkedin && (
                    <Link
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn de ${member.name}`}
                      className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent hover:bg-accent hover:text-background"
                    >
                      <LinkedinIcon size={16} />
                    </Link>
                  )}
                </div>

                <div className="col-span-2 sm:col-span-1 sm:col-start-2">
                  <p className="text-sm leading-relaxed text-muted md:text-base">
                    {member.bio}
                  </p>
                  {member.focus && member.focus.length > 0 && (
                    <ul
                      aria-label={`De qué se encarga ${member.name}`}
                      className="mt-5 flex flex-wrap gap-2"
                    >
                      {member.focus.map((item) => (
                        <li
                          key={item}
                          className="rounded-full border border-border bg-surface-2 px-3 py-1 font-mono text-[11px] text-foreground/80"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
