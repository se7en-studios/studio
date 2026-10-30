"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, X } from "lucide-react";
import type { EnVivoPublic } from "@/app/api/en-vivo/route";
import type { VisitorsNow } from "@/lib/visitas";
import { pixel } from "@/lib/site-fonts";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { useVisitors } from "@/lib/use-visitors";
import {
  EASE_IO,
  EASE_OUT,
  RdLabel,
  RdLines,
  RdReveal,
  RdRoll,
} from "@/components/rd/primitives";

// «En vivo» en la landing: un fichín con la oficina adentro. La intro (la
// cámara llega al fichín y se prende) arranca al verse; en la pantalla queda un
// cartel con quién está conectado. Al tocarla, el panel se suelta de la página
// y crece a pantalla completa mientras la cámara se mete en la pantalla, y la
// oficina (el mismo mapa del panel, en modo público: sólo mirar) se abre desde
// el vidrio. Al salir, todo vuelve a su lugar.
//
// El mapa (motor, arte y tipografía) recién se baja cuando el fichín terminó de
// prenderse, y corre sólo mientras estás adentro: no suma nada a la carga.

const loadMap = () =>
  import("@/components/sections/en-vivo-map").then((m) => m.EnVivoMap);
const EnVivoMap = dynamic(loadMap, { ssr: false });

// Los dos clips salen de una misma toma (public/en-vivo/README.md): la intro
// termina en el cuadro 144 y el zoom arranca en el 145, así que el corte no se ve.
const V = "/en-vivo";
const CLIPS = {
  intro: {
    webm: `${V}/arcade-intro-2026-10.webm`,
    mp4: `${V}/arcade-intro-2026-10.mp4`,
    mobile: `${V}/arcade-intro-m-2026-10.mp4`,
  },
  zoom: {
    webm: `${V}/arcade-zoom-2026-10.webm`,
    mp4: `${V}/arcade-zoom-2026-10.mp4`,
    mobile: `${V}/arcade-zoom-m-2026-10.mp4`,
  },
};
const POSTER = {
  inicio: `${V}/arcade-inicio-2026-10.jpg`,
  frente: `${V}/arcade-frente-2026-10.jpg`,
};

type Box = { l: number; t: number; w: number; h: number };
/** La pantalla del fichín en el cuadro (fracciones de 1920×1080), medida sobre el video. */
const SCREEN_ON: Box = { l: 718 / 1920, t: 353 / 1080, w: 517 / 1920, h: 383 / 1080 };
/** La misma pantalla al final del zoom. */
const SCREEN_IN: Box = { l: 382 / 1920, t: 93 / 1080, w: 1295 / 1920, h: 974 / 1080 };
/** El vidrio plano dentro de SCREEN_IN: por ahí se abre la oficina. */
const GLASS: Box = { l: 397 / 1920, t: 113 / 1080, w: 1260 / 1920, h: 934 / 1080 };
/** Cuánto más grande se ve la pantalla al final del zoom que de frente. */
const ZOOM_K = 2.52;

const center = (b: Box) => ({ x: b.l + b.w / 2, y: b.t + b.h / 2 });
const pct = (b: Box) => ({
  left: `${b.l * 100}%`,
  top: `${b.t * 100}%`,
  width: `${b.w * 100}%`,
  height: `${b.h * 100}%`,
});

/**
 * Dónde cae `box` en la ventana con el panel en `p` y la etapa sin escala: la
 * etapa es un 16:9 que cubre el panel (ver .rd-arcade-stage).
 */
function boxIn(p: DOMRect, box: Box) {
  const w = Math.max(p.width, (p.height * 16) / 9);
  const h = (w * 9) / 16;
  const left = p.left + (p.width - w) / 2;
  const top = p.top + (p.height - h) / 2;
  const c = center(box);
  return {
    cx: left + c.x * w,
    cy: top + c.y * h,
    hw: (box.w * w) / 2,
    hh: (box.h * h) / 2,
  };
}

/**
 * El panel crece y vuelve sin cambiar de tamaño: queda fijo a pantalla completa
 * y se recorta al hueco de la página, mientras la etapa (ajustada a la ventana)
 * se mueve y se achica hasta donde estaría ajustada al hueco. Las dos son 16:9,
 * así que alcanza con mover y escalar: nada se vuelve a acomodar ni a dibujar
 * en cada cuadro.
 */
