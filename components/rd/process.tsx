"use client";

import { useRef } from "react";
import {
  m,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Check } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { RdLabel, RdLines } from "./primitives";

const steps = [
  {
    number: "01",
    title: "Descubrir & Estrategia",
    duration: "Semana 1",
    description:
      "Analizamos tu negocio, cómo generás ingresos y a quién le hablás. Definimos qué vamos a construir y qué resultado buscamos.",
    deliverables: [
      "Plan de trabajo claro",
      "Mapa de contenidos y pantallas",
      "Referencias visuales",
    ],
  },
  {
    number: "02",
    title: "Diseñar & Prototipar",
    duration: "Semana 2",
    description:
      "Diseñamos cómo se ve y cómo se usa cada pantalla. Armamos un prototipo interactivo que podés recorrer antes de construir nada, pensado para computadora y celular.",
    deliverables: [
      "Boceto de cada pantalla",
      "Diseño para computadora y celular",
      "Prototipo interactivo para probar",
    ],
  },
  {
    number: "03",
    title: "Construir & Animar",
    duration: "Semanas 3-4",
    description:
      "Programamos tu sitio para que cargue al instante y no tenga errores. Sumamos animaciones suaves y lo conectamos a tus datos.",
    deliverables: [
      "Programación completa",
      "Animaciones y detalles",
      "Versión de prueba en vivo antes del lanzamiento",
    ],
  },
  {
    number: "04",
    title: "Lanzar & Optimizar",
    duration: "Lanzamiento",
    description:
      "Publicamos tu sitio con la mejor infraestructura disponible, configuramos tu dominio, revisamos que cargue rápido y aparezca bien en Google, y te acompañamos después del lanzamiento.",
    deliverables: [
      "Revisión de velocidad y de Google",
      "Configuración de estadísticas",
      "30 días de garantía y soporte",
    ],
  },
];

const palettes = [
  { bg: "var(--paper)", fg: "var(--ink)", line: "var(--line-ink)" },
  { bg: "var(--signal)", fg: "var(--ink)", line: "var(--line-ink)" },
  { bg: "var(--ink-3)", fg: "var(--paper)", line: "var(--line)" },
  { bg: "var(--paper-2)", fg: "var(--ink)", line: "var(--line-ink)" },
];

/** Pasos que se apilan (sticky) y se van achicando y oscureciendo al avanzar. */
export function RdProcess() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  return (
    <section
      id="proceso"
      data-theme="ink"
      className="relative -mt-10 rounded-t-[2.5rem] bg-(--ink) pt-28 pb-16 md:-mt-16 md:rounded-t-[4rem] md:pt-40"
    >
      <div className="rd-wrap">
        <div className="grid gap-8 lg:grid-cols-12">
          <RdLabel index="04" className="text-(--paper)/60 lg:col-span-3">
            Proceso
          </RdLabel>
          <RdLines
            lines={[
              "De idea a",
              <>
                producción en{" "}
                <span className="rd-serif text-(--signal)">4 pasos</span>
              </>,
            ]}
            className="rd-display text-[clamp(1.9rem,9vw,2.4rem)] md:text-[clamp(2.4rem,6.4vw,7.6rem)] lg:col-span-9"
          />
        </div>
        <div ref={ref} className="relative mt-16 md:mt-24">
          {steps.map((step, i) => (
            <Step
              key={step.number}
              step={step}
              index={i}
              total={steps.length}
              progress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Step({
  step,
  index,
  total,
  progress,
}: {
  step: (typeof steps)[number];
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const p = palettes[index % palettes.length];
  const start = index / total;
  const scale = useTransform(
    progress,
    [start, 1],
    [1, 1 - (total - index - 1) * 0.04],
  );
  const shade = useTransform(
    progress,
    [start, Math.min(1, start + 1 / total)],
    [0, index < total - 1 ? 0.35 : 0],
  );
  return (
    <div
      className="sticky pb-6 md:h-[min(78vh,720px)]"
      style={{ top: `calc(12vh + ${index * 28}px)` }}
    >
      <m.article
        style={
          reduced
            ? { background: p.bg, color: p.fg }
            : { scale, background: p.bg, color: p.fg }
        }
        className="relative grid h-full origin-top grid-rows-[auto_1fr] gap-10 overflow-hidden rounded-[2rem] p-6 md:grid-cols-12 md:grid-rows-1 md:gap-0 md:p-12"
      >
        <div className="flex items-start justify-between md:col-span-5 md:flex-col md:justify-between">
          <span className="rd-label opacity-70">{step.duration}</span>
          <span className="rd-condensed text-[clamp(6rem,19vw,17rem)] leading-[0.78]">
            {step.number}
          </span>
        </div>
        <div className="flex flex-col justify-end gap-6 md:col-span-7 md:pl-8">
          <h3 className="rd-display text-[clamp(1.8rem,3.6vw,3.6rem)]">
            {step.title}
          </h3>
          <p className="rd-body max-w-xl text-base leading-snug opacity-80 md:text-xl">
            {step.description}
          </p>
          <ul
            className="grid gap-2 border-t pt-5 sm:grid-cols-2"
            style={{ borderColor: p.line }}
          >
            {step.deliverables.map((d) => (
              <li
                key={d}
                className="rd-body flex items-start gap-2 text-sm font-medium md:text-base"
              >
                <Check
                  size={16}
                  className="mt-0.5 shrink-0"
                  strokeWidth={2.5}
                />
                {d}
              </li>
            ))}
          </ul>
        </div>
        {!reduced && (
          <m.span
            aria-hidden
            style={{ opacity: shade }}
            className="pointer-events-none absolute inset-0 bg-black"
          />
        )}
      </m.article>
    </div>
  );
}
