"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import { marca } from "@/data/marca";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// La palabra SE7EN del pie: las letras en 3D de Flow (scripts/marca.mjs), sin
// fondo. Sube desde el piso cuando entra en pantalla, se inclina hacia el mouse
// con un brillo que la recorre, se refleja en el piso y el 7 tiene su resplandor.

export function MarcaSe7en() {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Inclinación hacia el puntero, suavizada. Sin mouse (celular) se mece sola.
  useEffect(() => {
    const el = box.current, w = word.current;
    if (!el || !w || reduced) return;
    const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    let raf = 0, hover = false;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      hover = true;
    };
    const onLeave = () => {
      hover = false;
      target.x = 0;
      target.y = 0;
    };
    const tick = (t: number) => {
      if (!fine && !hover) {
        target.x = Math.sin(t / 2400) * 0.5;
        target.y = Math.cos(t / 3100) * 0.25;
      }
      cur.x += (target.x - cur.x) * 0.07;
      cur.y += (target.y - cur.y) * 0.07;
      w.style.setProperty("--rx", `${(-cur.y * 7).toFixed(2)}deg`);
      w.style.setProperty("--ry", `${(cur.x * 11).toFixed(2)}deg`);
      w.style.setProperty("--shine", `${((cur.x + 1) * 50).toFixed(1)}%`);
      raf = requestAnimationFrame(tick);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  const mask = { "--mask": `url(${marca.src})` } as CSSProperties;
  return (
    <div ref={box} aria-hidden className="cs-marca relative select-none" data-shown={shown || reduced}>
      {/* Resplandor naranja detrás del 7 (está en el medio de la palabra). */}
      <div className="cs-marca__glow pointer-events-none absolute top-[8%] left-1/2 h-[80%] w-[26%] -translate-x-1/2 rounded-full" />
      <div className="cs-marca__stage">
        <div ref={word} className="cs-marca__word relative" style={mask}>
          <Image src={marca.src} alt="" width={marca.w} height={marca.h} sizes="(min-width: 1024px) 70vw, 94vw" className="block h-auto w-full" />
          {/* Brillo: una franja de luz que sigue al mouse, recortada con la forma de las letras. */}
          <div className="cs-marca__shine pointer-events-none absolute inset-0" />
        </div>
        {/* Reflejo en el piso. */}
        <div className="cs-marca__floor pointer-events-none relative">
          <Image src={marca.src} alt="" width={marca.w} height={marca.h} sizes="(min-width: 1024px) 70vw, 94vw" className="block h-auto w-full" />
        </div>
      </div>
      <div className="cs-marca__shadow pointer-events-none absolute left-[8%] h-[10%] w-[84%] rounded-[50%]" />
    </div>
  );
}
