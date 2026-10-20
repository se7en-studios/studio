// Motor de «En vivo»: cámara, orden de dibujo, luz, caminar y tocar. Sin React:
// el panel (app/admin/oficinas/view.tsx) y la landing (components/sections/
// en-vivo-map.tsx) lo montan sobre un <canvas> y le avisan lo que cambia
// (visitas, hora, quién es quién). El arte está en art.ts y el plano en
// lib/admin/oficinas-shared.ts.
import {
  DECALS,
  canStep,
  findPath,
  hasDoor,
  inBounds,
  otherOf,
  roomAt,
  walkable,
  type LedMsg,
  type MapModel,
  type MapRoom,
  type Period,
  type Pt,
  type Who,
} from "@/lib/admin/oficinas-shared";
import {
  AVATAR_REACH,
  CAT_REACH,
  HH,
  HW,
  P,
  PAL,
  TALL,
  WALL,
  avatar,
  bakeBrand,
  bakeSlogan,
  begin,
  brandRug,
  decal,
  decay,
  decor,
  decorScreen,
  floorTile,
  furni,
  hash,
  lightPool,
  lightSpill,
  mix,
  studioCat,
  posterAspect,
  quadImage,
  rug,
  setFade,
  setTint,
  slab,
  sloganAspect,
  tickerQuad,
  viewOf,
  wallSegment,
  type ActorLook,
  type Brand,
  type BrandImages,
  type Dir,
  type Glow,
  type Material,
  type Reach,
  type RoomArt,
  type StudioArt,
  type WallStyle,
  type XY,
} from "./art";
import type { Cue } from "./sound";

export type RoomInfo = {
  name: string;
  accent: string;
  status: string;
  /** Captura del sitio: la tele la muestra desde afuera. */
  cover?: string | null;
  /** Grabación del sitio: la tele la pasa mientras estás en la sala (si no hay captura automática). */
  video?: string | null;
  /** La página entera de la captura automática: la tele la recorre mientras estás en la sala. */
  page?: string | null;
  /** Dominio del sitio, para la barra del navegador de la tele. */
  domain?: string | null;
  /** La marca: tipografía (familia ya resuelta) y rutas del logo y el ícono. null = letra genérica. */
  brand?: (Brand & { logo: string | null; mark: string | null }) | null;
};
export type RoomLooks = Record<string, { fade: number; days: number | null; badge: number }>;
export type EngineOptions = {
  map: MapModel;
  /** Por id de sala de proyecto. */
  info: Record<string, RoomInfo>;
  me: Who;
  /** Familia de la fuente pixel (Silkscreen) para las compus, el globo y el LED. */
  font: string;
  onRoom: (id: string | null) => void;
  /** La sala que queda bajo el mouse (null al salir): su nombre va arriba, no flotando en el mapa. */
  onHover?: (id: string | null) => void;
  /**
   * Para la landing: sin jugador ni teclado (no se roba las flechas de la
   * página), las salas siempre prendidas, la compu dice «en línea» en vez de
   * los días y caminan los personajes de setActors. Tocar una sala avisa por
   * onRoom sin caminar hasta ahí.
   */
  public?: boolean;
  /** Para los sonidos (lib/oficinas/sound.ts): pasos, entrar a una sala, novedades, tubos. */
  onCue?: (c: Cue) => void;
  /** Zoom inicial (uno de ZOOMS). Sin esto, 0.65 en pantallas chicas y 1 en el resto. */
  zoom?: number;
  /** Tope de densidad de píxeles del lienzo (2.5 si no se pasa). */
  maxDpr?: number;
  /** La letra del sitio (familia ya resuelta) para la frase de la recepción y los globos. Sin esto, la pixel. */
  display?: string;
  /** Lo que pasa la pantalla de Reuniones: los pasos del proceso, tal como están en la web (data/services.ts). */
  slides?: string[];
  /**
   * Sólo en la landing, a pantalla completa: tu muñeco («VOS») se maneja. Tocar
   * el piso lo lleva caminando, las flechas lo mueven y arrastrar corre la cámara.
   */
  controls?: boolean;
};

/**
 * Qué hace un personaje de la landing: sentado en su escritorio, mirando la
 * tele de una sala, recorriéndolas todas (el guía) o paseando de sala en sala
 * a su aire (las visitas).
 */
export type ActorGoal = { kind: "seat"; who: Who } | { kind: "room"; room: string } | { kind: "tour" } | { kind: "wander" };
/**
 * `you`: la visita que está mirando; la cámara la sigue y lleva el cartelito
 * «VOS». `tag`: un nombre arriba de la cabeza (Franco o Federico de visita).
 */
export type ActorSpec = { id: string; look: ActorLook; goal: ActorGoal; you?: boolean; tag?: string };
export type Engine = {
  setMe: (me: Who) => void;
  /** `lightUp`: la sala a la que se acaba de entrar (titila y se prende). */
  setLooks: (looks: RoomLooks, lightUp?: string) => void;
  /** Lo que pasa por el cartel LED de la recepción: la hora, la marca y los proyectos (ver ledMessages). */
  setTicker: (msgs: LedMsg[]) => void;
  /** Un globo arriba de tu muñeco, como en el chat de Habbo. `news` suena el ding. */
  say: (text: string, tone?: "news" | "plain") => void;
  /** El otro socio no está conectado: se queda dormido en su escritorio. */
  setPartnerAway: (away: boolean) => void;
  setPeriod: (p: Period) => void;
  setPartnerLine: (text: string | null) => void;
  goTo: (roomId: string) => boolean;
  goOut: () => void;
  press: (dir: "up" | "down" | "left" | "right", on: boolean) => void;
  zoomBy: (step: number) => void;
  /** Sólo en la landing: quiénes caminan por el mapa. Los que ya están siguen desde donde estaban. */
  setActors: (specs: ActorSpec[]) => void;
  /**
   * Sólo en la landing: ir a una sala. Tu muñeco («VOS») va caminando y se
   * queda mirando; si no estás en el mapa, va la cámara.
   */
  visit: (roomId: string) => void;
  /** La sala elegida (se marca su contorno), o null. */
  select: (roomId: string | null) => void;
  /** Frena el dibujo (la sección de la landing quedó fuera de la pantalla) y lo retoma. */
  setPaused: (paused: boolean) => void;
  resize: () => void;
  destroy: () => void;
};

export const ZOOMS = [0.5, 0.65, 0.8, 1, 1.25, 1.5];
/** Ancho/alto de lo que muestra la tele (abajo de la barra del navegador). */
const TV_ASPECT = 64 / 38.7;
/**
 * Cuánto bajó la tele por la página a los `t` segundos de entrar: un rato
 * arriba, baja despacio como alguien leyendo, espera al final y vuelve arriba.
 * `travel`: lo que se puede bajar, en px de la imagen.
 */
function browse(t: number, travel: number) {
  if (travel <= 0) return 0;
  const HOLD = 3, DOWN = travel / 70, END = 2.5, UP = travel / 600;
  const k = t % (HOLD + DOWN + END + UP);
  if (k < HOLD) return 0;
  if (k < HOLD + DOWN) return ((k - HOLD) / DOWN) * travel;
  if (k < HOLD + DOWN + END) return travel;
  return (1 - (k - HOLD - DOWN - END) / UP) * travel;
}
const SPEED = 4.2; // baldosas por segundo
const DIRS: Record<string, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const KEYS: Record<string, string> = { ArrowUp: "up", w: "up", W: "up", ArrowDown: "down", s: "down", S: "down", ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
/**
 * La luz de cada hora, horneada en los colores: cuánto se tiñe el hall y cuánto
 * las salas (que siempre tienen la luz prendida), y qué tan fuertes son los
 * charcos de luz de las lámparas y las puertas.
 */
const LIGHT: Record<Period, { color: string; hall: number; room: number; pools: number }> = {
  manana: { color: "#3d2347", hall: 0.12, room: 0.04, pools: 0 },
  dia: { color: "#000000", hall: 0, room: 0, pools: 0 },
  tarde: { color: "#2a1236", hall: 0.22, room: 0.07, pools: 0.55 },
  noche: { color: "#060920", hall: 0.44, room: 0.12, pools: 1 },
};
/** Quieto (sólo las pantallas y el cartel): cada cuánto se dibuja. Con movimiento reducido, mucho menos. */
const IDLE_MS = 66;
const IDLE_REDUCED_MS = 500;
/** Moviéndose, como mucho un cuadro cada 12 ms (~60–72 por segundo): en pantallas de 120/144 Hz no se nota y ahorra la mitad. */
const MIN_FRAME_MS = 12;
/** Tubos que titilan al entrar: valores escalonados, no interpolados. 1 = como estaba. */
const FLICK: [number, number][] = [[0, 1], [0.1, 0.12], [0.16, 0.9], [0.24, 0.08], [0.3, 0.7], [0.42, 0.04], [0.5, 0.35], [0.6, 0]];

// El cartel LED: una grilla de puntos de 2 px del mundo, 12 de alto. Lo que
// entra entero se queda quieto un rato; lo que no, pasa de derecha a izquierda
// de a una columna, como un cartel de verdad.
const LED_PITCH = 2;
const LED_ROWS = 12;
const LED_SPEED = 16; // columnas por segundo
const LED_HOLD = 4000;
const LED_AMBER = "#c4b5fd";
/** El fondo de afuera del edificio: el azul de la noche, casi negro. */
const BG = "#0a0a14";
/** El logo de se7en, el de verdad (el de la web), para la pared de la recepción. */
const STUDIO_LOGO = "/logo.png";
/** Un mensaje ya pasado a puntos: qué filas se prenden en cada columna y de qué color. */
type LedBake = { cols: number; mask: Uint16Array; color: string[] };
/** Globo de chat arriba del muñeco. */
type Bubble = { text: string; tone: "news" | "plain"; t0: number };
const BUBBLE_MS = 4200;
/** Motas de luz que suben cuando una sala apagada se vuelve a prender. */
type Mote = { x: number; y: number; t0: number; col: string };

/** Un rectángulo en px del mundo (o, ya pasado a la pantalla, en px enteros del lienzo). */
type Box = { x0: number; y0: number; x1: number; y1: number };
/**
 * Lo que se ordena por profundidad: una pared, el arco o un mueble. `box`: hasta
 * dónde llega su dibujo. `glows`: lo que prende arriba de la oscuridad.
 * `ghost`: si ahora se vuelve casi transparente porque tapa al que camina.
 */
type Item = { depth: number; order: number; x: number; ax: number; ay: number; box: Box; glows: Glow[]; ghost?: () => boolean; draw: () => void };
/** Alguien (o el gato) para intercalar con los muebles: `box`, el rectángulo que ocupa. */
type Person = { depth: number; box: Box; draw: () => void };
/**
 * Más píxeles que esto por lienzo de lo quieto (un zoom grande en retina) y se
 * dibuja todo directo en cada cuadro: no vale la memoria.
 */
const LAYER_PX = 16e6;
const touches = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
/** El rectángulo de algo parado en (sx, sy), los pies (el arte los redondea), que llega hasta `k`. */
const around = (sx: number, sy: number, k: Reach): Box => ({ x0: Math.round(sx) - k.x - 2, x1: Math.round(sx) + k.x + 2, y0: Math.round(sy) - k.up - 2, y1: Math.round(sy) + k.down + 2 });

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Los colores oscuros (un azul marino de marca) no se leen en el cartel: se aclaran hasta que se ven. */
function ledColor(hex: string | null) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return LED_AMBER;
  const n = parseInt(hex.slice(1), 16);
  const lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
  return lum >= 0.55 ? hex : mix(hex, "#ffffff", Math.min(0.7, (0.55 - lum) / (1 - lum) + 0.1));
}

