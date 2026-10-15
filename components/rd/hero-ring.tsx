"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Logo-anillo del hero: 7 elipses concéntricas que giran sobre el eje Y
// (el ancho respira con el seno) y siguen al puntero en X. Se anima mutando
// atributos SVG por rAF, sin re-render de React.
const RINGS = 7;
const RADIUS = 92;
const SHRINK = 0.125;
const SPACING = 22;
const BASE_ANGLE = 1.05;

export function RdHeroRing({
  className = "",
  hole = "var(--ink)",
  ring = "var(--signal)",
  outline = false,
  follow = 1,
}: {
  className?: string;
  hole?: string;
  ring?: string;
  outline?: boolean;
  follow?: number;
}) {
  const reduced = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const ellipses = useRef<(SVGEllipseElement | null)[]>([]);
  const dot = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let raf = 0;
    let visible = true;
    let target = 0;
    let eased = 0;
    const t0 = performance.now();

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      eased += (target - eased) * 0.06;
      const sway = reduced ? 0 : 0.22 * Math.sin(t * 0.7);
      const angle = BASE_ANGLE + sway + eased * 0.35 * follow;
      const gap = SPACING + (reduced ? 0 : 3.5 * Math.sin(t * 1.15));
      const squash = Math.abs(Math.sin(angle));
      const cos = Math.cos(angle);
      const offset = ((RINGS - 1) * gap * cos) / 2;
      for (let i = 0; i < RINGS; i++) {
        const el = ellipses.current[i];
        if (!el) continue;
        const r = RADIUS * (1 - i * SHRINK);
        el.setAttribute("cx", (i * gap * cos - offset).toFixed(2));
        el.setAttribute("rx", (r * squash).toFixed(2));
      }
      const d = dot.current;
      if (d) {
        d.setAttribute("cx", ((RINGS + 0.9) * gap * cos - offset).toFixed(2));
        d.setAttribute("rx", (RADIUS * 0.2 * squash * 0.55).toFixed(2));
      }
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !reduced) raf = requestAnimationFrame(loop);
    };

    // Sólo anima mientras está en pantalla.
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(loop);
    });
    io.observe(svg);

    const onMove = (e: PointerEvent) => {
      target = (e.clientX / window.innerWidth - 0.5) * 2;
    };
    if (!reduced && follow > 0) {
      window.addEventListener("pointermove", onMove, { passive: true });
    }
    draw(performance.now());

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduced, follow]);

  return (
    <svg
      ref={svgRef}
      aria-hidden
      viewBox="-150 -100 300 200"
      className={className}
    >
      {Array.from({ length: RINGS }, (_, i) => {
        const r = RADIUS * (1 - i * SHRINK);
        const isRing = i % 2 === 0;
        return (
          <ellipse
            key={i}
            ref={(el) => {
              ellipses.current[i] = el;
            }}
            cx={0}
            cy={0}
            rx={r * 0.87}
            ry={r}
            fill={outline ? "none" : isRing ? ring : hole}
            stroke={outline ? ring : "none"}
            strokeWidth={outline ? 0.6 : 0}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
      <ellipse
        ref={dot}
        cx={0}
        cy={0}
        rx={RADIUS * 0.1}
        ry={RADIUS * 0.2}
        fill={outline ? "none" : ring}
        stroke={outline ? ring : "none"}
        strokeWidth={outline ? 0.6 : 0}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
