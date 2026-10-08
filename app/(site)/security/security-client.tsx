"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  FileCode2,
  KeyRound,
  Database,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Server,
  FileCheck2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { SITE } from "@/data/site";

const securityPillars = [
  {
    icon: FileCheck2,
    title: "1. 100% Propiedad de tu Código en GitHub",
    description:
      "No retenemos propiedad intelectual ni creamos dependencias. Al finalizar el proyecto, transferimos el repositorio completo de GitHub a tu organización con código TypeScript limpio y documentado.",
    points: [
      "Sin suscripciones obligatorias de mantenimiento",
      "Código fuente 100% auditable y modular",
      "Historial de commits y CI/CD transferidos",
    ],
  },
  {
    icon: Lock,
    title: "2. Acuerdo de Confidencialidad (NDA)",
    description:
      "Protegemos tus ideas y modelos de negocio. Firmamos acuerdos de confidencialidad estándar antes de revisar documentación o comenzar cualquier sprint de desarrollo.",
    points: [
      "Protección legal de propiedad intelectual",
      "Privacidad estricta sobre datos de usuarios",
      "Acceso restringido únicamente a los fundadores",
    ],
  },
  {
    icon: Database,
    title: "3. PostgreSQL con Row-Level Security (RLS)",
    description:
      "Aislamiento estricto de datos en Supabase. Las políticas de seguridad se aplican directamente en el motor de la base de datos, impidiendo que un usuario acceda a información de otros.",
    points: [
      "Políticas declarativas de acceso por tenant",
      "Backups automáticos diarios con PITR",
      "Cifrado en reposo (AES-256) y en tránsito (TLS 1.3)",
    ],
  },
  {
    icon: KeyRound,
    title: "4. Gestión de Secrets & Zero Frontend Leaks",
    description:
      "Las claves de API (Stripe, Mercado Pago, OpenAI, Claude) nunca tocan el navegador del cliente. Se ejecutan en Server Actions aisladas en el Edge.",
    points: [
      "Variables de entorno cifradas en Vercel",
      "Cero tokens expuestos en el bundle de JavaScript",
      "Protección contra inyecciones SQL y ataques XSS",
    ],
  },
];

export function SecurityClient() {
  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Seguridad Institucional & Propiedad Intelectual</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Tu código es tuyo. <br />
            <span className="text-accent">Tu seguridad, absoluta.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Cómo protegemos la propiedad intelectual de tu empresa, garantizamos aislamiento de datos y eliminamos cualquier riesgo técnico.
          </p>
        </div>

        {/* Grilla de Pilares */}
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2">
          {securityPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-3xl border border-border bg-surface p-8 transition-all hover:border-accent/40 hover:bg-surface-2/60 flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent mb-6">
                    <Icon size={22} />
                  </div>

                  <h3 className="font-semibold text-foreground text-lg sm:text-xl">
                    {pillar.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {pillar.description}
                  </p>
                </div>

                <div className="mt-6 space-y-2 border-t border-border/60 pt-4">
                  {pillar.points.map((pt) => (
                    <div key={pt} className="flex items-center gap-2 text-xs text-foreground/90 font-mono">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <Reveal>
          <div className="mt-20 rounded-3xl border border-border bg-surface p-8 md:p-12 text-center flex flex-col items-center">
            <h3 className="display text-2xl sm:text-3xl text-foreground">
              ¿Querés firmar un NDA antes de compartir tu brief?
            </h3>
            <p className="mt-2 text-sm text-muted max-w-md">
              Escribinos directamente a nuestro WhatsApp o iniciá el asistente de proyecto para coordinar.
            </p>
            <div className="mt-6 flex flex-wrap gap-4">
              <a
                href={SITE.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background hover:bg-accent/90"
              >
                <span>Solicitar NDA por WhatsApp</span>
                <ArrowRight size={15} />
              </a>

              <Link
                href="/start"
                className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-muted hover:text-foreground"
              >
                <span>Iniciar Briefing</span>
              </Link>
            </div>
          </div>
        </Reveal>
      </Container>
    </main>
  );
}
