"use client";

import { useState } from "react";
import {
  Server,
  Database,
  Globe,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Bot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { useSoundFx } from "@/components/providers/sound-provider";

interface ArchitectureNode {
  id: string;
  step: string;
  name: string;
  role: string;
  tech: string;
  icon: LucideIcon;
  specs: string[];
  security: string;
}

const architectureNodes: ArchitectureNode[] = [
  {
    id: "edge",
    step: "01",
    name: "Edge CDN & Global Middleware",
    role: "Primera línea de respuesta",
    tech: "Vercel Edge Network / Cloudflare",
    icon: Globe,
    specs: [
      "Tiempos de respuesta (TTFB) < 40ms en todo el mundo",
      "SSL automático de grado bancario y mitigación DDoS",
      "Enrutamiento dinámico y geolocalización en milisegundos",
    ],
    security: "Mitigación perimetral activa 24/7",
  },
  {
    id: "frontend",
    step: "02",
    name: "React 19 Server Components",
    role: "Renderizado y experiencia de usuario",
    tech: "Next.js 16 (Turbopack) & Tailwind CSS v4",
    icon: Layers,
    specs: [
      "Streaming SSR: contenido visible antes de que termine de cargar la página",
      "0 KB de JavaScript innecesario en el cliente",
      "Micro-interacciones y transiciones fluidas a 60 FPS",
    ],
    security: "Sin renderizado de credenciales en el cliente",
  },
  {
    id: "backend",
    step: "03",
    name: "Server Actions & API Layer",
    role: "Lógica de negocio y transacciones",
    tech: "TypeScript Strict & Zod Validation",
    icon: Server,
    specs: [
      "Mutaciones atómicas sin exponer endpoints REST públicos",
      "Validación de esquemas tipados de punta a punta",
      "Control de tasa de consultas (Rate Limiting) y anti-spam",
    ],
    security: "Claves de API y tokens protegidos en el servidor",
  },
  {
    id: "database",
    step: "04",
    name: "PostgreSQL & Realtime Sync",
    role: "Persistencia de datos y suscripciones",
    tech: "Supabase Postgres & pgvector",
    icon: Database,
    specs: [
      "Row-Level Security (RLS): reglas de acceso a nivel de fila",
      "WebSockets en tiempo real para carritos y chats (<20ms)",
      "Backups automáticos diarios y réplicas geográficas",
    ],
    security: "Aislamiento estricto por usuario mediante RLS",
  },
  {
    id: "ai",
    step: "05",
    name: "Modelos IA & APIs Externas",
    role: "Inteligencia y automatizaciones",
    tech: "OpenAI, Anthropic & NASA FIRMS",
    icon: Bot,
    specs: [
      "Integración de agentes conversacionales y búsqueda semántica",
      "Procesamiento de datos satelitales y webhooks en vivo",
      "Optimización de costos y caché de inferencia",
    ],
    security: "Cifrado de datos en tránsito y en reposo (AES-256)",
  },
];

export function ArchitectureBlueprint() {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode>(architectureNodes[0]);
  const { playClick } = useSoundFx();

  const Icon = selectedNode.icon;

  return (
    <section className="border-t border-border py-24 md:py-32">
      <Container>
        <SectionHeading
          kicker="Blueprint de Ingeniería"
          title="Cómo construimos productos escalables."
          subtitle="Del navegador a la base de datos: cada capa está diseñada para soportar millones de peticiones con costo mínimo de infraestructura."
        />

        {/* Diagrama de Nodos Interactivo */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {architectureNodes.map((node) => {
            const NodeIcon = node.icon;
            const isSelected = selectedNode.id === node.id;
            return (
              <button
                key={node.id}
                type="button"
                onClick={() => {
                  playClick();
                  setSelectedNode(node);
                }}
                className={`focus-ring relative text-left rounded-2xl border p-5 transition-all duration-300 ${
                  isSelected
                    ? "border-accent bg-surface shadow-[0_0_25px_rgba(255,77,46,0.2)]"
                    : "border-border bg-surface/50 hover:border-foreground/30 hover:bg-surface"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-accent font-bold">
                    Capa {node.step}
                  </span>
                  <NodeIcon
                    size={18}
                    className={isSelected ? "text-accent" : "text-muted"}
                  />
                </div>

                <h4 className="mt-3 text-sm font-medium text-foreground">
                  {node.name}
                </h4>

                <p className="mt-1 font-mono text-[11px] text-muted truncate">
                  {node.tech}
                </p>

                {isSelected && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        {/* Detalle Expandido de la Capa Seleccionada */}
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between border-b border-border pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon size={28} />
              </div>
              <div>
                <span className="font-mono text-xs text-accent uppercase font-semibold">
                  Capa {selectedNode.step} — {selectedNode.tech}
                </span>
                <h3 className="display mt-1 text-2xl text-foreground sm:text-3xl">
                  {selectedNode.name}
                </h3>
                <p className="text-sm text-muted">{selectedNode.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-400 font-mono">
              <ShieldCheck size={16} />
              <span>{selectedNode.security}</span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            {selectedNode.specs.map((spec, i) => (
              <div
                key={i}
                className="rounded-xl border border-border/80 bg-background/60 p-4"
              >
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-xs leading-relaxed text-muted">
                    {spec}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
