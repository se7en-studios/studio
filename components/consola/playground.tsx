"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Frame, Hand, MousePointer2, PenTool, Sparkles, Square, Type } from "lucide-react";
import { pared, type PiezaPared } from "@/data/pared";
import { projects } from "@/data/projects";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { RdButton } from "@/components/rd/primitives";
import { CsSection } from "@/components/consola/section";

// La pared: un lienzo grande con funciones reales de los casos (capturas de
// los sitios en vivo y de las apps por dentro, ver scripts/pared.mjs). Se
// arrastra para recorrerlo; el titular queda quieto en el medio.

const COL = 300;
const GAP = 30;
/** Lo que ocupa el nombre de la capa arriba de cada pieza. */
const LABEL = 24;
const COLS = 7;
/** Las capturas de celular son muy altas: se cortan a esto, desde arriba. */
const MAX_H = 400;
/** Hueco libre en el medio del lienzo, para el titular. */
const HOLE = { w: 560, h: 380 };

const accent = Object.fromEntries(projects.map((p) => [p.slug, p.brand?.accent ?? "#ff4d2e"]));

type Placed = PiezaPared & { x: number; y: number; dh: number };

/** Reparte las piezas en columnas (la más corta primero), salteando el hueco del medio. */
function layout() {
  const width = COLS * (COL + GAP) + GAP;
  const total = pared.reduce((s, p) => s + Math.min(MAX_H, (COL * p.h) / p.w) + LABEL + GAP, 0);
  const height = Math.max(HOLE.h + 700, total / COLS + HOLE.h / 2 + GAP * 2);
  const hole = { x0: (width - HOLE.w) / 2, x1: (width + HOLE.w) / 2, y0: (height - HOLE.h) / 2, y1: (height + HOLE.h) / 2 };
  const cols = Array.from({ length: COLS }, (_, i) => ({ x: GAP + i * (COL + GAP), y: GAP + (i % 2) * 70 }));
  const placed: Placed[] = [];
  for (const p of pared) {
    const dh = Math.min(MAX_H, (COL * p.h) / p.w);
    const c = cols.reduce((a, b) => (b.y < a.y ? b : a));
    let y = c.y;
    const inHoleX = c.x < hole.x1 && c.x + COL > hole.x0;
    if (inHoleX && y < hole.y1 && y + LABEL + dh > hole.y0) y = hole.y1 + GAP;
    placed.push({ ...p, x: c.x, y, dh });
    c.y = y + LABEL + dh + GAP;
  }
  return { placed, width, height: Math.max(height, ...cols.map((c) => c.y)), hole };
}

/** El reparto no depende de nada de afuera: se calcula una vez. */
const { placed, width, height, hole } = layout();

