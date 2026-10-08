import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { ArrowLeft, ArrowUpRight, CheckCircle2, ExternalLink, Quote, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { RevealText } from "@/components/ui/reveal-text";
import { ButtonLink } from "@/components/ui/button-link";
import { Magnetic } from "@/components/ui/magnetic";
import { ViewportSimulator } from "@/components/work/viewport-simulator";
import { getProjectBySlug, projects } from "@/data/projects";
import { testimonials } from "@/data/team";
import { SITE } from "@/data/site";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};

  const title = `${project.name} — ${project.category} · ${SITE.name}`;

  return {
    title,
    description: project.shortDescription,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      title,
      description: project.shortDescription,
      url: `${SITE.url}/work/${project.slug}`,
      images: [project.image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: project.shortDescription,
      images: [project.image],
    },
  };
}

function getNextProject(currentSlug: string) {
  const sorted = [...projects].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((p) => p.slug === currentSlug);
  return sorted[(index + 1) % sorted.length];
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  const nextProject = getNextProject(project.slug);
  const clientTestimonial = testimonials.find(
    (t) => t.projectSlug === project.slug && t.published !== false,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.name,
    description: project.shortDescription,
    url: `${SITE.url}/work/${project.slug}`,
    image: `${SITE.url}${project.image}`,
    creator: { "@type": "Organization", name: SITE.name, url: SITE.url },
    dateCreated: project.year,
  };

  return (
    <PageTransition>
      <article className="pt-32 pb-24 md:pt-40">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Container>
          {/* Navegación superior */}
          <div className="flex items-center justify-between">
            <Link
              href="/#work"
              transitionTypes={["nav-back"]}
              className="focus-ring group inline-flex items-center gap-2 font-mono text-xs text-muted transition-colors hover:text-foreground"
            >
              <ArrowLeft size={14} className="transition-transform duration-300 group-hover:-translate-x-1" />
              <span>Volver a proyectos</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
                {project.category}
              </span>
              <span className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
                {project.year}
              </span>
            </div>
          </div>

          {/* Encabezado del caso de estudio */}
          <div className="mt-12 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-accent">Proyecto {project.number}</span>
                {project.impactMetric && (
                  <span className="rounded-full border border-accent/40 bg-accent/10 px-3 py-0.5 font-mono text-xs font-medium text-accent">
                    {project.impactMetric}
                  </span>
                )}
              </div>

              <h1 className="display mt-3 text-5xl text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
                <RevealText>{project.name}</RevealText>
              </h1>
            </div>

            {project.url && (
              <Magnetic className="shrink-0">
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring group inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(255,77,46,0.35)]"
                >
                  <span>Visitar sitio en vivo</span>
                  <ExternalLink size={15} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </Magnetic>
            )}
          </div>

          <p className="mt-8 max-w-3xl text-xl leading-relaxed text-muted md:text-2xl">
            {project.description}
          </p>

          {/* Media principal: Imagen / Video en alta resolución */}
          <div className="relative mt-14 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <div className="relative aspect-[16/10] w-full">
              {project.image && (
                <ViewTransition
                  name={`project-${project.slug}`}
                  share="morph"
                  default="none"
                >
                  <Image
                    src={project.image}
                    alt={`${project.name} preview`}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover object-top"
                  />
                </ViewTransition>
              )}

              {project.video && (
                <video
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover object-top"
                >
                  <source src={project.video.webm} type="video/webm" />
                  <source src={project.video.mp4} type="video/mp4" />
                </video>
              )}
            </div>
          </div>

          {/* Estructura del Caso: Sidebar + Contenido */}
          <div className="mt-20 grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-16">
            {/* Sidebar con detalles técnicos y testimonio */}
            <div className="space-y-8 lg:col-span-4">
              <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
                <h3 className="font-mono text-xs tracking-widest text-muted uppercase">
                  Ficha Técnica
                </h3>

                <dl className="mt-6 space-y-6 divide-y divide-border">
                  <div className="pt-4 first:pt-0">
                    <dt className="font-mono text-xs text-muted">Cliente / Producto</dt>
                    <dd className="mt-1 font-medium text-foreground">{project.name}</dd>
                  </div>

                  <div className="pt-4">
                    <dt className="font-mono text-xs text-muted">Disciplina</dt>
                    <dd className="mt-1 text-sm text-foreground">{project.category}</dd>
                  </div>

                  <div className="pt-4">
                    <dt className="font-mono text-xs text-muted">Año</dt>
                    <dd className="mt-1 text-sm text-foreground">{project.year}</dd>
                  </div>

                  {project.technology && project.technology.length > 0 && (
                    <div className="pt-4">
                      <dt className="font-mono text-xs text-muted mb-2">Tecnologías Clave</dt>
                      <dd className="flex flex-wrap gap-1.5">
                        {project.technology.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-md border border-border bg-background px-2.5 py-1 font-mono text-xs text-foreground"
                          >
                            {tech}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}

                  {project.url && (
                    <div className="pt-4">
                      <dt className="font-mono text-xs text-muted mb-1">Acceso Público</dt>
                      <dd>
                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                        >
                          <span>{project.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                          <ArrowUpRight size={14} />
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Testimonio del cliente si existe */}
              {clientTestimonial && (
                <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 md:p-8">
                  <Quote size={20} className="text-accent mb-4" />
                  <p className="text-sm italic leading-relaxed text-foreground/90">
                    &ldquo;{clientTestimonial.quote}&rdquo;
                  </p>
                  <footer className="mt-4 border-t border-border pt-3 text-xs text-muted">
                    <span className="font-medium text-foreground">{clientTestimonial.name}</span> — {clientTestimonial.role}
                  </footer>
                </div>
              )}
            </div>

            {/* Contenido Narrativo del Caso */}
            <div className="space-y-12 lg:col-span-8">
              {project.challenge && (
                <section className="rounded-2xl border border-border bg-surface/40 p-8 md:p-10">
                  <p className="font-mono text-xs tracking-widest text-accent uppercase">
                    01. El Desafío
                  </p>
                  <h2 className="display mt-3 text-2xl text-foreground md:text-3xl">
                    El problema a resolver
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
                    {project.challenge}
                  </p>
                </section>
              )}

              {project.approach && (
                <section className="rounded-2xl border border-border bg-surface/40 p-8 md:p-10">
                  <p className="font-mono text-xs tracking-widest text-accent uppercase">
                    02. Estrategia & Enfoque
                  </p>
                  <h2 className="display mt-3 text-2xl text-foreground md:text-3xl">
                    Cómo lo abordamos
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
                    {project.approach}
                  </p>
                </section>
              )}

              {project.design && (
                <section className="rounded-2xl border border-border bg-surface/40 p-8 md:p-10">
                  <p className="font-mono text-xs tracking-widest text-accent uppercase">
                    03. Diseño & Experiencia de Usuario
                  </p>
                  <h2 className="display mt-3 text-2xl text-foreground md:text-3xl">
                    Dirección visual y micro-interacciones
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">
                    {project.design}
                  </p>
                </section>
              )}

              {project.outcome && (
                <section className="rounded-2xl border border-accent/30 bg-surface p-8 md:p-10">
                  <p className="font-mono text-xs tracking-widest text-emerald-400 uppercase flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    04. Impacto & Resultado
                  </p>
                  <h2 className="display mt-3 text-2xl text-foreground md:text-3xl">
                    En producción y generando valor
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-foreground/90 md:text-lg">
                    {project.outcome}
                  </p>
                </section>
              )}

              {/* Simulador Multi-Viewport */}
              {project.image && (
                <ViewportSimulator
                  imageSrc={project.image}
                  projectName={project.name}
                  videoSrc={project.video}
                  screens={project.screens}
                  liveUrl={project.url}
                />
              )}

              {/* Call to action de cierre para proyecto similar */}
              <div className="rounded-2xl border border-border bg-gradient-to-r from-surface to-surface-2 p-8 md:p-10">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                  <div>
                    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-accent">
                      <Sparkles size={13} />
                      ¿Tenés un proyecto en mente?
                    </span>
                    <h3 className="display mt-2 text-2xl text-foreground">
                      Construyamos algo como {project.name}.
                    </h3>
                  </div>

                  <Magnetic className="shrink-0">
                    <ButtonLink href="/#contact">
                      Iniciar conversación
                      <ArrowUpRight size={16} />
                    </ButtonLink>
                  </Magnetic>
                </div>
              </div>
            </div>
          </div>

          {/* Navegación al Siguiente Proyecto */}
          <div className="mt-24 border-t border-border pt-12">
            <p className="font-mono text-xs tracking-widest text-muted uppercase">
              Siguiente Caso de Estudio
            </p>
            <Link
              href={`/work/${nextProject.slug}`}
              transitionTypes={["nav-forward"]}
              className="focus-ring group mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-6 transition-all duration-300 hover:border-accent/40 hover:bg-surface-2 md:p-8"
            >
              <div>
                <span className="font-mono text-xs text-accent">Caso {nextProject.number}</span>
                <h3 className="display mt-1 text-2xl text-foreground transition-colors duration-300 group-hover:text-accent md:text-4xl">
                  {nextProject.name}
                </h3>
                <p className="mt-1 text-sm text-muted">{nextProject.category}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-muted transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-background">
                <ArrowUpRight size={20} />
              </div>
            </Link>
          </div>
        </Container>
      </article>
    </PageTransition>
  );
}
