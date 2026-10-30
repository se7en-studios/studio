"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projects";
import { testimonials } from "@/data/team";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_OUT, RdLabel } from "@/components/rd/primitives";

const published = testimonials
  .filter((t) => t.published)
  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Tiempo que dura cada testimonio antes de pasar al siguiente. */
const AUTOPLAY_MS = 8000;

export function RdTestimonials() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const playing = !reduced && !paused && published.length > 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(
      () => setIndex((c) => (c + 1) % published.length),
      AUTOPLAY_MS,
    );
    return () => window.clearTimeout(id);
  }, [playing, index]);

  if (published.length === 0) return null;

  const current = published[index];
  const accent =
    projects.find((p) => p.slug === current.projectSlug)?.brand?.accent ??
    "var(--signal)";

  return (
    <section
      aria-label="Lo que dicen nuestros clientes"
      aria-roledescription="carrusel"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-24 md:py-36"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="rd-wrap">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <RdLabel index="07" className="text-(--paper)/60">
            Clientes
          </RdLabel>
          <div className="flex gap-2" role="tablist" aria-label="Testimonios">
            {published.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`${t.company}`}
                onClick={() => setIndex(i)}
                className={`rd-label relative h-10 overflow-hidden rounded-full border px-4 transition-colors duration-300 ${
                  i === index
                    ? "border-(--paper) text-(--paper)"
                    : "border-(--line) text-(--paper)/50 hover:text-(--paper)"
                }`}
              >
                {i === index && playing && (
                  <m.span
                    key={`bar-${index}`}
                    aria-hidden
                    className="absolute inset-0 origin-left bg-(--paper)/12"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{
                      duration: AUTOPLAY_MS / 1000,
                      ease: "linear",
                    }}
                  />
                )}
                <span className="relative">{t.company}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-14 min-h-[28rem] md:mt-20 md:min-h-[22rem]">
          <AnimatePresence mode="wait">
            <m.blockquote
              key={current.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="grid gap-10 lg:grid-cols-12"
            >
              <div className="lg:col-span-7">
                <span className="rd-mask">
                  <m.span
                    className="rd-display block text-[clamp(1.2rem,6vw,5rem)] lg:text-[clamp(2rem,3.9vw,4.8rem)]"
                    initial={{ y: "110%" }}
                    animate={{ y: "0%" }}
                    transition={{ duration: 1, ease: EASE_OUT }}
                    style={{ color: accent }}
                  >
                    {current.highlight}
                  </m.span>
                </span>
              </div>
              <div className="flex flex-col justify-end gap-8 lg:col-span-5">
                <m.p
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.15 }}
                  className="rd-serif text-[clamp(1.5rem,2.3vw,2.3rem)] leading-[1.15] text-(--paper)"
                >
                  {"“"}
                  {current.quote}
                  {"”"}
                </m.p>
                <m.footer
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.35 }}
                  className="flex flex-wrap items-center justify-between gap-4 border-t border-(--line) pt-5"
                >
                  <div>
                    <cite className="rd-body block text-base font-semibold not-italic">
                      {current.name}
                    </cite>
                    <span className="rd-label text-(--paper)/60">
                      {current.role} {"·"} {current.company}
                    </span>
                  </div>
                  {current.projectSlug && (
                    <Link
                      href={`/work/${current.projectSlug}`}
                      className="rd-label rd-link flex items-center gap-1 text-(--paper)/80 hover:text-(--paper)"
                    >
                      Ver caso <ArrowUpRight size={14} />
                    </Link>
                  )}
                </m.footer>
              </div>
            </m.blockquote>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
