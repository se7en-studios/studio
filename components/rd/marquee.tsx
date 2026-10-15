"use client";

import { useRef, useState } from "react";
import {
  m,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
  wrap,
} from "framer-motion";
import { Pause, Play } from "lucide-react";
import { projects } from "@/data/projects";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Sparkle } from "@/components/rd/primitives";

const PROJECT_NAMES = [...projects]
  .sort((a, b) => a.order - b.order)
  .map((p) => p.name);

const SERVICES = [
  "Estrategia de producto",
  "Diseño de interfaz",
  "Motion & interacción",
  "Desarrollo web",
  "E-commerce",
  "Integraciones de IA",
  "Identidad digital",
  "Performance & SEO",
];

export function RdMarquee() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "100px 0px" });
  // Quieta si el usuario pausó, prefiere menos movimiento o está fuera de pantalla.
  const still = reduced || paused || !inView;

  return (
    <section
      ref={ref}
      aria-label="Lo que hacemos y para quién"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-10 md:py-14"
    >
      <div className="relative h-[clamp(150px,22vw,300px)]">
        <Band
          items={PROJECT_NAMES}
          baseVelocity={-2.2}
          still={still}
          className="top-1/2 -translate-y-1/2 rotate-[3deg] bg-(--paper) text-(--ink)"
        />
        <Band
          items={SERVICES}
          baseVelocity={2.6}
          still={still}
          className="top-1/2 -translate-y-1/2 -rotate-[4deg] bg-(--signal) text-(--ink) shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]"
        />
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="rd-label absolute right-(--gutter) bottom-4 flex items-center gap-2 text-(--paper)/60 transition-colors hover:text-(--paper)"
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
        {paused ? "Reanudar" : "Pausar"} cintas
      </button>
    </section>
  );
}

/** Cinta infinita; el scroll acelera y puede invertir el sentido. */
function Band({
  items,
  baseVelocity,
  still,
  className,
}: {
  items: string[];
  baseVelocity: number;
  still: boolean;
  className: string;
}) {
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smooth = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const boost = useTransform(smooth, [0, 1000], [0, 4], { clamp: false });
  const direction = useRef(1);
  const x = useTransform(base, (v) => `${wrap(-25, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (still) return;
    let move = direction.current * baseVelocity * (delta / 1000);
    const b = boost.get();
    if (b < 0) direction.current = -1;
    else if (b > 0) direction.current = 1;
    move += direction.current * move * b;
    base.set(base.get() + move / 4);
  });

  const group = (
    <span className="flex shrink-0 items-center">
      {items.map((item) => (
        <span key={item} className="flex items-center">
          <span className="px-[0.35em]">{item}</span>
          <Sparkle className="h-[0.42em] w-[0.42em] shrink-0" />
        </span>
      ))}
    </span>
  );

  return (
    <div className={`absolute -inset-x-[10%] py-[0.18em] ${className}`}>
      <m.div
        aria-hidden
        style={{ x }}
        className="rd-condensed flex w-max text-[clamp(2.4rem,6.4vw,6.4rem)] leading-none whitespace-nowrap"
      >
        {group}
        {group}
        {group}
        {group}
      </m.div>
      <span className="sr-only">{items.join(", ")}</span>
    </div>
  );
}
