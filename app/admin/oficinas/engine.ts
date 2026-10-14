// Motor de «En vivo»: cámara, orden de dibujo, luz, caminar y tocar. Sin React:
// view.tsx lo monta sobre un <canvas> y le avisa lo que cambia (visitas, hora,
// quién es quién). El arte está en art.ts y el plano en oficinas-shared.ts.
import {
  DECALS,
  canStep,
  findPath,
  hasDoor,
  inBounds,
  otherOf,
  roomAt,
  walkable,
  type MapModel,
  type MapRoom,
  type Period,
  type Pt,
  type Who,
} from "@/lib/admin/oficinas-shared";
import {
  HH,
  HW,
  P,
  TALL,
  WALL,
  avatar,
  bakeBrand,
  begin,
  brandRug,
  decal,
  decay,
  decor,
  decorScreen,
  floorTile,
  furni,
  hash,
  mix,
  posterAspect,
  quadImage,
  rug,
  setFade,
  slab,
  tickerQuad,
  viewOf,
  wallSegment,
  type Brand,
  type BrandImages,
  type Dir,
  type Glow,
  type Material,
  type RoomArt,
  type WallStyle,
  type XY,
} from "./art";

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
};
export type Engine = {
  setMe: (me: Who) => void;
  /** `lightUp`: la sala a la que se acaba de entrar (titila y se prende). */
  setLooks: (looks: RoomLooks, lightUp?: string) => void;
  setTicker: (text: string) => void;
  setPeriod: (p: Period) => void;
  setPartnerLine: (text: string | null) => void;
  goTo: (roomId: string) => boolean;
  goOut: () => void;
  press: (dir: "up" | "down" | "left" | "right", on: boolean) => void;
  zoomBy: (step: number) => void;
  resize: () => void;
  destroy: () => void;
};

const ZOOMS = [0.5, 0.65, 0.8, 1, 1.25, 1.5];
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
const AMB: Record<Period, [number, number, number, number]> = { manana: [44, 20, 30, 0.14], dia: [0, 0, 0, 0], tarde: [48, 18, 28, 0.22], noche: [8, 10, 30, 0.5] };
/** Tubos que titilan al entrar: valores escalonados, no interpolados. 1 = como estaba. */
const FLICK: [number, number][] = [[0, 1], [0.1, 0.12], [0.16, 0.9], [0.24, 0.08], [0.3, 0.7], [0.42, 0.04], [0.5, 0.35], [0.6, 0]];

type Item = { depth: number; order: number; x: number; ax: number; ay: number; draw: () => void };

const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

