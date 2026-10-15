"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

// Piezas compartidas del rediseño de la landing (components/rd). Port de los
// helpers del prototipo: botón con rodillo, etiqueta numerada, titular que sube
// por líneas y reveal genérico.

export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IO = [0.76, 0, 0.24, 1] as const;
/** Escalonado entre líneas de un titular, en segundos. */
export const STAGGER = 0.08;

/** Texto que rueda hacia arriba y se reemplaza por una copia al hover/focus. */
export function RdRoll({ children }: { children: ReactNode }) {
  return (
    <span className="rd-roll">
      <span>{children}</span>
      <span aria-hidden>{children}</span>
    </span>
  );
}

export function RdButton({
  href,
  children,
  variant = "signal",
  external = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: "signal" | "ink" | "ghost";
  external?: boolean;
  className?: string;
}) {
  const classes = `rd-btn ${variant === "ink" ? "rd-btn--ink" : ""} ${
    variant === "ghost" ? "rd-btn--ghost" : ""
  } ${className}`;
  const inner = (
    <>
      <RdRoll>{children}</RdRoll>
      {variant !== "ghost" && (
        <span className="rd-btn__icon" aria-hidden>
          <ArrowUpRight size={18} strokeWidth={2.25} />
        </span>
      )}
    </>
  );
  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={classes}>
      {inner}
    </Link>
  );
}

/** Etiqueta de sección: ( 02 — Trabajos ). */
export function RdLabel({
  index,
  children,
  className = "",
}: {
  index: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`rd-label flex items-center gap-2 ${className}`}>
      <span aria-hidden>(</span>
      <span>{index}</span>
      <span
        aria-hidden
        className="inline-block h-px w-6 bg-current opacity-50"
      />
      <span>{children}</span>
      <span aria-hidden>)</span>
    </p>
  );
}

/** Titular que sube línea por línea detrás de una máscara al entrar en pantalla. */
export function RdLines({
  lines,
  as: Tag = "h2",
  className = "",
  lineClassName = "",
  delay = 0,
  play,
}: {
  lines: ReactNode[];
  as?: ElementType;
  className?: string;
  lineClassName?: string;
  delay?: number;
  /** Fuerza el estado (p. ej. esperar al preloader). Sin esto usa el viewport. */
  play?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const on = play ?? inView;
  return (
    <Tag ref={ref} className={className}>
      {lines.map((line, i) => (
        <span key={i} className={`rd-mask ${lineClassName}`}>
          <motion.span
            className="block origin-bottom-left"
            initial={{ y: "110%", rotate: 3 }}
            animate={on ? { y: "0%", rotate: 0 } : { y: "110%", rotate: 3 }}
            transition={{
              duration: 1.1,
              ease: EASE_OUT,
              delay: delay + i * STAGGER,
            }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Fade + subida al entrar en pantalla. */
export function RdReveal({
  children,
  className = "",
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.9, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Estrella de cuatro puntas del estudio. */
export function Sparkle({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 0c.6 5.2 1.6 8 3.3 9.1 1.4.9 4.2 1.4 8.7 2.9-4.5 1.5-7.3 2-8.7 2.9C13.6 16 12.6 18.8 12 24c-.6-5.2-1.6-8-3.3-9.1C7.3 14 4.5 13.5 0 12c4.5-1.5 7.3-2 8.7-2.9C10.4 8 11.4 5.2 12 0Z" />
    </svg>
  );
}
