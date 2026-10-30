"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/container";
import { ButtonLink } from "@/components/ui/button-link";
import { Magnetic } from "@/components/ui/magnetic";
import { ScrambleText } from "@/components/ui/scramble-text";
import { HeroMesh } from "@/components/ui/hero-mesh";
import { DeliveryCard } from "@/components/sections/hero/delivery-card";
import { BrandMarquee } from "@/components/sections/hero/brand-marquee";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE } from "@/lib/motion";
import { projects } from "@/data/projects";
import type { Project } from "@/types";

const SEQUENCE = {
  kicker: "0.05s",
  line1: "0.35s",
  line2: "0.55s",
  sub: "1.05s",
  cta: "1.2s",
  console: "1.15s",
  ticker: "1.4s",
};

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: rootRef,
    offset: ["start start", "end start"],
  });
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const clientBrands = [...projects].sort((a, b) => a.order - b.order);

  // Preview circular que sigue al cursor al pasar por la marquesina: el
  // clip-path arranca en un punto y se abre a un rectángulo redondeado,
  // versión con framer-motion (sin GSAP) de un reveal circular por scroll.
  const [hovered, setHovered] = useState<Project | null>(null);
  const previewX = useMotionValue(0);
  const previewY = useMotionValue(0);
  const springX = useSpring(previewX, { damping: 25, stiffness: 300 });
  const springY = useSpring(previewY, { damping: 25, stiffness: 300 });

  function handleMarqueeMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    previewX.set(e.clientX);
    previewY.set(e.clientY);
  }

  // Resplandor ambiente que sigue al cursor dentro del hero: mismo patrón
  // que el spotlight de las tarjetas de proyecto (motion values, sin
  // useState), un solo tono de acento, cero dependencias nuevas.
  const glowX = useMotionValue(0);
  const glowY = useMotionValue(0);
  const glowBackground = useMotionTemplate`radial-gradient(480px circle at ${glowX}px ${glowY}px, var(--accent-soft), transparent 70%)`;

  function handleHeroMouseMove(e: React.MouseEvent<HTMLElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    glowX.set(e.clientX - rect.left);
    glowY.set(e.clientY - rect.top);
  }

  return (
    <section
      id="hero"
      ref={rootRef}
      onMouseMove={reduceMotion ? undefined : handleHeroMouseMove}
      className="relative flex min-h-[100dvh] flex-col justify-center overflow-hidden pt-20 pb-12 md:pt-24 md:pb-16"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      <motion.div
        aria-hidden
        style={reduceMotion ? undefined : { y: gridY }}
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:64px_64px] opacity-40"
      />
      <HeroMesh />
      {!reduceMotion && (
        <motion.div
          aria-hidden
          style={{ background: glowBackground }}
          className="pointer-events-none absolute inset-0 opacity-60"
        />
      )}
      {/* Borde de abajo: la grilla y el resplandor se funden con blur en el
          fondo de la página, sin línea de corte contra la sección siguiente. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent via-background/70 to-background"
      />

      <Container className="relative">
        <div
          className="hero-rise mb-8 flex flex-wrap items-center gap-3"
          style={{ animationDelay: SEQUENCE.kicker }}
        >
          <div className="inline-flex items-center gap-2.5 rounded-full border border-border bg-surface/90 px-3.5 py-1.5 font-mono text-xs text-muted">
            <span className="relative flex h-2 w-2">
              {!reduceMotion && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-foreground font-medium">Estudio Abierto</span>
            <span className="text-border">·</span>
            <span>Patagonia AR</span>
          </div>
        </div>

        <h1 className="display max-w-5xl text-[2.6rem] text-foreground sm:text-5xl md:text-[3.5rem] lg:text-7xl xl:text-[5.5rem]">
          <span className="line-mask block">
            <span
              className="hero-line block"
              style={{ animationDelay: SEQUENCE.line1 }}
            >
              Construimos sitios y apps
            </span>
          </span>
          <span className="line-mask block">
            <span
              className="hero-line block"
              style={{ animationDelay: SEQUENCE.line2 }}
            >
              para marcas que{" "}
              <span className="text-accent">
                {reduceMotion ? (
                  "crecen."
                ) : (
                  <ScrambleText text="crecen." speed={22} />
                )}
              </span>
            </span>
          </span>
        </h1>

        <div className="mt-8 grid grid-cols-1 items-center gap-10 md:mt-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <p
              className="hero-rise max-w-md text-lg leading-relaxed text-muted md:text-xl"
              style={{ animationDelay: SEQUENCE.sub }}
            >
              Diseñamos y construimos tu web o app de punta a punta, lista y
              funcionando en 2 a 3 semanas.
            </p>

            <div
              className="hero-rise mt-8 flex flex-wrap items-center gap-3"
              style={{ animationDelay: SEQUENCE.cta }}
            >
              <Magnetic>
                <ButtonLink href="/#contacto">
                  Iniciar un proyecto
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </ButtonLink>
              </Magnetic>
              <Magnetic>
                <ButtonLink href="/pricing" variant="secondary">
                  Ver Precios & Alcance
                  <ArrowUpRight
                    size={16}
                    className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </ButtonLink>
              </Magnetic>
            </div>
          </div>

          <div
            className="hero-rise lg:col-span-6 xl:col-span-5 xl:col-start-8"
            style={{ animationDelay: SEQUENCE.console }}
          >
            <DeliveryCard />
          </div>
        </div>
      </Container>

      {/* Marquee de Clientes y Productos */}
      <div
        className="hero-rise relative mt-14 md:mt-16"
        style={{ animationDelay: SEQUENCE.ticker }}
        onMouseMove={reduceMotion ? undefined : handleMarqueeMouseMove}
        onMouseLeave={reduceMotion ? undefined : () => setHovered(null)}
      >
        <BrandMarquee
          projects={clientBrands}
          onHover={reduceMotion ? undefined : setHovered}
        />
      </div>

      {/* Preview flotante: se abre en círculo desde el cursor al pasar sobre
          una marca de la marquesina, con un clip de ese proyecto adentro. */}
      {!reduceMotion && (
        <AnimatePresence>
          {hovered && (
            <motion.div
              aria-hidden
              style={{ left: springX, top: springY }}
              className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2"
              initial={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
              animate={{ clipPath: "circle(75% at 50% 50%)", opacity: 1 }}
              exit={{ clipPath: "circle(0% at 50% 50%)", opacity: 0 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <div className="relative h-40 w-64 overflow-hidden rounded-2xl border border-border shadow-2xl">
                {hovered.video ? (
                  <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="h-full w-full object-cover"
                  >
                    <source src={hovered.video.webm} type="video/webm" />
                    <source src={hovered.video.mp4} type="video/mp4" />
                  </video>
                ) : (
                  <Image
                    src={hovered.image}
                    alt={hovered.name}
                    fill
                    sizes="256px"
                    className="object-cover"
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </section>
  );
}
