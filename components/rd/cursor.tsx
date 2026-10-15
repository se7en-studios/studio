"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useMediaQuery } from "@/lib/use-media-query";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_OUT } from "@/components/rd/primitives";

/** Cursor custom: punto que crece sobre links y burbuja con el `data-cursor`. */
export function Cursor() {
  const fine = useMediaQuery("(pointer: fine)");
  const reduced = useReducedMotion();
  return !fine || reduced ? null : <CursorInner />;
}

function CursorInner() {
  const mx = useMotionValue(-100);
  const my = useMotionValue(-100);
  const x = useSpring(mx, { stiffness: 500, damping: 40, mass: 0.4 });
  const y = useSpring(my, { stiffness: 500, damping: 40, mass: 0.4 });
  const [label, setLabel] = useState<string | null>(null);
  const [onLink, setOnLink] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const move = (e: PointerEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
      setVisible(true);
    };
    const over = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      const tagged = el?.closest<HTMLElement>("[data-cursor]");
      setLabel(tagged?.dataset.cursor ?? null);
      setOnLink(!!el?.closest("a, button, [role=button], label"));
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [mx, my]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[150]"
      style={{ x, y }}
    >
      <AnimatePresence>
        {label ? (
          <motion.div
            key="label"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 30 }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
            className="rd-label absolute -top-12 -left-12 grid h-24 w-24 place-items-center rounded-full bg-(--signal) text-center text-[10px] leading-tight font-bold text-(--ink)"
          >
            {label}
          </motion.div>
        ) : (
          <motion.div
            key="dot"
            initial={{ scale: 0 }}
            animate={{ scale: visible ? (onLink ? 3.2 : 1) : 0 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-(--signal) shadow-[0_0_0_1.5px_var(--paper)]"
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
