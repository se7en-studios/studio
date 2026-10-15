"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import Link from "next/link";

interface EdgeNode {
  city: string;
  country: string;
  flag: string;
  latencyMs: number;
  status: "optimal" | "fast";
  infra: string;
}

const edgeNodes: EdgeNode[] = [
  { city: "Buenos Aires / Neuquén", country: "Argentina", flag: "🇦🇷", latencyMs: 24, status: "optimal", infra: "Vercel Edge EZE" },
  { city: "São Paulo", country: "Brasil", flag: "🇧🇷", latencyMs: 18, status: "optimal", infra: "Vercel Edge GRU" },
  { city: "Santiago", country: "Chile", flag: "🇨🇱", latencyMs: 29, status: "optimal", infra: "Cloudflare Edge SCL" },
  { city: "Miami", country: "Estados Unidos", flag: "🇺🇸", latencyMs: 38, status: "fast", infra: "AWS Edge MIA" },
  { city: "Madrid", country: "España", flag: "🇪🇸", latencyMs: 52, status: "fast", infra: "Vercel Edge MAD" },
  { city: "Frankfurt", country: "Alemania", flag: "🇩🇪", latencyMs: 58, status: "fast", infra: "Vercel Edge FRA" },
];

export function EdgeLatencyMonitor() {
  const [, setPulse] = useState(0); // solo fuerza el redibujado

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => (p + 1) % 100);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="border-t border-border py-24 md:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="Infraestructura Perimetral"
            title="Respuesta instantánea en toda América y Europa."
            subtitle="Desplegamos cada línea de código en la red perimetral de Vercel Edge con CDN distribuida en más de 300 ciudades."
          />

          <Link
            href="/tech"
            className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-xs font-mono text-muted hover:text-foreground shrink-0 transition-colors"
          >
            <span>Ver Radar Tecnológico</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Grilla de Nodos */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {edgeNodes.map((node) => (
            <div
              key={node.city}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5 transition-all hover:border-accent/40 hover:bg-surface-2/60"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-2xl">{node.flag}</span>
                <div>
                  <h4 className="font-semibold text-foreground text-sm">
                    {node.city}
                  </h4>
                  <span className="font-mono text-[11px] text-muted">
                    {node.infra}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{node.latencyMs}ms</span>
                </div>
                <span className="block font-mono text-[10px] text-muted mt-1">
                  TTFB Latency
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Banner de Garantía de Servidores */}
        <div className="mt-8 rounded-2xl border border-border/80 bg-background/60 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck size={20} className="text-accent" />
            <p className="text-xs text-muted leading-relaxed">
              <strong className="text-foreground">99.99% de Disponibilidad SLA:</strong> Cero mantenimiento de servidores físicos, balanceo automático de carga y protección perimetral DDoS incluida.
            </p>
          </div>

          <span className="font-mono text-[11px] text-accent font-semibold shrink-0">
            HTTP/3 · SSL Automático · Zero Downtime
          </span>
        </div>
      </Container>
    </section>
  );
}
