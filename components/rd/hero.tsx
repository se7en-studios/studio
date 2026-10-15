"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MD, useMediaQuery } from "@/lib/use-media-query";
import { projects } from "@/data/projects";
import { useIntroReady } from "@/components/rd/intro";
import { RdHeroRing } from "@/components/rd/hero-ring";
import {
  EASE_OUT,
  STAGGER,
  RdButton,
  Sparkle,
} from "@/components/rd/primitives";

// Cada verbo del titular se apoya en un proyecto real: el clip, la pastilla de
// abajo y el verbo cambian juntos, así que lo que decimos tiene su prueba.
const PROOFS = [
  { verb: "venden.", slug: "pone-la-pava", what: "Como Poné La Pava: tienda online con stock en tiempo real" },
  { verb: "dan turnos.", slug: "muzzaga", what: "Como Muzzaga Pádel: reservas de cancha online" },
  { verb: "toman pedidos.", slug: "takefyy", what: "Como Takefyy, la startup de Franco: pedidos sin comisiones de marketplaces" },
] as const;
const PROOF_INTERVAL = 3200;

const sorted = [...projects].sort((a, b) => a.order - b.order);
const proofProject = (slug: string) => sorted.find((p) => p.slug === slug);

const FACTS = [
  `${projects.length} proyectos en producción`,
  "Respuesta en 24 h",
  "Código 100% tuyo",
  "Presupuesto a medida",
];

export function RdHero() {
  const ready = useIntroReady();
  const reduced = useReducedMotion();
  const [proofIndex, setProofIndex] = useState(0);
  useEffect(() => {
    if (!ready || reduced) return;
    const id = window.setInterval(
      () => setProofIndex((n) => (n + 1) % PROOFS.length),
      PROOF_INTERVAL,
    );
    return () => window.clearInterval(id);
  }, [ready, reduced]);
  const proof = PROOFS[proofIndex];
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const line1X = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const line2X = useTransform(scrollYProgress, [0, 1], ["0%", "10%"]);
  const ringScale = useTransform(scrollYProgress, [0, 1], [1, 1.35]);
  const ringY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0.25]);

  return (
    <section
      ref={ref}
      data-theme="ink"
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-(--ink) pt-24 md:pt-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-[8%] right-[-25%] h-[90vw] w-[90vw] rounded-full bg-[radial-gradient(closest-side,rgba(255,77,46,0.28),transparent)] md:top-[-10%] md:right-[-12%] md:h-[70vw] md:w-[70vw]"
      />
      <motion.div
        aria-hidden
        style={reduced ? undefined : { scale: ringScale, y: ringY }}
        className="pointer-events-none absolute top-[3%] right-[-42%] w-[104vw] md:top-[6%] md:right-[-16%] md:w-[68vw] lg:top-[2%] lg:right-[-8%] lg:w-[52vw]"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
          animate={ready ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
          transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.1 }}
        >
          <RdHeroRing className="h-auto w-full" />
        </motion.div>
      </motion.div>

      <motion.div
        style={reduced ? undefined : { opacity: fade }}
        className="rd-wrap relative flex flex-1 flex-col"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1 } : undefined}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="rd-label flex items-center justify-between gap-4 text-(--paper)/70"
        >
          <span>( Estudio de producto digital )</span>
          <span className="hidden sm:inline">Est. 2025 — Patagonia, AR</span>
        </motion.div>

        <div className="flex flex-1 flex-col justify-center py-8 md:py-10">
          <h1 className="rd-display relative text-[clamp(2.5rem,min(13.4vw,21svh),11.8rem)] whitespace-nowrap md:text-[clamp(2.5rem,min(11vw,21svh),11.8rem)]">
            <span className="sr-only">Hacemos webs que venden.</span>
            <motion.span
              aria-hidden
              style={reduced ? undefined : { x: line1X }}
              className="rd-mask"
            >
              <HeroLine ready={ready} index={0}>
                Hacemos
              </HeroLine>
            </motion.span>
            <motion.span
              aria-hidden
              style={reduced ? undefined : { x: line2X }}
              className="rd-mask text-right"
            >
              <HeroLine ready={ready} index={1}>
                <span className="inline-flex items-center justify-end gap-[0.12em]">
                  <HeroClip slug={proof.slug} play={ready && !reduced} />
                  <span>Webs que</span>
                </span>
              </HeroLine>
            </motion.span>
            <span aria-hidden className="rd-mask">
              <HeroLine ready={ready} index={2}>
                <HeroWord word={proof.verb} />
              </HeroLine>
            </span>
            <HeroSticker ready={ready} />
          </h1>

          <div className="mt-8 grid grid-cols-1 gap-8 md:mt-6 lg:-mt-[min(8.6vw,16svh)] lg:grid-cols-12">
            <motion.div
              // Sin opacity 0: el párrafo es el LCP y tiene que pintar con el HTML, no esperar al
              // preloader ni al JS. Sólo se desliza (queda tapado por el telón mientras tanto).
              initial={{ y: 24 }}
              animate={ready ? { y: 0 } : undefined}
              transition={{ duration: 1, ease: EASE_OUT, delay: 0.75 }}
              className="lg:col-span-5 lg:col-start-8"
            >
              <ProofPill slug={proof.slug} what={proof.what} />
              <p className="rd-body max-w-[30rem] text-lg leading-snug text-(--paper)/80 md:text-xl">
                Webs, tiendas y apps a medida,{" "}
                <span className="text-(--paper)">
                  de la idea a producción en 2 a 3 semanas.
                </span>{" "}
                Hablás directo con los dos fundadores que las diseñan y
                programan.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <RdButton href="#contacto">Empezá tu proyecto</RdButton>
                <RdButton href="#trabajos" variant="ghost">
                  Ver trabajos
                </RdButton>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : undefined}
        transition={{ duration: 1, delay: 1 }}
        className="relative border-t border-(--line)"
      >
        <div className="rd-wrap flex items-center justify-between gap-6 py-4">
          <ul className="rd-label flex flex-wrap items-center gap-x-6 gap-y-2 text-(--paper)/75">
            {FACTS.map((fact, i) => (
              <li
                key={fact}
                className={`flex items-center gap-2 ${i > 1 ? "hidden md:flex" : ""}`}
              >
                <Sparkle className="h-3 w-3 text-(--signal)" />
                {fact}
              </li>
            ))}
          </ul>
          <a
            href="#trabajos"
            className="rd-label hidden shrink-0 items-center gap-2 text-(--paper)/75 transition-colors hover:text-(--paper) sm:flex"
          >
            Scroll
            <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-full border border-(--line)">
              <motion.span
                animate={reduced ? undefined : { y: ["-120%", "0%", "120%"] }}
                transition={{
                  duration: 1.8,
                  repeat: Infinity,
                  ease: EASE_OUT,
                  times: [0, 0.45, 1],
                }}
              >
                <ArrowDown size={14} />
              </motion.span>
            </span>
          </a>
        </div>
      </motion.div>
    </section>
  );
}