export function createEngine(canvas: HTMLCanvasElement, o: EngineOptions): Engine {
  const m = o.map;
  const view = viewOf(m);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const darkC = document.createElement("canvas");
  const dctx = darkC.getContext("2d") as CanvasRenderingContext2D;
  // La proyección (P) depende de la vista: se fija antes de precalcular posiciones.
  begin(ctx, view);
  const byId = new Map(m.rooms.map((r) => [r.id, r]));
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = mq.matches;
  const onMq = (e: MediaQueryListEvent) => (reduced = e.matches);
  mq.addEventListener("change", onMq);

  let me = o.me;
  let looks: RoomLooks = {};
  let ticker = "";
  let period: Period = "dia";
  let partnerLine: string | null = null;
  let zi = ZOOMS.indexOf(canvas.clientWidth < 640 ? 0.65 : 1);
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
  let raf = 0, last = performance.now();

  const fadeOfId = (id: string | null | undefined) => (id ? disp.get(id) ?? 0 : 0);
  const lightOf = (id: string | null | undefined) => {
    const r = id ? byId.get(id) : null;
    return r && r.kind === "project" ? 1 - fadeOfId(id) : 1;
  };
  const accentOf = (id: string | null | undefined) => (id ? o.info[id]?.accent : undefined) ?? "#ff4d2e";

  // Lo propio de cada sala: las texturas con la marca y la captura del sitio.
  // Se hornean ya con la letra de reserva y otra vez cuando baja la de la marca.
  const arts = new Map<string, RoomArt>();
  let dead = false;
  for (const r of m.rooms) {
    const inf = o.info[r.id];
    if (r.kind !== "project" || !inf) continue;
    const poster = m.decor.find((dc) => dc.room === r.id && dc.k === "brand");
    const imgs: BrandImages = { logo: null, mark: null };
    const bake = () => {
      const prev = arts.get(r.id);
      arts.set(r.id, { ...bakeBrand(inf.name, inf.accent, inf.brand ?? null, poster ? posterAspect(poster) : 2, imgs), ...imgs, site: prev?.site ?? null, page: prev?.page ?? null });
    };
    bake();
    if (inf.brand) document.fonts?.load(`${Math.max(inf.brand.weight, 500)} 40px ${inf.brand.family}`).then(() => !dead && bake(), () => {});
    load(inf.brand?.logo, (img) => ((imgs.logo = img), bake()));
    load(inf.brand?.mark, (img) => ((imgs.mark = img), bake()));
    load(inf.cover, (img) => {
      const a = arts.get(r.id);
      if (a && !a.page) a.site = img;
    });
    // La captura automática: desde afuera se ve su parte de arriba (recortada
    // una vez, así apagarla no copia la página entera) y adentro se recorre.
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
    );
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
  const artOf = (id: string | null | undefined) => (id ? arts.get(id) ?? null : null);

  function matAt(x: number, y: number): Material {
    const id = m.region[y][x];
    if (id === "hall") return m.archiveY !== null && y >= m.archiveY && x >= m.spine.x0 && x < m.spine.x1 ? "gallery" : "hall";
    const r = byId.get(id) as MapRoom;
    if (r.kind === "office") return r.who === "franco" ? "carpetFranco" : "carpetFederico";
    if (r.kind === "reception") return "reception";
    if (r.kind === "kitchen") return "kitchen";
    if (r.kind === "storage") return "storage";
    return r.zone === "archive" ? "parquet" : "wood";
  }

  // --- Lo que se ordena por profundidad: paredes, arco y muebles ----------------
  const items: Item[] = [];
  let glows: Glow[] = [];
  const litDecor = new Set<string>();
  const playerBox = { x0: 0, y0: 0, x1: 0, y1: 0, depth: 0 };

  function wallStyle(side: "L" | "R", kind: "rail" | "wall" | "tall", owner: string | null): WallStyle {
    const r = owner ? byId.get(owner) : null;
    if (kind === "tall") return { face: side === "L" ? "#cbc1b2" : "#e0d7c9", cap: "#f2ebe0" };
    if (kind === "rail") return { face: side === "L" ? "#bcb1a1" : "#cdc2b2", cap: "#e8dfd2" };
    const acc = r && r.kind === "project" ? accentOf(r.id) : r && r.kind === "office" ? "#ff4d2e" : null;
    const base = acc ? mix("#ddd4c6", acc, 0.12) : "#ddd4c6";
    return { face: side === "L" ? mix(base, "#000000", 0.08) : base, cap: "#f3ece1", stripe: acc ?? undefined };
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
        items.push({
          depth, order: 0, x, ax, ay,
          draw: () => {
            // Si la pared tapa al que camina atrás, se vuelve casi transparente.
            const ghost = kind === "wall" && depth > playerBox.depth && segBox.x1 > playerBox.x0 && segBox.x0 < playerBox.x1 && segBox.y1 > playerBox.y0 && segBox.y0 < playerBox.y1;
            if (ghost) ctx.globalAlpha = 0.28;
            setFade(fadeOfId(owner));
            wallSegment(side, x, y, kind, wallStyle(side, kind, owner), door);
            if (here.length && !door) {
              ctx.save();
              ctx.beginPath();
              ctx.moveTo(face[0][0], face[0][1]);
              for (let i = 1; i < 4; i++) ctx.lineTo(face[i][0], face[i][1]);
              ctx.closePath();
              ctx.clip();
              for (const dc of here) {
                setFade(fadeOfId(dc.room));
                decor(dc, accentOf(dc.room), period, artOf(dc.room));
              }
              ctx.restore();
              // Las pantallas de pared (tele, mapa) se prenden por arriba de la oscuridad, una sola vez.
              for (const dc of here) {
                const scr = decorScreen(dc);
                if (scr && !litDecor.has(dc.id)) {
                  litDecor.add(dc.id);
                  glows.push({ t: "screen", quad: scr.quad, kind: scr.kind, accent: accentOf(dc.room), room: dc.room });
                }
              }
            }
            ctx.globalAlpha = 1;
          },
        });
      }
  if (m.archiveY !== null) {
    const ay0 = m.archiveY, { x0, x1 } = m.spine;
    const [ax, ay] = P(x0 + 0.5, ay0 + 0.5);
    items.push({
      depth: x0 + ay0 - 0.6, order: 0, x: x0, ax, ay,
      draw: () => {
        setFade(0);
        archPost(x0, ay0);
        archPost(x1, ay0);
      },
    });
  }
  function archPost(x: number, y: number) {
    // Columnas y dintel dorado del Archivo
    const pts = [P(x - 0.12, y + 0.12, 96), P(x + 0.12, y + 0.12, 96), P(x + 0.12, y + 0.12, 0), P(x - 0.12, y + 0.12, 0)];
    poly(pts, "#4a4552");
    poly([P(x + 0.12, y - 0.12, 96), P(x + 0.12, y + 0.12, 96), P(x + 0.12, y + 0.12, 0), P(x + 0.12, y - 0.12, 0)], "#36323e");
    poly([P(x - 0.12, y - 0.12, 96), P(x + 0.12, y - 0.12, 96), P(x + 0.12, y + 0.12, 96), P(x - 0.12, y + 0.12, 96)], "#c9a24a");
    if (x === m.spine.x0) {
      const a = m.spine.x0, b = m.spine.x1;
      poly([P(a - 0.12, y + 0.12, 106), P(b + 0.12, y + 0.12, 106), P(b + 0.12, y + 0.12, 96), P(a - 0.12, y + 0.12, 96)], "#c9a24a");
      poly([P(a - 0.12, y - 0.12, 106), P(b + 0.12, y - 0.12, 106), P(b + 0.12, y + 0.12, 106), P(a - 0.12, y + 0.12, 106)], "#e8c14e");
    }
  }
  function poly(pts: XY[], fill: string) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = "rgba(28,20,30,0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  const COVERABLE = new Set(["desk", "chair", "sofa"]);
  for (const f of m.furni) {
    if (DECALS.has(f.k)) continue;
    const r = f.room ? byId.get(f.room) : null;
    const status = r?.id ? o.info[r.id]?.status ?? "" : "";
    const [ax, ay] = P(f.x + f.w / 2, f.y + f.d / 2);
    items.push({
      depth: f.x + f.w - 1 + f.y + f.d - 1, order: 1, x: f.x, ax, ay,
      draw: () => {
        setFade(fadeOfId(f.room));
        furni(f, { accent: accentOf(f.room), status, covered: status === "pausado" && COVERABLE.has(f.k), kind: r?.kind ?? "hall", glows });
      },
    });
  }
  items.sort((a, b) => a.depth - b.depth || a.order - b.order || a.x - b.x);

  // --- Caminar ----------------------------------------------------------------
  const dirOf = (dx: number, dy: number): Dir => (dx > 0 ? "SE" : dx < 0 ? "NW" : dy > 0 ? "SW" : "NE");
  function step(nx: number, ny: number) {
    player.dir = dirOf(nx - player.x, ny - player.y);
    if (!canStep(m, player.x, player.y, nx, ny)) return false;
    player.from = { x: player.x, y: player.y };
    player.to = { x: nx, y: ny };
    player.moving = true;
    player.t = 0;
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
      o.onRoom(r ? r.id : null);
      tuneTv();
    }
  }

  // La tele de la sala donde estás pasa la grabación del sitio; las demás
  // muestran la captura quieta. Un solo video a la vez, y nada con movimiento reducido.
  let tv: { room: string; el: HTMLVideoElement } | null = null;
  let tvSince = 0;
  function tuneTv() {
    const id = current?.kind === "project" ? current.id : null;
    tvSince = performance.now();
    if (tv && tv.room === id) return;
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
    if (!player.moving) next();
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
  const playerPos = (): [number, number] => {
    const k = player.moving ? Math.min(1, player.t) : 0;
    const fx = player.moving ? player.from.x : player.x, fy = player.moving ? player.from.y : player.y;
    const tx = player.moving ? player.to.x : player.x, ty = player.moving ? player.to.y : player.y;
    return [fx + (tx - fx) * k + 0.5, fy + (ty - fy) * k + 0.5];
  };

  // --- Luz ----------------------------------------------------------------------
  function volume(r: MapRoom): XY[] {
    const h = r.x === 0 || r.y === 0 ? TALL : WALL + 30;
    const x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.d;
    return [P(x0, y1, 0), P(x0, y1, h), P(x0, y0, h), P(x1, y0, h), P(x1, y0, 0), P(x1, y1, 0)];
  }
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
  function drawDark() {
    const [cr, cg, cb, a] = AMB[period];
    dctx.setTransform(1, 0, 0, 1, 0, 0);
    dctx.globalCompositeOperation = "source-over";
    dctx.clearRect(0, 0, darkC.width, darkC.height);
    dctx.setTransform(scale, 0, 0, scale, offX, offY);
    if (a > 0) {
      dctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
      dctx.fillRect(-200, -200, view.width + 400, view.height + 400);
    }
    for (const r of m.rooms) {
      const f = r.kind === "project" ? fadeOfId(r.id) : 0;
      if (f > 0.01) fillPoly(dctx, volume(r), `rgba(4,4,12,${f * 0.42})`);
    }
    dctx.globalCompositeOperation = "destination-out";
    if (a > 0) {
      for (const r of m.rooms) {
        const L = lightOf(r.id);
        if (L <= 0.02) continue;
        fillPoly(dctx, volume(r), `rgba(0,0,0,${L * 0.88})`);
        fillPoly(dctx, spillPoly(r, 1.8), `rgba(0,0,0,${L * 0.5})`);
        fillPoly(dctx, spillPoly(r, 1.1), `rgba(0,0,0,${L * 0.3})`);
      }
      for (const l of m.lamps) {
        const [cx, cy] = P(l.x + 0.5, l.y + 0.5);
        for (const [rx, al] of [[90, 0.14], [62, 0.16], [34, 0.18]]) {
          dctx.beginPath();
          dctx.ellipse(cx, cy, rx, rx / 2, 0, 0, Math.PI * 2);
          dctx.fillStyle = `rgba(0,0,0,${al})`;
          dctx.fill();
        }
      }
    }
    dctx.globalCompositeOperation = "source-over";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(darkC, 0, 0);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
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
    const here = current?.id === gl.room && L > 0.9;
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
      quadImage(page, a, b, qq[3], TV_ASPECT, reduced ? 0 : browse((ts - tvSince) / 1000, page.naturalHeight - page.naturalWidth / TV_ASPECT));
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
  function screenGlow(gl: Extract<Glow, { t: "screen" }>, ts: number) {
    if (gl.kind === "status") return statusScreen(gl);
    if (gl.kind === "live") return tvScreen(gl, ts);
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
        if (Math.floor(ts / 1000) % 2 === 0) R(17, 9, 1.5, 1.5, "#ff8a3d");
        return;
      }
      if (gl.kind === "site" && site) return;
      switch (gl.kind) {
        case "code": {
          R(0, 0, 20, 12, "#0e1a2b");
          const cols = ["#7fd1ff", "#ffb199", gl.accent, "#9be08a", "#e9e4da"];
          for (let i = 0; i < 5; i++) {
            const n = tick + i, ind = Math.floor(hash(n, 3) * 3) * 2;
            R(1 + ind, 1 + i * 2.1, 2 + Math.floor(hash(n, 7) * 12), 1, cols[Math.floor(hash(7, n) * cols.length)]);
          }
          break;
        }
        case "review": {
          R(0, 0, 20, 12, "#0f1a14");
          const live = Math.floor(ts / 900) % 4;
          for (let i = 0; i < 4; i++) {
            R(1, 1.5 + i * 2.6, 1.4, 1.4, i === live ? "#fcd34d" : "#6ee7b7");
            R(3.5, 1.7 + i * 2.6, 4 + hash(i, 5) * 12, 1, "#cfe9da");
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
      fillPoly(ctx, gl.quad, gl.kind === "site" ? `rgba(255,236,210,${0.08 * L})` : `rgba(110,170,255,${0.1 * L})`);
      ctx.globalCompositeOperation = "source-over";
    }
  }
  function emissives(ts: number) {
    const night = period === "noche";
    ctx.globalCompositeOperation = "lighter";
    for (const r of m.rooms) {
      const L = lightOf(r.id);
      if (L < 0.05) continue;
      fillPoly(ctx, spillPoly(r, 1.8), `rgba(255,196,128,${(night ? 0.07 : 0.035) * L})`);
      fillPoly(ctx, spillPoly(r, 1.1), `rgba(255,196,128,${(night ? 0.07 : 0.035) * L})`);
    }
    ctx.globalCompositeOperation = "source-over";
    for (const gl of glows) {
      if (gl.t === "screen") screenGlow(gl, ts);
      else if (gl.t === "lamp") {
        const L = lightOf(gl.room);
        if (L < 0.3) continue;
        ctx.globalCompositeOperation = "lighter";
        const [x, y] = gl.at;
        for (const [rad, al] of [[34, 0.05], [20, 0.07], [9, 0.12]]) {
          ctx.beginPath();
          ctx.arc(x, y, rad, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255,214,150,${al * L * (night ? 1.6 : 1)})`;
          ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";
      } else if (gl.t === "led") {
        const L = lightOf(gl.room);
        let col = "#1c1c22";
        if (gl.i === -2) col = L > 0.15 ? (Math.floor(ts / 380) % 3 ? "#ff7a2e" : "#ffd28a") : "#5a2a1c";
        else if (gl.i < 0) col = "#ff4d2e";
        else if (L > 0.5) col = hash(gl.i, Math.floor(ts / 420)) > 0.3 ? "#5eea8a" : "#1d3a28";
        else if (L > 0.15) col = Math.floor(ts / 1500) % 2 ? "#e8a33d" : "#1c1c22";
        ctx.fillStyle = col;
        ctx.fillRect(gl.at[0] - 1, gl.at[1] - 1, 2.4, 1.8);
      } else if (gl.t === "steam" && !reduced && lightOf(gl.room) > 0.3) {
        for (let k = 0; k < 3; k++) {
          const ph = (ts / 1700 + k / 3) % 1;
          ctx.globalAlpha = 0.5 * (1 - ph);
          ctx.fillStyle = "#f1ede6";
          ctx.beginPath();
          ctx.arc(gl.at[0] + Math.sin(ph * 6 + k) * 2, gl.at[1] - ph * 16, 1.6 + ph * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
    // Cartel LED de la recepción con lo último del estudio
    const tk = m.decor.find((dc) => dc.k === "ticker");
    if (tk && ticker) {
      const q = tickerQuad(tk);
      const len = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
      inQuad(q, len, 24, () => {
        ctx.font = `8px ${o.font}`;
        ctx.textBaseline = "middle";
        const w = ctx.measureText(ticker).width + 60;
        const off = reduced ? 0 : (ts * 0.025) % (w + len);
        ctx.fillStyle = "#ffb347";
        ctx.fillText(ticker, len - off, 12.5);
        ctx.fillStyle = "rgba(14,14,18,0.45)";
        for (let xx = 0; xx < len; xx += 2) ctx.fillRect(xx, 0, 1, 24);
      });
    }
  }

  // --- Cuadro -----------------------------------------------------------------------
  function render(ts: number) {
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#07070a";
    ctx.fillRect(0, 0, W, H);
    scale = ZOOMS[zi] * dpr;
    const [pxT, pyT] = playerPos();
    const [wx, wy] = P(pxT, pyT);
    const vw = W / scale, vh = H / scale;
    const tx = view.width <= vw ? view.width / 2 : Math.max(vw / 2, Math.min(view.width - vw / 2, wx));
    const ty = view.height <= vh ? view.height / 2 : Math.max(vh / 2, Math.min(view.height - vh / 2, wy - 30));
    if (!cam.ready || reduced) {
      cam.x = tx;
      cam.y = ty;
      cam.ready = true;
    } else {
      cam.x += (tx - cam.x) * 0.12;
      cam.y += (ty - cam.y) * 0.12;
    }
    offX = Math.round(W / 2 - cam.x * scale);
    offY = Math.round(H / 2 - cam.y * scale);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    begin(ctx, view);
    const vx0 = -offX / scale - 80, vy0 = -offY / scale - 80, vx1 = vx0 + vw + 160, vy1 = vy0 + vh + 220;
    const visible = (ax: number, ay: number) => ax > vx0 && ax < vx1 && ay > vy0 && ay < vy1;

    // Piso, alfombras, polvo y el borde del edificio
    for (let y = 0; y < m.H; y++)
      for (let x = 0; x < m.W; x++) {
        const [ax, ay] = P(x + 0.5, y + 0.5);
        if (!visible(ax, ay)) continue;
        setFade(fadeOfId(m.region[y][x] === "hall" ? null : m.region[y][x]));
        floorTile(x, y, matAt(x, y), m.archiveY !== null && y >= m.archiveY && x === 7 && m.region[y][x] === "hall");
      }
    for (const f of m.furni) {
      if (!DECALS.has(f.k)) continue;
      const r = f.room ? byId.get(f.room) : null;
      setFade(fadeOfId(f.room));
      const art = artOf(f.room);
      if (f.k !== "rug") decal(f, accentOf(f.room), art);
      else if (r?.kind === "office") rug(f, r.who === "franco" ? "#8f8257" : "#33333f", r.who === "franco" ? "#e2d5a3" : "#ff4d2e");
      else if (r?.kind === "reception") rug(f, "#b8442c", "#ffb199");
      else if (art) brandRug(f, art.rug);
      else {
        const acc = accentOf(f.room);
        rug(f, mix(acc, "#2a2228", 0.4), mix(acc, "#f1ede6", 0.35));
      }
    }
    setFade(0);
    for (const r of m.rooms) if (r.kind === "project") decay(r, fadeOfId(r.id));
    slab(m, matAt);
    // Al pasar el mouse por una sala se marca su contorno, para saber a dónde vas
    const hovered = hover ? roomAt(m, hover.x, hover.y) : null;
    if (hovered && hovered.kind !== "storage") {
      const r = hovered, acc = r.kind === "project" ? accentOf(r.id) : "#ff4d2e";
      fillPoly(ctx, [P(r.x, r.y), P(r.x + r.w, r.y), P(r.x + r.w, r.y + r.d), P(r.x, r.y + r.d)], rgba(acc, 0.08));
      ctx.strokeStyle = rgba(acc, 0.8);
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
      fillPoly(ctx, [P(marker.x + 0.1, marker.y + 0.1), P(marker.x + 0.9, marker.y + 0.1), P(marker.x + 0.9, marker.y + 0.9), P(marker.x + 0.1, marker.y + 0.9)], `rgba(255,120,80,${0.18 + pulse * 0.2})`);
      ctx.strokeStyle = "#ffb199";
      ctx.stroke();
    }

    // Personas, ordenadas con lo demás por profundidad
    glows = [];
    litDecor.clear();
    const [psx, psy] = P(pxT, pyT);
    const pDepth = player.moving ? Math.max(player.from.x + player.from.y, player.to.x + player.to.y) + 0.05 : player.x + player.y + 0.05;
    Object.assign(playerBox, { x0: psx - 14, x1: psx + 14, y0: psy - 66, y1: psy, depth: pDepth });
    const people: { depth: number; draw: () => void }[] = [
      { depth: pDepth, draw: () => avatar(me, psx, psy, player.dir, player.moving && !reduced ? player.step % 1 : null) },
    ];
    const po = byId.get(`off-${otherOf(me)}`);
    if (po?.seat) {
      const seat = po.seat;
      const [sx, sy] = P(seat.x + 0.5, seat.y + 0.5);
      const blink = !reduced && ts % 4300 < 140;
      people.push({ depth: seat.x + seat.y + 0.05, draw: () => avatar(otherOf(me), sx, sy, "SW", null, true, blink) });
    }
    people.sort((a, b) => a.depth - b.depth);
    let pi = 0;
    for (const it of items) {
      while (pi < people.length && people[pi].depth < it.depth + (it.order === 0 ? 0 : 0.01)) {
        setFade(0);
        people[pi++].draw();
      }
      if (visible(it.ax, it.ay)) it.draw();
    }
    while (pi < people.length) {
      setFade(0);
      people[pi++].draw();
    }

    drawDark();
    emissives(ts);

    // Sin carteles flotantes: cada sala se reconoce por su marca y por lo que
    // dice su compu, y el nombre de la que está bajo el mouse va arriba (onHover).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const toScreen = (p: XY): XY => [(p[0] * scale + offX) / dpr, (p[1] * scale + offY) / dpr];
    const near = !!po?.seat && current?.id === po.id && Math.abs(player.x - po.seat.x) + Math.abs(player.y - po.seat.y) <= 3;
    // Globo del otro socio cuando te acercás a su escritorio
    if (po?.seat && partnerLine && near) {
      const [sx, sy] = toScreen(P(po.seat.x + 0.5, po.seat.y + 0.5, 64));
      ctx.font = `8px ${o.font}`;
      const w = Math.ceil(ctx.measureText(partnerLine).width) + 14, h = 17;
      const x = Math.round(sx - w / 2), y = Math.round(sy - h - 8);
      ctx.fillStyle = "#fbf8f2";
      ctx.strokeStyle = "rgba(28,20,30,0.8)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 5);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx - 4, y + h - 0.5);
      ctx.lineTo(sx, y + h + 6);
      ctx.lineTo(sx + 4, y + h - 0.5);
      ctx.fill();
      ctx.fillStyle = "#16161b";
      ctx.textBaseline = "top";
      ctx.fillText(partnerLine, x + 7, y + 5);
    }
  }

  function frame(ts: number) {
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    update(dt, ts);
    render(ts);
    raf = requestAnimationFrame(frame);
  }

  // --- Tocar y teclado -------------------------------------------------------------
  function toTile(e: PointerEvent): Pt & { cx: number; cy: number } {
    const b = canvas.getBoundingClientRect();
    const cx = e.clientX - b.left, cy = e.clientY - b.top;
    const wx = (cx * dpr - offX) / scale, wy = (cy * dpr - offY) / scale;
    const a = (wx - view.ox) / HW, bb = (wy - view.oy) / HH;
    return { x: Math.floor((a + bb) / 2), y: Math.floor((bb - a) / 2), cx, cy };
  }
  function onDown(e: PointerEvent) {
    canvas.focus({ preventScroll: true });
    const t = toTile(e);
    if (!inBounds(m, t.x, t.y)) return;
    if (walkable(m, t.x, t.y) && walkTo(t)) return;
    const r = roomAt(m, t.x, t.y);
    if (r) api.goTo(r.id);
  }
  function onMove(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const t = toTile(e);
    hover = inBounds(m, t.x, t.y) ? { x: t.x, y: t.y } : null;
    const r = hover ? roomAt(m, hover.x, hover.y) : null;
    setHoverRoom(r && r.kind !== "storage" ? r.id : null);
  }
  function setHoverRoom(id: string | null) {
    if (id === hoverRoom) return;
    hoverRoom = id;
    o.onHover?.(id);
  }
  const onLeave = () => {
    hover = null;
    setHoverRoom(null);
  };
  const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
  function onKey(e: KeyboardEvent) {
    const k = KEYS[e.key];
    if (!k || typing(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
    held.add(k);
    e.preventDefault();
  }
  function onKeyUp(e: KeyboardEvent) {
    const k = KEYS[e.key];
    if (k) held.delete(k);
  }
  const onBlur = () => held.clear();
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerleave", onLeave);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  function resize() {
    dpr = Math.min(2.5, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
    darkC.width = canvas.width;
    darkC.height = canvas.height;
    cam.ready = false;
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
        if (r.id === lightUp && now !== undefined && now > 0.12 && !reduced) anim.set(r.id, { t0: performance.now(), from: now });
        else if (!anim.has(r.id)) disp.set(r.id, target);
      }
    },
    setTicker(text) {
      ticker = text;
    },
    setPeriod(p) {
      period = p;
    },
    setPartnerLine(text) {
      partnerLine = text;
    },
    goTo(id) {
      const r = byId.get(id);
      return r ? walkTo(r.inside) : false;
    },
    goOut() {
      if (current) walkTo(current.outside);
    },
    press(dir, on) {
      if (on) held.add(dir);
      else held.delete(dir);
    },
    zoomBy(stepBy) {
      zi = Math.max(0, Math.min(ZOOMS.length - 1, zi + stepBy));
      cam.ready = false;
    },
    resize,
    destroy() {
      dead = true;
      current = null;
      tuneTv();
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onMq);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    },
  };
  return api;
}