export function createEngine(canvas: HTMLCanvasElement, o: EngineOptions): Engine {
  const m = o.map;
  const view = viewOf(m);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  // Lo quieto (el piso en uno; paredes y muebles en otro) se dibuja acá una vez
  // y en cada cuadro sólo se copia (ver render)
  const floorC = document.createElement("canvas");
  const fctx = floorC.getContext("2d") as CanvasRenderingContext2D;
  const itemsC = document.createElement("canvas");
  const ictx = itemsC.getContext("2d") as CanvasRenderingContext2D;
  let floorKey = "", itemsKey = "";
  let artRev = 0;
  /** Dónde dibujan las paredes y el arco: la pantalla o el lienzo de lo quieto. */
  let dst = ctx;
  // La proyección (P) depende de la vista: se fija antes de precalcular posiciones.
  begin(ctx, view);
  const byId = new Map(m.rooms.map((r) => [r.id, r]));
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = mq.matches;
  const onMq = (e: MediaQueryListEvent) => (reduced = e.matches);
  mq.addEventListener("change", onMq);

  let me = o.me;
  let looks: RoomLooks = {};
  let period: Period = "dia";
  let partnerLine: string | null = null;
  let partnerAway = false;
  let bubbles: Bubble[] = [];
  let motes: Mote[] = [];
  let zi = ZOOMS.indexOf(canvas.clientWidth < 640 ? 0.65 : 1);
  if (o.zoom !== undefined && ZOOMS.includes(o.zoom)) zi = ZOOMS.indexOf(o.zoom);
  let dpr = 1, scale = 1, offX = 0, offY = 0;
  const cam = { x: 0, y: 0, ready: false };
  const disp = new Map<string, number>();
  const anim = new Map<string, { t0: number; from: number }>();
  const player = { x: m.start.x, y: m.start.y, from: { ...m.start }, to: { ...m.start }, t: 0, moving: false, dir: "SW" as Dir, path: [] as Pt[], step: 0 };
  let current: MapRoom | null = null;
  let hover: Pt | null = null;
  let marker: (Pt & { t0: number }) | null = null;
  const held = new Set<string>();
  let hoverRoom: string | null = null;
  let raf = 0, last = performance.now(), paused = false;
  /** En la landing: la sala elegida (se marca), a qué sala mira la cámara si no estás en el mapa, y si la arrastraste. */
  let selected: string | null = null;
  let camAt: string | null = null;
  let camFree = false;
  let dragging = false;

  const fadeOfId = (id: string | null | undefined) => (id ? disp.get(id) ?? 0 : 0);
  const lightOf = (id: string | null | undefined) => {
    const r = id ? byId.get(id) : null;
    return r && r.kind === "project" ? 1 - fadeOfId(id) : 1;
  };
  const accentOf = (id: string | null | undefined) => (id ? o.info[id]?.accent : undefined) ?? PAL.violet;

  // Lo propio de cada sala: las texturas con la marca y la captura del sitio.
  // Se hornean ya con la letra de reserva y otra vez cuando baja la de la marca.
  // Los logos son livianos y van enseguida; las capturas (lo que pesa) recién
  // cuando la sala está por verse, y la página entera, cuando alguien la mira.
  const arts = new Map<string, RoomArt>();
  /** Lo que se baja cuando la sala se acerca a la pantalla (la captura) y cuando alguien la mira (la página entera). */
  const lazy = new Map<string, { near: (() => void) | null; live: (() => void) | null }>();
  let dead = false;
  for (const r of m.rooms) {
    const inf = o.info[r.id];
    if (r.kind !== "project" || !inf) continue;
    const poster = m.decor.find((dc) => dc.room === r.id && dc.k === "brand");
    const imgs: BrandImages = { logo: null, mark: null };
    const bake = () => {
      artRev++;
      const prev = arts.get(r.id);
      arts.set(r.id, { ...bakeBrand(inf.name, inf.accent, inf.brand ?? null, poster ? posterAspect(poster) : 2, imgs), ...imgs, site: prev?.site ?? null, page: prev?.page ?? null });
    };
    bake();
    if (inf.brand) document.fonts?.load(`${Math.max(inf.brand.weight, 500)} 40px ${inf.brand.family}`).then(() => !dead && bake(), () => {});
    load(inf.brand?.logo, (img) => ((imgs.logo = img), bake()));
    load(inf.brand?.mark, (img) => ((imgs.mark = img), bake()));
    lazy.set(r.id, {
      near: () =>
        load(inf.cover, (img) => {
          const a = arts.get(r.id);
          if (a && !a.page) a.site = img;
        }),
      // La captura automática: desde afuera se ve su parte de arriba (recortada
      // una vez, así apagarla no copia la página entera) y adentro se recorre.
      live: () =>
        load(
          inf.page,
          (img) => {
            const a = arts.get(r.id);
            if (!a) return;
            const top = document.createElement("canvas");
            top.width = img.naturalWidth;
            top.height = Math.min(img.naturalHeight, Math.round(img.naturalWidth / TV_ASPECT));
            top.getContext("2d")?.drawImage(img, 0, 0);
            Object.assign(a, { page: img, site: top });
          },
          true,
        ),
    });
  }
  function load(src: string | null | undefined, done: (img: HTMLImageElement) => void, cors = false) {
    if (!src) return;
    const img = new Image();
    // Las capturas automáticas vienen de otro dominio (Supabase): sin esto no se podrían apagar
    if (cors) img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => !dead && done(img);
    img.src = src;
  }
  /** Pide lo que falta de las salas que están cerca de la pantalla. */
  function loadNear(near: (ax: number, ay: number) => boolean) {
    for (const [id, l] of lazy) {
      if (!l.near) continue;
      const r = byId.get(id) as MapRoom;
      if (!near(...P(r.x + r.w / 2, r.y + r.d / 2))) continue;
      l.near();
      l.near = null;
    }
  }
  const artOf = (id: string | null | undefined) => (id ? arts.get(id) ?? null : null);

  // Lo del estudio: el logo de se7en en la recepción y la frase, con la letra del sitio
  const studio: StudioArt = { logo: null, slogan: null, slides: o.slides ?? [] };
  const sloganDecor = m.decor.find((dc) => dc.k === "slogan");
  if (sloganDecor) {
    const bakeStudio = () => {
      studio.slogan = bakeSlogan(o.display ?? null, sloganAspect(sloganDecor));
      artRev++;
    };
    bakeStudio();
    if (o.display) document.fonts?.load(`800 40px ${o.display}`).then(() => !dead && bakeStudio(), () => {});
  }
  load(STUDIO_LOGO, (img) => {
    studio.logo = img;
    artRev++;
  });

  function matAt(x: number, y: number): Material {
    const id = m.region[y][x];
    if (id === "hall") return m.archiveY !== null && y >= m.archiveY && x >= m.spine.x0 && x < m.spine.x1 ? "gallery" : "hall";
    const r = byId.get(id) as MapRoom;
    if (r.kind === "office") return r.area === "design" ? "design" : "dev";
    if (r.kind === "reception") return "reception";
    if (r.kind === "meeting") return "meeting";
    if (r.kind === "lounge") return "lounge";
    if (r.kind === "kitchen") return "kitchen";
    if (r.kind === "storage") return "storage";
    return r.zone === "archive" ? "parquet" : "wood";
  }
  /** Cuánto tiñe la luz de la hora lo que está en `id` (una sala o el hall). Una sala apagada queda como el hall. */
  function tintOf(id: string | null | undefined) {
    const L = LIGHT[period];
    const r = id && id !== "hall" ? byId.get(id) : null;
    if (!r) return L.hall;
    return L.room + (L.hall - L.room) * (r.kind === "project" ? fadeOfId(r.id) : 0);
  }
  const tint = (id: string | null | undefined) => setTint(tintOf(id), LIGHT[period].color);

  // --- Lo que se ordena por profundidad: paredes, arco y muebles ----------------
  const items: Item[] = [];
  let glows: Glow[] = [];
  /** Las pantallas de pared, una por cartel aunque ocupe varios tramos. */
  const wallGlows = new Map<string, Glow>();
  const playerBox = { x0: 0, y0: 0, x1: 0, y1: 0, depth: 0 };
  /** Lo que ocupa en pantalla (px del mundo) un volumen de [x0, x1] × [y0, y1] baldosas y z1 de alto, con margen para los contornos. */
  const reach = (x0: number, y0: number, x1: number, y1: number, z1: number, pad = 3): Box => ({ x0: P(x0, y1)[0] - pad, x1: P(x1, y0)[0] + pad, y0: P(x0, y0, z1)[1] - pad, y1: P(x1, y1)[1] + pad });

  // Las paredes en azul noche con el corte en violeta; las de las salas de
  // proyecto llevan una franja del color de la marca.
  function wallStyle(side: "L" | "R", kind: "rail" | "wall" | "tall", owner: string | null): WallStyle {
    const r = owner ? byId.get(owner) : null;
    if (kind === "tall") return { face: side === "L" ? "#232a52" : "#2b3463", cap: PAL.violet };
    if (kind === "rail") return { face: side === "L" ? "#2f3766" : "#384174", cap: PAL.violet2 };
    const acc = r && r.kind === "project" ? accentOf(r.id) : null;
    const base = acc ? mix("#333b6c", acc, 0.1) : "#333b6c";
    return { face: side === "L" ? mix(base, "#000000", 0.14) : base, cap: PAL.violet2, stripe: acc ?? undefined };
  }
  for (let y = 0; y < m.H; y++)
    for (let x = 0; x < m.W; x++)
      for (const side of ["L", "R"] as const) {
        const kind = side === "L" ? m.edgeL[y][x] : m.edgeR[y][x];
        if (kind === "none") continue;
        const behind = side === "L" ? (x > 0 ? m.region[y][x - 1] : null) : y > 0 ? m.region[y - 1][x] : null;
        const front = m.region[y][x];
        const owner = kind === "rail" ? behind : front === "hall" ? null : front;
        const door = hasDoor(m, x, y, side);
        const here = m.decor.filter((d) => d.side === side && (side === "L" ? d.x === x && y >= d.y && y < d.y + d.len : d.y === y && x >= d.x && x < d.x + d.len));
        const h = kind === "tall" ? TALL : WALL;
        const face: XY[] = side === "L" ? [P(x, y, h), P(x, y + 1, h), P(x, y + 1, 0), P(x, y, 0)] : [P(x, y, h), P(x + 1, y, h), P(x + 1, y, 0), P(x, y, 0)];
        const segBox = side === "L" ? { x0: P(x, y + 1)[0] - 8, x1: P(x, y)[0], y0: P(x, y, h)[1], y1: P(x, y + 1)[1] } : { x0: P(x, y)[0], x1: P(x + 1, y)[0] + 8, y0: P(x, y, h)[1], y1: P(x + 1, y)[1] };
        const depth = x + y - 0.5;
        const [ax, ay] = P(x + 0.5, y + 0.5);
        // Las pantallas de pared (tele, mapa) se prenden por arriba de la oscuridad, una sola vez.
        const lit = door
          ? []
          : here.flatMap((dc) => {
              const scr = decorScreen(dc);
              if (!scr) return [];
              let gl = wallGlows.get(dc.id);
              if (!gl) wallGlows.set(dc.id, (gl = { t: "screen", quad: scr.quad, kind: scr.kind, accent: accentOf(dc.room), room: dc.room }));
              return [gl];
            });
        // Si la pared tapa al que camina atrás, se vuelve casi transparente.
        const ghost = kind === "wall" ? () => depth > playerBox.depth && segBox.x1 > playerBox.x0 && segBox.x0 < playerBox.x1 && segBox.y1 > playerBox.y0 && segBox.y0 < playerBox.y1 : undefined;
        items.push({
          depth, order: 0, x, ax, ay, glows: lit, ghost,
          // El espesor de la pared (y algo más) y las jambas de la puerta, un poco más altas
          box: side === "L" ? reach(x - 0.2, y, x, y + 1, h + 4) : reach(x, y - 0.2, x + 1, y, h + 4),
          draw: () => {
            if (ghost?.()) dst.globalAlpha = 0.28;
            setFade(fadeOfId(owner));
            tint(owner);
            wallSegment(side, x, y, kind, wallStyle(side, kind, owner), door);
            if (here.length && !door) {
              dst.save();
              dst.beginPath();
              dst.moveTo(face[0][0], face[0][1]);
              for (let i = 1; i < 4; i++) dst.lineTo(face[i][0], face[i][1]);
              dst.closePath();
              dst.clip();
              for (const dc of here) {
                setFade(fadeOfId(dc.room));
                tint(dc.room);
                decor(dc, accentOf(dc.room), period, artOf(dc.room), studio);
              }
              dst.restore();
            }
            setTint(0);
            dst.globalAlpha = 1;
          },
        });
      }
  // Los arcos sobre el eje: la entrada al ala de proyectos y la del Archivo,
  // cada uno con su cartel de neón (son parte del edificio, no carteles flotando).
  const arches: [number, string][] = [[m.wingY, "PROYECTOS"], ...(m.archiveY !== null ? ([[m.archiveY, "ARCHIVO"]] as [number, string][]) : [])];
  for (const [ay0, label] of arches) {
    const { x0, x1 } = m.spine;
    const [ax, ay] = P(x0 + 0.5, ay0 + 0.5);
    let sign: HTMLCanvasElement | null = null;
    items.push({
      depth: x0 + ay0 - 0.6, order: 0, x: x0, ax, ay, glows: [],
      box: reach(x0 - 0.14, ay0 - 0.14, x1 + 0.14, ay0 + 0.14, 112),
      draw: () => {
        setFade(0);
        tint(null);
        archPost(x0, ay0);
        archPost(x1, ay0);
        setTint(0);
        sign ??= neonSign(label);
        const z0 = 99, z1 = 109, yy = ay0 + 0.145;
        quadImage(sign, P(x0 + 0.5, yy, z1), P(x1 - 0.5, yy, z1), P(x0 + 0.5, yy, z0));
      },
    });
  }
  function archPost(x: number, y: number) {
    // Columnas oscuras con el filo violeta y el dintel con el cartel
    poly([P(x - 0.14, y + 0.14, 96), P(x + 0.14, y + 0.14, 96), P(x + 0.14, y + 0.14, 0), P(x - 0.14, y + 0.14, 0)], PAL.char3);
    poly([P(x + 0.14, y - 0.14, 96), P(x + 0.14, y + 0.14, 96), P(x + 0.14, y + 0.14, 0), P(x + 0.14, y - 0.14, 0)], PAL.char2);
    poly([P(x - 0.14, y - 0.14, 96), P(x + 0.14, y - 0.14, 96), P(x + 0.14, y + 0.14, 96), P(x - 0.14, y + 0.14, 96)], PAL.violet);
    if (x === m.spine.x0) {
      const a = m.spine.x0, b = m.spine.x1;
      poly([P(a - 0.14, y + 0.14, 112), P(b + 0.14, y + 0.14, 112), P(b + 0.14, y + 0.14, 96), P(a - 0.14, y + 0.14, 96)], PAL.ink);
      poly([P(a - 0.14, y - 0.14, 112), P(b + 0.14, y - 0.14, 112), P(b + 0.14, y + 0.14, 112), P(a - 0.14, y + 0.14, 112)], PAL.violet2);
    }
  }
  /** El cartel de neón del arco: letras violeta con su brillo, sobre fondo transparente. */
  function neonSign(text: string) {
    const cv = document.createElement("canvas");
    cv.width = 512;
    cv.height = 56;
    const t = cv.getContext("2d") as CanvasRenderingContext2D;
    const family = o.display ?? o.font;
    t.font = `800 40px ${family}`;
    const k = Math.min(1, (cv.width * 0.86) / t.measureText(text).width);
    t.font = `800 ${Math.round(40 * k)}px ${family}`;
    t.textAlign = "center";
    t.textBaseline = "middle";
    t.shadowColor = "rgba(167,139,250,0.9)";
    t.shadowBlur = 10;
    t.fillStyle = PAL.violet3;
    t.fillText(text, cv.width / 2, cv.height / 2 + 2);
    t.shadowBlur = 0;
    t.fillStyle = "#f3efff";
    t.fillText(text, cv.width / 2, cv.height / 2 + 2);
    return cv;
  }
  function poly(pts: XY[], fill: string) {
    dst.beginPath();
    dst.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) dst.lineTo(pts[i][0], pts[i][1]);
    dst.closePath();
    dst.fillStyle = fill;
    dst.fill();
    dst.strokeStyle = "rgba(12,10,20,0.9)";
    dst.lineWidth = 1.25;
    dst.stroke();
  }
  const COVERABLE = new Set(["desk", "chair", "sofa"]);
  for (const f of m.furni) {
    if (DECALS.has(f.k)) continue;
    const r = f.room ? byId.get(f.room) : null;
    const status = r?.id ? o.info[r.id]?.status ?? "" : "";
    const [ax, ay] = P(f.x + f.w / 2, f.y + f.d / 2);
    const it: Item = {
      depth: f.x + f.w - 1 + f.y + f.d - 1, order: 1, x: f.x, ax, ay, glows: [],
      // Ningún mueble pasa de 70 px de alto ni se sale más que un poco de sus baldosas
      box: reach(f.x - 0.15, f.y - 0.15, f.x + f.w + 0.15, f.y + f.d + 0.15, 70, 6),
      draw: () => {
        setFade(fadeOfId(f.room));
        tint(f.room);
        // Lo que prende se anota cada vez que se dibuja (es siempre lo mismo)
        it.glows = [];
        furni(f, { accent: accentOf(f.room), status, covered: status === "pausado" && COVERABLE.has(f.k), kind: r?.kind ?? "hall", area: r?.area, glows: it.glows });
        setTint(0);
      },
    };
    items.push(it);
  }
  items.sort((a, b) => a.depth - b.depth || a.order - b.order || a.x - b.x);

  // --- Caminar ----------------------------------------------------------------
  const dirOf = (dx: number, dy: number): Dir => (dx > 0 ? "SE" : dx < 0 ? "NW" : dy > 0 ? "SW" : "NE");
  // Llegar al propio escritorio y quedarse quieto: te sentás y tipeás. Al
  // moverte, te levantás. `idleSince`: desde cuándo estás quieto.
  let sitting = false, idleSince = 0;
  const ownSeat = () => byId.get(`off-${me}`)?.seat ?? null;
  /** La baldosa al lado de tu silla desde donde te sentás. */
  function seatApproach(): Pt | null {
    const seat = ownSeat();
    if (!seat) return null;
    return [[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dy]) => ({ x: seat.x + dx, y: seat.y + dy })).find((q) => walkable(m, q.x, q.y)) ?? null;
  }
  function step(nx: number, ny: number) {
    sitting = false;
    player.dir = dirOf(nx - player.x, ny - player.y);
    if (!canStep(m, player.x, player.y, nx, ny)) return false;
    player.from = { x: player.x, y: player.y };
    player.to = { x: nx, y: ny };
    player.moving = true;
    player.t = 0;
    o.onCue?.("step");
    return true;
  }
  function next() {
    const k = ["up", "down", "left", "right"].find((d) => held.has(d));
    if (k) {
      player.path = [];
      marker = null;
      const [dx, dy] = DIRS[k];
      step(player.x + dx, player.y + dy);
      return;
    }
    if (player.path.length) {
      const n = player.path.shift() as Pt;
      if (!step(n.x, n.y)) {
        player.path = [];
        marker = null;
      }
    } else marker = null;
  }
  function walkTo(t: Pt) {
    const from = player.moving ? player.to : { x: player.x, y: player.y };
    const path = findPath(m, from, t);
    if (!path) return false;
    player.path = path;
    marker = path.length || player.moving ? { ...t, t0: performance.now() } : null;
    return true;
  }
  function arrive() {
    const r = roomAt(m, player.x, player.y);
    if ((r?.id ?? null) !== (current?.id ?? null)) {
      current = r;
      if (r) o.onCue?.("enter");
      o.onRoom(r ? r.id : null);
      tuneTv(r?.kind === "project" ? r.id : null);
    }
  }

  // La tele de la sala donde estás pasa la grabación del sitio; las demás
  // muestran la captura quieta. Un solo video a la vez, y nada con movimiento reducido.
  let tv: { room: string; el: HTMLVideoElement } | null = null;
  function tuneTv(id: string | null) {
    if ((tv?.room ?? null) === id) return;
    if (tv) {
      tv.el.pause();
      tv.el.removeAttribute("src");
      tv.el.load();
      tv = null;
    }
    // Con captura automática la tele recorre la página: no hace falta la grabación
    const src = id && !artOf(id)?.page ? o.info[id]?.video : null;
    if (!id || !src || reduced) return;
    const el = document.createElement("video");
    el.muted = true;
    el.loop = true;
    el.playsInline = true;
    el.preload = "auto";
    el.src = src;
    el.play().catch(() => {});
    tv = { room: id, el };
  }

  // --- Personajes (landing) ----------------------------------------------------
  // En la landing no hay jugador: caminan los socios conectados (a la sala del
  // proyecto que tienen abierto, o se quedan sentados en su escritorio) o, si no
  // hay nadie, el guía, que recorre las salas y se queda mirando cada tele.
  type Actor = {
    id: string;
    look: ActorLook;
    goal: ActorGoal;
    x: number;
    y: number;
    from: Pt;
    to: Pt;
    t: number;
    moving: boolean;
    dir: Dir;
    path: Pt[];
    step: number;
    /** Dónde está sentado (null = de pie). */
    seat: Pt | null;
    /** Hacia dónde mira cuando llega (la tele). */
    face: Dir | null;
    /** El guía: hasta cuándo se queda en esta sala y por qué parada del recorrido va. */
    wait: number;
    stop: number;
    stuck: boolean;
    /** Las visitas: a qué baldosa van ahora y de qué número salen sus elecciones. */
    dest: Pt | null;
    seed: number;
    you: boolean;
    tag: string | null;
    /** Saludando a alguien que se cruzó: desde cuándo y qué dice. */
    greet: { t0: number; word: string } | null;
    /** Lo que eligió la visita que mira (tu muñeco): manda sobre `goal`, que viene de afuera. */
    own: OwnGoal | null;
  };
  /** Lo que hace tu muñeco cuando lo manejás: ir a una sala, a una baldosa, o quedarse (con las flechas). */
  type OwnGoal = { kind: "room"; room: string } | { kind: "spot"; at: Pt } | { kind: "manual" };
  const actors: Actor[] = [];
  const DWELL = 7000;
  const seatOf = (who: Who) => byId.get(`off-${who}`)?.seat ?? null;
  // Dónde se para alguien a mirar la tele de cada sala, y hacia dónde mira
  const tvSpots = new Map<string, { at: Pt; face: Dir }>();
  for (const r of m.rooms) {
    const tvf = r.kind === "project" ? m.furni.find((f) => f.k === "tvstand" && f.room === r.id) : null;
    if (!tvf) continue;
    const front = tvf.face === "y" ? { x: tvf.x + tvf.w / 2, y: tvf.y + 2.2 } : { x: tvf.x + 2.2, y: tvf.y + tvf.d / 2 };
    let best: Pt | null = null, bd = Infinity;
    for (let y = r.y; y < r.y + r.d; y++)
      for (let x = r.x; x < r.x + r.w; x++) {
        const d = Math.hypot(x + 0.5 - front.x, y + 0.5 - front.y);
        if (walkable(m, x, y) && d < bd) {
          bd = d;
          best = { x, y };
        }
      }
    if (best) tvSpots.set(r.id, { at: best, face: tvf.face === "y" ? "NE" : "NW" });
  }
  // En las salas del estudio, dónde pararse a mirar: frente al mostrador, al
  // escritorio de cada socio, a la pantalla de Reuniones y al fichín.
  const STUDIO_SPOTS: Record<string, { dx: number; dy: number; face: Dir }> = {
    recepcion: { dx: 2, dy: 3, face: "NE" },
    "off-franco": { dx: 2, dy: 3, face: "NE" },
    "off-federico": { dx: 2, dy: 3, face: "NE" },
    reuniones: { dx: 4, dy: 3, face: "NW" },
    lounge: { dx: 3, dy: 3, face: "NE" },
  };
  for (const r of m.rooms) {
    const s = STUDIO_SPOTS[r.id];
    if (s && walkable(m, r.x + s.dx, r.y + s.dy)) tvSpots.set(r.id, { at: { x: r.x + s.dx, y: r.y + s.dy }, face: s.face });
  }
  const spotOf = (id: string) => {
    const r = byId.get(id);
    return tvSpots.get(id) ?? (r ? { at: r.inside, face: "SW" as Dir } : null);
  };
  // El recorrido del guía: la recepción, las salas del estudio y después cada proyecto, en el orden del mapa
  const tourStops: { at: Pt; face: Dir }[] = [...m.rooms].sort((a, b) => +(b.kind === "reception") - +(a.kind === "reception")).flatMap((r) => tvSpots.get(r.id) ?? []);
  // Por dónde pasean las visitas: las salas de proyectos, las del estudio que son de todos y la cocina
  const wanderRooms = m.rooms.filter((r) => r.kind === "project" || r.kind === "reception" || r.kind === "kitchen" || r.kind === "lounge" || r.kind === "meeting");
  const freeTiles = new Map(wanderRooms.map((r) => {
    const tiles: Pt[] = [];
    for (let y = r.y; y < r.y + r.d; y++) for (let x = r.x; x < r.x + r.w; x++) if (walkable(m, x, y)) tiles.push({ x, y });
    return [r.id, tiles];
  }));
  /** La próxima baldosa de una visita: una sala elegida con su número y un lugar libre adentro. */
  function wanderSpot(a: Actor): Pt | null {
    if (!wanderRooms.length) return null;
    const r = wanderRooms[Math.floor(hash(a.seed, a.stop * 13 + 1) * wanderRooms.length)];
    const tiles = freeTiles.get(r.id) ?? [];
    // Mejor una baldosa donde no haya otra visita parada
    const taken = (q: Pt) => actors.some((o) => o !== a && (o.dest ? o.dest.x === q.x && o.dest.y === q.y : o.x === q.x && o.y === q.y));
    const start = Math.floor(hash(a.stop * 7 + 3, a.seed) * tiles.length);
    for (let i = 0; i < tiles.length; i++) {
      const q = tiles[(start + i) % tiles.length];
      if (!taken(q)) return q;
    }
    return tiles[start] ?? null;
  }
  const seedOf = (id: string) => {
    let n = 0;
    for (let i = 0; i < id.length; i++) n = (Math.imul(n, 31) + id.charCodeAt(i)) | 0;
    return n;
  };
  function syncActors(specs: ActorSpec[]) {
    for (let i = actors.length - 1; i >= 0; i--) if (!specs.some((sp) => sp.id === actors[i].id)) actors.splice(i, 1);
    for (const sp of specs) {
      const a = actors.find((x) => x.id === sp.id);
      if (a) {
        if (JSON.stringify(a.goal) !== JSON.stringify(sp.goal)) Object.assign(a, { goal: sp.goal, stuck: false, wait: 0, face: null });
        a.look = sp.look;
        a.you = !!sp.you;
        a.tag = sp.tag ?? null;
        continue;
      }
      // Los socios aparecen en su escritorio; el guía y las visitas, en el pasillo frente a la recepción
      const seat = sp.goal.kind === "seat" ? seatOf(sp.goal.who) : null;
      const at = seat ?? m.start;
      const seed = seedOf(sp.id);
      actors.push({ id: sp.id, look: sp.look, goal: sp.goal, x: at.x, y: at.y, from: { ...at }, to: { ...at }, t: 0, moving: false, dir: "SW", path: [], step: 0, seat, face: null, wait: 0, stop: sp.goal.kind === "wander" ? Math.abs(seed) % 97 : 0, stuck: false, dest: null, seed, you: !!sp.you, tag: sp.tag ?? null, greet: null, own: null });
    }
    poke();
  }
  const youActor = () => actors.find((a) => a.you) ?? null;
  /** Tu muñeco hace lo que le pediste (con los controles de la pantalla completa). */
  function own(a: Actor, g: OwnGoal) {
    Object.assign(a, { own: g, wait: 0, dest: null, stuck: false, face: null });
    if (g.kind !== "manual") a.path = [];
    camFree = false;
    poke();
  }
  function headTo(a: Actor, to: Pt) {
    const path = findPath(m, a.moving ? a.to : { x: a.x, y: a.y }, to);
    if (!path) return false;
    a.seat = null;
    a.face = null;
    // Con movimiento reducido, aparece directamente donde va
    if (reduced) Object.assign(a, { x: to.x, y: to.y, from: { ...to }, to: { ...to }, moving: false, path: [] });
    else a.path = path;
    return true;
  }
  function settle(a: Actor, ts: number) {
    if (a.own) {
      const w = a.own;
      if (w.kind === "manual") return;
      const stop = w.kind === "room" ? spotOf(w.room) : { at: w.at, face: null };
      if (!stop) return;
      if (a.x === stop.at.x && a.y === stop.at.y) {
        if (stop.face) a.face = stop.face;
        return;
      }
      if (a.stuck) return;
      if (!headTo(a, stop.at)) a.stuck = true;
      return;
    }
    const g = a.goal;
    if (g.kind === "wander") {
      // Llega, se queda un rato mirando (4 a 10 s) y elige otra sala
      if (a.dest && a.x === a.dest.x && a.y === a.dest.y) {
        if (!a.wait) {
          a.wait = ts + 4000 + hash(a.seed, a.stop) * 6000;
          a.face = (["NE", "NW", "SE", "SW"] as Dir[])[Math.floor(hash(a.stop, a.seed) * 4)];
        } else if (ts > a.wait) Object.assign(a, { wait: 0, dest: null, stop: a.stop + 1 });
        return;
      }
      if (!a.dest) a.dest = wanderSpot(a);
      if (!a.dest || !headTo(a, a.dest)) Object.assign(a, { dest: null, stop: a.stop + 1 });
      return;
    }
    if (g.kind === "seat") {
      const seat = seatOf(g.who);
      if (a.seat || !seat) return;
      if (a.stuck || Math.abs(a.x - seat.x) + Math.abs(a.y - seat.y) <= 1) {
        Object.assign(a, { x: seat.x, y: seat.y, seat });
        return;
      }
      const next = [[0, -1], [-1, 0], [1, 0], [0, 1]].map(([dx, dy]) => ({ x: seat.x + dx, y: seat.y + dy })).find((q) => walkable(m, q.x, q.y));
      if (!next || !headTo(a, next)) a.stuck = true;
      return;
    }
    const stop = g.kind === "room" ? spotOf(g.room) : tourStops[a.stop % Math.max(1, tourStops.length)];
    if (!stop) return;
    if (a.x === stop.at.x && a.y === stop.at.y) {
      a.face = stop.face;
      if (g.kind !== "tour" || reduced) return;
      if (!a.wait) a.wait = ts + DWELL;
      else if (ts > a.wait) {
        a.wait = 0;
        a.stop++;
      }
      return;
    }
    if (a.stuck) return;
    if (!headTo(a, stop.at)) {
      if (g.kind === "tour") a.stop++;
      else a.stuck = true;
    }
  }
  function stepActor(a: Actor) {
    const n = a.path.shift() as Pt;
    a.dir = dirOf(n.x - a.x, n.y - a.y);
    if (!canStep(m, a.x, a.y, n.x, n.y)) {
      a.path = [];
      return;
    }
    Object.assign(a, { from: { x: a.x, y: a.y }, to: n, moving: true, t: 0 });
  }
  // Dos que se cruzan se saludan: se miran, levantan la mano y se dicen algo.
  // Cada par, a lo sumo una vez cada 25 s, así no se la pasan saludando.
  const GREET_MS = 1800;
  const WORDS = ["HOLA!", "BUENAS!", "QUÉ TAL!", "EY!", "HOLI!"];
  const greeted = new Map<string, number>();
  const faceTo = (dx: number, dy: number): Dir => (Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "SE" : "NW") : dy > 0 ? "SW" : "NE");
  function greetings(ts: number) {
    const free = actors.filter((a) => !a.seat);
    for (let i = 0; i < free.length; i++)
      for (let j = i + 1; j < free.length; j++) {
        const a = free[i], b = free[j];
        const [ax, ay] = actorPos(a), [bx, by] = actorPos(b);
        const d = Math.hypot(ax - bx, ay - by);
        if (d > 1.6 || d < 0.01) continue;
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (ts - (greeted.get(key) ?? -Infinity) < 25_000) continue;
        greeted.set(key, ts);
        // Cada uno tiene su forma de saludar; si les toca la misma, el segundo dice otra cosa
        const wa = Math.abs(a.seed) % WORDS.length;
        let wb = Math.abs(b.seed) % WORDS.length;
        if (wb === wa) wb = (wb + 1) % WORDS.length;
        a.greet = { t0: ts, word: WORDS[wa] };
        b.greet = { t0: ts + 350, word: WORDS[wb] };
        // Los que están quietos se dan vuelta para mirarse y se quedan un poco más
        for (const [p, q] of [[a, b], [b, a]] as const) {
          if (p.moving) continue;
          const [px, py] = actorPos(p), [qx, qy] = actorPos(q);
          p.face = faceTo(qx - px, qy - py);
          if (p.wait) p.wait += GREET_MS;
        }
      }
    for (const a of actors) if (a.greet && ts - a.greet.t0 > GREET_MS) a.greet = null;
  }
  /** Una visita parada en una sala a veces saca el celular (y lo guarda para saludar). */
  const phoneOut = (a: Actor) => a.goal.kind === "wander" && !a.moving && !a.path.length && !!a.wait && !a.greet && hash(a.seed, a.stop * 3 + 1) > 0.55;
  /** La sala donde está tu muñeco, para avisar cuando entrás caminando con las flechas. */
  let youRoom: string | null = null;
  function updateActors(dt: number, ts: number) {
    // Con las flechas, tu muñeco da un paso por vez hacia donde apretás
    const you = o.controls ? youActor() : null;
    if (you && held.size) {
      // Apretar una flecha corta lo que estaba haciendo (paseaba solo o iba a una sala)
      if (you.own?.kind !== "manual") {
        own(you, { kind: "manual" });
        you.path = [];
        marker = null;
      }
      if (!you.moving && !you.path.length) {
        const k = ["up", "down", "left", "right"].find((d) => held.has(d)) as string;
        const [dx, dy] = DIRS[k];
        you.dir = dirOf(dx, dy);
        if (canStep(m, you.x, you.y, you.x + dx, you.y + dy)) you.path = [{ x: you.x + dx, y: you.y + dy }];
      }
    }
    for (const a of actors) {
      if (!a.moving && a.path.length) stepActor(a);
      if (a.moving) {
        a.t += dt * SPEED;
        a.step += dt * SPEED;
        if (a.t >= 1) {
          Object.assign(a, { x: a.to.x, y: a.to.y, moving: false });
          if (a.path.length) stepActor(a);
        }
      }
      if (!a.moving && !a.path.length) settle(a, ts);
    }
    if (you) {
      if (marker && !you.moving && !you.path.length) marker = null;
      const r = you.moving ? null : roomAt(m, you.x, you.y);
      const id = r && r.kind !== "storage" ? r.id : null;
      if (!you.moving && id !== youRoom) {
        youRoom = id;
        // Si entraste caminando con las flechas, la sala se elige sola
        if (you.own?.kind === "manual" && id) {
          selected = id;
          o.onRoom(id);
        }
      }
    }
  }
  const actorPos = (a: Actor): [number, number] => {
    if (a.seat) return [a.seat.x + 0.5, a.seat.y + 0.5];
    const k = a.moving ? Math.min(1, a.t) : 0;
    const fx = a.moving ? a.from.x : a.x, fy = a.moving ? a.from.y : a.y;
    const tx = a.moving ? a.to.x : a.x, ty = a.moving ? a.to.y : a.y;
    return [fx + (tx - fx) * k + 0.5, fy + (ty - fy) * k + 0.5];
  };
  const actorDepth = (a: Actor) => (a.moving ? Math.max(a.from.x + a.from.y, a.to.x + a.to.y) : a.x + a.y) + 0.05;
  /** A quién sigue la cámara: la visita que mira, o el guía, o el que camina, o el primero. */
  const focusActor = () => actors.find((a) => a.you) ?? actors.find((a) => a.goal.kind === "tour") ?? actors.find((a) => !a.seat) ?? actors[0] ?? null;

  // Salas con alguien mirando la tele (o, en el panel, donde estás): ahí la
  // tele recorre el sitio. `liveSince`: desde cuándo, para arrancar arriba.
  const liveSince = new Map<string, number>();
  function updateLive(ts: number) {
    const live = new Set<string>();
    if (o.public) {
      for (const a of actors) {
        const r = !a.moving && !a.seat && !a.path.length ? roomAt(m, a.x, a.y) : null;
        if (r?.kind === "project") live.add(r.id);
      }
      // La grabación (si la sala no tiene captura) va en la del que sigue la cámara
      const f = focusActor();
      const fr = f && !f.moving && !f.seat && !f.path.length ? roomAt(m, f.x, f.y) : null;
      tuneTv(fr?.kind === "project" ? fr.id : null);
    } else if (current?.kind === "project") live.add(current.id);
    for (const id of [...liveSince.keys()]) if (!live.has(id)) liveSince.delete(id);
    for (const id of live) {
      if (!liveSince.has(id)) liveSince.set(id, ts);
      // La página entera de la captura recién se baja cuando alguien mira la tele
      const l = lazy.get(id);
      if (l?.live) {
        l.near?.();
        l.live();
        Object.assign(l, { near: null, live: null });
      }
    }
  }

  // --- El gato del estudio -------------------------------------------------------
  // Anda por el pasillo, la recepción y la cocina; cada tanto se echa una siesta
  // en la alfombra de la recepción. Cuando alguien pasa al lado, le salen
  // corazones. Con movimiento reducido se queda dormido.
  const CAT_SPEED = 1.4;
  const catTiles: Pt[] = [];
  for (let y = 0; y < m.H; y++)
    for (let x = 0; x < m.W; x++) {
      const r = roomAt(m, x, y);
      if (walkable(m, x, y) && (!r || r.kind === "reception" || r.kind === "kitchen" || r.kind === "lounge")) catTiles.push({ x, y });
    }
  const napTiles = m.furni.filter((f) => f.k === "rug" && (f.room === "recepcion" || f.room === "lounge")).flatMap((f) => {
    const out: Pt[] = [];
    for (let y = f.y; y < f.y + f.d; y++) for (let x = f.x; x < f.x + f.w; x++) if (walkable(m, x, y)) out.push({ x, y });
    return out;
  });
  const catStart = napTiles[1] ?? napTiles[0] ?? m.start;
  const cat = { x: catStart.x, y: catStart.y, from: { ...catStart }, to: { ...catStart }, t: 0, moving: false, dir: "SW" as Dir, path: [] as Pt[], step: 0, until: 0, sleeping: true, heart: -Infinity };
  function updateCat(dt: number, ts: number) {
    if (reduced) {
      cat.sleeping = true;
      return;
    }
    if (cat.moving) {
      cat.t += dt * CAT_SPEED;
      cat.step += dt * CAT_SPEED * 1.6;
      if (cat.t >= 1) Object.assign(cat, { x: cat.to.x, y: cat.to.y, moving: false });
    }
    if (cat.moving) return;
    if (cat.path.length) {
      const n = cat.path.shift() as Pt;
      cat.dir = dirOf(n.x - cat.x, n.y - cat.y);
      if (canStep(m, cat.x, cat.y, n.x, n.y)) Object.assign(cat, { from: { x: cat.x, y: cat.y }, to: n, moving: true, t: 0 });
      else cat.path = [];
      return;
    }
    if (ts < cat.until) return;
    // Se despierta o termina de pasear: elige qué hacer
    const r = Math.random();
    if (!cat.sleeping && r < 0.25 && napTiles.length) {
      const spot = napTiles[Math.floor(Math.random() * napTiles.length)];
      if (spot.x === cat.x && spot.y === cat.y) Object.assign(cat, { sleeping: true, until: ts + 15_000 + Math.random() * 25_000 });
      else cat.path = findPath(m, { x: cat.x, y: cat.y }, spot) ?? [];
      return;
    }
    cat.sleeping = false;
    const dest = catTiles[Math.floor(Math.random() * catTiles.length)];
    cat.path = dest ? (findPath(m, { x: cat.x, y: cat.y }, dest) ?? []).slice(0, 8) : [];
    cat.until = ts + 2500 + Math.random() * 5000;
  }
  const catPos = (): [number, number] => {
    const k = cat.moving ? Math.min(1, cat.t) : 0;
    return [cat.from.x + (cat.to.x - cat.from.x) * (cat.moving ? k : 1) + 0.5, cat.from.y + (cat.to.y - cat.from.y) * (cat.moving ? k : 1) + 0.5];
  };
  /** ¿Hay alguien al lado del gato? (vos en el panel; cualquiera en la landing) */
  function catCompany() {
    const [cx, cy] = catPos();
    const near = (px: number, py: number) => Math.hypot(px - cx, py - cy) < 1.3;
    if (o.public) return actors.some((a) => !a.seat && near(...actorPos(a)));
    return near(...playerPos());
  }

  function update(dt: number, ts: number) {
    for (const [id, a] of anim) {
      const t = (ts - a.t0) / 900;
      let v = a.from;
      for (const [k, val] of FLICK) if (t >= k) v = val === 1 ? a.from : Math.min(a.from, val);
      if (t >= 1) {
        v = looks[id]?.fade ?? 0;
        anim.delete(id);
      }
      disp.set(id, v);
    }
    if (o.public) {
      updateActors(dt, ts);
      if (!reduced) greetings(ts);
    }
    else {
      if (!player.moving) next();
      // Quieto al lado de tu silla un momento: te sentás
      const seat = ownSeat();
      if (player.moving || player.path.length || held.size || !seat) idleSince = 0;
      else if (!idleSince) idleSince = ts;
      else if (!sitting && ts - idleSince > 700 && Math.abs(player.x - seat.x) + Math.abs(player.y - seat.y) === 1) sitting = true;
      // Quieto un rato en otro lado: mira para un costado y para el otro, como en Habbo
      const still = player.moving || player.path.length || held.size ? 0 : (idleSince || ts);
      if (!sitting && still && !reduced && ts - still > 6000) player.dir = Math.floor((ts - still - 6000) / 2400) % 2 ? "SE" : "SW";
      if (player.moving) {
        player.t += dt * SPEED;
        player.step += dt * SPEED;
        if (player.t >= 1) {
          player.x = player.to.x;
          player.y = player.to.y;
          player.moving = false;
          arrive();
          next();
        }
      }
    }
    updateCat(dt, ts);
    if (!reduced && ts - cat.heart > 12_000 && catCompany()) cat.heart = ts;
    updateLive(ts);
  }
  const playerPos = (): [number, number] => {
    const k = player.moving ? Math.min(1, player.t) : 0;
    const fx = player.moving ? player.from.x : player.x, fy = player.moving ? player.from.y : player.y;
    const tx = player.moving ? player.to.x : player.x, ty = player.moving ? player.to.y : player.y;
    return [fx + (tx - fx) * k + 0.5, fy + (ty - fy) * k + 0.5];
  };

  // --- Luz ----------------------------------------------------------------------
  // La luz de la hora va horneada en los colores (ver tintOf) y los charcos de
  // luz, en el piso: no hay una capa de oscuridad que repintar en cada cuadro.
  function spillPoly(r: MapRoom, reach: number): XY[] {
    const d = r.door, inside = r.inside, outside = r.outside;
    const sx = Math.sign(outside.x - inside.x), sy = Math.sign(outside.y - inside.y);
    const spread = reach * 0.25;
    if (d.side === "L")
      return [P(d.x, d.y + 0.1), P(d.x + sx * reach, d.y - spread), P(d.x + sx * reach, d.y + 1 + spread), P(d.x, d.y + 0.9)];
    return [P(d.x + 0.1, d.y), P(d.x - spread, d.y + sy * reach), P(d.x + 1 + spread, d.y + sy * reach), P(d.x + 0.9, d.y)];
  }
  function fillPoly(g: CanvasRenderingContext2D, pts: XY[], style: string) {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
    g.closePath();
    g.fillStyle = style;
    g.fill();
  }
  /** Los charcos de luz de la tarde y la noche: debajo de las lámparas del pasillo y saliendo por cada puerta prendida. */
  function lightPools() {
    const k = LIGHT[period].pools;
    if (!k) return;
    for (const l of m.lamps) lightPool(P(l.x + 0.5, l.y + 0.5), 92, 0.2 * k);
    for (const r of m.rooms) {
      const L = lightOf(r.id);
      if (L <= 0.02 || r.kind === "reception" || r.kind === "lounge") continue;
      lightSpill(spillPoly(r, 1.8), 0.09 * L * k);
      lightSpill(spillPoly(r, 1.1), 0.09 * L * k);
    }
  }

  function inQuad(q: XY[], cols: number, rows: number, fn: () => void) {
    const [a, b, , d] = q;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]);
    ctx.closePath();
    ctx.clip();
    ctx.transform((b[0] - a[0]) / cols, (b[1] - a[1]) / cols, (d[0] - a[0]) / rows, (d[1] - a[1]) / rows, a[0], a[1]);
    fn();
    ctx.restore();
  }
  /**
   * La compu de cada sala: los días sin entrar en grande y, si hay, las
   * novedades en rojo. En una sala apagada queda como pantalla de bloqueo, en
   * ámbar: desde el pasillo se ve cuánto hace que nadie entra.
   */
  function statusScreen(gl: Extract<Glow, { t: "screen" }>) {
    if (o.public) return publicScreen(gl);
    const L = lightOf(gl.room), on = L > 0.5;
    const lk = gl.room ? looks[gl.room] : undefined;
    const days = lk?.days ?? null, badge = lk?.badge ?? 0;
    const mark = artOf(gl.room)?.mark ?? null;
    const q = gl.quad, flip = q[1][0] < q[0][0];
    const W = 42, H = 30;
    inQuad(flip ? [q[1], q[0], q[3], q[2]] : q, W, H, () => {
      ctx.fillStyle = on ? "#121219" : "#07070b";
      ctx.fillRect(0, 0, W, H);
      if (on) {
        ctx.fillStyle = "#1f1e27";
        ctx.fillRect(0, 0, W, 7);
        ctx.fillStyle = gl.accent;
        ctx.fillRect(0, 7, W, 1);
        if (mark) {
          const k = Math.min(5.4 / mark.naturalWidth, 5.4 / mark.naturalHeight);
          ctx.drawImage(mark, 1.4, 0.8, mark.naturalWidth * k, mark.naturalHeight * k);
        }
      }
      const big = days === null ? "NUNCA" : days === 0 ? "HOY" : String(Math.min(days, 99));
      const unit = days === null || days === 0 ? "" : days === 1 ? "DÍA" : "DÍAS";
      const amber = (a: number) => `rgba(232,140,64,${a})`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = on ? "#f4efe6" : amber(0.45 + 0.4 * L);
      ctx.font = `${big.length > 3 ? 8 : 14}px ${o.font}`;
      ctx.fillText(big, W / 2, unit ? 16 : 18.5);
      if (unit) {
        ctx.font = `6px ${o.font}`;
        ctx.fillStyle = on ? "#a39e95" : amber(0.4);
        ctx.fillText(unit, W / 2, 25.5);
      }
      // Las novedades, en la barra de arriba (no pisan el número)
      if (badge) {
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath();
        ctx.roundRect(W - 12.5, 0.6, 11.5, 6.6, 2.5);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = `5px ${o.font}`;
        ctx.fillText(badge > 9 ? "9+" : String(badge), W - 6.75, 4.1);
      }
      ctx.textAlign = "left";
    });
    if (on) {
      ctx.globalCompositeOperation = "lighter";
      fillPoly(ctx, gl.quad, `rgba(255,236,210,${0.06 * L})`);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  /** La tele: barra de navegador con el dominio y, abajo, el sitio. Apagada en una sala apagada. */
  function tvScreen(gl: Extract<Glow, { t: "screen" }>, ts: number) {
    const L = lightOf(gl.room);
    const q = gl.quad, flip = q[1][0] < q[0][0];
    const qq = flip ? [q[1], q[0], q[3], q[2]] : q;
    const W = 64, H = 42.7, BAR = 4;
    if (L <= 0.15) {
      inQuad(qq, W, H, () => {
        ctx.fillStyle = "#050507";
        ctx.fillRect(0, 0, W, H);
      });
      return;
    }
    const since = liveSince.get(gl.room ?? "");
    const here = since !== undefined && L > 0.9;
    const art = artOf(gl.room);
    const vid = here && tv && tv.room === gl.room && tv.el.readyState >= 2 ? tv.el : null;
    const page = here && art?.page ? art.page : null;
    const still = art?.site ?? null;
    const lerp = (p: XY, r: XY, t: number): XY => [p[0] + (r[0] - p[0]) * t, p[1] + (r[1] - p[1]) * t];
    const a = lerp(qq[0], qq[3], BAR / H), b = lerp(qq[1], qq[2], BAR / H);
    const live = page ?? vid;
    const shown = live ?? still;
    if (page) {
      setFade(0);
      quadImage(page, a, b, qq[3], TV_ASPECT, reduced ? 0 : browse((ts - (since ?? ts)) / 1000, page.naturalHeight - page.naturalWidth / TV_ASPECT));
    } else if (shown) {
      setFade(vid ? 0 : fadeOfId(gl.room));
      quadImage(shown, a, b, qq[3], TV_ASPECT);
      setFade(0);
    }
    const domain = gl.room ? o.info[gl.room]?.domain ?? "" : "";
    inQuad(qq, W, H, () => {
      if (!shown) {
        ctx.fillStyle = "#101016";
        ctx.fillRect(0, BAR, W, H - BAR);
      }
      ctx.fillStyle = "#26252d";
      ctx.fillRect(0, 0, W, BAR);
      ["#ff5f57", "#febc2e", "#28c840"].forEach((col, i) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(1.8 + i * 1.9, BAR / 2, 0.65, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#3a3942";
      ctx.beginPath();
      ctx.roundRect(8.5, 0.8, W - 17, BAR - 1.6, 1.2);
      ctx.fill();
      if (domain) {
        ctx.font = `2.3px ${o.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#d8d4cc";
        ctx.fillText(domain, W / 2, BAR / 2 + 0.1);
        ctx.textAlign = "left";
      }
      // Punto rojo mientras la tele recorre el sitio
      if (live && Math.floor(ts / 700) % 2 === 0) {
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath();
        ctx.arc(W - 3.5, BAR / 2, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    if (L > 0.5) {
      ctx.globalCompositeOperation = "lighter";
      fillPoly(ctx, gl.quad, `rgba(255,236,210,${0.05 * L})`);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  /** La compu en la landing: el ícono de la marca y «en línea». Nada de días ni novedades: eso es del panel. */
  function publicScreen(gl: Extract<Glow, { t: "screen" }>) {
    const mark = artOf(gl.room)?.mark ?? null;
    const q = gl.quad, flip = q[1][0] < q[0][0];
    const W = 42, H = 30;
    const blinkOn = reduced || Math.floor(performance.now() / 900) % 2 === 0;
    inQuad(flip ? [q[1], q[0], q[3], q[2]] : q, W, H, () => {
      ctx.fillStyle = "#121219";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = gl.accent;
      ctx.fillRect(0, 0, W, 1.4);
      if (mark) {
        const k = Math.min(15 / mark.naturalWidth, 13 / mark.naturalHeight);
        ctx.drawImage(mark, W / 2 - (mark.naturalWidth * k) / 2, 13 - (mark.naturalHeight * k) / 2, mark.naturalWidth * k, mark.naturalHeight * k);
      }
      ctx.fillStyle = blinkOn ? "#34d27b" : "#1f6b43";
      ctx.beginPath();
      ctx.arc(W / 2 - 12.5, 25, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `5px ${o.font}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#cfe9da";
      ctx.fillText("EN LÍNEA", W / 2 - 9.5, 25.3);
    });
    ctx.globalCompositeOperation = "lighter";
    fillPoly(ctx, gl.quad, "rgba(255,236,210,0.06)");
    ctx.globalCompositeOperation = "source-over";
  }
  function screenGlow(gl: Extract<Glow, { t: "screen" }>, ts: number) {
    if (gl.kind === "status") return statusScreen(gl);
    if (gl.kind === "live") return tvScreen(gl, ts);
    if (gl.kind === "ci") return ciScreen(gl, ts);
    if (gl.kind === "slides") return slidesScreen(gl, ts);
    if (gl.kind === "arcade") return arcadeScreen(gl, ts);
    const L = lightOf(gl.room);
    const tick = reduced ? 0 : Math.floor(ts / 380);
    // Las pantallas «site» (el pedestal del archivo, los celulares) muestran el sitio de verdad, derecho aunque miren a +x
    const site = gl.kind === "site" && L > 0.5 ? artOf(gl.room)?.site : null;
    if (site) {
      const q = gl.quad, flip = q[1][0] < q[0][0];
      setFade(fadeOfId(gl.room));
      quadImage(site, flip ? q[1] : q[0], flip ? q[0] : q[1], flip ? q[2] : q[3], Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]));
      setFade(0);
    }
    inQuad(gl.quad, 20, 12, () => {
      const R = (x: number, y: number, w: number, h: number, col: string) => {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, w, h);
      };
      if (L <= 0.15) return R(0, 0, 20, 12, "#060609");
      if (L <= 0.5) {
        R(0, 0, 20, 12, "#0c0c14");
        if (Math.floor(ts / 1000) % 2 === 0) R(17, 9, 1.5, 1.5, PAL.violet2);
        return;
      }
      if (gl.kind === "site" && site) return;
      switch (gl.kind) {
        case "code": {
          R(0, 0, 20, 12, "#12112a");
          const cols = [PAL.violet3, PAL.white, gl.accent, PAL.violet, "#7fd1ff"];
          for (let i = 0; i < 5; i++) {
            const n = tick + i, ind = Math.floor(hash(n, 3) * 3) * 2;
            R(1 + ind, 1 + i * 2.1, 2 + Math.floor(hash(n, 7) * 12), 1, cols[Math.floor(hash(7, n) * cols.length)]);
          }
          break;
        }
        case "review": {
          R(0, 0, 20, 12, "#141233");
          const live = Math.floor(ts / 900) % 4;
          for (let i = 0; i < 4; i++) {
            R(1, 1.5 + i * 2.6, 1.4, 1.4, i === live ? PAL.white : PAL.violet2);
            R(3.5, 1.7 + i * 2.6, 4 + hash(i, 5) * 12, 1, PAL.violet3);
          }
          break;
        }
        case "map": {
          // Mapa satelital con focos de incendio que titilan
          R(0, 0, 20, 12, "#0d2236");
          R(2, 2, 6, 4, "#2f6b3f");
          R(9, 4.5, 7, 5, "#2f6b3f");
          R(4.5, 7, 3, 3, "#2f6b3f");
          for (const [fx, fy, k] of [[4, 3, 0], [12, 7, 1], [14.5, 5.5, 2], [6, 8, 1]]) if (reduced || (Math.floor(ts / 450) + k) % 3) R(fx, fy, 1.4, 1.4, "#ff6b2c");
          break;
        }
        case "site": {
          R(0, 0, 20, 12, "#f2ede4");
          const off = reduced ? 0 : (ts / 140) % 26;
          R(0, -off, 20, 2.2, gl.accent);
          R(1, 3 - off, 18, 6, mix(gl.accent, "#000000", 0.25));
          for (let k = 11; k < 24; k += 2) R(1, k - off, 4 + hash(k, 2) * 12, 1, "#9a948a");
          R(1, 24 - off, 18, 4, gl.accent);
          R(0, 28 - off, 20, 2.2, gl.accent);
          break;
        }
      }
    });
    if (L > 0.5) {
      ctx.globalCompositeOperation = "lighter";
      fillPoly(ctx, gl.quad, gl.kind === "site" ? `rgba(255,236,210,${0.08 * L})` : `rgba(167,139,250,${0.1 * L})`);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  /**
   * La pantalla grande de Desarrollo: el pipeline del deploy (compilar, probar,
   * publicar) que se llena y vuelve a empezar, y el log que corre abajo. Sin
   * nombres de nada: sólo la forma de un deploy.
   */
  function ciScreen(gl: Extract<Glow, { t: "screen" }>, ts: number) {
    const W = 80, H = 44;
    const cycle = reduced ? 7.5 : (ts / 1000) % 10;
    inQuad(gl.quad, W, H, () => {
      const R = (x: number, y: number, w: number, h: number, col: string) => {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, w, h);
      };
      R(0, 0, W, H, "#0f0e1d");
      R(0, 0, W, 5, "#1d1b30");
      ["#ff6b6b", "#ffd84d", "#5ad1a8"].forEach((col, i) => R(2 + i * 3, 1.6, 1.8, 1.8, col));
      R(W - 16, 1.4, 13, 2.2, PAL.violet);
      // Los tres pasos: hechos (violeta con tilde), el que corre (barra) y los que faltan (contorno)
      for (let i = 0; i < 3; i++) {
        const x = 5 + i * 25, y = 10, done = cycle > 2.5 + i * 2.5, run = !done && cycle > 0.5 + i * 2.5;
        if (i) R(x - 7, y + 3.6, 7, 0.8, done || run ? PAL.violet2 : "#3a3856");
        R(x, y, 18, 8, done ? PAL.violet : "#1b1930");
        if (!done) {
          ctx.strokeStyle = run ? PAL.violet3 : "#3a3856";
          ctx.lineWidth = 0.8;
          ctx.strokeRect(x + 0.4, y + 0.4, 17.2, 7.2);
        }
        if (done) {
          ctx.strokeStyle = PAL.white;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(x + 6.5, y + 4);
          ctx.lineTo(x + 8.5, y + 6);
          ctx.lineTo(x + 12, y + 2.2);
          ctx.stroke();
        } else if (run) R(x + 2, y + 5.4, 14 * ((cycle - 0.5 - i * 2.5) / 2), 1.2, PAL.violet3);
      }
      // El log: renglones que suben
      const tick = reduced ? 0 : Math.floor(ts / 420);
      for (let k = 0; k < 6; k++) {
        const n = tick + k;
        R(5, 23 + k * 3.4, 2, 1.4, hash(n, 2) > 0.85 ? PAL.violet3 : "#4a4868");
        R(9, 23 + k * 3.4, 10 + hash(n, 5) * 50, 1.4, hash(n, 9) > 0.7 ? PAL.violet2 : "#8d8aa8");
      }
    });
    ctx.globalCompositeOperation = "lighter";
    fillPoly(ctx, gl.quad, "rgba(167,139,250,0.08)");
    ctx.globalCompositeOperation = "source-over";
  }
  /** La pantalla de Reuniones: los pasos del proceso de la web, uno por vez. */
  function slidesScreen(gl: Extract<Glow, { t: "screen" }>, ts: number) {
    const W = 72, H = 44;
    const list = studio.slides.length ? studio.slides : ["Se7en Studio"];
    const i = reduced ? 0 : Math.floor(ts / 5000) % list.length;
    const [num, ...rest] = /^\d\d /.test(list[i]) ? list[i].split(" ") : ["", list[i]];
    const title = rest.join(" ");
    const family = o.display ?? o.font;
    inQuad(gl.quad, W, H, () => {
      ctx.fillStyle = "#151234";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = PAL.violet;
      ctx.fillRect(0, 0, 3, H);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      if (num) {
        ctx.font = `800 15px ${family}`;
        ctx.fillStyle = PAL.violet2;
        ctx.fillText(num, 8, 18);
      }
      // El título en uno o dos renglones, lo más grande que entre
      const words = title.split(" ");
      const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [title];
      let px = 8;
      ctx.font = `800 ${px}px ${family}`;
      const wid = Math.max(...lines.map((s) => ctx.measureText(s).width));
      px = Math.min(8, (8 * (W - 16)) / Math.max(1, wid));
      ctx.font = `800 ${px}px ${family}`;
      ctx.fillStyle = PAL.white;
      lines.forEach((s, k) => ctx.fillText(s, 8, (num ? 27 : 18) + k * (px + 2)));
      // Los puntitos de cuál va
      list.forEach((_, k) => {
        ctx.fillStyle = k === i ? PAL.violet2 : "#3b3760";
        ctx.fillRect(8 + k * 5, H - 5, 3, 1.6);
      });
    });
    ctx.globalCompositeOperation = "lighter";
    fillPoly(ctx, gl.quad, "rgba(167,139,250,0.07)");
    ctx.globalCompositeOperation = "source-over";
  }
  /** El fichín del Chill-out: el orbe del estudio rebotando y «PLAY» que titila. */
  function arcadeScreen(gl: Extract<Glow, { t: "screen" }>, ts: number) {
    const W = 20, H = 18;
    const t = reduced ? 0 : ts / 1000;
    inQuad(gl.quad, W, H, () => {
      ctx.fillStyle = "#0c0a1e";
      ctx.fillRect(0, 0, W, H);
      for (let k = 0; k < 7; k++) {
        ctx.fillStyle = k % 2 ? PAL.violet3 : "#5a4a9a";
        ctx.fillRect((hash(k, 1) * W + t * (2 + k)) % W, hash(1, k) * H, 0.6, 0.6);
      }
      const bx = 5 + Math.abs(((t * 6) % 20) - 10), by = 4 + Math.abs(((t * 4.2) % 12) - 6);
      ctx.strokeStyle = PAL.violet2;
      ctx.lineWidth = 0.8;
      for (const r of [2.6, 1.6]) {
        ctx.beginPath();
        ctx.arc(bx, by, r, Math.PI * 0.55, Math.PI * 1.45);
        ctx.stroke();
      }
      if (Math.floor(t * 1.6) % 2 === 0 || reduced) {
        ctx.font = `4px ${o.font}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = PAL.white;
        ctx.fillText("PLAY", W / 2, H - 3.2);
        ctx.textAlign = "left";
      }
    });
    ctx.globalCompositeOperation = "lighter";
    fillPoly(ctx, gl.quad, "rgba(167,139,250,0.12)");
    ctx.globalCompositeOperation = "source-over";
  }
  function emissives(ts: number) {
    const night = period === "noche";
    for (const gl of glows) {
      if (gl.t === "screen") screenGlow(gl, ts);
      else if (gl.t === "lamp") {
        const L = lightOf(gl.room);
        if (L < 0.3) continue;
        ctx.globalCompositeOperation = "lighter";
        const [x, y] = gl.at;
        for (const [rad, al] of [[30, 0.05], [18, 0.07], [8, 0.12]]) {
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(214,200,255,${al * L * (night ? 1.6 : 1)})`;
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      } else if (gl.t === "led") {
        const L = lightOf(gl.room);
        let col = "#1c1c22";
        if (gl.i === -2) col = L > 0.15 ? (Math.floor(ts / 380) % 3 ? "#ff7a2e" : "#ffd28a") : "#5a2a1c";
        else if (gl.i < 0) col = PAL.violet2;
        else if (L > 0.5) col = hash(gl.i, Math.floor(ts / 420)) > 0.3 ? PAL.violet3 : "#2e2650";
        else if (L > 0.15) col = Math.floor(ts / 1500) % 2 ? "#e8a33d" : "#1c1c22";
        ctx.fillStyle = col;
        ctx.fillRect(gl.at[0] - 1, gl.at[1] - 1, 2.4, 1.8);
      } else if (gl.t === "bubble" && !reduced) {
        // De vez en cuando sube una tanda de burbujas por el bidón, como cuando alguien se sirve
        const cycle = (ts / 1000) % 9;
        if (cycle < 2.4)
          for (let k = 0; k < 3; k++) {
            const ph = (cycle / 2.4 + k * 0.27) % 1;
            ctx.globalAlpha = 0.75 * (1 - ph * 0.6);
            ctx.fillStyle = "#eaf6ff";
            ctx.beginPath();
            ctx.arc(gl.at[0] + Math.sin(ph * 9 + k * 2) * 1.6 + (k - 1) * 1.8, gl.at[1] - ph * 13, 0.8 + k * 0.25, 0, Math.PI * 2);
            ctx.fill();
          }
        ctx.globalAlpha = 1;
      } else if (gl.t === "steam" && !reduced && lightOf(gl.room) > 0.3) {
        for (let k = 0; k < 3; k++) {
          const ph = (ts / 1700 + k / 3) % 1;
          ctx.globalAlpha = 0.45 * (1 - ph);
          ctx.fillStyle = PAL.white;
          ctx.beginPath();
          ctx.arc(gl.at[0] + Math.sin(ph * 6 + k) * 2, gl.at[1] - ph * 14, 1.3 + ph * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    ledBoard(ts);
    for (const mo of motes) {
      const k = (ts - mo.t0) / 1600;
      if (k < 0 || k > 1) continue;
      const [mx, my] = P(mo.x, mo.y, 6 + k * 52);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = Math.sin(k * Math.PI) * 0.9;
      ctx.fillStyle = mo.col;
      ctx.fillRect(mx - 0.9, my - 0.9 + Math.sin(k * 9 + mo.x) * 1.5, 1.8, 1.8);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    if (motes.length && motes.every((mo) => ts - mo.t0 > 1600)) motes = [];
  }

  // --- Cartel LED -------------------------------------------------------------------
  const ledCanvas = document.createElement("canvas");
  const lctx = ledCanvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  let ledMsgs: LedMsg[] = [];
  let ledBakes: LedBake[] = [];
  let ledIdx = 0, ledT0 = -1;
  /** Escribe el mensaje con la letra pixel en un canvas chico y se queda con los puntos prendidos. */
  function bakeLed(msg: LedMsg): LedBake {
    const font = `8px ${o.font}`;
    lctx.font = font;
    const spans: { x0: number; x1: number; color: string }[] = [];
    let x = 0;
    for (const part of msg) {
      const w = Math.round(lctx.measureText(part.text).width);
      spans.push({ x0: x, x1: x + w, color: ledColor(part.color) });
      x += w;
    }
    const cols = Math.max(1, x + 1);
    ledCanvas.width = cols;
    ledCanvas.height = LED_ROWS;
    lctx.font = font;
    lctx.textBaseline = "alphabetic";
    lctx.fillStyle = "#ffffff";
    msg.forEach((part, i) => lctx.fillText(part.text, spans[i].x0, 9));
    const px = lctx.getImageData(0, 0, cols, LED_ROWS).data;
    const mask = new Uint16Array(cols);
    const color = new Array<string>(cols).fill(LED_AMBER);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < LED_ROWS; r++) if (px[(r * cols + c) * 4 + 3] > 110) mask[c] |= 1 << r;
      color[c] = spans.find((sp) => c >= sp.x0 && c < sp.x1)?.color ?? LED_AMBER;
    }
    return { cols, mask, color };
  }
  const rebakeLed = () => {
    ledBakes = ledMsgs.map(bakeLed);
  };
  function ledBoard(ts: number) {
    const tk = m.decor.find((dc) => dc.k === "ticker");
    if (!tk) return;
    const q = tickerQuad(tk);
    const len = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    const board = Math.floor((len - 2) / LED_PITCH);
    const pad = (len - board * LED_PITCH) / 2;
    // Qué mensaje va y por dónde va
    let cur = ledBakes.length ? ledBakes[ledIdx % ledBakes.length] : null;
    if (cur && ledT0 < 0) ledT0 = ts;
    const fits = cur ? cur.cols <= board : true;
    const dur = !cur ? Infinity : fits ? LED_HOLD : reduced ? 6000 : ((cur.cols + board) / LED_SPEED) * 1000;
    if (cur && ts - ledT0 > dur) {
      ledIdx = (ledIdx + 1) % ledBakes.length;
      ledT0 = ts;
      cur = ledBakes[ledIdx];
    }
    const nowFits = cur ? cur.cols <= board : true;
    const off = !cur ? 0 : nowFits ? -Math.floor((board - cur.cols) / 2) : reduced ? 0 : -board + Math.floor(((ts - ledT0) / 1000) * LED_SPEED);
    const night = period === "noche" || period === "tarde";
    inQuad(q, len, 24, () => {
      // Los puntos apagados: una sola pasada
      ctx.beginPath();
      for (let c = 0; c < board; c++) for (let r = 0; r < LED_ROWS; r++) ctx.rect(pad + c * LED_PITCH + 0.45, r * LED_PITCH + 0.45, 1.1, 1.1);
      ctx.fillStyle = "#231d33";
      ctx.fill();
      if (!cur) return;
      // Los prendidos, agrupados por color: el punto y, encima, su brillo
      const lit = new Map<string, [number, number][]>();
      for (let c = 0; c < board; c++) {
        const k = c + off;
        if (k < 0 || k >= cur.cols || !cur.mask[k]) continue;
        const col = cur.color[k];
        let arr = lit.get(col);
        if (!arr) lit.set(col, (arr = []));
        for (let r = 0; r < LED_ROWS; r++) if (cur.mask[k] & (1 << r)) arr.push([pad + c * LED_PITCH + 1, r * LED_PITCH + 1]);
      }
      for (const [col, dots] of lit) {
        ctx.beginPath();
        for (const [x, y] of dots) {
          ctx.moveTo(x + 0.75, y);
          ctx.arc(x, y, 0.75, 0, Math.PI * 2);
        }
        ctx.fillStyle = col;
        ctx.fill();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = night ? 0.32 : 0.2;
        ctx.beginPath();
        for (const [x, y] of dots) {
          ctx.moveTo(x + 1.5, y);
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
      }
    });
    // El cartel ilumina un poco la pared
    ctx.globalCompositeOperation = "lighter";
    fillPoly(ctx, q, `rgba(255,170,80,${night ? 0.07 : 0.035})`);
    ctx.globalCompositeOperation = "source-over";
  }

  /**
   * Globos y cartelitos de historieta: esquinas redondas, contorno de tinta de
   * 2 px y la colita apuntando a `tailX` (null = sin colita).
   */
  function bubbleBox(x: number, y: number, w: number, h: number, fill: string, border: string, tailX: number | null) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(8, h / 2));
    if (tailX !== null) {
      const t = Math.round(Math.max(x + 8, Math.min(x + w - 8, tailX)));
      ctx.moveTo(t - 5, y + h - 0.5);
      ctx.lineTo(t - 1, y + h + 6);
      ctx.lineTo(t + 5, y + h - 0.5);
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = border;
    ctx.stroke();
    if (tailX !== null) {
      // Tapa la raya del contorno donde nace la colita
      const t = Math.round(Math.max(x + 8, Math.min(x + w - 8, tailX)));
      ctx.fillStyle = fill;
      ctx.fillRect(t - 4, y + h - 2.5, 8, 3.5);
    }
  }
  /** La letra de los globos: la del sitio si hay, si no la pixel. */
  const uiFont = (px: number, weight = 700) => (o.display ? `${weight} ${px + 1}px ${o.display}` : `${px}px ${o.font}`);

  /**
   * El piso, sobre el contexto de art (begin): baldosas, alfombras, polvo, los
   * charcos de luz y el borde del edificio. Con `near`, sólo las baldosas que
   * están a la vista.
   */
  function drawFloor(near?: (ax: number, ay: number) => boolean) {
    for (let y = 0; y < m.H; y++)
      for (let x = 0; x < m.W; x++) {
        if (near && !near(...P(x + 0.5, y + 0.5))) continue;
        const id = m.region[y][x];
        setFade(fadeOfId(id === "hall" ? null : id));
        tint(id);
        const axis = id === "hall" && x === 7 && y >= m.start.y - 1;
        floorTile(x, y, matAt(x, y), !axis ? null : m.archiveY !== null && y >= m.archiveY ? "gallery" : "axis");
      }
    for (const f of m.furni) {
      if (!DECALS.has(f.k)) continue;
      const r = f.room ? byId.get(f.room) : null;
      setFade(fadeOfId(f.room));
      tint(f.room);
      const art = artOf(f.room);
      if (f.k !== "rug") decal(f, accentOf(f.room), art);
      else if (r?.kind === "office") rug(f, r.area === "design" ? "#3b1d7a" : "#2b3463", r.area === "design" ? PAL.violet2 : PAL.violet);
      else if (r?.kind === "reception") rug(f, "#4c2a91", PAL.violet3);
      else if (r?.kind === "meeting") rug(f, "#262c4f", "#4a5590");
      else if (r?.kind === "lounge") rug(f, "#5b2bb5", PAL.violet3);
      else if (art) brandRug(f, art.rug);
      else {
        const acc = accentOf(f.room);
        rug(f, mix(acc, "#1b1a24", 0.45), mix(acc, "#f5f3ff", 0.3));
      }
    }
    setFade(0);
    setTint(0);
    for (const r of m.rooms) if (r.kind === "project") decay(r, fadeOfId(r.id));
    tint(null);
    slab(m, matAt);
    setTint(0);
    lightPools();
  }

  /** Lo que se marca sobre el piso, abajo de los muebles: la sala bajo el mouse (o la elegida), la baldosa y a dónde vas. */
  function floorMarks(ts: number) {
    // El trazo como lo deja el piso: así sale igual en cada rectángulo que se rehace
    ctx.lineJoin = "round";
    ctx.lineWidth = 1;
    // Al pasar el mouse por una sala (o al elegirla en la lista) se marca su contorno
    const hovered = hover ? roomAt(m, hover.x, hover.y) : null;
    for (const r of new Set([hovered, selected ? byId.get(selected) ?? null : null])) {
      if (!r || r.kind === "storage") continue;
      const acc = r.kind === "project" ? accentOf(r.id) : PAL.violet2;
      fillPoly(ctx, [P(r.x, r.y), P(r.x + r.w, r.y), P(r.x + r.w, r.y + r.d), P(r.x, r.y + r.d)], rgba(acc, 0.1));
      ctx.strokeStyle = rgba(acc, 0.85);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (hover && walkable(m, hover.x, hover.y)) {
      fillPoly(ctx, [P(hover.x, hover.y), P(hover.x + 1, hover.y), P(hover.x + 1, hover.y + 1), P(hover.x, hover.y + 1)], "rgba(255,255,255,0.12)");
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (marker) {
      const pulse = reduced ? 0.5 : (Math.sin((ts - marker.t0) / 160) + 1) / 2;
      fillPoly(ctx, [P(marker.x + 0.1, marker.y + 0.1), P(marker.x + 0.9, marker.y + 0.1), P(marker.x + 0.9, marker.y + 0.9), P(marker.x + 0.1, marker.y + 0.9)], `rgba(139,92,246,${0.22 + pulse * 0.22})`);
      ctx.strokeStyle = PAL.violet3;
      ctx.stroke();
      // Al tocar, una onda que se abre desde la baldosa
      const k = (ts - marker.t0) / 450;
      if (k < 1 && !reduced) {
        const cx = marker.x + 0.5, cy = marker.y + 0.5, h = 0.3 + k * 0.6;
        ctx.beginPath();
        const pts = [P(cx - h, cy - h), P(cx + h, cy - h), P(cx + h, cy + h), P(cx - h, cy + h)];
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const pt of pts.slice(1)) ctx.lineTo(pt[0], pt[1]);
        ctx.closePath();
        ctx.strokeStyle = `rgba(196,181,253,${1 - k})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }
  /** Dibuja `fn` en un lienzo de lo quieto: el mundo entero, a la escala de ahora. */
  function paint(cv: HTMLCanvasElement, g: CanvasRenderingContext2D, w: number, h: number, fn: () => void) {
    if (cv.width !== w || cv.height !== h) {
      cv.width = w;
      cv.height = h;
    } else {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, w, h);
    }
    g.setTransform(scale, 0, 0, scale, 0, 0);
    dst = g;
    begin(g, view);
    fn();
    dst = ctx;
    begin(ctx, view);
  }
  /** Copia un lienzo de lo quieto con el corrimiento de la cámara. */
  function blit(cv: HTMLCanvasElement) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(cv, offX, offY);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
  }
  /** Paredes y muebles (en su orden) con la gente intercalada por profundidad. */
  function layered(list: Item[], people: Person[]) {
    let pi = 0;
    for (const it of list) {
      while (pi < people.length && people[pi].depth < it.depth + (it.order === 0 ? 0 : 0.01)) {
        setFade(0);
        people[pi++].draw();
      }
      it.draw();
    }
    while (pi < people.length) {
      setFade(0);
      people[pi++].draw();
    }
  }
  /** Las cajas del mundo pasadas a la pantalla (px enteros, con uno de margen); las que se pisan, juntas en una. */
  function onScreen(boxes: Box[], W: number, H: number): Box[] {
    const out: Box[] = [];
    for (const b of boxes) {
      const r = { x0: Math.max(0, Math.floor(b.x0 * scale + offX) - 1), y0: Math.max(0, Math.floor(b.y0 * scale + offY) - 1), x1: Math.min(W, Math.ceil(b.x1 * scale + offX) + 1), y1: Math.min(H, Math.ceil(b.y1 * scale + offY) + 1) };
      if (r.x1 > r.x0 && r.y1 > r.y0) out.push(r);
    }
    for (let merged = true; merged; ) {
      merged = false;
      for (let i = 0; i < out.length && !merged; i++)
        for (let j = i + 1; j < out.length; j++) {
          const a = out[i], b = out[j];
          if (!touches(a, b)) continue;
          out[i] = { x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) };
          out.splice(j, 1);
          merged = true;
          break;
        }
    }
    return out;
  }

  // --- Cuadro -----------------------------------------------------------------------
  function render(ts: number) {
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);
    scale = ZOOMS[zi] * dpr;
    const focus = o.public ? focusActor() : null;
    // Sin nadie en el mapa, la cámara mira la recepción
    const [pxT, pyT] = o.public ? (focus ? actorPos(focus) : [7.5, 3]) : playerPos();
    // La cámara sigue al que camina; si elegiste una sala sin estar en el mapa, a la sala; si la arrastraste, se queda
    const camRoom = o.public && camAt ? byId.get(camAt) : null;
    const [wx, wy] = camRoom ? P(camRoom.x + camRoom.w / 2, camRoom.y + camRoom.d / 2, -30) : P(pxT, pyT);
    const vw = W / scale, vh = H / scale;
    const clampX = (v: number) => (view.width <= vw ? view.width / 2 : Math.max(vw / 2, Math.min(view.width - vw / 2, v)));
    const clampY = (v: number) => (view.height <= vh ? view.height / 2 : Math.max(vh / 2, Math.min(view.height - vh / 2, v)));
    const tx = camFree ? clampX(cam.x) : clampX(wx);
    const ty = camFree ? clampY(cam.y) : clampY(wy - 30);
    if (!cam.ready || reduced) {
      cam.x = tx;
      cam.y = ty;
      cam.ready = true;
    } else {
      cam.x += (tx - cam.x) * 0.12;
      cam.y += (ty - cam.y) * 0.12;
    }
    camMoving = Math.abs(tx - cam.x) > 0.35 || Math.abs(ty - cam.y) > 0.35;
    offX = Math.round(W / 2 - cam.x * scale);
    offY = Math.round(H / 2 - cam.y * scale);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    begin(ctx, view);
    const vx0 = -offX / scale - 80, vy0 = -offY / scale - 80, vx1 = vx0 + vw + 160, vy1 = vy0 + vh + 220;
    const visible = (ax: number, ay: number) => ax > vx0 && ax < vx1 && ay > vy0 && ay < vy1;
    // Las capturas de las salas que están a la vista o a media pantalla de entrar
    loadNear((ax, ay) => ax > vx0 - vw / 2 && ax < vx1 + vw / 2 && ay > vy0 - vh / 2 && ay < vy1 + vh / 2);

    // Lo quieto es casi todo lo que hay que dibujar: el piso (baldosas, alfombras,
    // polvo, los charcos de luz y el borde del edificio) en un lienzo y las
    // paredes y los muebles en otro, en coordenadas del mundo. En cada cuadro
    // sólo se copian con el corrimiento de la cámara. Se rehacen si cambia el
    // zoom, si una sala se prende o se apaga, si llega el arte de una marca o si
    // cambia la hora (la luz va horneada en los colores). Mientras titilan los
    // tubos de una sala, o si los lienzos no entran en memoria, se dibuja todo
    // directo, como antes.
    const lw = Math.ceil(view.width * scale), lh = Math.ceil(view.height * scale);
    const baked = !anim.size && lw * lh <= LAYER_PX;
    if (baked) {
      const fk = `${scale}|${artRev}|${period}|${m.rooms.map((r) => fadeOfId(r.id).toFixed(3)).join(",")}`;
      if (fk !== floorKey) {
        floorKey = fk;
        paint(floorC, fctx, lw, lh, () => drawFloor());
      }
      if (fk !== itemsKey) {
        itemsKey = fk;
        // Sin transparencias: la pared que tapa a alguien se rehace en su rectángulo (abajo)
        playerBox.depth = Infinity;
        paint(itemsC, ictx, lw, lh, () => {
          for (const it of items) it.draw();
        });
      }
      blit(floorC);
      floorMarks(ts);
      blit(itemsC);
    } else {
      drawFloor(visible);
      floorMarks(ts);
    }

    // Personas, ordenadas con lo demás por profundidad
    const [psx, psy] = P(pxT, pyT);
    const pDepth = o.public ? (focus ? actorDepth(focus) : -1) : player.moving ? Math.max(player.from.x + player.from.y, player.to.x + player.to.y) + 0.05 : player.x + player.y + 0.05;
    Object.assign(playerBox, { x0: psx - 14, x1: psx + 14, y0: psy - 66, y1: psy, depth: pDepth });
    const blink = !reduced && ts % 4300 < 140;
    const typing = reduced ? null : (ts / 260) % 1;
    const people: Person[] = [];
    const po = byId.get(`off-${otherOf(me)}`);
    if (o.public) {
      for (const a of actors) {
        const [ax, ay] = P(...actorPos(a));
        const wave = a.greet && ts >= a.greet.t0 ? (ts - a.greet.t0) / GREET_MS : null;
        people.push({
          depth: actorDepth(a),
          box: around(ax, ay, AVATAR_REACH),
          draw: () =>
            a.seat
              ? avatar(a.look, ax, ay, "SW", null, true, blink, typing)
              : avatar(a.look, ax, ay, a.moving ? a.dir : (a.face ?? a.dir), a.moving && !reduced ? a.step % 1 : null, false, blink && !a.moving, null, wave, phoneOut(a), wave),
        });
      }
    } else {
      const seat = sitting ? ownSeat() : null;
      if (seat) {
        const [sx, sy] = P(seat.x + 0.5, seat.y + 0.5);
        people.push({ depth: seat.x + seat.y + 0.05, box: around(sx, sy, AVATAR_REACH), draw: () => avatar(me, sx, sy, "SW", null, true, blink, typing) });
      } else people.push({ depth: pDepth, box: around(psx, psy, AVATAR_REACH), draw: () => avatar(me, psx, psy, player.dir, player.moving && !reduced ? player.step % 1 : null) });
      if (po?.seat) {
        const seat = po.seat;
        const [sx, sy] = P(seat.x + 0.5, seat.y + 0.5);
        // Conectado, tipea; si no, duerme con los ojos cerrados
        people.push({ depth: seat.x + seat.y + 0.05, box: around(sx, sy, AVATAR_REACH), draw: () => avatar(otherOf(me), sx, sy, "SW", null, true, partnerAway || blink, partnerAway ? null : typing) });
      }
    }
    {
      const [cx, cy] = catPos();
      const [csx, csy] = P(cx, cy);
      const cd = (cat.moving ? Math.max(cat.from.x + cat.from.y, cat.to.x + cat.to.y) : cat.x + cat.y) + 0.04;
      people.push({ depth: cd, box: around(csx, csy, CAT_REACH), draw: () => studioCat(csx, csy, cat.dir, cat.moving ? cat.step % 1 : null, cat.sleeping) });
    }
    people.sort((a, b) => a.depth - b.depth);
    if (baked) {
      // Lo que se mueve va en su rectángulo: ahí se vuelve a copiar el piso y se
      // dibuja de nuevo, en orden, todo lo que lo toca (así lo tapan los muebles
      // que tiene adelante). Las paredes que se vuelven transparentes van enteras.
      const boxes = people.map((p) => p.box);
      for (const it of items) if (it.ghost?.()) boxes.push(it.box);
      for (const r of onScreen(boxes, W, H)) {
        const wb: Box = { x0: (r.x0 - offX) / scale, y0: (r.y0 - offY) / scale, x1: (r.x1 - offX) / scale, y1: (r.y1 - offY) / scale };
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.beginPath();
        ctx.rect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
        ctx.clip();
        // Desde el fondo: el piso tiene las juntas entre baldosas un poco transparentes
        ctx.fillStyle = BG;
        ctx.fillRect(r.x0, r.y0, r.x1 - r.x0, r.y1 - r.y0);
        ctx.drawImage(floorC, offX, offY);
        ctx.setTransform(scale, 0, 0, scale, offX, offY);
        floorMarks(ts);
        layered(items.filter((it) => touches(it.box, wb)), people.filter((p) => touches(p.box, wb)));
        ctx.restore();
      }
    } else layered(items.filter((it) => visible(it.ax, it.ay)), people);
    // Lo que prende arriba de la oscuridad: lo de las paredes y los muebles que están a la vista, una vez cada cosa
    glows = [];
    const seen = new Set<Glow>();
    for (const it of items)
      if (visible(it.ax, it.ay))
        for (const gl of it.glows)
          if (!seen.has(gl)) {
            seen.add(gl);
            glows.push(gl);
          }

    emissives(ts);

    // Sin carteles flotantes: cada sala se reconoce por su marca y por lo que
    // dice su compu, y el nombre de la que está bajo el mouse va arriba (onHover).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const toScreen = (p: XY): XY => [(p[0] * scale + offX) / dpr, (p[1] * scale + offY) / dpr];
    const near = !!po?.seat && current?.id === po.id && Math.abs(player.x - po.seat.x) + Math.abs(player.y - po.seat.y) <= 3;
    // Globo del otro socio cuando te acercás a su escritorio
    if (po?.seat && partnerLine && near) {
      const [sx, sy] = toScreen(P(po.seat.x + 0.5, po.seat.y + 0.5, 64));
      ctx.font = uiFont(8);
      const w = Math.ceil(ctx.measureText(partnerLine).width) + 16, h = 19;
      const x = Math.round(sx - w / 2), y = Math.round(sy - h - 8);
      bubbleBox(x, y, w, h, PAL.white, PAL.ink, sx);
      ctx.fillStyle = PAL.ink;
      ctx.textBaseline = "middle";
      ctx.fillText(partnerLine, x + 8, y + h / 2 + 0.5);
    }
    // En la landing: arriba de cada uno, su cartelito («VOS» o el nombre de un
    // socio) y, si está saludando, el globo con lo que dice
    if (o.public)
      for (const a of actors) {
        const label = a.you ? "VOS" : a.tag?.toUpperCase();
        const word = a.greet && ts >= a.greet.t0 ? a.greet.word : null;
        if (!label && !word) continue;
        const [ax, ay] = actorPos(a);
        const [tx, ty] = toScreen(P(ax, ay, a.seat ? 62 : 76));
        const bob = reduced ? 0 : Math.sin(ts / 260 + a.seed) * 1.5;
        ctx.font = uiFont(8, 800);
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        let top = ty;
        if (label) {
          const w = Math.ceil(ctx.measureText(label).width) + 14, h = 15;
          const x = Math.round(tx - w / 2), y = Math.round(ty - h - 6 + bob);
          bubbleBox(x, y, w, h, a.you ? PAL.violet : PAL.char2, a.you ? PAL.ink : PAL.violet2, tx);
          ctx.fillStyle = "#ffffff";
          ctx.fillText(label, tx, y + h / 2 + 0.5);
          top = y - 3;
        }
        if (word) {
          const k = (ts - (a.greet as { t0: number }).t0) / GREET_MS;
          const w = Math.ceil(ctx.measureText(word).width) + 16, h = 17;
          const x = Math.round(tx - w / 2), y = Math.round(top - h - 6 - (reduced ? 0 : Math.min(1, k * 6) * 3));
          ctx.globalAlpha = Math.min(1, (1 - k) * 4);
          bubbleBox(x, y, w, h, PAL.white, PAL.ink, tx + 6);
          ctx.fillStyle = PAL.ink;
          ctx.fillText(word, tx, y + h / 2 + 1);
          ctx.globalAlpha = 1;
        }
        ctx.textAlign = "left";
      }
    // El gato: corazones cuando alguien pasa al lado; una zeta chiquita cuando duerme
    {
      const [cx, cy] = catPos();
      const [hx, hy] = toScreen(P(cx, cy, 22));
      const zf = ZOOMS[zi];
      const hk = (ts - cat.heart) / 1600;
      if (hk >= 0 && hk < 1)
        for (let i = 0; i < 2; i++) {
          const k = Math.min(1, Math.max(0, hk - i * 0.25) / 0.75);
          if (k <= 0) continue;
          const x = hx + (i ? 6 : -3) * zf + Math.sin(k * 7 + i) * 2, y = hy - k * 22 * zf, r = (2.4 + i * 0.4) * zf;
          ctx.globalAlpha = Math.sin(k * Math.PI);
          ctx.fillStyle = PAL.violet2;
          ctx.beginPath();
          ctx.moveTo(x, y + r * 1.4);
          ctx.bezierCurveTo(x - r * 2.2, y - r * 0.2, x - r * 0.9, y - r * 1.8, x, y - r * 0.6);
          ctx.bezierCurveTo(x + r * 0.9, y - r * 1.8, x + r * 2.2, y - r * 0.2, x, y + r * 1.4);
          ctx.fill();
          ctx.strokeStyle = PAL.ink;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      if (cat.sleeping) {
        const k = reduced ? 0.5 : (ts / 3000) % 1;
        ctx.globalAlpha = reduced ? 0.8 : Math.sin(k * Math.PI);
        ctx.font = uiFont(Math.round(7 * zf), 800);
        ctx.textBaseline = "alphabetic";
        ctx.textAlign = "left";
        ctx.fillStyle = PAL.violet3;
        ctx.fillText("z", hx + 6 * zf + k * 4, hy - 2 * zf - k * 10 * zf);
      }
      ctx.globalAlpha = 1;
    }
    // El otro socio, dormido: las zetas suben desde su cabeza
    if (po?.seat && partnerAway) {
      const [zx, zy] = toScreen(P(po.seat.x + 0.5, po.seat.y + 0.5, 58));
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      for (let i = 0; i < 3; i++) {
        const k = reduced ? 0.35 + i * 0.25 : ((ts / 2600 + i / 3) % 1);
        ctx.globalAlpha = reduced ? 0.85 : Math.sin(k * Math.PI);
        ctx.font = uiFont(Math.round((9 + k * 7) * ZOOMS[zi]), 800);
        const tx = zx + (8 + k * 12 + Math.sin(k * 6) * 2) * ZOOMS[zi], ty = zy - k * 28 * ZOOMS[zi];
        ctx.lineWidth = 3;
        ctx.strokeStyle = PAL.ink;
        ctx.strokeText("Z", tx, ty);
        ctx.fillStyle = PAL.violet3;
        ctx.fillText("Z", tx, ty);
      }
      ctx.globalAlpha = 1;
    }
    // Los globos de chat arriba de tu muñeco: el más nuevo abajo y los demás suben
    bubbles = bubbles.filter((b) => ts - b.t0 < BUBBLE_MS);
    if (bubbles.length && !o.public) {
      const seat = sitting ? ownSeat() : null;
      const [hx, hy] = toScreen(seat ? P(seat.x + 0.5, seat.y + 0.5, 72) : P(pxT, pyT, 78));
      ctx.font = uiFont(8);
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      let stackY = hy;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i], age = ts - b.t0;
        const rise = reduced ? 1 : Math.min(1, age / 220);
        const w = Math.ceil(ctx.measureText(b.text).width) + 28, h = 20;
        const x = Math.round(hx - w / 2), y = Math.round(stackY - h - 7 + (1 - rise) * 8);
        ctx.globalAlpha = Math.min(rise, (BUBBLE_MS - age) / 400, 1);
        bubbleBox(x, y, w, h, PAL.white, PAL.ink, i === bubbles.length - 1 ? hx : null);
        // El ícono: un signo de admiración rojo para las novedades; el punto violeta del estudio si no
        ctx.fillStyle = b.tone === "news" ? "#ff3b30" : PAL.violet;
        ctx.beginPath();
        ctx.arc(x + 11, y + h / 2, 5, 0, Math.PI * 2);
        ctx.fill();
        if (b.tone === "news") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(x + 10, y + h / 2 - 3.5, 2, 4);
          ctx.fillRect(x + 10, y + h / 2 + 1.5, 2, 2);
        }
        ctx.fillStyle = PAL.ink;
        ctx.fillText(b.text, x + 21, y + h / 2 + 1);
        ctx.globalAlpha = 1;
        stackY = y - 3;
      }
    }
  }

  // --- El ritmo de los cuadros ----------------------------------------------------
  // Cuando algo se mueve (alguien camina, la cámara viaja, titilan los tubos) se
  // dibuja a pleno. Quieto, lo único que cambia son las pantallas y el cartel:
  // alcanza con unos 15 cuadros por segundo, y el procesador descansa entre uno
  // y otro (en un celular, la batería lo nota). Lo que toca el usuario despierta
  // el próximo cuadro enseguida.
  let timer = 0;
  let camMoving = true;
  let lastDraw = -Infinity;
  function busy(ts: number) {
    if (camMoving || anim.size || motes.length || bubbles.length || marker || dragging) return true;
    if (cat.moving || cat.path.length || ts - cat.heart < 1700) return true;
    if (o.public) return actors.some((a) => a.moving || a.path.length || (a.greet && ts - a.greet.t0 < GREET_MS + 400));
    if (player.moving || player.path.length || held.size) return true;
    return !!tv && tv.el.readyState >= 2 && !tv.el.paused;
  }
  function frame(ts: number) {
    raf = 0;
    // Con pantallas de 120 o 144 Hz alcanza con la mitad: un cuadro cada ~12 ms como mucho
    if (ts - lastDraw < MIN_FRAME_MS) {
      raf = requestAnimationFrame(frame);
      return;
    }
    lastDraw = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt, ts);
    render(ts);
    if (paused || dead) return;
    if (busy(ts)) raf = requestAnimationFrame(frame);
    else timer = window.setTimeout(() => ((timer = 0), (raf = requestAnimationFrame(frame))), reduced ? IDLE_REDUCED_MS : IDLE_MS);
  }
  /** Algo cambió: que el próximo cuadro sea ya. */
  function poke() {
    if (paused || dead || !timer) return;
    window.clearTimeout(timer);
    timer = 0;
    raf = requestAnimationFrame(frame);
  }

  // --- Tocar y teclado -------------------------------------------------------------
  function toTile(e: MouseEvent): Pt & { cx: number; cy: number } {
    const b = canvas.getBoundingClientRect();
    const cx = e.clientX - b.left, cy = e.clientY - b.top;
    const wx = (cx * dpr - offX) / scale, wy = (cy * dpr - offY) / scale;
    const a = (wx - view.ox) / HW, bb = (wy - view.oy) / HH;
    return { x: Math.floor((a + bb) / 2), y: Math.floor((bb - a) / 2), cx, cy };
  }
  // En la landing a pantalla completa: arrastrar corre la cámara (y no cuenta como toque)
  let press0: { x: number; y: number; cx: number; cy: number; id: number } | null = null;
  function onDown(e: PointerEvent) {
    if (o.public) {
      press0 = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, id: e.pointerId };
      dragging = false;
      return;
    }
    canvas.focus({ preventScroll: true });
    const t = toTile(e);
    if (!inBounds(m, t.x, t.y)) return;
    poke();
    if (walkable(m, t.x, t.y) && walkTo(t)) return;
    const r = roomAt(m, t.x, t.y);
    if (r) api.goTo(r.id);
  }
  function onMove(e: PointerEvent) {
    if (press0 && e.pointerId === press0.id) {
      const dx = e.clientX - press0.x, dy = e.clientY - press0.y;
      if (!dragging && Math.hypot(dx, dy) > 7) {
        dragging = true;
        camFree = true;
        camAt = null;
        canvas.setPointerCapture?.(e.pointerId);
      }
      if (dragging) {
        cam.x = press0.cx - (dx * dpr) / scale;
        cam.y = press0.cy - (dy * dpr) / scale;
        poke();
        return;
      }
    }
    if (e.pointerType !== "mouse") return;
    const t = toTile(e);
    const next = inBounds(m, t.x, t.y) ? { x: t.x, y: t.y } : null;
    if (next?.x !== hover?.x || next?.y !== hover?.y) poke();
    hover = next;
    const r = hover ? roomAt(m, hover.x, hover.y) : null;
    setHoverRoom(r && r.kind !== "storage" ? r.id : null);
  }
  function onUp(e: PointerEvent) {
    if (!press0 || e.pointerId !== press0.id) return;
    const was = dragging;
    press0 = null;
    dragging = false;
    if (!was) tap(e);
  }
  const onCancel = () => {
    press0 = null;
    dragging = false;
  };
  /**
   * Un toque en la landing (no el arrastre). Con los controles, tu muñeco va
   * caminando adonde tocaste; sin ellos, sólo se avisa la sala.
   */
  function tap(e: MouseEvent) {
    const t = toTile(e);
    if (!inBounds(m, t.x, t.y)) return;
    const r = roomAt(m, t.x, t.y);
    if (o.controls) {
      const you = youActor();
      if (you && walkable(m, t.x, t.y)) {
        own(you, { kind: "spot", at: { x: t.x, y: t.y } });
        marker = { x: t.x, y: t.y, t0: performance.now() };
      } else if (you && r) own(you, { kind: "room", room: r.id });
      else if (r) {
        camAt = r.id;
        camFree = false;
      }
      selected = r && r.kind !== "storage" ? r.id : null;
      poke();
      o.onRoom(selected);
    } else if (r?.kind === "project") o.onRoom(r.id);
  }
  function setHoverRoom(id: string | null) {
    if (id === hoverRoom) return;
    hoverRoom = id;
    o.onHover?.(id);
  }
  const onLeave = () => {
    hover = null;
    setHoverRoom(null);
    poke();
  };
  const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  function onKey(e: KeyboardEvent) {
    const k = KEYS[e.key];
    if (!k || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    held.add(k);
    e.preventDefault();
    poke();
  }
  function onKeyUp(e: KeyboardEvent) {
    const k = KEYS[e.key];
    if (k) held.delete(k);
  }
  const onBlur = () => held.clear();
  // En la landing sin controles (la ventanita), un clic completo: si no, empezar
  // a scrollear la página con el dedo encima del mapa abriría un caso.
  function onClick(e: MouseEvent) {
    tap(e);
  }
  if (o.public && !o.controls) canvas.addEventListener("click", onClick);
  else {
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onCancel);
  }
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  // El teclado: en el panel siempre; en la landing, sólo con la oficina a pantalla completa
  const keys = !o.public || !!o.controls;
  if (keys) {
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
  }

  function resize() {
    dpr = Math.min(o.maxDpr ?? 2.5, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    cam.ready = false;
    poke();
  }
  resize();
  raf = requestAnimationFrame(frame);

  const api: Engine = {
    setMe(w) {
      me = w;
    },
    setLooks(next, lightUp) {
      looks = next;
      for (const r of m.rooms) {
        if (r.kind !== "project") continue;
        const target = next[r.id]?.fade ?? 1;
        const now = disp.get(r.id);
        if (r.id === lightUp && now !== undefined && now > 0.12 && !reduced) {
          const t0 = performance.now();
          anim.set(r.id, { t0, from: now });
          o.onCue?.("flicker");
          // Cuando terminan de titilar los tubos, suben motas de luz del color de la sala
          const col = ledColor(accentOf(r.id));
          motes.push(...Array.from({ length: 18 }, (_, i) => ({ x: r.x + 0.6 + hash(i, t0 | 0) * (r.w - 1.2), y: r.y + 0.6 + hash(t0 | 0, i) * (r.d - 1.2), t0: t0 + 450 + hash(i, 9) * 500, col: i % 3 ? col : "#f3efff" })));
        } else if (!anim.has(r.id)) disp.set(r.id, target);
      }
      poke();
    },
    setTicker(msgs) {
      // Si el mensaje que pasa sigue estando, no se corta: cambian los textos y sigue
      if (ledIdx >= msgs.length) {
        ledIdx = 0;
        ledT0 = -1;
      }
      ledMsgs = msgs;
      rebakeLed();
      document.fonts?.load(`8px ${o.font}`).then(() => !dead && rebakeLed(), () => {});
      poke();
    },
    say(text, tone = "plain") {
      bubbles.push({ text, tone, t0: performance.now() });
      if (bubbles.length > 3) bubbles.shift();
      if (tone === "news") o.onCue?.("news");
      poke();
    },
    setPartnerAway(away) {
      partnerAway = away;
      poke();
    },
    setPeriod(p) {
      period = p;
      poke();
    },
    setPartnerLine(text) {
      partnerLine = text;
    },
    goTo(id) {
      const r = byId.get(id);
      if (!r) return false;
      poke();
      // Tu oficina: hasta tu silla, para sentarte
      const near = r.kind === "office" && r.who === me ? seatApproach() : null;
      return walkTo(near ?? r.inside);
    },
    goOut() {
      if (current) walkTo(current.outside);
      poke();
    },
    press(dir, on) {
      if (on) held.add(dir);
      else held.delete(dir);
      poke();
    },
    zoomBy(stepBy) {
      zi = Math.max(0, Math.min(ZOOMS.length - 1, zi + stepBy));
      cam.ready = false;
      poke();
    },
    setActors: syncActors,
    visit(id) {
      if (!byId.has(id)) return;
      selected = id;
      camFree = false;
      const you = youActor();
      if (you) {
        camAt = null;
        own(you, { kind: "room", room: id });
      } else camAt = id;
      poke();
    },
    select(id) {
      selected = id;
      // Sin sala elegida, la cámara se queda donde está
      if (!id && camAt) {
        camAt = null;
        camFree = true;
      }
      poke();
    },
    setPaused(on) {
      if (on === paused || dead) return;
      paused = on;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      timer = 0;
      if (!on) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    },
    resize,
    destroy() {
      dead = true;
      current = null;
      tuneTv(null);
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      // Los lienzos de lo quieto ocupan bastante memoria: se sueltan ya
      for (const c of [floorC, itemsC]) c.width = c.height = 0;
      mq.removeEventListener("change", onMq);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
  return api;
}
