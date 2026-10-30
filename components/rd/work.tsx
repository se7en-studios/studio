"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  m,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { MD, useMediaQuery } from "@/lib/use-media-query";
import { projects } from "@/data/projects";
import { brandFonts } from "@/lib/brand-fonts";
import { caseBrand } from "@/lib/en-vivo";
import { PhoneScreen } from "@/components/work/phone-screen";
import type { Project, ProjectBrand } from "@/types";
import { EASE_OUT, RdButton, RdLines } from "./primitives";

// Trabajos: las tarjetas flotan en un anillo 3D, como tarjetas en órbita. En
// desktop son apaisadas, con la captura de la compu, y el anillo gira con el
// scroll (sticky); en celular y tablet, paradas, con la del celular, y gira
// deslizando con el dedo (la sección queda del alto de una pantalla). Sin
// movimiento, un carrusel que se desliza con el dedo.

const sorted = [...projects].sort((a, b) => a.order - b.order);

/** Tarjetas del anillo: los proyectos y, al final, «¿Y el tuyo?». */
const COUNT = sorted.length + 1;
/** Grados entre tarjeta y tarjeta. */
const STEP = 360 / COUNT;
/** Radio del anillo en anchos de tarjeta (var(--w)): con 9 tarjetas, 1.37 las deja pegadas. */
const RADIUS = 1.5;

export function RdWork() {
  // Al revés que useReducedMotion: en el servidor da false, así arranca sin movimiento.
  const motion = useMediaQuery("(prefers-reduced-motion: no-preference)");
  const desktop = useMediaQuery("(min-width: 1024px)");
  // Con key: al cruzar el breakpoint se rearma, porque cada forma mueve el anillo con otra cosa.
  return motion ? <Orbit key={desktop ? "wide" : "compact"} compact={!desktop} /> : (
    <section id="trabajos" data-theme="ink" className="relative bg-(--ink)">
      <Rail />
    </section>
  );
}

/** De 0 a 1 con arranque y llegada suaves. */
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Ángulo en (-180, 180]. */
const wrap = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180;
/** Índice de tarjeta en [0, COUNT): el anillo da vueltas. */
const mod = (i: number) => ((i % COUNT) + COUNT) % COUNT;
const SNAP = { type: "spring", stiffness: 140, damping: 22, mass: 0.7 } as const;

/** Medidas de cada forma: ancho de tarjeta (--w), alto sobre ancho. */
const SHAPE = {
  wide: { w: "[--w:min(42vw,76vh,880px)]", ratio: 0.625, aspect: "aspect-[16/10]" },
  compact: { w: "[--w:min(60vw,31svh,380px)]", ratio: 1.6, aspect: "aspect-[10/16]" },
} as const;

