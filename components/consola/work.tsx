"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projects";
import type { Project } from "@/types";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { RdButton, RdLines, RdReveal } from "@/components/rd/primitives";
import { CsSection } from "@/components/consola/section";

// Trabajos: bento a sangre, cada tarjeta con el color de su marca. Las anchas
// muestran el sitio en una ventana de navegador (con su recorrido en video);
// las angostas, la versión de celular en un teléfono inclinado.

const cases = [...projects].sort((a, b) => a.order - b.order);
/** Ritmo del bento: ancha, dos angostas, ancha y el resto de a pares (son 8 casos). */
const WIDE = new Set([0, 3]);

/** Texto oscuro o claro según la luminancia del color de marca. */
function onAccent(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.32 ? "#0b0b0c" : "#f2eee6";
}

export function CsWork() {
  return (
    <CsSection id="trabajos" label="Trabajos" className="pt-28 md:pt-40">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <RdLines
          className="cs-h2 text-[clamp(2.4rem,4.6vw,4.4rem)]"
          lines={[
            "Mirá lo último",
            <>
              que <span className="rd-serif text-(--signal)">pusimos</span> online
            </>,
          ]}
        />
        <RdButton href="/work" variant="ghost">
          Ver todos
        </RdButton>
      </div>
      <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-2">
        {cases.map((p, i) => (
          <RdReveal key={p.slug} className={WIDE.has(i) ? "md:col-span-2" : ""} y={40}>
            <WorkCard project={p} wide={WIDE.has(i)} />
          </RdReveal>
        ))}
      </div>
    </CsSection>
  );
}

function WorkCard({ project: p, wide }: { project: Project; wide: boolean }) {
  const accent = p.brand?.accent ?? "#ff4d2e";
  const fg = onAccent(accent);
  return (
    <Link
      id={`caso-${p.slug}`}
      href={`/work/${p.slug}`}
      className={`group relative block scroll-mt-28 overflow-hidden rounded-(--cs-radius) ${
        wide ? "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[16/8.4]" : "aspect-[4/5] lg:aspect-[1/1.02]"
      }`}
      style={{
        background: `radial-gradient(120% 90% at 80% 0%, color-mix(in srgb, ${accent} 70%, white) 0%, ${accent} 45%, color-mix(in srgb, ${accent} 55%, black) 100%)`,
        color: fg,
      }}
    >
      {/* Grano de tinta sobre el color plano, como en el resto del sistema. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* En celular todas van con teléfono: la ventana de escritorio no entra. */}
      {wide ? (
        <>
          <span className="hidden sm:contents">
            <BrowserShot project={p} />
          </span>
          <span className="contents sm:hidden">
            <PhoneShot project={p} />
          </span>
        </>
      ) : (
        <PhoneShot project={p} />
      )}
      {/* Velo del color de marca abajo, para que el nombre se lea sobre la captura. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: `linear-gradient(to top, color-mix(in srgb, ${accent} 78%, ${fg === "#0b0b0c" ? "white" : "black"}) 0%, color-mix(in srgb, ${accent} 60%, transparent) 50%, transparent 100%)`,
        }}
      />

      <span className="rd-label absolute top-5 right-5 rounded-full border border-current/30 px-2.5 py-1 text-[10px] opacity-80">
        {p.year}
      </span>
      <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 md:inset-x-6 md:bottom-6">
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="cs-cond grid h-11 w-11 shrink-0 place-items-center rounded-full text-[1.3rem]"
            style={{ background: fg, color: accent }}
            aria-hidden
          >
            {p.name[0]}
          </span>
          <span className="min-w-0">
            <span className="rd-body block text-[16px] leading-tight font-medium">{p.name}</span>
            <span className="rd-body block truncate text-[12.5px] opacity-75">{p.category}</span>
          </span>
        </span>
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform duration-500 group-hover:rotate-45"
          style={{ background: fg, color: accent }}
          aria-hidden
        >
          <ArrowUpRight size={18} />
        </span>
      </span>
    </Link>
  );
}

/** Ventana de navegador con el recorrido del sitio: corre sólo en pantalla. */
function BrowserShot({ project: p }: { project: Project }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold: 0.35 });
    io.observe(v);
    return () => io.disconnect();
  }, [reduced]);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (on) v.play().catch(() => {});
    else v.pause();
  }, [on]);

  const host = p.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <span className="absolute inset-x-[6%] top-[9%] bottom-[-6%] block overflow-hidden rounded-t-[14px] bg-[#0b0b0c] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] transition-transform duration-700 ease-(--ease-out) group-hover:-translate-y-2 sm:inset-x-[10%] lg:inset-x-[14%]">
      <span className="flex h-8 items-center gap-1.5 bg-[#1a1a1c] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="rd-body mx-auto rounded-md bg-white/[0.07] px-3 py-0.5 text-[11px] text-white/60">{host}</span>
      </span>
      <span className="relative block h-[calc(100%-2rem)]">
        {p.video ? (
          <video
            ref={ref}
            muted
            loop
            playsInline
            preload="none"
            poster={p.image}
            className="absolute inset-0 h-full w-full object-cover object-top"
          >
            <source src={p.video.webm} type="video/webm" />
            <source src={p.video.mp4} type="video/mp4" />
          </video>
        ) : (
          <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 50vw, 90vw" className="object-cover object-top" />
        )}
      </span>
    </span>
  );
}

/** Teléfono inclinado con la captura de celular del caso. */
function PhoneShot({ project: p }: { project: Project }) {
  const src = p.screens?.mobile ?? p.image;
  return (
    <span className="absolute top-[6%] left-1/2 block aspect-[390/844] w-[40%] -translate-x-1/2 rotate-[-7deg] rounded-[2.2rem] bg-[#0b0b0c] p-[7px] shadow-[0_50px_70px_-25px_rgba(0,0,0,0.65)] transition-transform duration-700 ease-(--ease-out) group-hover:rotate-[-3deg] group-hover:-translate-y-2">
      <span className="relative block h-full w-full overflow-hidden rounded-[1.8rem]">
        <Image src={src} alt="" fill sizes="(min-width: 1024px) 18vw, 45vw" className="object-cover object-top" />
        <span className="absolute top-2 left-1/2 h-[18px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
      </span>
    </span>
  );
}