/** Línea del titular que sube desde la máscara, escalonada por índice. */
function HeroLine({
  ready,
  index,
  children,
}: {
  ready: boolean;
  index: number;
  children: ReactNode;
}) {
  return (
    <motion.span
      className="block origin-bottom-left"
      initial={{ y: "115%", rotate: 4 }}
      animate={ready ? { y: "0%", rotate: 0 } : undefined}
      transition={{
        duration: 1.2,
        ease: EASE_OUT,
        delay: 0.15 + index * STAGGER * 1.4,
      }}
    >
      {children}
    </motion.span>
  );
}

/** Palabra final que rota (venden / enamoran / escalan / facturan). */
function HeroWord({ word }: { word: string }) {
  return (
    <span className="relative -mt-[0.22em] inline-block overflow-hidden pt-[0.22em] pr-[0.1em] align-bottom">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={word}
          className="rd-serif inline-block text-(--signal)"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Prueba del verbo del titular, sólo en celular (donde el clip del titular no entra). */
function ProofPill({ slug, what }: { slug: string; what: string }) {
  const project = proofProject(slug);
  if (!project) return null;
  return (
    <Link
      href={`/work/${slug}`}
      className="mb-6 flex items-center gap-3 rounded-full border border-(--line) bg-(--ink-2)/70 p-1.5 pr-4 md:hidden"
    >
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-(--ink-3)">
        <Image
          src={project.image}
          alt=""
          fill
          sizes="48px"
          className="object-cover object-top"
        />
      </span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={slug}
          className="rd-body min-w-0 flex-1 text-sm leading-snug text-(--paper)/90"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {what}
        </motion.span>
      </AnimatePresence>
      <ArrowUpRight size={16} aria-hidden className="shrink-0 text-(--signal)" />
    </Link>
  );
}

/** Píldora de video entre "Webs" y "que" que alterna entre proyectos. */
function HeroClip({ slug, play }: { slug: string; play: boolean }) {
  const wide = useMediaQuery(MD);
  const clip = proofProject(slug);
  // La pastilla sólo se ve desde md: en celular ni se pide el video.
  if (!wide || !clip?.video) return null;
  return (
    <span className="relative hidden h-[0.66em] w-[1.25em] shrink-0 overflow-hidden rounded-full bg-(--ink-3) align-middle ring-1 ring-(--line) md:inline-block">
      <AnimatePresence initial={false}>
        <motion.video
          key={clip.slug}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay={play}
          muted
          loop
          playsInline
          preload="metadata"
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        >
          <source src={clip.video.webm} type="video/webm" />
          <source src={clip.video.mp4} type="video/mp4" />
        </motion.video>
      </AnimatePresence>
    </span>
  );
}

/** Sello circular giratorio con texto en trazado. */
function HeroSticker({ ready }: { ready: boolean }) {
  return (
    <motion.span
      aria-hidden
      initial={{ scale: 0, rotate: -90 }}
      animate={ready ? { scale: 1, rotate: 0 } : undefined}
      transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.7 }}
      className="absolute right-0 bottom-[calc(100%+0.75rem)] grid h-[clamp(92px,10vw,164px)] w-[clamp(92px,10vw,164px)] place-items-center rounded-full bg-(--paper) text-(--ink) shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] md:top-[-4%] md:right-[5%] md:bottom-auto"
    >
      <svg
        viewBox="0 0 200 200"
        className="rd-spin absolute inset-0 h-full w-full"
      >
        <defs>
          <path
            id="rd-sticker-path"
            d="M100,100 m-74,0 a74,74 0 1,1 148,0 a74,74 0 1,1 -148,0"
          />
        </defs>
        <text
          className="rd-label"
          style={{ fontSize: 15.5, letterSpacing: "0.16em", fontWeight: 700 }}
          fill="currentColor"
        >
          <textPath href="#rd-sticker-path">
            De idea a producción ✦ en 2–3 semanas ✦{" "}
          </textPath>
        </text>
      </svg>
      <span className="rd-display text-[0.28em] text-(--signal)">7</span>
    </motion.span>
  );
}
