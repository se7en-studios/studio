"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { ProjectCard } from "@/components/work/project-card";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { brandFonts } from "@/lib/brand-fonts";
import type { Project } from "@/types";

// Carril horizontal de proyectos: la sección es alta y su interior queda fijo
// (sticky) mientras el scroll vertical desplaza las tarjetas de costado. Cada
// tarjeta reproduce su clip sólo cuando está a la vista. En pantallas chicas o
// con "menos movimiento" cae a la grilla de ProjectCard.

const DESKTOP = "(min-width: 1024px)";
const ACCENT = "#ff4d2e";

function Grid({ projects }: { projects: Project[] }) {
  return (
    <div className="mx-auto mt-12 grid w-full max-w-[1400px] grid-cols-1 gap-x-8 gap-y-14 px-6 md:grid-cols-2 md:px-10">
      {projects.map((project, i) => (
        <ProjectCard
          key={project.slug}
          project={project}
          priority={i === 0}
          index={i % 2}
        />
      ))}
    </div>
  );
}

export function ProjectRail({ projects }: { projects: Project[] }) {
  const reduceMotion = useReducedMotion();
  const isDesktop = useMediaQuery(DESKTOP);
  if (reduceMotion || !isDesktop) return <Grid projects={projects} />;
  return <Rail projects={projects} />;
}

function Rail({ projects }: { projects: Project[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(0);
  const [active, setActive] = useState(0);

  // Cuánto hay que desplazar el carril: ancho total menos una pantalla.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
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
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const smooth = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });
  const x = useTransform(smooth, [0, 1], [0, -overflow]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const last = projects.length - 1;
    setActive(Math.min(last, Math.round(Math.max(0, p * 1.12 - 0.06) * last)));
  });

  const accent = projects[active]?.brand?.accent ?? ACCENT;

  return (
    <div
      ref={sectionRef}
      className="relative mt-12"
      style={{ height: `calc(${overflow}px + 100svh)` }}
    >
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
          style={{
            background: `radial-gradient(60% 55% at 60% 55%, ${accent}2e, transparent 70%)`,
          }}
        />
        <motion.div
          ref={trackRef}
          style={{ x }}
          className="relative flex w-max items-stretch gap-6 pr-[8vw] pl-10"
        >
          {projects.map((project, i) => (
            <RailCard key={project.slug} project={project} index={i} />
          ))}
        </motion.div>

        <div className="absolute inset-x-0 bottom-6 mx-auto flex w-full max-w-[1400px] items-center gap-6 px-10">
          <span className="font-mono text-xs tracking-widest text-foreground/70 uppercase tabular-nums">
            {String(active + 1).padStart(2, "0")} /{" "}
            {String(projects.length).padStart(2, "0")}
          </span>
          <div className="h-px flex-1 bg-border">
            <motion.div
              className="h-px origin-left"
              style={{ scaleX: smooth, background: accent }}
            />
          </div>
          <span className="font-mono text-xs tracking-widest text-foreground/70 uppercase">
            {projects[active]?.name}
          </span>
        </div>
      </div>
    </div>
  );
}

function RailCard({ project, index }: { project: Project; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const brand = project.brand;
  const accent = brand?.accent ?? ACCENT;

  // El clip corre sólo mientras la tarjeta está a la vista.
  useEffect(() => {
    const card = cardRef.current;
    const video = videoRef.current;
    if (!card || !video) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(card);
    return () => io.disconnect();
  }, []);

  const tagline = brand?.tagline ?? project.shortDescription;
  const highlight = brand?.highlight;
  const at = highlight ? tagline.indexOf(highlight) : -1;
  const [before, after] =
    highlight && at >= 0
      ? [tagline.slice(0, at), tagline.slice(at + highlight.length)]
      : [tagline, ""];

  return (
    <Link
      ref={cardRef}
      href={`/work/${project.slug}`}
      className="focus-ring group relative flex h-[72vh] w-[min(52vw,940px)] shrink-0 flex-col overflow-hidden rounded-[2rem] border border-border bg-surface"
    >
      <div className="flex items-center justify-between gap-4 px-8 pt-5 pb-4 font-mono text-[11px] tracking-widest text-foreground/60 uppercase">
        <span>
          {String(index + 1).padStart(2, "0")} — {project.category}
        </span>
        <span>{project.year}</span>
      </div>

      <div className="relative mx-3 flex-1 overflow-hidden rounded-[1.4rem] bg-surface-2">
        <Image
          src={project.image}
          alt={`${project.name}: ${project.shortDescription}`}
          fill
          sizes="(min-width: 1024px) 52vw, 100vw"
          className="object-cover object-top transition-transform duration-[1.2s] ease-(--ease) group-hover:scale-[1.04]"
        />
        {project.video && (
          <video
            ref={videoRef}
            aria-hidden
            muted
            loop
            playsInline
            preload="none"
            className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-(--ease) group-hover:scale-[1.04]"
          >
            <source src={project.video.webm} type="video/webm" />
            <source src={project.video.mp4} type="video/mp4" />
          </video>
        )}
        {project.impactMetric && (
          <span
            className="absolute top-4 left-4 rounded-full px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-background uppercase"
            style={{ background: accent }}
          >
            {project.impactMetric}
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-6 px-8 pt-5 pb-7">
        <div className="min-w-0">
          <h3
            className={`${brand ? brandFonts[brand.font] : "display"} text-[clamp(2rem,3.6vw,3.6rem)] leading-[0.95]`}
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
          <p className="mt-2 truncate text-sm text-foreground/70 md:text-base">
            {before}
            {highlight && at >= 0 && (
              <span style={{ color: accent }}>{highlight}</span>
            )}
            {after}
          </p>
        </div>
        <span
          aria-hidden
          className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full border border-border text-foreground transition-all duration-500 ease-(--ease) group-hover:-rotate-45 group-hover:border-transparent group-hover:text-background"
        >
          <span
            className="absolute h-14 w-14 scale-0 rounded-full transition-transform duration-500 ease-(--ease) group-hover:scale-100"
            style={{ background: accent }}
          />
          <ArrowRight size={20} className="relative" />
        </span>
      </div>
    </Link>
  );
}
