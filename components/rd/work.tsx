"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  motion,
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
// desktop; columna de tarjetas en mobile / reduced motion.

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
      <div
        className={
          pinned
            ? "sticky top-0 flex h-screen flex-col justify-center overflow-hidden"
            : "py-24"
        }
      >
        {pinned && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
            style={{
              background: `radial-gradient(60% 55% at 60% 55%, ${accent}2e, transparent 70%)`,
            }}
          />
        )}
        <motion.div
          ref={trackRef}
          style={pinned ? { x } : undefined}
          className={
            pinned
              ? "relative flex w-max items-stretch gap-6 pr-[8vw] pl-(--gutter)"
              : "rd-wrap relative flex flex-col gap-6"
          }
        >
          <Header pinned={pinned} />
          {sorted.map((p, i) => (
            <Card key={p.slug} project={p} index={i} pinned={pinned} />
          ))}
          <EndCard pinned={pinned} />
        </motion.div>
        {pinned && (
          <div className="rd-wrap absolute inset-x-0 bottom-6 flex items-center gap-6">
            <span className="rd-label tabular-nums text-(--paper)/70">
              {String(active + 1).padStart(2, "0")} /{" "}
              {String(sorted.length).padStart(2, "0")}
            </span>
            <div className="h-px flex-1 bg-(--line)">
              <motion.div
                className="h-px origin-left bg-(--signal)"
                style={{ scaleX }}
              />
            </div>
            <span className="rd-label text-(--paper)/70">
              {sorted[active]?.name}
            </span>
          </div>
        )}
      </div>
    </section>
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
        pinned ? "h-[72vh] w-[34vw]" : "min-h-[60vh]"
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
        pinned ? "h-[72vh] w-[min(52vw,940px)]" : "w-full"
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
            className="flex justify-center px-6 pt-14 pb-7 md:hidden"
            style={{
              background: `linear-gradient(160deg, ${accent}40, transparent 65%)`,
            }}
          >
            <div className="relative aspect-[390/844] w-[58%] overflow-hidden rounded-[1.6rem] border-[5px] border-(--ink) shadow-2xl ring-1 ring-(--line)">
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
