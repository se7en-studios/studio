"use client";

import { useRef, useState } from "react";
import {
  MessageSquare,
  Code2,
  Sparkles,
  Rocket,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { RevealText } from "@/components/ui/reveal-text";
import { ButtonLink } from "@/components/ui/button-link";
import { useSoundFx } from "@/components/providers/sound-provider";

interface ProcessStep {
  step: string;
  days: string;
  title: string;
  tagline: string;
  icon: LucideIcon;
  description: string;
  tasks: string[];
  deliverable: string;
}

const steps: ProcessStep[] = [
  {
    step: "01",
    days: "Días 1 a 3",
    title: "Estrategia y Diseño",
    tagline: "Definimos el plan y armamos un prototipo navegable",
    icon: MessageSquare,
    description:
      "Alineamos los objetivos de tu negocio y diseñamos cada pantalla en detalle antes de escribir una sola línea de código.",
    tasks: [
      "Canal directo por WhatsApp con los fundadores (Franco & Federico).",
      "Mapa de las pantallas y pasos clave que va a tener tu sitio.",
      "Prototipo navegable con el diseño final aprobado por vos.",
    ],
    deliverable: "Diseño completo aprobado, listo para construir",
  },
  {
    step: "02",
    days: "Días 4 a 10",
    title: "Construcción",
    tagline: "Programamos todo y lo conectamos a tus datos",
    icon: Code2,
    description:
      "Programamos cada pantalla y la conectamos con tu base de datos, para que todo funcione de verdad, no solo se vea bien.",
    tasks: [
      "Sitio de prueba privado para ver los avances día a día.",
      "Código prolijo y a prueba de errores.",
      "Conexión con tu base de datos, usuarios y pagos.",
    ],
    deliverable: "Versión de prueba 100% funcional con tus datos reales",
  },
  {
    step: "03",
    days: "Días 11 a 16",
    title: "Animaciones y Ajustes Finos",
    tagline: "Detalles, velocidad y compatibilidad en todos los dispositivos",
    icon: Sparkles,
    description:
      "Sumamos animaciones y micro-detalles, y optimizamos cada milisegundo de carga para que se sienta rápido y prolijo.",
    tasks: [
      "Transiciones y animaciones suaves en toda la experiencia.",
      "Revisión a fondo de velocidad y buen posicionamiento en Google.",
      "Pruebas en celular, tablet y computadora, en todos los navegadores.",
    ],
    deliverable: "Máxima puntuación de velocidad y una experiencia fluida",
  },
  {
    step: "04",
    days: "Días 17 a 21",
    title: "Lanzamiento y Garantía",
    tagline: "Publicamos tu sitio y te acompañamos después",
    icon: Rocket,
    description:
      "Publicamos tu sitio con la mejor infraestructura disponible y te entregamos la propiedad total del proyecto.",
    tasks: [
      "Configuración de tu dominio y certificado de seguridad.",
      "Indexación en Google y vista previa lista para redes sociales.",
      "El proyecto pasa a tu nombre + 30 días de soporte post-lanzamiento.",
    ],
    deliverable: "Tu sitio en línea + el proyecto es 100% tuyo",
  },
];

export function Process() {
  const [activeStep, setActiveStep] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const { playClick } = useSoundFx();

  const current = steps[activeStep];
  const Icon = current.icon;

  function select(idx: number) {
    playClick();
    setActiveStep(idx);
  }

  // Patrón de tabs de WAI-ARIA con activación automática: flechas, Home y End
  // mueven el foco y seleccionan. Sólo la tab activa entra en el orden de Tab.
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const last = steps.length - 1;
    const forward = activeStep === last ? 0 : activeStep + 1;
    const back = activeStep === 0 ? last : activeStep - 1;
    const next: Record<string, number> = {
      ArrowRight: forward,
      ArrowDown: forward,
      ArrowLeft: back,
      ArrowUp: back,
      Home: 0,
      End: last,
    };
    if (!(e.key in next)) return;
    e.preventDefault();
    select(next[e.key]);
    tabRefs.current[next[e.key]]?.focus();
  }

  return (
    <section id="process" className="border-t border-border py-20 md:py-28">
      <Container>
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="mb-5 font-mono text-xs tracking-widest text-muted uppercase">
              <span className="text-accent">●</span> Proceso
            </p>
            <h2 className="display text-4xl uppercase text-foreground md:text-6xl">
              <RevealText>De la idea a producción en 2 a 3 semanas.</RevealText>
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Cuatro etapas, cada una con un entregable concreto. Ves el avance
              todos los días en un sitio de prueba privado.
            </p>
          </div>
          <ButtonLink
            href="/#contacto"
            variant="secondary"
            className="shrink-0 self-start md:self-auto"
          >
            Iniciar un proyecto
            <ArrowRight
              size={16}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </ButtonLink>
        </div>

        <div
          role="tablist"
          aria-label="Etapas del proceso"
          className="mt-12 grid grid-cols-2 gap-3 lg:grid-cols-4"
        >
          {steps.map((item, idx) => {
            const isSelected = activeStep === idx;

            return (
              <button
                key={item.step}
                ref={(el) => {
                  tabRefs.current[idx] = el;
                }}
                id={`process-tab-${item.step}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="process-panel"
                tabIndex={isSelected ? 0 : -1}
                onClick={() => select(idx)}
                onKeyDown={handleKeyDown}
                className={`focus-ring relative overflow-hidden rounded-2xl border p-4 text-left transition-colors duration-300 sm:p-5 ${
                  isSelected
                    ? "border-accent/60 bg-surface"
                    : "border-border bg-surface/40 hover:border-foreground/30 hover:bg-surface"
                }`}
              >
                {/* Barra superior: se llena en la etapa activa. */}
                <span
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-0.5 origin-left bg-accent transition-transform duration-500 ${
                    isSelected ? "scale-x-100" : "scale-x-0"
                  }`}
                />
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-[11px]">
                  <span
                    className={`font-bold ${isSelected ? "text-accent" : "text-muted"}`}
                  >
                    {item.step}
                  </span>
                  <span className="text-muted">{item.days}</span>
                </span>
                <span
                  className={`mt-3 block text-sm font-semibold transition-colors ${
                    isSelected ? "text-foreground" : "text-foreground/70"
                  }`}
                >
                  {item.title}
                </span>
                <span className="mt-1 hidden text-xs text-muted sm:line-clamp-1">
                  {item.tagline}
                </span>
              </button>
            );
          })}
        </div>

        <div
          id="process-panel"
          role="tabpanel"
          aria-labelledby={`process-tab-${current.step}`}
          className="mt-4 rounded-2xl border border-border bg-surface p-6 md:p-8"
        >
          <div className="flex flex-col gap-4 border-b border-border/80 pb-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Icon size={24} aria-hidden />
              </div>
              <div>
                <span className="font-mono text-xs font-bold tracking-widest text-accent uppercase">
                  Paso {current.step} · {current.days}
                </span>
                <h3 className="display mt-0.5 text-2xl text-foreground sm:text-3xl">
                  {current.title}
                </h3>
              </div>
            </div>

            <div className="inline-flex items-start gap-2 self-start rounded-xl border border-accent/25 bg-accent/5 px-4 py-2 font-mono text-xs lg:self-auto">
              <span className="font-semibold text-accent">Entregable:</span>
              <span className="text-foreground/80">{current.deliverable}</span>
            </div>
          </div>

          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            {current.description}
          </p>

          <ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
            {current.tasks.map((task) => (
              <li
                key={task}
                className="flex items-start gap-3 rounded-xl border border-border/80 bg-background/60 p-4"
              >
                <CheckCircle2
                  size={16}
                  aria-hidden
                  className="mt-0.5 shrink-0 text-accent"
                />
                <p className="text-sm leading-relaxed text-foreground/80">
                  {task}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-4 font-mono text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Clock size={13} aria-hidden className="text-accent" />
              Avances visibles todos los días, antes del lanzamiento
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} aria-hidden className="text-accent" />
              30 días de soporte post-lanzamiento incluidos
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
