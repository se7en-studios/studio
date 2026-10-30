"use client";

import { useEffect, useRef, useState } from "react";
import { animate, m, useInView } from "framer-motion";
import { projects } from "@/data/projects";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_OUT } from "@/components/rd/primitives";

const COUNT_EASE = [0.22, 1, 0.36, 1] as const;

const STATS = [
  {
    value: `${projects.length}`,
    label: "Negocios funcionando online",
    note: "marcas y clientes activos",
  },
  {
    value: "2–3",
    label: "Semanas para tener tu web lista",
    note: "rápido y con fecha exacta",
  },
  {
    value: "24h",
    label: "Para responderte por WhatsApp",
    note: "directo con Franco y Fede",
  },
  {
    value: "100%",
    label: "La web es tuya para siempre",
    note: "cero cuotas de alquiler mensual",
  },
];

export function RdStats() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -15% 0px" });

  return (
    <section
      aria-label="El estudio en números"
      data-theme="signal"
      className="relative overflow-hidden bg-(--signal) text-(--ink)"
    >
      <div ref={ref} className="rd-wrap grid grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <m.div
            key={stat.label}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 1, ease: EASE_OUT, delay: i * 0.08 }}
            className={`flex flex-col justify-between gap-10 py-10 md:py-14 ${i % 2 === 1 ? "pl-5 md:pl-8" : "pr-5 md:pr-8"} ${i > 0 ? "lg:border-l lg:border-(--ink)/20 lg:pl-8" : ""} ${i === 1 ? "border-l border-(--ink)/20" : ""} ${i === 3 ? "border-l border-(--ink)/20" : ""} ${i > 1 ? "border-t border-(--ink)/20 lg:border-t-0" : ""}`}
          >
            <span className="rd-label text-(--ink)/70">0{i + 1}</span>
            <div>
              <span className="rd-condensed block text-[clamp(4.5rem,11vw,10.5rem)] leading-[0.8]">
                <CountUp value={stat.value} />
              </span>
              <p className="rd-body mt-4 text-base leading-tight font-semibold md:text-lg">
                {stat.label}
              </p>
              <p className="rd-label mt-1 text-xs text-(--ink)/70">
                {stat.note}
              </p>
            </div>
          </m.div>
        ))}
      </div>
    </section>
  );
}

function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const [display, setDisplay] = useState(value);

  const num = parseInt(value, 10);
  const hasNum = !isNaN(num);

  useEffect(() => {
    if (!hasNum || reduced || !inView) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, num, {
      duration: 1.6,
      ease: COUNT_EASE,
      onUpdate: (latest) => {
        const current = Math.round(latest);
        setDisplay(value.replace(String(num), String(current)));
      },
    });
    return () => controls.stop();
  }, [hasNum, inView, num, reduced, value]);

  return <span ref={ref}>{display}</span>;
}
