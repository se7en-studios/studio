"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { projects } from "@/data/projects";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_OUT, RdLines } from "@/components/rd/primitives";
import { CsSection, useConsola } from "@/components/consola/section";

// Inicio: titular condensado enorme y un reel hecho con los recorridos reales
// de los casos (los mismos videos de /work), uno detrás del otro.

const REEL = [...projects]
  .sort((a, b) => a.order - b.order)
  .filter((p): p is typeof p & { video: NonNullable<typeof p.video> } => !!p.video);
/** Cada caso se queda como mucho esto en el reel, en segundos. */
const SLIDE_MAX = 7;

export function CsHero() {
  const { openTalk } = useConsola();
  return (
    <CsSection id="inicio" label="Inicio" className="pt-6 lg:pt-10">
      <p className="rd-label text-(--paper)/55">( Estudio de diseño y desarrollo · Patagonia, AR )</p>
      <RdLines
        as="h1"
        play
        className="cs-cond mt-6 text-[clamp(3.6rem,min(10.5vw,17svh),10.5rem)]"
        lines={[
          "Diseño, código",
          <>
            & <span className="rd-serif text-(--signal)">oficio</span>
          </>,
        ]}
      />
      <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <p className="rd-body max-w-[34rem] text-[clamp(1rem,1.3vw,1.2rem)] leading-snug text-(--paper)/80">
          Somos dos fundadores en la Patagonia. Diseñamos y programamos webs, tiendas online y productos con IA a
          medida: rápidos, tuyos y online en 1 a 4 semanas.
        </p>
        <button type="button" onClick={openTalk} className="rd-btn self-start md:self-auto">
          <span>Contanos tu idea</span>
          <span className="rd-btn__icon" aria-hidden>
            →
          </span>
        </button>
      </div>
      <Reel />
      <p className="rd-body mt-4 text-center text-[14px] text-(--paper)/45">
        Todo lo que pasa en el reel está online hoy. ¿El próximo? <span className="rd-serif text-[1.1em] text-(--paper)/75">El tuyo.</span>
      </p>
    </CsSection>
  );
}

function Reel() {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  // null = nadie tocó el botón: corre, salvo que el sistema pida menos movimiento.
  const [choice, setChoice] = useState<boolean | null>(null);
  const playing = choice ?? !reduced;
  const setPlaying = (fn: (v: boolean) => boolean) => setChoice(fn(playing));
  const [progress, setProgress] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const p = REEL[i];

  // Sólo corre en pantalla.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playing && visible) v.play().catch(() => {});
    else v.pause();
  }, [playing, visible, i]);

  // timeupdate puede llegar dos veces antes de re-renderizar: se avanza una vez por caso.
  const advanced = useRef<string | null>(null);
  const next = () => {
    if (advanced.current === p.slug) return;
    advanced.current = p.slug;
    setProgress(0);
    setI((v) => (v + 1) % REEL.length);
  };

  return (
    <div ref={box} className="relative mt-10 overflow-hidden rounded-(--cs-radius) bg-[#111] md:mt-14">
      <div className="relative aspect-[4/3.4] sm:aspect-[16/10] lg:aspect-[16/9]">
        <AnimatePresence initial={false}>
          <m.video
            key={p.slug}
            // El video que sale sigue montado durante el fundido: la ref queda en el nuevo.
            ref={(el) => {
              if (el) video.current = el;
            }}
            muted
            playsInline
            preload="metadata"
            poster={p.image}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT }}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v !== video.current) return;
              const len = Math.min(SLIDE_MAX, v.duration || SLIDE_MAX);
              setProgress(Math.min(1, v.currentTime / len));
              if (v.currentTime >= len) next();
            }}
            onEnded={(e) => e.currentTarget === video.current && next()}
            className="absolute inset-0 h-full w-full object-cover object-top"
          >
            <source src={p.video.webm} type="video/webm" />
            <source src={p.video.mp4} type="video/mp4" />
          </m.video>
        </AnimatePresence>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-transparent to-black/30" />

        {/* Segmentos tipo historia: uno por caso. */}
        <div className="absolute inset-x-4 top-4 flex gap-1.5 md:inset-x-6 md:top-6">
          {REEL.map((r, k) => (
            <button
              key={r.slug}
              type="button"
              onClick={() => {
                setProgress(0);
                setI(k);
              }}
              aria-label={`Ver ${r.name}`}
              className="h-5 flex-1 py-2"
            >
              <span className="block h-[3px] overflow-hidden rounded-full bg-white/25">
                <span
                  className="block h-full rounded-full bg-white transition-[width] duration-300 ease-linear"
                  style={{ width: `${k < i ? 100 : k === i ? progress * 100 : 0}%` }}
                />
              </span>
            </button>
          ))}
        </div>

        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-4 md:inset-x-6 md:bottom-6">
          <AnimatePresence mode="wait" initial={false}>
            <m.a
              key={p.slug}
              href={`#caso-${p.slug}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="flex min-w-0 items-center gap-3"
            >
              <span
                className="cs-cond grid h-11 w-11 shrink-0 place-items-center rounded-full text-[1.3rem] text-(--ink)"
                style={{ background: p.brand?.accent ?? "var(--signal)" }}
                aria-hidden
              >
                {p.name[0]}
              </span>
              <span className="min-w-0">
                <span className="rd-body block text-[15px] leading-tight text-white">{p.name}</span>
                <span className="rd-body block truncate text-[12.5px] text-white/65">{p.brand?.tagline ?? p.category}</span>
              </span>
            </m.a>
          </AnimatePresence>
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="rd-body flex h-11 shrink-0 items-center gap-2 rounded-full bg-black/55 px-4 text-[14px] text-white backdrop-blur transition-colors hover:bg-black/75"
          >
            {playing ? <Pause size={14} aria-hidden /> : <Play size={14} aria-hidden />}
            {playing ? "Pausar" : "Ver reel"}
          </button>
        </div>
      </div>
    </div>
  );
}
