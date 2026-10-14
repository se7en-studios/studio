"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AnimatePresence,
  motion,
  TargetAndTransition,
  Transition,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { ProjectCard } from "@/components/work/project-card";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE } from "@/lib/motion";
import { brandFonts } from "@/lib/brand-fonts";
import type { Project, ProjectBrand } from "@/types";

// Rueda horizontal de proyectos, en 3D. La sección es alta y su interior
// queda fijo (sticky) mientras se scrollea: cada proyecto es una pantalla
// parada sobre un piso que la refleja (components/work/showcase-scene.tsx).
// La del centro se adelanta y se enciende; las de los costados quedan
// atenuadas. Debajo, el nombre y la frase con la tipografía y el color de su
// marca.

/** Alto de scroll que consume cada proyecto, en vh. */
const STEP_VH = 60;

// three.js pesa: se baja sólo en el cliente y recién cuando la sección está
// cerca de la pantalla.
const ShowcaseScene = dynamic(() => import("@/components/work/showcase-scene"), {
  ssr: false,
});

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Grid({ projects }: { projects: Project[] }) {
  return (
    <div className="mx-auto mt-12 grid w-full max-w-[1400px] grid-cols-1 gap-x-8 gap-y-14 px-6 md:grid-cols-2 md:px-10">
      {projects.map((project, i) => (
        <ProjectCard key={project.slug} project={project} priority={i === 0} index={i % 2} />
      ))}
    </div>
  );
}

export function ProjectWheel({ projects }: { projects: Project[] }) {
  const reduceMotion = useReducedMotion();
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    const check = () => setWebgl(hasWebGL());
    check();
  }, []);

  // Sin la rueda para quien pidió menos movimiento o sin WebGL: la grilla.
  if (reduceMotion || !webgl) return <Grid projects={projects} />;
  return <Wheel projects={projects} />;
}

