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

        {/* Retrato grande por fundador: la foto es el argumento de la sección
            (hablás con personas, no con una agencia). En blanco y negro hasta
            el hover; el segundo retrato va desfasado para romper la grilla. */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:mt-16 md:grid-cols-2 md:gap-8">
          {team.map((member, i) => (
            <Reveal key={member.id} index={i} className="h-full">
              <article
                className={`group ${i % 2 === 1 ? "md:mt-16" : ""}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-border bg-surface-2">
                  {member.imageUrl && (
                    <Image
                      src={member.imageUrl}
                      alt={member.name ?? ""}
                      fill
                      sizes="(min-width: 768px) 46vw, 100vw"
                      className="object-cover grayscale transition-[filter,transform] duration-[1.2s] ease-(--ease) group-hover:scale-[1.04] group-hover:grayscale-0"
                    />
                  )}
                  <span className="absolute top-5 left-5 rounded-full bg-foreground px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-background uppercase">
                    {member.role}
                  </span>
                  {member.focus && member.focus.length > 0 && (
                    <ul
                      aria-label={`De qué se encarga ${member.name}`}
                      className="absolute inset-x-5 bottom-5 flex flex-wrap gap-1.5"
                    >
                      {member.focus.map((item) => (
                        <li
                          key={item}
                          className="rounded-full bg-background/70 px-2.5 py-1 font-mono text-[10px] tracking-widest text-foreground uppercase backdrop-blur-md"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-6 flex items-start justify-between gap-6">
                  <div>
                    <h3 className="display text-3xl text-foreground uppercase md:text-5xl">
                      {member.name}
                    </h3>
                    <p className="mt-3 max-w-md text-base leading-snug text-muted">
                      {member.bio}
                    </p>
                  </div>
                  {member.linkedin && (
                    <Link
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`LinkedIn de ${member.name}`}
                      className="focus-ring grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border text-muted transition-colors duration-300 hover:border-accent hover:bg-accent hover:text-background"
                    >
                      <LinkedinIcon size={18} />
                    </Link>
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
