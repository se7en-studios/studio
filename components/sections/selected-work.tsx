"use client";

import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { RevealText } from "@/components/ui/reveal-text";
import { ButtonLink } from "@/components/ui/button-link";
import { Magnetic } from "@/components/ui/magnetic";
import { ProjectRail } from "@/components/work/project-rail";
import { projects } from "@/data/projects";
import { SITE } from "@/data/site";

const ordered = [...projects].sort((a, b) => a.order - b.order);

export function SelectedWork() {
  return (
    <section id="work" className="py-20 md:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs tracking-widest text-muted uppercase">
              <span className="text-accent">●</span> Trabajo
            </p>
            <h2 className="display text-4xl uppercase text-foreground md:text-6xl">
              <RevealText>Trabajo seleccionado</RevealText>
              <RevealText index={1}>
                <span className="text-accent">{SITE.stats.years}</span>
                <span className="align-top text-2xl md:text-3xl">©</span>
              </RevealText>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              {projects.length} proyectos que diseñamos y programamos de punta
              a punta, con foco en conversión y en cómo se ven.
            </p>
          </div>
          <Magnetic className="shrink-0">
            <ButtonLink href="/#contact" variant="secondary">
              Iniciar un proyecto
              <ArrowRight
                size={16}
                className="transition-transform duration-300 group-hover:translate-x-1"
              />
            </ButtonLink>
          </Magnetic>
        </div>

      </Container>

      <ProjectRail projects={ordered} />
    </section>
  );
}
