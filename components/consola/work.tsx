"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { projects } from "@/data/projects";
import { stickers } from "@/data/stickers";
import { iphoneMarco } from "@/data/iphone-marco";
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
      <Stickers slug={p.slug} wide={wide} />
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
      <span aria-hidden className="cs-light pointer-events-none absolute inset-0" />
      {/* Velo del color de marca abajo, para que el nombre se lea sobre la captura. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[38%]"
        style={{
          background: `linear-gradient(to top, color-mix(in srgb, ${accent} 78%, ${fg === "#0b0b0c" ? "white" : "black"}) 0%, color-mix(in srgb, ${accent} 60%, transparent) 50%, transparent 100%)`,
        }}
      />

      <span className="rd-label absolute top-5 right-5 rounded-full px-2.5 py-1 text-[10px]" style={{ background: fg, color: accent }}>
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

/**
 * Dónde cae cada sticker: centro (x, y) y ancho, en % de la tarjeta, y giro.
 * Rodean la captura y se esconden un poco detrás de ella o del borde, como
 * pegados sobre la mesa. La ancha deja libres los costados de la ventana; la
 * angosta (y la ancha en celular, que también va con teléfono), los del teléfono.
 */
type Slot = [x: number, y: number, w: number, rot: number];
const SLOTS_WIDE: Slot[] = [
  [8, 22, 13, -12],
  [13, 50, 14, 8],
  [5, 72, 11, -5],
  [92, 28, 13, 12],
  [87, 56, 14, -9],
  [96, 78, 10, 6],
  [30, 5, 10, 14],
  [70, 4, 11, -10],
];
const SLOTS_NARROW: Slot[] = [
  [13, 15, 25, -12],
  [21, 40, 22, 10],
  [8, 63, 21, -6],
  [87, 14, 23, 12],
  [80, 39, 24, -8],
  [93, 62, 21, 6],
  [27, 79, 17, 14],
  [74, 80, 17, -12],
];

/** Mezcla fija por caso (no cambia entre servidor y cliente): cada tarjeta arranca con otro objeto. */
function order(slug: string, n: number) {
  let s = [...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

/**
 * Stickers del rubro de cada caso detrás de la captura (fotos de Flow, ver
 * scripts/stickers.mjs). Cada lámina trae los mismos 8 objetos dos veces
 * (a y b): se toma uno de cada objeto, alternando la versión. Al pasar el
 * mouse se abren un poco hacia afuera.
 */
function Stickers({ slug, wide }: { slug: string; wide: boolean }) {
  const all = stickers[slug];
  if (!all?.length) return null;
  const half = all.length / 2;
  const pick = order(slug, half).map((k, i) => all[i % 2 ? k + half : k]);
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {SLOTS_NARROW.map((n, i) => {
        const s = pick[i % pick.length];
        const w = SLOTS_WIDE[i];
        const style = {
          "--nx": `${n[0]}%`,
          "--ny": `${n[1]}%`,
          "--nw": `${n[2]}%`,
          "--nr": `${n[3]}deg`,
          "--ndx": `${(n[0] - 50) / 2.5}px`,
          "--ndy": `${(n[1] - 50) / 2.5}px`,
          "--x": `${w[0]}%`,
          "--y": `${w[1]}%`,
          "--w": `${w[2]}%`,
          "--r": `${w[3]}deg`,
          "--dx": `${(w[0] - 50) / 2.5}px`,
          "--dy": `${(w[1] - 50) / 2.5}px`,
        } as CSSProperties;
        // Cada uno flota a su ritmo.
        const bob = { animationDelay: `${-i * 0.8}s`, animationDuration: `${6 + (i % 3)}s` };
        return (
          <span key={i} className={`cs-sticker ${wide ? "cs-sticker--wide" : ""}`} style={style}>
            <span className="cs-sticker__push">
              <Image
                src={s.src}
                alt=""
                width={s.w}
                height={s.h}
                sizes="(min-width: 1024px) 12vw, 25vw"
                className="cs-sticker__img cs-bob"
                style={bob}
              />
            </span>
          </span>
        );
      })}
    </span>
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
    <span className="absolute top-[9%] left-1/2 block w-[80%] -translate-x-1/2 overflow-hidden rounded-t-[14px] bg-[#0b0b0c] shadow-[-24px_44px_80px_-30px_rgba(0,0,0,0.65)] transition-transform duration-700 ease-(--ease-out) group-hover:-translate-y-2 lg:w-[72%]">
      <span className="flex h-8 items-center gap-1.5 bg-[#1a1a1c] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
        <span className="rd-body mx-auto rounded-md bg-white/[0.07] px-3 py-0.5 text-[11px] text-white/60">{host}</span>
      </span>
      {/* La pantalla con la proporción de la captura (16:10): entera a lo ancho; si sobra, se corta abajo con la tarjeta. */}
      <span className="relative block aspect-[16/10]">
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

/**
 * Color de la barra de estado de cada caso: el del borde de arriba de su
 * captura de celular, como lo pinta Safari con el color del sitio.
 */
const STATUS_BAR: Record<string, string> = {
  "altum-sci": "#f6f7fc",
  "apex-ai": "#0e0e0d",
  "iphone-vita": "#f5f5f7",
  muzzaga: "#0c0c12",
  "pone-la-pava": "#467650",
  pravilo: "#0c0a0b",
  sentinel: "#050810",
  takefyy: "#211312",
};

/**
 * Teléfono inclinado: el marco es una foto real de iPhone (Flow, ver
 * scripts/iphone-marco.mjs) y la pantalla va detrás, en el hueco medido. La
 * pantalla es la barra de estado más la captura entera (390×790) a lo ancho:
 * nada se recorta y la isla del marco cae sobre la barra, no sobre el sitio.
 * Las medidas de adentro van en cqw (ancho de la pantalla).
 */
function PhoneShot({ project: p }: { project: Project }) {
  const mobile = p.screens?.mobile;
  const bar = STATUS_BAR[p.slug] ?? "#0b0b0c";
  const ink = onAccent(bar);
  const { screen } = iphoneMarco;
  return (
    <span
      className="cs-phone absolute top-[7%] left-1/2 block w-[33%] -translate-x-1/2 rotate-[-7deg] transition-transform duration-700 ease-(--ease-out) group-hover:rotate-[-3deg] group-hover:-translate-y-2"
      style={{ aspectRatio: `${iphoneMarco.w} / ${iphoneMarco.h}` }}
    >
      <span
        className="absolute flex flex-col overflow-hidden [container-type:inline-size]"
        style={{
          left: `${screen.x}%`,
          top: `${screen.y}%`,
          width: `${screen.w}%`,
          height: `${screen.h}%`,
          borderRadius: "12% / 5.5%",
          background: bar,
        }}
      >
        <span className="flex flex-1 items-center justify-between px-[9cqw]" style={{ color: ink }}>
          <span className="text-[4.1cqw] font-semibold tracking-[-0.02em] tabular-nums" style={{ fontFamily: "system-ui, sans-serif" }}>
            9:41
          </span>
          <StatusIcons />
        </span>
        {mobile ? (
          <Image src={mobile} alt="" width={390} height={790} sizes="(min-width: 1024px) 16vw, 40vw" className="block h-auto w-full shrink-0" />
        ) : (
          <span className="relative block aspect-[390/790] shrink-0">
            <Image src={p.image} alt="" fill sizes="(min-width: 1024px) 16vw, 40vw" className="object-cover object-top" />
          </span>
        )}
      </span>
      <Image src={iphoneMarco.src} alt="" fill sizes="(min-width: 1024px) 16vw, 40vw" className="pointer-events-none select-none" />
    </span>
  );
}

/** Señal, wifi y batería de la barra de estado, en el color del texto. */
function StatusIcons() {
  return (
    <span className="flex items-center gap-[1.4cqw]">
      <svg viewBox="0 0 18 12" className="h-[2.9cqw] w-auto" fill="currentColor" aria-hidden>
        <rect x="0" y="8" width="3" height="4" rx="0.8" />
        <rect x="5" y="5.5" width="3" height="6.5" rx="0.8" />
        <rect x="10" y="3" width="3" height="9" rx="0.8" />
        <rect x="15" y="0" width="3" height="12" rx="0.8" />
      </svg>
      <svg viewBox="0 0 16 12" className="h-[2.9cqw] w-auto" fill="currentColor" aria-hidden>
        <path d="M8 2.2c2.5 0 4.8 1 6.5 2.6l1.2-1.3A11 11 0 0 0 8 .4 11 11 0 0 0 .3 3.5l1.2 1.3A9.2 9.2 0 0 1 8 2.2Zm0 3.6c1.5 0 2.9.6 3.9 1.5l1.2-1.3A7.4 7.4 0 0 0 8 4a7.4 7.4 0 0 0-5.1 2l1.2 1.3c1-.9 2.4-1.5 3.9-1.5Zm0 3.6c.6 0 1.1.2 1.5.5L8 11.6 6.5 9.9c.4-.3.9-.5 1.5-.5Z" />
      </svg>
      <svg viewBox="0 0 27 13" className="h-[3cqw] w-auto" aria-hidden>
        <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" strokeOpacity="0.4" />
        <rect x="2" y="2" width="20" height="9" rx="2.2" fill="currentColor" />
        <path d="M25 4.5v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2Z" fill="currentColor" fillOpacity="0.45" />
      </svg>
    </span>
  );
}
