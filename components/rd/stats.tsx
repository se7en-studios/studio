"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView } from "framer-motion";
import { projects } from "@/data/projects";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_OUT } from "@/components/rd/primitives";

const COUNT_EASE = [0.22, 1, 0.36, 1] as const;

const STATS = [
  {
    value: `${projects.length}`,
    label: "Proyectos en producción",
    note: "y en mantenimiento activo",
  },
  {
    value: "2–3",
    label: "Semanas de idea a producción",
    note: "en una landing o sitio",
  },
  {
    value: "24h",
    label: "Para responder tu consulta",
    note: "hábiles, por WhatsApp o mail",
  },
  {
    value: "100%",
    label: "Del código es tuyo",
    note: "sin licencias ni ataduras",
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
          <motion.div
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
              <p className="rd-label mt-1 text-(--ink)/65">{stat.note}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** Cuenta de 0 al número del valor ("24h", "100%"); si no hay número, lo muestra tal cual. */
function CountUp({ value }: { value: string }) {
  const match = value.match(/^(\D*)(\d+)(\D*)$/);
  const prefix = match?.[1] ?? "";
  const target = match ? parseInt(match[2], 10) : null;
  const suffix = match?.[3] ?? "";
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduced = useReducedMotion();
  const [shown, setShown] = useState("0");
  const started = useRef(false);

  useEffect(() => {
    if (target === null || !inView || reduced || started.current) return;
    started.current = true;
    const controls = animate(0, target, {
      duration: 1.4,
      ease: COUNT_EASE,
      onUpdate: (v) => setShown(String(Math.round(v))),
    });
    return () => controls.stop();
  }, [inView, target, reduced]);

  if (target === null) return <span ref={ref}>{value}</span>;
  return (
    <span ref={ref}>
      {prefix}
      {reduced ? String(target) : shown}
      {suffix}
    </span>
  );
}
