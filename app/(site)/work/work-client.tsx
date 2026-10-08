"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Sparkles, Filter, ArrowRight, Layers, LayoutGrid } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { ProjectCard } from "@/components/work/project-card";
import { projects } from "@/data/projects";

const categories = [
  { id: "all", label: "Todos los proyectos" },
  { id: "saas", label: "SaaS & Apps" },
  { id: "ecommerce", label: "E-Commerce" },
  { id: "systems", label: "Software & IA" },
  { id: "web", label: "Web Corporativa" },
];

export function WorkArchiveClient() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesCategory =
        selectedCategory === "all" || project.categoryGroup === selectedCategory;

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query === "" ||
        project.name.toLowerCase().includes(query) ||
        project.category.toLowerCase().includes(query) ||
        project.shortDescription.toLowerCase().includes(query) ||
        (project.technology && project.technology.some((tech) => tech.toLowerCase().includes(query)));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Cabecera Editorial */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Layers size={13} className="text-accent" />
            <span>Portafolio & Archivo</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Proyectos reales. <br />
            <span className="text-accent">Resultados tangibles.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Explorá los productos digitales, plataformas SaaS y experiencias web que diseñamos y desarrollamos en producción para startups y empresas.
          </p>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="mt-12 border-y border-border py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Categorías */}
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`focus-ring rounded-lg border px-3.5 py-1.5 font-mono text-xs transition-all ${
                    selectedCategory === cat.id
                      ? "border-accent bg-accent text-background font-medium shadow-[0_0_15px_rgba(255,77,46,0.25)]"
                      : "border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {cat.label}
                  {cat.id === "all" && (
                    <span className="ml-2 opacity-70">({projects.length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="relative w-full sm:w-80">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por cliente o tecnología..."
                className="focus-ring w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted/60 transition-colors focus:border-accent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-xs text-muted hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grilla de Proyectos */}
        <div className="mt-12">
          {filteredProjects.length === 0 ? (
            <div className="rounded-2xl border border-border/80 bg-surface/50 p-12 text-center">
              <p className="font-mono text-sm text-muted">
                No se encontraron proyectos con los criterios de búsqueda ingresados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSearchQuery("");
                }}
                className="focus-ring mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 font-mono text-xs text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              {filteredProjects.map((project, idx) => (
                <ProjectCard
                  key={project.slug}
                  project={project}
                  index={idx % 2}
                  priority={idx < 2}
                />
              ))}
            </div>
          )}
        </div>

        {/* Banner pre-footer en /work */}
        <Reveal>
          <div className="mt-24 rounded-2xl border border-border bg-surface p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                ¿Tenés un proyecto en mente?
              </span>
              <h3 className="display mt-2 text-2xl text-foreground sm:text-3xl">
                Estimá costos y tiempos en 2 minutos con nuestro cotizador.
              </h3>
              <p className="mt-2 text-sm text-muted">
                Obtené un cálculo instantáneo basado en tu tipo de producto, features y urgencia.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/#estimator"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(255,77,46,0.3)]"
              >
                <span>Abrir cotizador</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/#contact"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium text-muted transition-colors hover:text-foreground"
              >
                <span>Contacto directo</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