function slotFlip(slot: DOMRect, radius: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const f =
    Math.max(slot.width, (slot.height * 16) / 9) / Math.max(vw, (vh * 16) / 9);
  const dx = slot.left + slot.width / 2 - vw / 2;
  const dy = slot.top + slot.height / 2 - vh / 2;
  /** k=0: en el hueco; k=1: a pantalla completa. */
  return (k: number) => {
    const q = 1 - k;
    return {
      clip: `inset(${slot.top * q}px ${(vw - slot.right) * q}px ${(vh - slot.bottom) * q}px ${slot.left * q}px round ${radius * q}px)`,
      transform: `translate(${dx * q}px, ${dy * q}px) scale(${f + (1 - f) * k})`,
    };
  };
}

/** El recorte del vidrio agrandado `z` veces desde su centro, con las esquinas del tubo. */
function glassClip(g: ReturnType<typeof boxIn>, z: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const { cx, cy, hw, hh } = g;
  return `inset(${cy - z * hh}px ${vw - cx - z * hw}px ${vh - cy - z * hh}px ${cx - z * hw}px round ${z * hw * 0.16}px / ${z * hh * 0.2}px)`;
}

const NAMES = { federico: "Federico", franco: "Franco" } as const;

type Phase = "idle" | "intro" | "ready" | "enter" | "open" | "leave";

/** Curva cúbica como las de CSS, para animar a mano varias cosas en el mismo cuadro. */
function bezier([x1, y1, x2, y2]: readonly [number, number, number, number]) {
  const at = (t: number, a: number, b: number) =>
    ((1 - 3 * b + 3 * a) * t * t + (3 * b - 6 * a) * t + 3 * a) * t;
  return (x: number) => {
    if (x <= 0 || x >= 1) return x;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 20; i++) {
      const v = at(t, x1, x2);
      if (Math.abs(v - x) < 1e-4) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return at(t, y1, y2);
  };
}
const easeIO = bezier(EASE_IO);
const easeOut = bezier(EASE_OUT);

function tween(ms: number, ease: (t: number) => number, on: (k: number) => void) {
  return new Promise<void>((done) => {
    const t0 = performance.now();
    const step = (now: number) => {
      const t = ms <= 0 ? 1 : Math.min(1, (now - t0) / ms);
      on(ease(t));
      if (t < 1) requestAnimationFrame(step);
      else done();
    };
    requestAnimationFrame(step);
  });
}
const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
}

/** Reproduce el clip hasta el final. `false` si no pudo (sin datos, bloqueado). */
function playThrough(v: HTMLVideoElement, onPlaying: () => void) {
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      v.removeEventListener("ended", ended);
      v.removeEventListener("playing", onPlaying);
      resolve(ok);
    };
    const ended = () => finish(true);
    const timer = window.setTimeout(() => finish(false), 7000);
    v.addEventListener("ended", ended);
    v.addEventListener("playing", onPlaying, { once: true });
    v.currentTime = 0;
    v.play().catch(() => finish(false));
  });
}

/**
 * Mientras estás adentro la página no se mueve: sin barra (compensada para que
 * nada salte) y sin que la rueda le llegue al scroll suave (Lenis escucha en
 * window, así que se corta en la captura).
 */
function lockScroll() {
  const html = document.documentElement;
  const gap = window.innerWidth - html.clientWidth;
  const block = (e: Event) => {
    e.stopPropagation();
    e.preventDefault();
  };
  html.style.overflow = "hidden";
  if (gap > 0) html.style.paddingRight = `${gap}px`;
  window.addEventListener("wheel", block, { capture: true, passive: false });
  return () => {
    html.style.overflow = "";
    html.style.paddingRight = "";
    window.removeEventListener("wheel", block, { capture: true });
  };
}

