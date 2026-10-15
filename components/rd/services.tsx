"use client";

import { useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { projects } from "@/data/projects";
import { EASE_OUT, RdLabel, RdLines, RdReveal } from "./primitives";

const services = [
  {
    number: "01",
    title: "Experiencias Digitales",
    tagline: "Landing pages y sitios de marca",
    deliverables: [
      "Landing pages",
      "Sitios corporativos",
      "Animaciones y detalles",
      "SEO técnico",
    ],
  },
  {
    number: "02",
    title: "E-Commerce",
    tagline: "Tiendas y catálogos",
    deliverables: [
      "Catálogo interactivo",
      "Checkout optimizado",
      "Panel de gestión",
      "Pagos online",
    ],
  },
  {
    number: "03",
    title: "Productos Digitales",
    tagline: "Plataformas y paneles a medida",
    deliverables: [
      "Plataformas a medida",
      "Paneles de control",
      "Usuarios y permisos",
      "Sistema de diseño",
    ],
  },
  {
    number: "04",
    title: "IA y Automatización",
    tagline: "Procesos que se hacen solos",
    deliverables: [
      "Asistentes con IA",
      "Integraciones entre sistemas",
      "Datos en tiempo real",
      "Tareas automáticas",
    ],
  },
];

/** Proyecto que se muestra flotando al pasar por cada servicio. */
const previewSlug: Record<string, string> = {
  "01": "pravilo",
  "02": "pone-la-pava",
  "03": "takefyy",
  "04": "apex-ai",
};

export function RdServices() {
  const reduced = useReducedMotion();
  const finePointer = useMediaQuery("(pointer: fine)");
  const [hover, setHover] = useState<string | null>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const left = useSpring(mx, { stiffness: 220, damping: 26 });
  const top = useSpring(my, { stiffness: 220, damping: 26 });
  const preview = hover
    ? projects.find((p) => p.slug === previewSlug[hover])
    : null;

  return (
    <section
      id="servicios"
      data-theme="paper"
      className="relative -mt-10 rounded-t-[2.5rem] bg-(--paper) py-24 text-(--ink) md:-mt-16 md:rounded-t-[4rem] md:py-36"
    >
      <div className="rd-wrap">
        <div className="grid gap-8 lg:grid-cols-12">
          <RdLabel index="03" className="text-(--ink)/60 lg:col-span-3">
            Servicios
          </RdLabel>
          <div className="lg:col-span-9">
            <RdLines
              lines={[
                "Todo lo que",
                <>
                  tu marca{" "}
                  <span className="rd-serif text-(--signal)">necesita</span>
                </>,
                "para vender",
              ]}
              className="rd-display text-[clamp(2.4rem,6.4vw,7.6rem)]"
            />
            <RdReveal className="mt-8 max-w-xl">
              <p className="rd-body text-lg leading-snug text-(--ink)/70 md:text-xl">
                Diseño, desarrollo e IA en el mismo equipo. Todo hecho desde
                cero, sin plantillas, y con el código a tu nombre.
              </p>
            </RdReveal>
          </div>
        </div>
        <ul
          className="mt-16 border-t border-(--line-ink) md:mt-24"
          onMouseMove={(e) => {
            mx.set(e.clientX);
            my.set(e.clientY);
          }}
          onMouseLeave={() => setHover(null)}
        >
          {services.map((s) => {
            const open = hover === s.number || !finePointer;
            return (
              <li
                key={s.number}
                onMouseEnter={() => setHover(s.number)}
                className="group relative overflow-hidden border-b border-(--line-ink)"
              >
                <span
                  aria-hidden
                  className="absolute inset-0 origin-bottom scale-y-0 bg-(--signal) transition-transform duration-700 ease-(--ease-io) group-hover:scale-y-100"
                />
                <div className="relative grid items-center gap-4 py-7 md:grid-cols-12 md:py-10">
                  <span className="rd-label text-(--ink)/50 md:col-span-1">
                    {s.number}
                  </span>
                  <h3 className="rd-display text-[clamp(1.5rem,7.8vw,1.9rem)] transition-transform md:text-[clamp(1.9rem,4.4vw,5rem)] duration-700 ease-(--ease-out) md:col-span-7 md:group-hover:translate-x-4">
                    {s.title}
                  </h3>
                  <div className="md:col-span-4">
                    <p className="rd-body text-base font-semibold md:text-lg">
                      {s.tagline}
                    </p>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.ul
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.5, ease: EASE_OUT }}
                          className="flex flex-wrap gap-1.5 overflow-hidden pt-3"
                        >
                          {s.deliverables.map((d) => (
                            <li
                              key={d}
                              className="rd-label rounded-full border border-(--ink)/25 px-2.5 py-1 text-[10px]"
                            >
                              {d}
                            </li>
                          ))}
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {finePointer && !reduced && (
        <AnimatePresence>
          {preview && (
            <motion.div
              key="preview"
              aria-hidden
              style={{ left, top }}
              className="pointer-events-none fixed z-[90] -translate-x-1/2 -translate-y-1/2"
              initial={{ clipPath: "circle(0% at 50% 50%)", rotate: -8 }}
              animate={{ clipPath: "circle(75% at 50% 50%)", rotate: -4 }}
              exit={{ clipPath: "circle(0% at 50% 50%)", rotate: 0 }}
              transition={{ duration: 0.6, ease: EASE_OUT }}
            >
              <div className="relative h-56 w-80 overflow-hidden rounded-2xl shadow-2xl">
                <AnimatePresence initial={false}>
                  <motion.div
                    key={preview.slug}
                    className="absolute inset-0"
                    initial={{ y: "100%" }}
                    animate={{ y: "0%" }}
                    exit={{ y: "-100%" }}
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                  >
                    <Image
                      src={preview.image}
                      alt=""
                      fill
                      sizes="320px"
                      className="object-cover object-top"
                    />
                    <span className="rd-label absolute bottom-3 left-3 rounded-full bg-(--ink) px-2.5 py-1 text-[10px] text-(--paper)">
                      {preview.name}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