export function CsPlayground() {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const vel = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; sx: number; sy: number; ox: number; oy: number; t: number; moved: boolean } | null>(null);
  const moved = useRef(false);
  const raf = useRef(0);
  const [grabbing, setGrabbing] = useState(false);

  const apply = () => {
    const el = canvas.current;
    if (el) el.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
  };
  /** El lienzo no se va del todo: siempre queda un borde de piezas a la vista. */
  const clamp = (x: number, y: number) => {
    const b = box.current;
    if (!b) return { x, y };
    const m = 120;
    return {
      x: Math.min(m, Math.max(b.clientWidth - width - m, x)),
      y: Math.min(m, Math.max(b.clientHeight - height - m, y)),
    };
  };

  // Arranca con el hueco del titular centrado en la pantalla (el lienzo puede ser más alto abajo).
  useEffect(() => {
    const center = () => {
      const b = box.current;
      if (!b) return;
      pos.current = clamp(b.clientWidth / 2 - (hole.x0 + hole.x1) / 2, b.clientHeight / 2 - (hole.y0 + hole.y1) / 2);
      apply();
    };
    center();
    window.addEventListener("resize", center);
    return () => {
      window.removeEventListener("resize", center);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const moveBy = (dx: number, dy: number) => {
    pos.current = clamp(pos.current.x + dx, pos.current.y + dy);
    apply();
  };

  /** Al soltar, sigue un poco con la velocidad que traía. */
  const glide = () => {
    if (reduced) return;
    const step = () => {
      vel.current.x *= 0.92;
      vel.current.y *= 0.92;
      if (Math.abs(vel.current.x) + Math.abs(vel.current.y) < 0.3) return;
      moveBy(vel.current.x, vel.current.y);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    cancelAnimationFrame(raf.current);
    drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: pos.current.x, oy: pos.current.y, t: e.timeStamp, moved: false };
    vel.current = { x: 0, y: 0 };
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.sx, dy = e.clientY - d.sy;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setGrabbing(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (!d.moved) return;
    const prev = pos.current;
    pos.current = clamp(d.ox + dx, d.oy + dy);
    const dt = Math.max(1, e.timeStamp - d.t);
    vel.current = { x: ((pos.current.x - prev.x) / dt) * 16, y: ((pos.current.y - prev.y) / dt) * 16 };
    d.t = e.timeStamp;
    apply();
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    setGrabbing(false);
    moved.current = !!d?.moved;
    if (d?.moved) glide();
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] }[e.key];
    if (!k) return;
    e.preventDefault();
    moveBy(k[0], k[1]);
  };

  return (
    <CsSection id="piezas" label="Funciones de nuestros proyectos" className="pt-28 md:pt-40">
      <div
        ref={box}
        tabIndex={0}
        role="region"
        aria-label="Pared de funciones de nuestros proyectos. Arrastrá o usá las flechas para recorrerla."
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        // Un arrastre no es un clic: si se movió, no se abre la pieza de abajo.
        onClickCapture={(e) => {
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
            moved.current = false;
          }
        }}
        className={`cs-wall cs-canvas relative h-[620px] overflow-hidden rounded-(--cs-radius) border border-(--paper)/[0.07] select-none md:h-[720px] ${
          grabbing ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        <div ref={canvas} className="absolute top-0 left-0 will-change-transform" style={{ width, height }}>
          {placed.map((p) => (
            <WallPiece key={p.layer} piece={p} />
          ))}
        </div>

        {/* Penumbra en el medio, para que el titular se lea sobre lo que pasa por abajo. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(30%_28%_at_50%_50%,rgb(15_15_17/0.92),rgb(15_15_17/0.6)_60%,transparent_100%)]"
        />
        <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center">
          <p className="rd-body mb-5 flex items-center gap-2 text-[13px] text-(--paper)/55">
            <Hand size={15} aria-hidden /> Arrastrá para moverte
          </p>
          <h2 className="cs-h2 max-w-[15ch] text-[clamp(1.8rem,3.2vw,3rem)]">
            Funciones que ya <span className="rd-serif text-(--signal)">venden</span> por nuestros clientes
          </h2>
          <p className="rd-body mt-3 max-w-[34ch] text-[14px] text-(--paper)/65">
            Paneles, cartas, mapas y turneros en producción. Recorré la pared o tocá una pieza para ver el caso.
          </p>
          <div data-no-drag className="pointer-events-auto mt-7">
            <RdButton href="/work">Ver los casos</RdButton>
          </div>
        </div>

        <Cursor name="Franco" className="cs-cursor-a top-[24%] left-[18%]" color="var(--signal)" />
        <Cursor name="Federico" className="cs-cursor-b top-[66%] left-[70%]" color="var(--paper)" />

        <div
          aria-hidden
          className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-(--paper)/10 bg-[#1a1a1d] p-1.5 shadow-[0_20px_40px_-15px_#000]"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-(--signal) text-(--ink)">
            <MousePointer2 size={16} />
          </span>
          {[Frame, Square, PenTool, Type, Sparkles].map((Icon, i) => (
            <span key={i} className="grid h-9 w-9 place-items-center rounded-xl text-(--paper)/70">
              <Icon size={16} />
            </span>
          ))}
          <span className="mx-1 hidden h-6 w-px bg-(--paper)/10 sm:block" />
          <span className="rd-label hidden h-9 items-center rounded-xl bg-(--paper)/[0.06] px-3 text-[10px] text-(--paper)/60 sm:flex">
            {"</>"} {pared.length} funciones
          </span>
        </div>
      </div>
    </CsSection>
  );
}

function WallPiece({ piece: p }: { piece: Placed }) {
  return (
    <Link
      href={`/work/${p.slug}`}
      draggable={false}
      className="group absolute block"
      style={{ left: p.x, top: p.y, width: COL }}
    >
      <span className="rd-label mb-2 flex h-4 items-center gap-1.5 text-[9.5px] text-(--paper)/45 transition-colors group-hover:text-(--paper)/80">
        <span aria-hidden style={{ color: accent[p.slug] }}>
          ◆
        </span>
        {p.layer}
      </span>
      <span
        className="relative block overflow-hidden rounded-[18px] bg-[#151517] shadow-[-10px_24px_40px_-18px_#000] ring-1 ring-white/10 transition-[transform,box-shadow] duration-500 ease-(--ease-out) group-hover:-translate-y-1 group-hover:ring-2 group-hover:ring-(--signal)/60"
        style={{ height: p.dh }}
      >
        <Image
          src={p.src}
          alt={p.caption}
          width={p.w}
          height={p.h}
          draggable={false}
          sizes="300px"
          className="pointer-events-none block h-full w-full object-cover object-top"
        />
        <span className="rd-body absolute inset-x-3 bottom-3 flex translate-y-2 items-center gap-2 rounded-xl bg-black/70 px-3 py-2 text-[12.5px] text-white opacity-0 backdrop-blur transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: accent[p.slug] }} />
          {p.caption}
        </span>
      </span>
    </Link>
  );
}

function Cursor({ name, className, color }: { name: string; className: string; color: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute z-30 ${className}`}>
      <MousePointer2 size={20} fill={color} stroke="#070708" strokeWidth={1.4} />
      <span className="rd-body ml-4 -mt-1 block rounded-md px-2 py-0.5 text-[12px]" style={{ background: color, color: "#0b0b0c" }}>
        {name}
      </span>
    </div>
  );
}
