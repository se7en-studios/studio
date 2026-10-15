"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
  useSpring,
} from "framer-motion";
import { SITE } from "@/data/site";
import { useIntroReady } from "@/components/rd/intro";
import { EASE_IO, EASE_OUT, RdRoll } from "@/components/rd/primitives";

const LINKS = [
  { href: "#trabajos", label: "Trabajos" },
  { href: "#servicios", label: "Servicios" },
  { href: "#proceso", label: "Proceso" },
  { href: "#estudio", label: "Estudio" },
  { href: "#faq", label: "FAQ" },
];

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const noopSubscribe = () => () => {};

/** Mes actual; null en el servidor para no desajustar la hidratación. */
function useMonth(): string | null {
  return useSyncExternalStore(
    noopSubscribe,
    () => MONTHS[new Date().getMonth()],
    () => null,
  );
}

export function RdNavbar() {
  const ready = useIntroReady();
  const month = useMonth();
  const slots = SITE.availability.slots;
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40 });
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("ink");

  // Se esconde al bajar y el color sigue a la sección que está bajo el logo.
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > 160 && y > prev);
    const el = document
      .elementsFromPoint(24, 36)
      .find((n) => n instanceof HTMLElement && n.dataset.theme);
    setTheme((el as HTMLElement | undefined)?.dataset.theme ?? "ink");
  });

  const light = theme !== "ink" || open;
  const onSignal = theme === "signal" || open;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      root.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-x-0 top-0 z-[120] h-[3px] origin-left bg-(--signal)"
        style={{ scaleX: progress }}
      />
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={
          ready
            ? { y: hidden && !open ? -110 : 0, opacity: 1 }
            : { y: -100, opacity: 0 }
        }
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="fixed inset-x-0 top-0 z-[110] pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] md:pt-[calc(env(safe-area-inset-top,0px)+1rem)]"
      >
        <div className="rd-wrap flex items-center justify-between gap-4">
          <Link
            href="#top"
            aria-label={`${SITE.name}, volver arriba`}
            className={`rd-display flex items-baseline gap-1 text-[1.35rem] leading-none transition-colors duration-500 md:text-[1.6rem] ${light ? "text-(--ink)" : "text-(--paper)"}`}
          >
            SE
            <span className={onSignal ? "text-(--paper)" : "text-(--signal)"}>
              7
            </span>
            EN
            <sup className="rd-label text-[9px] tracking-normal">®</sup>
          </Link>
          <nav
            aria-label="Secciones"
            className="hidden items-center gap-1 rounded-full border border-(--line) bg-(--ink)/55 p-1.5 backdrop-blur-xl lg:flex"
          >
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rd-body rounded-full px-4 py-2 text-[13px] font-medium text-(--paper)/80 transition-colors duration-300 hover:bg-(--paper) hover:text-(--ink)"
              >
                <RdRoll>{l.label}</RdRoll>
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <span className="rd-label hidden items-center gap-2 rounded-full border border-(--line) bg-(--ink)/55 px-3.5 py-2.5 text-[10px] text-(--paper)/80 backdrop-blur-xl xl:inline-flex">
              <span className="relative flex h-2 w-2">
                <span className="rd-ping absolute inset-0 rounded-full bg-(--signal)" />
                <span className="relative h-2 w-2 rounded-full bg-(--signal)" />
              </span>
              {slots} lugares
              {month ? ` en ${month.toLowerCase()}` : ""}
            </span>
            <a
              href="#contacto"
              className="rd-btn hidden !h-11 !pl-5 !text-[13px] sm:inline-flex"
            >
              <RdRoll>Hablemos</RdRoll>
              <span className="rd-btn__icon !h-8 !w-8" aria-hidden>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M7 17 17 7M8 7h9v9" />
                </svg>
              </span>
            </a>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="rd-menu"
              className={`rd-label grid h-11 place-items-center rounded-full px-5 text-[11px] font-bold transition-colors duration-500 lg:hidden ${light ? "bg-(--ink) text-(--paper)" : "bg-(--paper) text-(--ink)"}`}
            >
              {open ? "Cerrar" : "Menú"}
            </button>
          </div>
        </div>
      </motion.header>
      <AnimatePresence>
        {open && (
          <motion.div
            id="rd-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menú"
            data-lenis-prevent
            initial={{ clipPath: "circle(0% at 92% 4%)" }}
            animate={{ clipPath: "circle(150% at 92% 4%)" }}
            exit={{ clipPath: "circle(0% at 92% 4%)" }}
            transition={{ duration: 0.8, ease: EASE_IO }}
            className="fixed inset-0 z-[105] flex flex-col justify-between bg-(--signal) px-(--gutter) pt-24 pb-8 text-(--ink)"
          >
            <nav aria-label="Secciones" className="flex flex-col">
              {[...LINKS, { href: "#contacto", label: "Contacto" }].map(
                (l, i) => (
                  <span key={l.href} className="rd-mask">
                    <motion.a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      initial={{ y: "110%" }}
                      animate={{ y: "0%" }}
                      transition={{
                        duration: 0.8,
                        ease: EASE_OUT,
                        delay: 0.25 + i * 0.05,
                      }}
                      className="rd-display block border-b border-(--ink)/15 py-2 text-[clamp(2.2rem,11vw,4rem)]"
                    >
                      {l.label}
                    </motion.a>
                  </span>
                ),
              )}
            </nav>
            <div className="rd-label flex items-end justify-between gap-4 text-(--ink)/80">
              <a href={`mailto:${SITE.email}`} className="rd-link">
                {SITE.email}
              </a>
              <span>
                {slots} lugares{month ? ` · ${month}` : ""}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
