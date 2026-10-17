"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import {
  m,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MD, useMediaQuery } from "@/lib/use-media-query";
import { projects } from "@/data/projects";
import { brandFonts } from "@/lib/brand-fonts";
import type { Project } from "@/types";
import { RdButton, RdLines } from "./primitives";

// Trabajos: carril horizontal que avanza con el scroll vertical (sticky) en
// desktop; en celular, tablet o sin movimiento, un carrusel que se desliza con
// el dedo (la sección queda del alto de una tarjeta, no de ocho).

const sorted = [...projects].sort((a, b) => a.order - b.order);

export function RdWork() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const pinned = useMediaQuery("(min-width: 1024px)") && !reduced;
  const [overflow, setOverflow] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !pinned) return;
    const measure = () =>
      setOverflow(Math.max(0, track.scrollWidth - window.innerWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pinned]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const spring = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });
  const x = useTransform(spring, [0, 1], [0, -overflow]);
  const scaleX = useTransform(spring, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    if (!pinned) return;
    const idx = Math.round(Math.max(0, v * 1.12 - 0.06) * (sorted.length - 1));
    setActive(Math.min(sorted.length - 1, idx));
  });

  const accent = sorted[active]?.brand?.accent ?? "#ff4d2e";

  return (
    <section
      id="trabajos"
      ref={sectionRef}
      data-theme="ink"
      className="relative bg-(--ink)"
      style={pinned ? { height: `calc(${overflow}px + 100svh)` } : undefined}
    >
      {!pinned && <Rail />}
      {pinned && (
        <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
            style={{
              background: `radial-gradient(60% 55% at 60% 55%, ${accent}2e, transparent 70%)`,
            }}
          />
          <m.div
            ref={trackRef}
            style={{ x }}
            className="relative flex w-max items-stretch gap-6 pr-[8vw] pl-(--gutter)"
          >
            <Header pinned />
            {sorted.map((p, i) => (
              <Card key={p.slug} project={p} index={i} pinned />
            ))}
            <EndCard pinned />
          </m.div>
          <div className="rd-wrap absolute inset-x-0 bottom-6 flex items-center gap-6">
            <span className="rd-label tabular-nums text-(--paper)/70">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(sorted.length).padStart(2, "0")}
            </span>
            <div className="h-px flex-1 bg-(--line)">
              <m.div
                className="h-px origin-left bg-(--signal)"
                style={{ scaleX }}
              />
            </div>
            <span className="rd-label text-(--paper)/70">
              {sorted[active]?.name}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

/** Ancho de cada tarjeta del carrusel: se asoma la siguiente para que se entienda que sigue. */
const SLIDE = "w-[84vw] shrink-0 snap-start sm:w-[62vw] lg:w-[44vw]";

/**
 * Celular, tablet y sin movimiento: las tarjetas en fila, con scroll horizontal
 * nativo y encastre en cada una. Abajo, en qué tarjeta vas, una barra y flechas
 * (para mouse y teclado; con el dedo se desliza).
 */
function Rail() {
  const railRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [moved, setMoved] = useState(false);
  const count = sorted.length + 1;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      const k = max > 0 ? rail.scrollLeft / max : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.max(1 / count, k)})`;
      setActive(Math.round(k * (count - 1)));
      if (rail.scrollLeft > 8) setMoved(true);
    };
    onScroll();
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => rail.removeEventListener("scroll", onScroll);
  }, [count]);

  /** Una tarjeta para un lado o para el otro. */
  const go = (dir: 1 | -1) => {
    const rail = railRef.current;
    const first = rail?.firstElementChild as HTMLElement | null;
    if (!rail || !first) return;
    const gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
    rail.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: reduced ? "auto" : "smooth" });
  };

  const current = sorted[active];
  return (
    <div className="py-24">
      <div className="rd-wrap">
        <Header pinned={false} />
      </div>
      <div
        ref={railRef}
        role="region"
        aria-label="Trabajos: deslizá para ver los demás"
        tabIndex={0}
        className="flex snap-x snap-mandatory scroll-px-(--gutter) gap-4 overflow-x-auto overscroll-x-contain px-(--gutter) [scrollbar-width:none] focus-visible:outline-offset-[-2px] [&::-webkit-scrollbar]:hidden"
      >
        {sorted.map((p, i) => (
          <Card key={p.slug} project={p} index={i} pinned={false} />
        ))}
        <EndCard pinned={false} />
      </div>
      <div className="rd-wrap mt-6 flex items-center gap-4">
        <span className="rd-label shrink-0 tabular-nums text-(--paper)/70">
          {String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <div className="h-px flex-1 bg-(--line)">
          <div
            ref={barRef}
            className="h-px origin-left bg-(--signal) transition-transform duration-150"
            style={{ transform: `scaleX(${1 / count})` }}
          />
        </div>
        <span className="rd-label hidden max-w-[40%] truncate text-(--paper)/70 sm:block">
          {current ? current.name : "¿Y el tuyo?"}
        </span>
        {!moved && (
          <span className="rd-label shrink-0 text-(--paper)/60 sm:hidden" aria-hidden>
            Deslizá →
          </span>
        )}
        <div className="flex shrink-0 gap-2 max-sm:hidden">
          {([[-1, "Anterior", ArrowLeft], [1, "Siguiente", ArrowRight]] as const).map(([dir, label, Icon]) => (
            <button
              key={label}
              type="button"
              aria-label={`Trabajo ${label.toLowerCase()}`}
              onClick={() => go(dir)}
              disabled={dir === -1 ? active === 0 : active === count - 1}
              className="grid h-11 w-11 place-items-center rounded-full border border-(--line) text-(--paper) transition-colors duration-300 hover:border-(--paper) hover:bg-(--paper) hover:text-(--ink) disabled:pointer-events-none disabled:opacity-30"
            >
              <Icon size={18} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header({ pinned }: { pinned: boolean }) {
  return (
    <div
      className={`flex shrink-0 flex-col justify-between gap-10 ${
        pinned ? "h-[72vh] w-[38vw] pr-[4vw]" : "pb-6"
      }`}
    >
      <p className="rd-label text-(--paper)/60">
        ( 02 — Trabajos seleccionados )
      </p>
      <div>
        <RdLines
          lines={[
            "Trabajos",
            <>
              que ya <span className="rd-serif text-(--signal)">venden</span>
            </>,
          ]}
          className="rd-display text-[clamp(2.6rem,6.2vw,7.5rem)]"
        />
        <p className="rd-body mt-6 max-w-sm text-lg leading-snug text-(--paper)/75">
          {sorted.length} productos en producción, usados todos los días por
          clientes reales. Diseñados y programados por nosotros dos.
        </p>
      </div>
      {pinned && (
        <p className="rd-label flex items-center gap-3 text-(--paper)/60">
          Seguí bajando
          <span aria-hidden className="inline-block h-px w-16 bg-current" />→
        </p>
      )}
    </div>
  );
}

function EndCard({ pinned }: { pinned: boolean }) {
  return (
    <div
      className={`flex shrink-0 flex-col justify-center gap-8 rounded-[2rem] bg-(--signal) p-8 text-(--ink) md:p-12 ${
        pinned ? "h-[72vh] w-[34vw]" : SLIDE
      }`}
    >
      <p className="rd-label">( ¿Y el tuyo? )</p>
      <p className="rd-display text-[clamp(2.4rem,4.6vw,5.5rem)]">
        El próximo
        <br />
        <span className="rd-serif">puede ser</span>
        <br />
        el tuyo.
      </p>
      <div>
        <RdButton href="#contacto" variant="ink">
          Contanos tu idea
        </RdButton>
      </div>
    </div>
  );
}

/** Qué hicimos en cada proyecto, para la tarjeta de celular. */
const PITCH: Record<string, string> = {
  "pone-la-pava": "Tienda online con catálogo y stock en tiempo real, construida alrededor de su identidad.",
  muzzaga: "Reservas de cancha online por día, cancha y horario; el turno se confirma por WhatsApp.",
  "iphone-vita": "Tienda con buscador de iPhone, Plan Canje y un catálogo que administra su propio equipo.",
  pravilo: "El sitio del primer centro Pravilo de Argentina, en Plottier, Neuquén.",
  "altum-sci": "Su canal principal de consultas para compradores e inversores en la Patagonia.",
  "apex-ai": "Panel del coach y app del atleta: la IA arma cada rutina dentro del plan del coach.",
  takefyy: "Carta digital y pedidos sin comisiones de marketplaces, en uso por restaurantes reales.",
  sentinel: "Mapa interactivo con datos satelitales en vivo (NASA FIRMS) e índice de riesgo de incendio.",
};
const OWNER: Record<string, string> = {
  takefyy: "Startup de Franco",
  sentinel: "Startup de Franco",
  "apex-ai": "Producto de Federico",
};

function Card({
  project,
  index,
  pinned,
}: {
  project: Project;
  index: number;
  pinned: boolean;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const wide = useMediaQuery(MD);
  const phoneShot = !pinned ? project.screens?.mobile : undefined;
  const brand = project.brand;
  const accent = brand?.accent ?? "#ff4d2e";

  // El video sólo corre mientras la tarjeta está a la vista.
  useEffect(() => {
    const link = linkRef.current;
    const video = videoRef.current;
    if (!link || !video || reduced) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(link);
    return () => io.disconnect();
  }, [reduced]);

  const tagline = brand?.tagline ?? project.shortDescription;
  const highlight = brand?.highlight;
  const at = highlight ? tagline.indexOf(highlight) : -1;
  const [before, after] =
    highlight && at >= 0
      ? [tagline.slice(0, at), tagline.slice(at + highlight.length)]
      : [tagline, ""];

  return (
    <Link
      ref={linkRef}
      href={`/work/${project.slug}`}
      data-cursor="Ver caso"
      className={`group relative flex shrink-0 flex-col overflow-hidden rounded-[2rem] border border-(--line) bg-(--ink-2) ${
        pinned ? "h-[72vh] w-[min(52vw,940px)]" : SLIDE
      }`}
    >
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 md:px-8">
        <span className="rd-label text-(--paper)/60">
          {String(index + 1).padStart(2, "0")} — {project.category}
        </span>
        <span className="rd-label text-(--paper)/60">{project.year}</span>
      </div>
      <div
        className={`relative mx-3 overflow-hidden rounded-[1.4rem] bg-(--ink-3) ${
          pinned
            ? "flex-1"
            : phoneShot
              ? "md:aspect-[16/10]"
              : "aspect-[4/3] md:aspect-[16/10]"
        }`}
      >
        {phoneShot && (
          <div
            className="flex justify-center px-6 pt-10 pb-6 md:hidden"
            style={{
              background: `linear-gradient(160deg, ${accent}40, transparent 65%)`,
            }}
          >
            <div className="relative aspect-[390/844] w-[46%] overflow-hidden rounded-[1.6rem] border-[5px] border-(--ink) shadow-2xl ring-1 ring-(--line)">
              <Image
                src={phoneShot}
                alt={`${project.name} en celular`}
                fill
                sizes="240px"
                className="object-cover object-top"
              />
            </div>
          </div>
        )}
        <Image
          src={project.image}
          alt={`${project.name}: ${project.shortDescription}`}
          fill
          sizes="(min-width: 1024px) 58vw, 100vw"
          className={`object-cover object-top transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.04] ${phoneShot ? "max-md:hidden" : ""}`}
        />
        {project.video && !reduced && wide && (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.04]"
            muted
            loop
            playsInline
            preload="none"
          >
            <source src={project.video.webm} type="video/webm" />
            <source src={project.video.mp4} type="video/mp4" />
          </video>
        )}
        {project.impactMetric && (
          <span
            className="rd-label absolute top-4 left-4 rounded-full px-3 py-1.5 text-[10px] font-bold text-(--ink)"
            style={{ background: accent }}
          >
            {project.impactMetric}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-6 px-6 pt-5 pb-6 md:px-8 md:pb-7">
        <div className="min-w-0">
          <h3
            className={`${brand ? brandFonts[brand.font] : ""} text-[clamp(2rem,3.6vw,3.6rem)] leading-[0.95]`}
            style={{
              fontWeight: brand?.weight,
              fontStyle: brand?.italic ? "italic" : undefined,
              textTransform: brand?.uppercase ? "uppercase" : undefined,
              letterSpacing:
                brand?.tracking !== undefined
                  ? `${brand.tracking}em`
                  : undefined,
            }}
          >
            {project.name}
          </h3>
          <p className="rd-body mt-2 text-sm text-(--paper)/70 md:truncate md:text-base">
            {before}
            {highlight && <span style={{ color: accent }}>{highlight}</span>}
            {after}
          </p>
        </div>
        <span
          aria-hidden
          className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-(--line) text-(--paper) transition-all duration-500 ease-(--ease-out) group-hover:rotate-[-45deg] group-hover:border-transparent group-hover:text-(--ink)"
        >
          <span
            className="absolute h-14 w-14 scale-0 rounded-full transition-transform duration-500 ease-(--ease-out) group-hover:scale-100"
            style={{ background: accent }}
          />
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="relative"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      {!pinned && (
        <div className="px-6 pb-6 md:hidden">
          <p className="rd-label text-(--paper)/50">
            Qué hicimos
            {OWNER[project.slug] && (
              <span style={{ color: accent }}> · {OWNER[project.slug]}</span>
            )}
          </p>
          <p className="rd-body mt-2 text-sm leading-snug text-(--paper)/75">
            {PITCH[project.slug] ?? project.shortDescription}
          </p>
          {project.technology && (
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {project.technology.slice(0, 4).map((t) => (
                <li
                  key={t}
                  className="rd-label rounded-full border border-(--line) px-2.5 py-1 text-[10px] text-(--paper)/70"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Link>
  );
}