function Orbit({ compact }: { compact: boolean }) {
  const shape = SHAPE[compact ? "compact" : "wide"];
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const [swiped, setSwiped] = useState(false);

  // Entrada: mientras la sección sube a la pantalla, el anillo llega girando y se endereza.
  const { scrollYProgress: enter } = useScroll({
    target: sectionRef,
    offset: ["start end", "start start"],
  });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Escalera: cada tarjeta se queda de frente un rato y recién después gira a la siguiente.
  const stepped = useTransform(scrollYProgress, (v) => {
    const x = clamp(v, 0, 1) * (COUNT - 1);
    const i = Math.floor(x);
    return i + smooth(clamp((x - i - 0.22) / 0.56, 0, 1));
  });
  const scrolled = useSpring(stepped, { stiffness: 90, damping: 22, mass: 0.6 });
  // En celular, en qué tarjeta está el anillo lo maneja el dedo (sin módulo: puede dar vueltas).
  const swipe = useMotionValue(0);
  const pos = compact ? swipe : scrolled;

  useMotionValueEvent(stepped, "change", (v) => !compact && setActive(Math.round(v)));
  useMotionValueEvent(swipe, "change", (v) => setActive(mod(Math.round(v))));

  // El puntero inclina un poco todo el anillo (con el dedo no: lo mueve).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 50, damping: 18 });
  const sy = useSpring(py, { stiffness: 50, damping: 18 });
  useEffect(() => {
    if (compact) return;
    const onMove = (e: PointerEvent) => {
      px.set((e.clientX / window.innerWidth - 0.5) * 2);
      py.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [compact, px, py]);

  /** Lleva el anillo a la tarjeta i por el camino más corto. */
  const goTo = (i: number) => {
    const base = Math.round(swipe.get());
    let d = mod(i - base);
    if (d > COUNT / 2) d -= COUNT;
    animate(swipe, base + d, SNAP);
  };

  // Deslizar: sólo lo horizontal es nuestro (touch-action: pan-y deja el scroll vertical al
  // navegador). Al soltar encastra en una tarjeta, con la inercia del gesto.
  const dragged = useRef(false);
  useEffect(() => {
    const stage = stageRef.current;
    if (!compact || !stage) return;
    let id = -1;
    let x0 = 0;
    let y0 = 0;
    let p0 = 0;
    let card = 1;
    let on = false;
    let samples: { x: number; t: number }[] = [];
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      on = false;
      dragged.current = false;
      card = stage.querySelector<HTMLElement>("[data-orbit-card]")?.offsetWidth || 1;
      samples = [{ x: e.clientX, t: e.timeStamp }];
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const dx = e.clientX - x0;
      if (!on) {
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(e.clientY - y0)) return;
        on = true;
        dragged.current = true;
        swipe.stop();
        p0 = swipe.get();
        stage.setPointerCapture(id);
        setSwiped(true);
      }
      swipe.set(p0 - dx / card);
      samples = [...samples.slice(-4), { x: e.clientX, t: e.timeStamp }];
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      if (!on) return;
      const first = samples[0];
      const last = samples[samples.length - 1];
      const v = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
      const target = Math.round(swipe.get() - (v * 180) / card);
      animate(swipe, clamp(target, p0 - 3, p0 + 3), SNAP);
    };
    // El click que llega al soltar un arrastre no es un toque: ni navega ni elige tarjeta.
    const click = (e: MouseEvent) => {
      if (!dragged.current) return;
      dragged.current = false;
      e.preventDefault();
      e.stopPropagation();
    };
    stage.addEventListener("click", click, true);
    stage.addEventListener("pointerdown", down);
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    return () => {
      stage.removeEventListener("click", click, true);
      stage.removeEventListener("pointerdown", down);
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      stage.removeEventListener("pointercancel", up);
    };
  }, [compact, swipe]);

  /** Un toque en una tarjeta de costado la trae de frente en vez de abrir el caso. */
  const onCardClick = (i: number, e: React.MouseEvent) => {
    if (!compact || i === active) return;
    e.preventDefault();
    goTo(i);
  };

  const angle = useTransform(
    [pos, sx, enter],
    ([p, x, e]: number[]) => -p * STEP + x * 5 + (1 - e) * 70,
  );
  const tiltX = useTransform([sy, enter], ([y, e]: number[]) => 7 - y * 4 + (1 - e) * 18);
  const tiltZ = useTransform(sx, (x) => -2.5 + x * 1.5);
  const tilt = useMotionTemplate`rotateX(${tiltX}deg) rotateZ(${tiltZ}deg)`;
  const spin = useMotionTemplate`translateZ(calc(var(--w) * -${RADIUS})) rotateY(${angle}deg)`;

  const floorY = useTransform(scrollYProgress, [0, 1], ["0px", "960px"]);
  const floorX = useTransform(swipe, (v) => `${-v * 120}px`);
  const progress = useTransform(compact ? swipe : scrollYProgress, (v) =>
    compact ? clamp(mod(v) / (COUNT - 1), 0, 1) : v,
  );

  /** Con el teclado: al enfocar una tarjeta, la trae de frente (en desktop, con el scroll). */
  const focusCard = (i: number) => {
    if (compact) return goTo(i);
    const s = sectionRef.current;
    if (!s) return;
    const top = s.getBoundingClientRect().top + window.scrollY;
    const span = s.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (span * i) / (COUNT - 1), behavior: "instant" });
  };

  const project = sorted[active];
  const accent = project?.brand?.accent ?? "#ff4d2e";

  return (
    <section
      id="trabajos"
      ref={sectionRef}
      data-theme="ink"
      // En celular, el colchón de abajo es lo que Servicios se sube encima (su -mt), para que no tape los puntos.
      className={`relative bg-(--ink) ${compact ? "pb-10 md:pb-16" : ""}`}
      style={compact ? undefined : { height: `calc(70vh * ${COUNT - 1} + 100svh)` }}
    >
      <div
        ref={stageRef}
        className={`top-0 h-svh overflow-hidden ${shape.w} ${
          compact ? "relative min-h-[560px] touch-pan-y select-none" : "sticky"
        }`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 transition-[background] duration-1000"
          style={{
            background: `radial-gradient(55% 50% at 50% 50%, ${accent}33, transparent 70%)`,
          }}
        />
        {/* Piso de grilla que corre con el scroll, hacia el horizonte. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[-40%] bottom-[-8%] h-[55%] [perspective:520px]"
        >
          <m.div
            className="rd-floor absolute inset-0 origin-bottom"
            style={compact ? { backgroundPositionX: floorX } : { backgroundPositionY: floorY }}
          />
        </div>

        {/* Los contenedores del 3D no reciben toques: el de inclinación queda en z=0 y tapaba a las
            tarjetas de los costados, que están más atrás. Sólo las tarjetas los vuelven a tomar. */}
        <div className="pointer-events-none absolute inset-0 [perspective:calc(var(--w)*2.6)]">
          <m.div
            className="absolute inset-0 [transform-style:preserve-3d]"
            style={{ transform: tilt }}
          >
            <m.div
              className="absolute inset-0 [transform-style:preserve-3d]"
              style={{ transform: spin }}
            >
              <OrbitPath ratio={shape.ratio} />
              {sorted.map((p, i) => (
                <OrbitCard
                  key={p.slug}
                  index={i}
                  project={p}
                  compact={compact}
                  angle={angle}
                  active={i === active}
                  onFocus={() => focusCard(i)}
                  onClick={(e) => onCardClick(i, e)}
                />
              ))}
              <OrbitCard
                index={sorted.length}
                compact={compact}
                angle={angle}
                active={active === sorted.length}
                onFocus={() => focusCard(sorted.length)}
                onClick={(e) => onCardClick(sorted.length, e)}
              />
            </m.div>
          </m.div>
        </div>

        {/* HUD de arriba: título de la sección y en qué tarjeta vas. */}
        <div className="rd-wrap pointer-events-none absolute inset-x-0 top-20 flex items-start justify-between gap-6 lg:top-24">
          <div>
            <p className="rd-label text-(--paper)/60 max-sm:hidden">
              ( 02 — Trabajos seleccionados )
            </p>
            <RdLines
              lines={[
                <>
                  Trabajos que ya{" "}
                  <span className="rd-serif text-(--signal)">venden</span>
                </>,
              ]}
              className="rd-display text-[clamp(1.5rem,3vw,3.4rem)] sm:mt-3"
            />
          </div>
          <div className="text-right">
            <p className="rd-display tabular-nums text-[clamp(1.5rem,3vw,3.4rem)] text-(--paper)">
              {String(active + 1).padStart(2, "0")}
              <span className="text-(--paper)/30">
                /{String(COUNT).padStart(2, "0")}
              </span>
            </p>
            {compact ? (
              <p
                className={`rd-label mt-2 whitespace-nowrap text-(--paper)/60 transition-opacity duration-500 ${swiped ? "opacity-0" : ""}`}
                aria-hidden
              >
                ← Deslizá →
              </p>
            ) : (
              <p className="rd-label mt-2 flex items-center justify-end gap-3 text-(--paper)/60">
                Seguí bajando
                <span aria-hidden className="inline-block h-px w-10 bg-current" />↓
              </p>
            )}
          </div>
        </div>

        {/* HUD de abajo: la tarjeta de frente, con su marca. */}
        <div className="rd-wrap absolute inset-x-0 bottom-5 lg:bottom-6">
          <div className="flex items-end justify-between gap-4 lg:gap-8">
            <div className="min-h-[6.5rem] min-w-0 flex-1 lg:min-h-[7.5rem]" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={active}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: EASE_OUT }}
                >
                  {project ? <OrbitCaption project={project} compact={compact} /> : <EndCaption />}
                </m.div>
              </AnimatePresence>
            </div>
            <div className="shrink-0 pb-1">
              {compact ? (
                <Link
                  href={project ? `/work/${project.slug}` : "#contacto"}
                  aria-label={project ? `Ver el caso de ${project.name}` : "Contanos tu idea"}
                  className="grid h-14 w-14 place-items-center rounded-full text-(--ink) transition-colors duration-500"
                  style={{ background: project?.brand?.accent ?? "var(--signal)" }}
                >
                  <ArrowRight size={22} aria-hidden />
                </Link>
              ) : project ? (
                <RdButton href={`/work/${project.slug}`} variant="ghost">
                  Ver caso
                </RdButton>
              ) : (
                <RdButton href="#contacto">Contanos tu idea</RdButton>
              )}
            </div>
          </div>
          <div className="relative mt-4 h-px bg-(--line) lg:mt-5">
            <m.div
              className="absolute inset-0 origin-left bg-(--signal)"
              style={{ scaleX: progress }}
            />
            {Array.from({ length: COUNT }, (_, i) => (
              <span
                key={i}
                aria-hidden
                className={`absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors duration-500 ${
                  i <= active ? "bg-(--signal)" : "bg-(--paper)/25"
                }`}
                style={{ left: `${(i / (COUNT - 1)) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** La órbita por donde pasan las tarjetas, acostada debajo de ellas. */
function OrbitPath({ ratio }: { ratio: number }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute top-1/2 left-1/2 overflow-visible"
      style={{
        width: `calc(var(--w) * ${RADIUS * 2})`,
        height: `calc(var(--w) * ${RADIUS * 2})`,
        transform: `translate(-50%, -50%) translateY(calc(var(--w) * ${ratio / 2 + 0.07})) rotateX(90deg)`,
      }}
    >
      <circle cx="50" cy="50" r="50" fill="none" stroke="var(--paper)" strokeOpacity="0.16" strokeWidth="0.12" />
    </svg>
  );
}

function OrbitCard({
  index,
  project,
  compact,
  angle,
  active,
  onFocus,
  onClick,
}: {
  index: number;
  /** Parada, con la captura del celular y sin video. */
  compact: boolean;
  /** Sin proyecto, es la tarjeta del final. */
  project?: Project;
  angle: MotionValue<number>;
  active: boolean;
  onFocus: () => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const own = index * STEP;
  // Cuánto le falta para estar de frente, en tarjetas: oscurece las de los costados y, mientras
  // gira, le pasa el brillo de holograma por encima (quieta, de frente o al costado, no tiene).
  const off = useTransform(angle, (a) => Math.abs(wrap(own + a)) / STEP);
  const dim = useTransform(off, (o) => Math.min(0.72, o * 0.6));
  const holo = useTransform(off, (o) => Math.min(1, o));
  const accent = project?.brand?.accent ?? "#ff4d2e";
  const shape = SHAPE[compact ? "compact" : "wide"];

  return (
    <Link
      href={project ? `/work/${project.slug}` : "#contacto"}
      data-cursor={project ? "Ver caso" : "Hablemos"}
      onFocus={onFocus}
      onClick={onClick}
      draggable={false}
      data-orbit-card
      className={`group pointer-events-auto absolute top-1/2 left-1/2 w-(--w) [backface-visibility:hidden] ${shape.aspect}`}
      style={{
        marginLeft: "calc(var(--w) / -2)",
        marginTop: `calc(var(--w) * ${-shape.ratio / 2})`,
        transform: `rotateY(${own}deg) translateZ(calc(var(--w) * ${RADIUS}))`,
      }}
    >
      <div
        className="rd-float h-full w-full"
        style={{ animationDelay: `${-index * 0.83}s` }}
      >
        <m.div
          className="relative h-full w-full overflow-hidden rounded-[1.6rem] bg-(--ink-2) shadow-[0_50px_90px_-35px_rgba(0,0,0,0.95)] ring-1 ring-white/12"
          style={{ ["--holo" as string]: holo }}
        >
          {project && compact ? (
            <Banner project={project} index={index} />
          ) : project ? (
            <>
              <Image
                src={project.image}
                alt={`${project.name}: ${project.shortDescription}`}
                draggable={false}
                fill
                sizes="44vw"
                className="object-cover object-top transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.04]"
              />
              {active && project.video && (
                <video
                  className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.04]"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src={project.video.webm} type="video/webm" />
                  <source src={project.video.mp4} type="video/mp4" />
                </video>
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(to_top,rgba(11,11,12,0.75),transparent_40%),linear-gradient(to_bottom,rgba(11,11,12,0.6),transparent_28%)]"
              />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 px-5 pt-4">
                <span className="rd-label text-(--paper)/80">
                  {String(index + 1).padStart(2, "0")} — {project.category}
                </span>
                <span className="rd-label text-(--paper)/80">{project.year}</span>
              </div>
              {project.impactMetric && (
                <span
                  className="rd-label absolute bottom-4 left-4 rounded-full px-3 py-1.5 text-[10px] font-bold text-(--ink)"
                  style={{ background: accent }}
                >
                  {project.impactMetric}
                </span>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col justify-between bg-(--signal) p-5 text-(--ink) lg:p-8">
              <p className="rd-label">( ¿Y el tuyo? )</p>
              <p className={`rd-display ${compact ? "text-[calc(var(--w)*0.135)]" : "text-[calc(var(--w)*0.085)]"}`}>
                El próximo <span className="rd-serif">puede ser</span> el tuyo.
              </p>
            </div>
          )}
          {project && <div aria-hidden className="rd-holo pointer-events-none absolute inset-0" />}
          <m.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-(--ink)"
            style={{ opacity: dim }}
          />
        </m.div>
      </div>
    </Link>
  );
}

/** La letra de la marca: su tipografía, peso, itálica, mayúsculas y espaciado. */
function brandType(brand?: ProjectBrand) {
  return {
    className: brand ? brandFonts[brand.font] : "",
    style: {
      fontWeight: brand?.weight,
      fontStyle: brand?.italic ? "italic" : undefined,
      textTransform: brand?.uppercase ? ("uppercase" as const) : undefined,
      letterSpacing: brand?.tracking !== undefined ? `${brand.tracking}em` : undefined,
    },
  };
}

/**
 * La tarjeta parada, armada como un banner de la marca y no como una captura: arriba el
 * logo y su frase en su letra, con el dato que más vende; abajo, el sitio en un celular
 * que asoma desde el borde. Todo se mide en anchos de tarjeta (--w), así escala entero.
 */
function Banner({ project, index }: { project: Project; index: number }) {
  const brand = project.brand;
  const accent = brand?.accent ?? "#ff4d2e";
  const logo = caseBrand(project.slug);
  const type = brandType(brand);
  const tagline = brand?.tagline ?? project.name;
  const highlight = brand?.highlight;
  const at = highlight ? tagline.indexOf(highlight) : -1;
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `radial-gradient(120% 70% at 85% 105%, ${accent}66, transparent 60%), radial-gradient(90% 55% at 0% 0%, ${accent}26, transparent 70%), var(--ink-2)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 px-[7%] pt-[7%]">
        {logo?.logo || logo?.mark ? (
          <span className="relative block h-[calc(var(--w)*0.11)] w-1/2">
            <Image
              src={(logo.logo ?? logo.mark)!}
              alt={project.name}
              draggable={false}
              fill
              sizes="40vw"
              className="object-contain object-left"
            />
          </span>
        ) : (
          <span
            className={`${type.className} text-[calc(var(--w)*0.09)] leading-none`}
            style={type.style}
          >
            {project.name}
          </span>
        )}
        <span className="rd-label text-(--paper)/60">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <p
        className={`${type.className} mt-[6%] px-[7%] text-[calc(var(--w)*0.092)] leading-[1.02] text-(--paper)`}
        style={type.style}
      >
        {at >= 0 && highlight ? (
          <>
            {tagline.slice(0, at)}
            <span style={{ color: accent }}>{highlight}</span>
            {tagline.slice(at + highlight.length)}
          </>
        ) : (
          tagline
        )}
      </p>
      {project.impactMetric && (
        <span
          className="rd-label absolute left-[7%] top-[47%] z-10 rounded-full px-2.5 py-1 text-[calc(var(--w)*0.034)] font-bold text-(--ink) shadow-lg"
          style={{ background: accent }}
        >
          {project.impactMetric}
        </span>
      )}
      {/* El celular: marco con fondo (no borde: el color de los bordes lo pisa globals.css). */}
      <div className="absolute top-[52%] left-1/2 w-[64%] -translate-x-1/2 rotate-[-4deg] rounded-[calc(var(--w)*0.09)] bg-[#2b2b31] p-[calc(var(--w)*0.012)] shadow-[0_24px_50px_-12px_rgba(0,0,0,0.9)] ring-1 ring-white/25 transition-transform duration-[1.2s] ease-(--ease-out) group-hover:-translate-y-2">
        <PhoneScreen
          src={project.screens?.mobile ?? project.image}
          alt={`${project.name}: ${project.shortDescription}`}
          sizes="40vw"
          className="rounded-[calc(var(--w)*0.08)]"
        />
      </div>
    </div>
  );
}

function OrbitCaption({ project, compact }: { project: Project; compact: boolean }) {
  const brand = project.brand;
  const accent = brand?.accent ?? "#ff4d2e";
  return (
    <>
      <p className="rd-label flex flex-wrap gap-x-3 text-(--paper)/60">
        <span>{project.category}</span>
        {OWNER[project.slug] && <span style={{ color: accent }}>{OWNER[project.slug]}</span>}
      </p>
      <h3
        className={`${brandType(brand).className} mt-2 text-[clamp(2rem,min(4.2vw,7vh),4.6rem)] leading-[0.95]`}
        style={brandType(brand).style}
      >
        {project.name}
      </h3>
      {/* En celular la frase ya va en el banner: abajo, qué hicimos. */}
      {compact ? (
        <p className="rd-body mt-2 line-clamp-2 max-w-xl text-sm leading-snug text-(--paper)/70">
          {PITCH[project.slug] ?? project.shortDescription}
        </p>
      ) : (
        <Tagline project={project} className="rd-body mt-2 max-w-2xl truncate text-base text-(--paper)/70" />
      )}
    </>
  );
}

function EndCaption() {
  return (
    <>
      <p className="rd-label text-(--paper)/60">( ¿Y el tuyo? )</p>
      <p className="rd-display mt-2 text-[clamp(1.6rem,min(4.2vw,7vh),4.6rem)]">
        El próximo <span className="rd-serif text-(--signal)">puede ser</span> el tuyo.
      </p>
    </>
  );
}

/** El tagline de la marca, con la parte destacada en su color. */
function Tagline({ project, className }: { project: Project; className: string }) {
  const brand = project.brand;
  const accent = brand?.accent ?? "#ff4d2e";
  const tagline = brand?.tagline ?? project.shortDescription;
  const highlight = brand?.highlight;
  const at = highlight ? tagline.indexOf(highlight) : -1;
  const [before, after] =
    highlight && at >= 0
      ? [tagline.slice(0, at), tagline.slice(at + highlight.length)]
      : [tagline, ""];
  return (
    <p className={className}>
      {before}
      {highlight && at >= 0 && <span style={{ color: accent }}>{highlight}</span>}
      {after}
    </p>
  );
}

/** Ancho de cada tarjeta del carrusel: se asoma la siguiente para que se entienda que sigue. */
const SLIDE = "w-[84vw] shrink-0 snap-start sm:w-[62vw] lg:w-[44vw]";

/**
 * Sin movimiento: las tarjetas en fila, con scroll horizontal
 * nativo y encastre en cada una. Abajo, en qué tarjeta vas, una barra y flechas
 * (para mouse y teclado; con el dedo se desliza).
 */
function Rail() {
  const railRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [moved, setMoved] = useState(false);
  const count = COUNT;

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
        <Header />
      </div>
      <div
        ref={railRef}
        role="region"
        aria-label="Trabajos: deslizá para ver los demás"
        tabIndex={0}
        className="flex snap-x snap-mandatory scroll-px-(--gutter) gap-4 overflow-x-auto overscroll-x-contain px-(--gutter) [scrollbar-width:none] focus-visible:outline-offset-[-2px] [&::-webkit-scrollbar]:hidden"
      >
        {sorted.map((p, i) => (
          <Card key={p.slug} project={p} index={i} />
        ))}
        <EndCard />
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

function Header() {
  return (
    <div className="flex shrink-0 flex-col justify-between gap-10 pb-6">
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
    </div>
  );
}

function EndCard() {
  return (
    <div
      className={`flex flex-col justify-center gap-8 rounded-[2rem] bg-(--signal) p-8 text-(--ink) md:p-12 ${SLIDE}`}
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

function Card({ project, index }: { project: Project; index: number }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = useReducedMotion();
  const wide = useMediaQuery(MD);
  const phoneShot = project.screens?.mobile;
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

  // El recorrido del sitio en video (desde tablet): llena la ventana de la compu o la tarjeta entera
  const media = project.video && !reduced && wide && (
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
  );

  return (
    <Link
      ref={linkRef}
      href={`/work/${project.slug}`}
      data-cursor="Ver caso"
      className={`group relative flex flex-col overflow-hidden rounded-[2rem] border border-(--line) bg-(--ink-2) ${SLIDE}`}
    >
      <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-4 md:px-8">
        <span className="rd-label text-(--paper)/60">
          {String(index + 1).padStart(2, "0")} — {project.category}
        </span>
        <span className="rd-label text-(--paper)/60">{project.year}</span>
      </div>
      <div
        className={`relative mx-3 overflow-hidden rounded-[1.4rem] bg-(--ink-3) ${
          phoneShot ? "aspect-[5/4] md:aspect-[16/10]" : "aspect-[4/3] md:aspect-[16/10]"
        }`}
        style={
          phoneShot
            ? { background: `linear-gradient(160deg, ${accent}40, transparent 65%)` }
            : undefined
        }
      >
        {phoneShot ? (
          <>
            {/* Cómo se ve en la compu: una ventana del navegador con el sitio */}
            <div className="absolute top-[9%] left-[6%] w-[80%] overflow-hidden rounded-lg border border-(--line) bg-(--ink) shadow-2xl transition-transform duration-[1.2s] ease-(--ease-out) group-hover:-translate-y-1 md:w-[72%]">
              <div className="flex h-3 items-center gap-1 px-2 md:h-4" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1 w-1 rounded-full bg-(--paper)/30 md:h-1.5 md:w-1.5" />
                ))}
              </div>
              <div className="relative aspect-[16/10]">
                <Image
                  src={project.image}
                  alt={`${project.name}: ${project.shortDescription}`}
                  fill
                  sizes="(min-width: 768px) 46vw, 72vw"
                  className="object-cover object-top"
                />
                {media}
              </div>
            </div>
            {/* Y en el celular: más chico, adelante y a la derecha. El marco va con
                fondo y no con borde: el color de los bordes lo pisa globals.css. */}
            <div className="absolute right-[6%] bottom-[7%] w-[27%] rounded-[1rem] bg-[#2b2b31] p-[3px] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.85)] ring-1 ring-white/30 md:w-[21%] md:rounded-[1.3rem] md:p-1">
              <PhoneScreen
                src={phoneShot}
                alt={`${project.name} en celular`}
                sizes="(min-width: 768px) 14vw, 26vw"
                className="rounded-[0.8rem] md:rounded-[1.05rem]"
              />
            </div>
          </>
        ) : (
          <>
            <Image
              src={project.image}
              alt={`${project.name}: ${project.shortDescription}`}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-top transition-transform duration-[1.2s] ease-(--ease-out) group-hover:scale-[1.04]"
            />
            {media}
          </>
        )}
        {project.impactMetric && (
          <span
            className={`rd-label absolute left-4 rounded-full px-3 py-1.5 text-[10px] font-bold text-(--ink) ${
              phoneShot ? "bottom-4" : "top-4"
            }`}
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
          <Tagline project={project} className="rd-body mt-2 text-sm text-(--paper)/70 md:truncate md:text-base" />
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
    </Link>
  );
}
