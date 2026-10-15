"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_IO, EASE_OUT } from "@/components/rd/primitives";

// Preloader "SE7EN" con contador. `useIntroReady` avisa al resto de la landing
// (navbar, hero) cuándo arrancar sus entradas.

const IntroContext = createContext(false);

/** true cuando el preloader terminó (o se salteó). */
export function useIntroReady(): boolean {
  return useContext(IntroContext);
}

const SEEN_KEY = "rd-intro-seen";
/** Duración del conteo 000→100, en ms. */
const COUNT_MS = 1500;

function wasSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

export function IntroProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [showing, setShowing] = useState(true);

  const finish = useCallback(() => {
    markSeen();
    setShowing(false);
    setReady(true);
  }, []);

  // Con reduced-motion o ya visto en la sesión no hay preloader.
  useEffect(() => {
    if (reduced || wasSeen()) {
      const id = requestAnimationFrame(finish);
      return () => cancelAnimationFrame(id);
    }
  }, [reduced, finish]);

  return (
    <IntroContext.Provider value={ready}>
      <AnimatePresence>
        {showing && <Preloader key="curtain" onComplete={finish} />}
      </AnimatePresence>
      {children}
    </IntroContext.Provider>
  );
}

function Preloader({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setCount(Math.round(eased * 100));
      if (t < 1) raf = requestAnimationFrame(tick);
      else window.setTimeout(onComplete, 180);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      root.style.overflow = prevOverflow;
    };
  }, [onComplete]);

  const letters = "SE7EN".split("");
  const lit = Math.floor((count / 100) * letters.length);

  return (
    <motion.div
      aria-hidden
      data-lenis-prevent
      className="rd-preloader fixed inset-0 z-[200] flex flex-col justify-between bg-(--ink) p-(--gutter) text-(--paper)"
      exit={{ y: "-100%" }}
      transition={{ duration: 1, ease: EASE_IO }}
    >
      <div className="flex items-start justify-between">
        <span className="rd-label text-(--mute)">Se7en Studio ®</span>
        <span className="rd-label text-(--mute)">Patagonia — AR</span>
      </div>
      <div className="flex justify-center gap-[0.04em] rd-display text-[clamp(3rem,14vw,12rem)]">
        {letters.map((l, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0.08 }}
            animate={{ opacity: i < lit ? 1 : 0.08 }}
            transition={{ duration: 0.25 }}
            className={l === "7" ? "text-(--signal)" : undefined}
          >
            {l}
          </motion.span>
        ))}
      </div>
      <div className="flex items-end justify-between">
        <span className="rd-label max-w-[14rem] text-(--mute)">
          Diseñamos y programamos productos digitales que venden
        </span>
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="rd-condensed tabular-nums text-[clamp(4rem,16vw,14rem)] leading-none"
        >
          {String(count).padStart(3, "0")}
        </motion.span>
      </div>
      <svg
        className="pointer-events-none absolute top-full left-0 h-[12vh] w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <motion.path
          fill="var(--ink)"
          initial={{ d: "M0 0 L100 0 Q50 0 0 0 Z" }}
          exit={{ d: "M0 0 L100 0 Q50 100 0 0 Z" }}
          transition={{ duration: 1, ease: EASE_IO }}
        />
      </svg>
    </motion.div>
  );
}