function Wheel({ projects }: { projects: Project[] }) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const n = projects.length;
  const [mobile, setMobile] = useState(false);
  const [near, setNear] = useState(false);
  // La escena 3D sólo dibuja mientras la sección está en pantalla: montada
  // pero quieta el resto del tiempo (sin cuadros, sin video).
  const [live, setLive] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    const el = sectionRef.current;
    // En el celular, three.js (~1 MB) se baja recién cuando la persona empieza
    // a bajar: la rueda está justo después del hero, así que cargarla al abrir
    // la página trababa el teléfono más de un segundo mientras se leía el hero.
    const phone = window.innerWidth < 768;
    let scrolled = !phone || window.scrollY > 0;
    let close = false;
    const load = () => {
      if (!scrolled || !close) return;
      setNear(true);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      scrolled = true;
      load();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        close = e.isIntersecting;
        load();
      },
      { rootMargin: "250% 0px" },
    );
    if (el) io.observe(el);
    if (!scrolled) window.addEventListener("scroll", onScroll, { passive: true });
    const vis = new IntersectionObserver(([e]) => {
      setLive(e.isIntersecting);
      // Ya en pantalla sin haber bajado (entrar con #work): se arma igual.
      if (e.isIntersecting) onScroll();
    });
    if (el) vis.observe(el);
    // Además se precarga cuando la página ya terminó y el navegador está
    // libre: quien llega de golpe (el link "Casos" del menú) encuentra las
    // pantallas con su imagen, no marcos vacíos. En el celular sólo se baja el
    // código, sin armar la escena (lo que más traba): al empezar a bajar, la
    // rueda aparece antes.
    let idle = 0;
    const warm = () => {
      idle = window.setTimeout(() => {
        if (!phone) setNear(true);
        else (window.requestIdleCallback ?? ((cb: () => void) => cb()))(() => void import("@/components/work/showcase-scene"));
      }, 1500);
    };
    if (document.readyState === "complete") warm();
    else window.addEventListener("load", warm, { once: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("load", warm);
      window.clearTimeout(idle);
      io.disconnect();
      vis.disconnect();
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  const raw = useTransform(scrollYProgress, (p) => p * (n - 1));
  // Resorte corto: suaviza el paso entre proyectos sin sentirse atrasado.
  const pos = useSpring(raw, { stiffness: 160, damping: 28, mass: 0.7 });

  // En el celular la rueda no toma el scroll: se desliza con el dedo a los
  // costados y la página sigue bajando normal. El destino es un índice y el
  // resorte lo acompaña mientras el dedo arrastra.
  const swipeTarget = useMotionValue(0);
  const swipePos = useSpring(swipeTarget, { stiffness: 220, damping: 30, mass: 0.6 });
  const scenePos = mobile ? swipePos : pos;

  const syncActive = (v: number) => {
    const i = Math.min(n - 1, Math.max(0, Math.round(v)));
    setActive((prev) => (prev === i ? prev : i));
  };
  useMotionValueEvent(pos, "change", (v) => !mobile && syncActive(v));
  useMotionValueEvent(swipePos, "change", (v) => mobile && syncActive(v));

  const drag = useRef({ x: 0, y: 0, start: 0, on: false, moved: false });
  const clampIndex = (i: number) => Math.min(n - 1, Math.max(0, i));

  function onPointerDown(e: React.PointerEvent) {
    if (!mobile) return;
    drag.current = { x: e.clientX, y: e.clientY, start: Math.round(swipeTarget.get()), on: false, moved: false };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!mobile || e.buttons === 0 && e.pointerType === "mouse") return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.on) {
      // Sólo se toma el gesto si es claramente horizontal; si no, es scroll.
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) d.on = true;
      else return;
    }
    const w = window.innerWidth * 0.55;
    swipeTarget.set(Math.min(n - 0.7, Math.max(-0.3, d.start - dx / w)));
  }
  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!mobile || !d.on) return;
    const dx = e.clientX - d.x;
    let steps = Math.round(-dx / (window.innerWidth * 0.55));
    if (steps === 0 && Math.abs(dx) > 40) steps = dx < 0 ? 1 : -1;
    swipeTarget.set(clampIndex(d.start + steps));
    d.on = false;
    d.moved = true;
    // El click que sigue al arrastre no tiene que abrir el caso.
    window.setTimeout(() => (d.moved = false), 60);
  }

  function scrollToIndex(i: number) {
    if (mobile) {
      swipeTarget.set(clampIndex(i));
      return;
    }
    const el = sectionRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (travel * i) / (n - 1), behavior: "smooth" });
  }

  function pick(i: number) {
    if (drag.current.moved) return;
    if (i === active) router.push(`/work/${projects[i].slug}`);
    else scrollToIndex(i);
  }

  const current = projects[active];

  return (
    <div
      ref={sectionRef}
      style={{ height: mobile ? "100svh" : `calc(100vh + ${(n - 1) * STEP_VH}vh)` }}
      className="relative mt-28"
    >
      {/* Entrada y salida del escenario negro: fundido con blur, sin corte
          contra el fondo de la página. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-28 z-10 h-40 bg-gradient-to-b from-transparent via-black/70 to-black [mask-image:linear-gradient(to_bottom,transparent,black_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-40 z-10 h-48 bg-gradient-to-b from-black via-black/70 to-transparent [mask-image:linear-gradient(to_top,transparent,black_60%)]"
      />
      {/* Fondo negro puro: el agua sólo tiene que mostrar el reflejo. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        // pan-y: el navegador sigue scrolleando en vertical y el gesto
        // horizontal queda para la rueda.
        style={mobile ? { touchAction: "pan-y" } : undefined}
        className={`sticky top-0 overflow-hidden bg-black ${mobile ? "h-[100svh]" : "h-[100dvh]"}`}
      >
        {/* Luz ambiente del color de la marca activa, detrás de la escena. */}
        <AnimatePresence initial={false}>
          <motion.div
            key={`glow-${current.slug}`}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            style={{
              background: `radial-gradient(ellipse 50% 38% at 50% 34%, ${alpha(accentOf(current), 0.12)}, transparent 70%)`,
            }}
            className="pointer-events-none absolute inset-0"
          />
        </AnimatePresence>

        {near && (
          <ShowcaseScene projects={projects} pos={scenePos} active={active} mobile={mobile} live={live} onPick={pick} />
        )}

        {/* El agua se pierde en negro hacia abajo: así el reflejo se funde y
            los datos del proyecto se leen encima. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[24%] bg-[linear-gradient(to_top,#000_30%,rgba(0,0,0,0.7)_60%,transparent)]"
        />

        {/* Lista accesible: la escena 3D no es navegable con teclado. */}
        <ul className="sr-only">
          {projects.map((p) => (
            <li key={p.slug}>
              <Link href={`/work/${p.slug}`}>{p.name} — {p.category}</Link>
            </li>
          ))}
        </ul>

        {/* Datos del proyecto activo con la personalidad de su marca. */}
        <div
          style={{ width: mobile ? "calc(100% - 48px)" : "min(760px, calc(100% - 80px))" }}
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${mobile ? "bottom-24" : "bottom-[5vh]"}`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <BrandLabel key={current.slug} project={current} mobile={mobile} />
          </AnimatePresence>
        </div>

        {/* Mobile: puntos para saber dónde estás y saltar a un proyecto. */}
        {mobile && (
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1.5">
            {projects.map((p, i) => (
              <button
                key={p.slug}
                aria-label={`Ver ${p.name}`}
                onClick={() => scrollToIndex(i)}
                className="flex h-6 items-center"
              >
                <span
                  className="block h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === active ? 18 : 6,
                    background: i === active ? accentOf(current) : "rgba(245,245,244,0.25)",
                  }}
                />
              </button>
            ))}
          </div>
        )}

        {/* Contador */}
        <div className="pointer-events-none absolute bottom-8 left-6 font-mono text-xs tabular-nums text-muted md:left-10">
          <span className="text-foreground">
            {String(active + 1).padStart(2, "0")}
          </span>{" "}
          / {String(n).padStart(2, "0")}
        </div>
      </div>
    </div>
  );
}

/** Hex #rrggbb + opacidad → #rrggbbaa. */
function alpha(hex: string, a: number) {
  return `${hex}${Math.round(a * 255).toString(16).padStart(2, "0")}`;
}

function accentOf(project: Project) {
  return project.brand?.accent ?? "#ff4d2e";
}

// Cada marca entra a su manera: Takefyy de golpe, Apex con un corte, Poné La
// Pava suave como una revista, Pravilo desde abajo, Muzzaga en diagonal como
// un saque, Sentinel barriendo como un escaneo y Altum abriendo el espaciado.
const ENTRANCES: Record<
  ProjectBrand["entrance"],
  { initial: TargetAndTransition; animate: TargetAndTransition; transition: Transition }
> = {
  slam: {
    initial: { opacity: 0, scale: 1.35, filter: "blur(10px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    transition: { type: "spring", stiffness: 420, damping: 26 },
  },
  wipe: {
    initial: { clipPath: "inset(0 100% 0 0)" },
    animate: { clipPath: "inset(0 0% 0 0)" },
    transition: { duration: 0.55, ease: [0.77, 0, 0.18, 1] },
  },
  soft: {
    initial: { opacity: 0, y: 18, filter: "blur(12px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.95, ease: EASE },
  },
  rise: {
    initial: { opacity: 0, y: 46 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
  slide: {
    initial: { opacity: 0, x: -70, skewX: -14 },
    animate: { opacity: 1, x: 0, skewX: 0 },
    transition: { type: "spring", stiffness: 340, damping: 22 },
  },
  scan: {
    initial: { clipPath: "inset(0 0 100% 0)", opacity: 0.4 },
    animate: { clipPath: "inset(0 0 0% 0)", opacity: 1 },
    transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] },
  },
  spread: {
    initial: { opacity: 0, letterSpacing: "0.4em" },
    animate: { opacity: 1, letterSpacing: "0em" },
    transition: { duration: 1.1, ease: EASE },
  },
};

const BrandLabel = ({
  project,
  mobile,
  ref,
}: {
  project: Project;
  mobile: boolean;
  ref?: React.Ref<HTMLDivElement>;
}) => {
  const brand = project.brand;
  const accent = accentOf(project);
  const entrance = ENTRANCES[brand?.entrance ?? "soft"];
  const fontClass = brand ? brandFonts[brand.font] : "";
  const type: React.CSSProperties = {
    fontWeight: brand?.weight,
    fontStyle: brand?.italic ? "italic" : undefined,
    textTransform: brand?.uppercase ? "uppercase" : undefined,
    letterSpacing:
      brand?.entrance === "spread" ? undefined : brand?.tracking != null ? `${brand.tracking}em` : undefined,
  };
  const tagline = brand?.tagline;
  const hl = brand?.highlight && tagline?.includes(brand.highlight) ? brand.highlight : null;
  const [before, after] = hl && tagline ? tagline.split(hl) : [tagline, ""];

  return (
    <motion.div
      ref={ref}
      exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
      className={`[text-shadow:0_2px_24px_rgba(0,0,0,0.95)] ${mobile ? "flex flex-col items-start gap-4" : "flex items-end justify-between gap-6"}`}
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted">
          <span style={{ color: accent }}>{project.number}</span>
          <span className="mx-2 text-border">/</span>
          {project.category.split("/")[0].trim()} · {project.year}
        </p>
        <motion.div
          initial={entrance.initial}
          animate={entrance.animate}
          transition={entrance.transition}
          style={{ transformOrigin: "left bottom" }}
          className={fontClass}
        >
          <p
            style={type}
            className={`mt-2 leading-[0.95] text-foreground ${mobile ? "text-4xl" : "text-5xl lg:text-6xl"}`}
          >
            {project.name}
          </p>
          {tagline && (
            <p
              style={{ ...type, fontWeight: brand?.font === "outfit" ? 500 : type.fontWeight }}
              className={`mt-2 leading-tight text-muted ${mobile ? "text-base" : "text-lg lg:text-xl"}`}
            >
              {before}
              {hl && <span style={{ color: accent }}>{hl}</span>}
              {after}
            </p>
          )}
        </motion.div>
      </div>
      <Link
        href={`/work/${project.slug}`}
        // --brand: el hover rellena con el color de la marca.
        style={{ borderColor: alpha(accent, 0.5), color: accent, ["--brand" as string]: accent }}
        className="focus-ring pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-wide transition-colors duration-300 hover:!bg-[var(--brand)] hover:!text-background"
      >
        Ver caso
        <ArrowUpRight size={13} />
      </Link>
    </motion.div>
  );
};