/** La hora de Buenos Aires (HH:MM), recién después de montar. */
function useClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/Argentina/Buenos_Aires",
    });
    const tick = () => setNow(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Quién está del estudio, en una frase. null mientras no llega. */
function statusOf(online: EnVivoPublic["online"] | null) {
  if (!online) return null;
  if (!online.length) return "El guía te muestra la oficina";
  if (online.length > 1) return "Federico y Franco están laburando";
  return `${NAMES[online[0].who]} está laburando`;
}

function watchingOf(v: VisitorsNow | null) {
  if (!v || !v.total) return null;
  return v.total === 1 ? "Sólo vos mirando" : `Vos y ${v.total - 1} más mirando`;
}

export function RdArcade() {
  const reduced = useReducedMotion();
  // Cada visita de la landing cuenta (y camina por la oficina), aunque no entre
  const visitors = useVisitors();
  const clock = useClock();

  const frameRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLSpanElement>(null);
  const frontRef = useRef<HTMLSpanElement>(null);
  const introRef = useRef<HTMLVideoElement>(null);
  const zoomRef = useRef<HTMLVideoElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  /** La despedida de la oficina (tu muñeco entra al fichín): la deja el mapa, ver EnVivoMap. */
  const exitRef = useRef<(() => number) | null>(null);
  const byeRef = useRef(false);
  /** Espera la despedida del mapa; false si ya había una en curso (un segundo Esc no sale dos veces). */
  async function farewell() {
    if (byeRef.current) return false;
    const ms = exitRef.current?.() ?? 0;
    if (!ms) return true;
    byeRef.current = true;
    await new Promise((r) => window.setTimeout(r, ms));
    byeRef.current = false;
    return true;
  }
  const flashRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const unlockRef = useRef<(() => void) | null>(null);
  const readyRef = useRef<ReturnType<typeof deferred> | null>(null);
  /** Cómo se abrió la oficina, para cerrarla por el mismo camino. */
  const openedRef = useRef<Box | null>(null);
  /** Si la cámara llegó a meterse en la pantalla (el clip del zoom se vio entero). */
  const zoomedRef = useRef(false);
  /** Sin movimiento: la oficina aparece y desaparece con un fundido, sin viaje. */
  const simpleRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [poster, setPoster] = useState<"inicio" | "frente">("inicio");
  const [screen, setScreen] = useState<"off" | "on" | "bye">("off");
  const [inView, setInView] = useState(false);
  const [mapOn, setMapOn] = useState(false);
  /** El mapa se arma al tocar pero recién dibuja cuando se abre el vidrio: no le roba cuadros al zoom. */
  const [live, setLive] = useState(false);
  const [signal, setSignal] = useState<"ok" | "loading" | "lost">("ok");
  const [online, setOnline] = useState<EnVivoPublic["online"] | null>(null);

  // Se prende cuando se ve más o menos la mitad del fichín
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.4,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const ready = useCallback(() => {
    // La intro también puede terminar con la entrada ya en marcha: ahí no se toca nada
    if (phaseRef.current !== "idle" && phaseRef.current !== "intro") return;
    setPhase("ready");
    setScreen("on");
    // Lo que hace falta para entrar ya, mientras mirás el cartel
    const zoom = zoomRef.current;
    if (zoom && zoom.preload !== "auto") {
      zoom.preload = "auto";
      zoom.load();
    }
    loadMap().catch(() => {});
  }, []);

  useEffect(() => {
    if (phase !== "idle" || !inView) return;
    const intro = introRef.current;
    const saveData = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection?.saveData;
    if (reduced || saveData || !intro) {
      setPoster("frente");
      ready();
      return;
    }
    setPhase("intro");
    intro.play().catch(() => {
      // Sin autoplay (ahorro de batería, por ejemplo): directo al fichín prendido
      setPoster("frente");
      ready();
    });
  }, [phase, inView, reduced, ready]);

  // Quién está del estudio, para el cartel: mientras el fichín se ve
  useEffect(() => {
    if (!inView) return;
    let gone = false;
    const load = () =>
      fetch("/api/en-vivo")
        .then((r) => (r.ok ? (r.json() as Promise<EnVivoPublic>) : null))
        .then((d) => {
          if (!gone && d) setOnline(d.online);
        })
        .catch(() => {});
    load();
    const id = window.setInterval(load, 30_000);
    return () => {
      gone = true;
      window.clearInterval(id);
    };
  }, [inView]);

  // Si la página se va (por ejemplo, al tocar una sala), la página vuelve a scrollear
  useEffect(() => () => unlockRef.current?.(), []);

  const onMapReady = useCallback(() => readyRef.current?.resolve(), []);

  /** Abre la oficina desde `box` (en fracciones del cuadro): el vidrio crece hasta llenar la pantalla. */
  async function reveal(box: Box) {
    const panel = panelRef.current;
    const layer = layerRef.current;
    const stage = stageRef.current;
    const map = mapRef.current;
    const flash = flashRef.current;
    if (!panel || !layer || !stage || !map || !flash) return;
    const g = boxIn(panel.getBoundingClientRect(), box);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Hasta que las esquinas redondeadas del vidrio salgan de la pantalla
    const S =
      Math.max(g.cx / g.hw, (vw - g.cx) / g.hw, g.cy / g.hh, (vh - g.cy) / g.hh) * 1.3;
    openedRef.current = box;
    setLive(true);
    const c = center(box);
    stage.style.transition = "none";
    stage.style.transformOrigin = `${c.x * 100}% ${c.y * 100}%`;
    layer.style.clipPath = glassClip(g, 1);
    layer.style.visibility = "visible";
    await tween(1050, easeIO, (k) => {
      // Escala exponencial: la velocidad del viaje se siente pareja
      const z = S ** k;
      stage.style.scale = String(z);
      layer.style.clipPath = glassClip(g, z);
      map.style.transform = `scale(${0.84 + 0.16 * k})`;
      // El tubo se prende: un fogonazo corto al abrir el vidrio
      flash.style.opacity = String(Math.max(0, 0.55 - k * 2.2));
    });
    layer.style.clipPath = "none";
    map.style.transform = "";
  }

  async function enter() {
    if (phase !== "idle" && phase !== "intro" && phase !== "ready") return;
    const panel = panelRef.current;
    const zoom = zoomRef.current;
    const intro = introRef.current;
    if (!panel || (!zoom && !reduced)) return;
    // Si la intro no terminó, al volver el fichín ya está de frente y prendido
    const early = phase !== "ready";
    phaseRef.current = "enter";
    setPhase("enter");
    setScreen((s) => (s === "on" ? "bye" : "off"));
    setSignal("ok");
    readyRef.current = deferred();
    setMapOn(true);
    unlockRef.current = lockScroll();

    const mapReady = Promise.race([
      readyRef.current.promise.then(() => true),
      wait(12_000).then(() => false),
    ]);

    simpleRef.current = reduced || !zoom;
    if (simpleRef.current || !zoom) {
      if (!(await mapReady)) return setSignal("lost");
      const layer = layerRef.current;
      setLive(true);
      if (layer) {
        layer.style.opacity = "0";
        layer.style.visibility = "visible";
        await tween(250, (t) => t, (k) => (layer.style.opacity = String(k)));
      }
      setPhase("open");
      return;
    }

    // El panel se suelta de la página y crece hasta llenar la pantalla
    const stage = stageRef.current;
    const flip = slotFlip(
      panel.getBoundingClientRect(),
      parseFloat(getComputedStyle(panel).borderTopLeftRadius) || 0,
    );
    const place = (k: number) => {
      const p = flip(k);
      panel.style.clipPath = p.clip;
      if (stage) stage.style.transform = p.transform;
    };
    place(0);
    Object.assign(panel.style, { position: "fixed", zIndex: "130", borderRadius: "0" });
    const grow = tween(950, easeIO, place);

    // La pantalla termina de apagarse y la cámara se mete
    await wait(260);
    const zoomed = await playThrough(zoom, () => {
      zoom.style.opacity = "1";
      if (!early) return;
      // Tapado por el zoom, el fichín queda de frente para cuando vuelvas
      window.setTimeout(() => {
        setPoster("frente");
        if (intro) {
          intro.pause();
          intro.style.visibility = "hidden";
        }
      }, 250);
    });
    zoomedRef.current = zoomed;
    await grow;
    // Ya a pantalla completa: sin recorte, sigue el tamaño de la ventana (barra del celular, etc.)
    panel.style.clipPath = "";
    if (stage) stage.style.transform = "";

    let ok = await Promise.race([
      readyRef.current.promise.then(() => true),
      wait(0).then(() => false),
    ]);
    if (!ok) {
      setSignal("loading");
      ok = await mapReady;
      if (!ok) return setSignal("lost");
      setSignal("ok");
    }
    await reveal(zoomed ? GLASS : SCREEN_ON);
    setPhase("open");
  }

  async function leave() {
    if (phase !== "open" && signal !== "lost") return;
    // Primero tu muñeco vuelve a entrar al fichín de la oficina (con movimiento reducido, nada)
    if (phase === "open" && !(await farewell())) return;
    const panel = panelRef.current;
    const stage = stageRef.current;
    const front = frontRef.current;
    const zoom = zoomRef.current;
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!panel || !stage || !front) return;
    setPhase("leave");

    // Se sale por el mismo camino por el que se entró
    if (simpleRef.current || !zoom) {
      if (layer) await tween(200, (t) => t, (k) => (layer.style.opacity = String(1 - k)));
      setMapOn(false);
      setLive(false);
      setSignal("ok");
      unlockRef.current?.();
      unlockRef.current = null;
      setPhase("ready");
      setScreen("on");
      panel.focus({ preventScroll: true });
      return;
    }

    // La oficina se achica hasta volver al vidrio (la ventana pudo cambiar de tamaño: se mide de nuevo)
    const opened = openedRef.current;
    if (layer && map && opened && signal !== "lost") {
      const g = boxIn(panel.getBoundingClientRect(), opened);
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const S =
        Math.max(g.cx / g.hw, (vw - g.cx) / g.hw, g.cy / g.hh, (vh - g.cy) / g.hh) * 1.3;
      await tween(800, easeIO, (k) => {
        const z = S ** (1 - k);
        stage.style.scale = String(z);
        layer.style.clipPath = glassClip(g, z);
        map.style.transform = `scale(${1 - 0.16 * k})`;
      });
      layer.style.visibility = "hidden";
    }
    setMapOn(false);
    setLive(false);
    setSignal("ok");
    stage.style.scale = "";
    stage.style.transformOrigin = "";

    // Travelling para atrás: el cuadro de frente, agrandado para que su pantalla
    // calce con la del final del zoom, vuelve a su tamaño mientras el panel
    // vuelve a la página.
    const zoomed = zoomedRef.current;
    const on = center(SCREEN_ON);
    const inn = center(SCREEN_IN);
    const dx = (inn.x - on.x) * 100;
    const dy = (inn.y - on.y) * 100;
    const K = zoomed ? ZOOM_K : 1;
    front.style.transformOrigin = `${on.x * 100}% ${on.y * 100}%`;
    const place = (k: number) => {
      const z = K ** (1 - k);
      const f = K === 1 ? 0 : (z - 1) / (K - 1);
      front.style.transform = `translate(${dx * f}%, ${dy * f}%) scale(${z})`;
    };
    place(0);
    zoom.style.opacity = "0";

    unlockRef.current?.();
    unlockRef.current = null;
    const slot = slotRef.current;
    const flip = slot
      ? slotFlip(slot.getBoundingClientRect(), parseFloat(getComputedStyle(slot).borderTopLeftRadius) || 0)
      : null;
    await tween(1100, easeOut, (k) => {
      place(k);
      if (!flip) return;
      const p = flip(1 - k);
      panel.style.clipPath = p.clip;
      stage.style.transform = p.transform;
    });
    panel.removeAttribute("style");
    front.removeAttribute("style");
    stage.removeAttribute("style");
    zoom.currentTime = 0;
    openedRef.current = null;
    setPhase("ready");
    setScreen("on");
    panel.focus({ preventScroll: true });
  }

  /**
   * Desde la barra de la oficina a una sección de la landing: la oficina se
   * funde, el fichín vuelve a su lugar sin el viaje de vuelta y la página baja
   * hasta la sección (con el scroll suave, que escucha los clics en anclas).
   */
  async function go(hash: string) {
    if (phase !== "open" || !(await farewell())) return;
    const panel = panelRef.current;
    const stage = stageRef.current;
    const front = frontRef.current;
    const zoom = zoomRef.current;
    const layer = layerRef.current;
    setPhase("leave");
    if (layer) await tween(180, (t) => t, (k) => (layer.style.opacity = String(1 - k)));
    setMapOn(false);
    setLive(false);
    setSignal("ok");
    for (const el of [panel, stage, front]) el?.removeAttribute("style");
    if (zoom) {
      zoom.style.opacity = "0";
      zoom.currentTime = 0;
    }
    openedRef.current = null;
    unlockRef.current?.();
    unlockRef.current = null;
    setPhase("ready");
    setScreen("on");
    requestAnimationFrame(() => {
      const a = document.createElement("a");
      a.href = hash;
      document.body.appendChild(a);
      a.click();
      a.remove();
    });
  }

  // Adentro: Esc sale y el foco no se escapa a la página de atrás
  useEffect(() => {
    if (phase === "open") document.querySelector<HTMLElement>("[data-office-close]")?.focus({ preventScroll: true });
  }, [phase]);
  useEffect(() => {
    if (signal === "lost") closeRef.current?.focus({ preventScroll: true });
  }, [signal]);

  function onDialogKey(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      void leave();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("button, a[href]"),
    ).filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const status = statusOf(online);
  const watching = watchingOf(visitors);
  const inside = phase === "enter" || phase === "open" || phase === "leave";

  return (
    <section
      id="en-vivo"
      data-theme="ink"
      aria-label="La oficina en vivo"
      className="relative bg-(--ink) pt-10 pb-32 md:pt-16 md:pb-48"
    >
      <div className="rd-wrap">
        <div className="grid gap-8 lg:grid-cols-12">
          <RdLabel index="08" className="text-(--paper)/60 lg:col-span-3">
            En vivo
          </RdLabel>
          <div className="lg:col-span-9">
            <RdLines
              lines={[
                "La oficina,",
                <>
                  <span className="rd-serif text-(--signal)">en vivo</span>.
                </>,
              ]}
              className="rd-display text-[clamp(1.6rem,9vw,2.6rem)] md:text-[clamp(2.2rem,5.6vw,6.8rem)]"
            />
            <RdReveal className="mt-8 flex flex-wrap items-center gap-6">
              <p className="rd-body max-w-xl text-lg leading-snug text-(--paper)/70 md:text-xl">
                Armamos el estudio como un fichín: cada sala es un proyecto en
                producción, con su sitio en la tele. Si estamos conectados nos
                ves laburando; si no, el guía te lleva de sala en sala. Y vos
                también aparecés adentro.
              </p>
              <button type="button" className="rd-btn" onClick={() => void enter()}>
                <RdRoll>Entrar a la oficina</RdRoll>
                <span className="rd-btn__icon" aria-hidden>
                  <ArrowUpRight size={18} strokeWidth={2.25} />
                </span>
              </button>
            </RdReveal>
          </div>
        </div>

        {/* El marco: la página rota. Por el agujero se ven las máquinas del otro lado
            y el video del fichín; la hoja es del mismo negro que la página, así el
            borde de la imagen no se nota. Ocupa el ancho de la columna, como el marco
            de antes, con la forma de la lámina (una apaisada y otra parada para el
            celular), sin deformarse. */}
        <div ref={frameRef} className="relative mt-14 md:mt-20">
          <div
            ref={slotRef}
            className="relative mx-auto aspect-[748/1101] w-full sm:aspect-[1029/612] sm:max-w-[min(100%,calc(92svh*1029/612))]"
          >
            <button
              ref={panelRef}
              type="button"
              onClick={() => void enter()}
              aria-label="Entrar a la oficina en vivo"
              aria-describedby="en-vivo-estado"
              data-cursor={inside ? undefined : "Entrar"}
              className="group rd-arcade-box absolute inset-0 block overflow-hidden rounded-[inherit] bg-[#07070a] text-left focus-visible:outline-(--ink)"
            >
              <span
                ref={stageRef}
                className={`rd-arcade-stage block transition-[scale] duration-[1.4s] ease-(--ease-out) will-change-transform ${
                  inside ? "" : "group-hover:scale-[1.035]"
                }`}
              >
                <span ref={frontRef} className="absolute inset-0 block">
                  <Image
                    src={poster === "frente" ? POSTER.frente : POSTER.inicio}
                    alt=""
                    fill
                    sizes="(min-width: 768px) 96vw, 225vw"
                    className="object-cover"
                  />
                  {!reduced && (
                    <video
                      ref={introRef}
                      className="absolute inset-0 h-full w-full object-cover"
                      muted
                      playsInline
                      preload="none"
                      aria-hidden
                      onEnded={ready}
                    >
                      <source src={CLIPS.intro.mobile} type="video/mp4" media="(max-width: 767px)" />
                      <source src={CLIPS.intro.webm} type="video/webm" />
                      <source src={CLIPS.intro.mp4} type="video/mp4" />
                    </video>
                  )}
                </span>
                {!reduced && (
                  <video
                    ref={zoomRef}
                    className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-200"
                    muted
                    playsInline
                    preload="none"
                    aria-hidden
                  >
                    <source src={CLIPS.zoom.mobile} type="video/mp4" media="(max-width: 767px)" />
                    <source src={CLIPS.zoom.webm} type="video/webm" />
                    <source src={CLIPS.zoom.mp4} type="video/mp4" />
                  </video>
                )}
                <Attract
                  state={screen}
                  status={status}
                  watching={watching}
                  clock={clock}
                />
                {signal !== "ok" && (
                  <span
                    className={`rd-crt absolute grid place-items-center ${pixel.className}`}
                    style={pct(GLASS)}
                    data-state="on"
                    aria-hidden
                  >
                    <span className="rd-crt-text rd-blink text-[4cqw] text-[#ffd9a0] uppercase">
                      {signal === "loading" ? "Cargando…" : "Sin señal"}
                    </span>
                  </span>
                )}
              </span>
              {/* Los bordes del video se funden con el marco */}
              <span
                aria-hidden
                className={`rd-arcade-vignette pointer-events-none absolute inset-0 transition-opacity duration-700 ${
                  inside ? "opacity-0" : ""
                }`}
              />
            </button>
            <picture>
              <source media="(min-width: 640px)" srcSet="/en-vivo/pagina-rota.webp" />
              <img
                src="/en-vivo/pagina-rota-m.webp"
                alt=""
                aria-hidden
                decoding="async"
                draggable={false}
                className={`pointer-events-none absolute inset-0 h-full w-full select-none transition-opacity duration-500 ${inside ? "opacity-0" : ""}`}
              />
            </picture>
          </div>

          <p id="en-vivo-estado" className="sr-only" aria-live="polite">
            {status ?? "Conectando…"}
            {watching && ` · ${watching}`}
          </p>
        </div>
      </div>

      {mapOn && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="La oficina de se7en, en vivo"
          onKeyDown={onDialogKey}
          className="fixed inset-0 z-[131]"
          style={{ pointerEvents: phase === "open" || signal === "lost" ? "auto" : "none" }}
        >
          <div
            ref={layerRef}
            className="absolute inset-0 overflow-hidden bg-[#07070a]"
            style={{ visibility: "hidden" }}
          >
            <div ref={mapRef} className="h-full w-full">
              <EnVivoMap fill active hold={!live} visitors={visitors} onReady={onMapReady} onClose={() => void leave()} onNavigate={(hash) => void go(hash)} exitRef={exitRef} />
            </div>
            <div
              ref={flashRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[#fff1dc] opacity-0"
            />
          </div>
          {/* Adentro, «Salir» va en la barra de la oficina; éste es para cuando el mapa no llegó a abrir. */}
          {signal === "lost" && (
            <button
              ref={closeRef}
              type="button"
              onClick={() => void leave()}
              className="rd-label absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-center gap-2 rounded-full border border-white/15 bg-[rgba(10,10,14,0.8)] py-2.5 pr-4 pl-3.5 text-[#f1ede6] backdrop-blur-md transition-colors duration-300 hover:bg-[#f1ede6] hover:text-[#0b0b0c] md:top-6 md:right-6"
            >
              <X size={15} aria-hidden /> Salir
            </button>
          )}
        </div>
      )}
    </section>
  );
}


/** El cartel de la pantalla del fichín: quién está, quién mira y «tocá para entrar». */
function Attract({
  state,
  status,
  watching,
  clock,
}: {
  state: "off" | "on" | "bye";
  status: string | null;
  watching: string | null;
  clock: string | null;
}) {
  return (
    <span
      aria-hidden
      className={`rd-crt absolute block ${pixel.className}`}
      style={pct(SCREEN_ON)}
      data-state={state}
    >
      <span className="rd-crt-text flex h-full flex-col justify-between px-[8cqw] py-[7cqw] text-[#ffd9a0] uppercase">
        <span className="flex items-center justify-between text-[5cqw] leading-none">
          <span className="flex items-center gap-[2.4cqw]">
            <span className="rd-blink inline-block h-[3cqw] w-[3cqw] rounded-full bg-[#ff4d2e]" />
            En vivo
          </span>
          <span className="tabular-nums">{clock ?? ""}</span>
        </span>
        <span className="block text-center">
          <span className="block text-[7.4cqw] leading-[1.15] text-[#fff1dc]">
            {status ?? "Conectando"}
          </span>
          {watching && (
            <span className="mt-[3cqw] block text-[4.6cqw] leading-tight text-[#ffb199]">
              {watching}
            </span>
          )}
        </span>
        <span className="rd-blink flex items-center justify-center gap-[2.4cqw] text-[5.2cqw] leading-none">
          <span className="inline-block h-0 w-0 border-y-[1.6cqw] border-l-[2.6cqw] border-y-transparent border-l-current" />
          Tocá para entrar
        </span>
      </span>
    </span>
  );
}
