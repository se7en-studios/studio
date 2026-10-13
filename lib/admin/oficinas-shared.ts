// Oficinas («En vivo»): el estudio como un mapa isométrico donde cada proyecto
// es una sala. Puro y sin DOM: lo usan el servidor (lib/admin/oficinas.ts), el
// mapa (app/admin/oficinas) y scripts/check-oficinas.mjs, que lo importa directo
// con Node. Por eso acá sólo hay imports de tipos.
import type { LeadOwner } from "./db";

export type Who = LeadOwner;
export const WHO: readonly Who[] = ["federico", "franco"];
export const otherOf = (w: Who): Who => (w === "federico" ? "franco" : "federico");

// --- Tiempo ------------------------------------------------------------------

export const TZ = "America/Argentina/Buenos_Aires";
const DAY = 86_400_000;

/** YYYY-MM-DD en hora de Argentina. */
export const dayKey = (ms: number) => new Date(ms).toLocaleDateString("en-CA", { timeZone: TZ });
const keyMs = (k: string) => Date.parse(`${k}T00:00:00Z`);

/** Días calendario (en Argentina) desde `at` hasta `now`. null = nunca. Pasar la medianoche no da −1. */
export function daysSince(at: string | null, now: number): number | null {
  if (!at) return null;
  return Math.max(0, Math.round((keyMs(dayKey(now)) - keyMs(dayKey(Date.parse(at)))) / DAY));
}

export const daysLabel = (d: number | null) =>
  d === null ? "nunca" : d === 0 ? "hoy" : d === 1 ? "hace 1 día" : `hace ${d} días`;

/** «recién», «hace 3 h», «ayer», «hace 4 días». */
export function relTime(at: string, now: number) {
  const d = daysSince(at, now);
  if (d === 0) {
    const h = Math.floor((now - Date.parse(at)) / 3_600_000);
    return h < 1 ? "recién" : `hace ${h} h`;
  }
  return d === 1 ? "ayer" : `hace ${d} días`;
}

/** Hora del día en Argentina (0–23). */
export const hourIn = (ms: number) => Number(new Date(ms).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false })) % 24;
export type Period = "manana" | "dia" | "tarde" | "noche";
export const periodOf = (h: number): Period => (h >= 6 && h < 8 ? "manana" : h >= 8 && h < 18 ? "dia" : h >= 18 && h < 21 ? "tarde" : "noche");

// --- Apagado -----------------------------------------------------------------

/** En curso: lo que se sigue tocando (mantenimiento incluido). Archivo: lo cerrado. */
export type Zone = "active" | "archive";
export const zoneOf = (status: string): Zone => (status === "entregado" ? "archive" : "active");

/**
 * 0 = recién visitada, 1 = apagada del todo.
 * En curso: empieza al tercer día y se apaga al mes. Archivo: desde las dos
 * semanas, del todo a los tres meses. Nunca visitada = apagada.
 */
export function fadeOf(days: number | null, zone: Zone = "active"): number {
  if (days === null) return 1;
  const f = zone === "archive" ? (days - 14) / 76 : (days - 2) / 28;
  return Math.min(1, Math.max(0, f));
}

/** 0 sana · 1 pide agua · 2 seca · 3 muerta. */
export const plantStage = (f: number) => (f < 0.2 ? 0 : f < 0.5 ? 1 : f < 0.8 ? 2 : 3);

// --- Lo que manda el servidor --------------------------------------------------

export type OfiTask = {
  id: string;
  title: string;
  assignee: Who | null;
  due: string | null;
  priority: "alta" | "media" | "baja";
  projectSlug: string | null;
};

export type OfiEvent = { id: string; createdAt: string; actor: Who | null; text: string; projectSlug: string | null };

export type OfiProject = {
  slug: string;
  name: string;
  category: string;
  client: string;
  accent: string;
  status: string;
  owner: Who | null;
  due: string | null;
  progress: number;
  notes: string;
  isCase: boolean;
  openTasks: OfiTask[];
  /** Los últimos 5, el más nuevo primero. */
  events: OfiEvent[];
  /** Última visita que cuenta para el apagado (fila de visitas o semilla). null = nunca. */
  lastVisit: Record<Who, string | null>;
};

export type OficinasData = {
  me: Who;
  generatedAt: string;
  /** false si falta supabase/oficinas.sql: el mapa anda, pero las visitas no se guardan. */
  visitsReady: boolean;
  projects: OfiProject[];
  /** Los últimos 6 del estudio, sin pedidos. */
  studioEvents: OfiEvent[];
  /** Abiertas, de proyectos o sueltas (sin las de pedidos). */
  openTasks: OfiTask[];
};

/** La visita que cuenta: la fila de panel_room_visits; si no hay, la más nueva entre la lectura del chat y mi último cambio. */
export function resolveVisit(row: string | null, read: string | null, ownEvent: string | null): string | null {
  if (row) return row;
  if (!read) return ownEvent;
  if (!ownEvent) return read;
  return read > ownEvent ? read : ownEvent;
}

/** Novedades de la sala: lo que hizo el otro después de mi última visita. */
export function newSince(events: OfiEvent[], who: Who, since: string | null, now: number) {
  return events.filter((e) => e.actor !== who && Date.parse(e.createdAt) <= now && (!since || e.createdAt > since)).length;
}

export type RoomLook = { days: number | null; fade: number; badge: number };

export function lookOf(p: Pick<OfiProject, "status" | "events">, visit: string | null, who: Who, now: number): RoomLook {
  const days = daysSince(visit, now);
  return { days, fade: fadeOf(days, zoneOf(p.status)), badge: newSince(p.events, who, visit, now) };
}

/** La sala más apagada (para el pasillo y la tarjeta de Inicio). Empate: más días, después por nombre. */
export function salaMasApagada(
  projects: Pick<OfiProject, "slug" | "name" | "status">[],
  visitOf: (slug: string) => string | null,
  now: number,
): { slug: string; name: string; days: number | null; fade: number } | null {
  let best: { slug: string; name: string; days: number | null; fade: number } | null = null;
  for (const p of projects) {
    const days = daysSince(visitOf(p.slug), now);
    const cand = { slug: p.slug, name: p.name, days, fade: fadeOf(days, zoneOf(p.status)) };
    const dd = (x: number | null) => (x === null ? Number.POSITIVE_INFINITY : x);
    if (
      !best ||
      cand.fade > best.fade ||
      (cand.fade === best.fade && dd(cand.days) > dd(best.days)) ||
      (cand.fade === best.fade && dd(cand.days) === dd(best.days) && cand.name.localeCompare(best.name, "es") < 0)
    )
      best = cand;
  }
  return best;
}

// --- El plano ------------------------------------------------------------------
//
// Grilla isométrica: x baja hacia la derecha, y baja hacia la izquierda. Las
// paredes no ocupan baldosas: van en los bordes. Cada baldosa (x, y) es dueña
// de sus dos bordes de atrás: «L» (entre x−1 y x) y «R» (entre y−1 e y).
//
//   y 0–4   Oficina de Franco · Recepción (abierta) · Oficina de Federico
//   y 5–6   Pasillo principal
//   y 7…    Salas de a dos (izquierda y derecha) a los lados de un pasillo
//           central; primero las de En curso y después, pasando el arco, el
//           Archivo.

export type EdgeKind = "none" | "rail" | "wall" | "tall";
export type Side = "L" | "R";
export type Pt = { x: number; y: number };
export type RoomKind = "office" | "reception" | "project" | "kitchen" | "storage";

export type MapRoom = {
  id: string;
  kind: RoomKind;
  x: number;
  y: number;
  w: number;
  d: number;
  slug?: string;
  who?: Who;
  zone?: Zone;
  status?: string;
  /** Lado del pasillo central (sólo salas de proyecto). */
  column?: "left" | "right";
  /** La puerta es el borde `side` de la baldosa (x, y). */
  door: Pt & { side: Side };
  /** Primera baldosa adentro y la de afuera, frente a la puerta. */
  inside: Pt;
  outside: Pt;
  /** Donde se sienta el dueño de la oficina. */
  seat?: Pt;
};

export type Facing = "x" | "y";
export type Furni = {
  id: string;
  k: string;
  x: number;
  y: number;
  w: number;
  d: number;
  room: string | null;
  /** Hacia dónde mira el frente (eje +x o +y). */
  face: Facing;
  solid: boolean;
};

/** Cuadros, pizarrones, ventanas: van pintados sobre una pared. */
export type Decor = { id: string; k: string; side: Side; x: number; y: number; len: number; room: string | null };

export type MapModel = {
  W: number;
  H: number;
  /** id de sala o "hall". */
  region: string[][];
  edgeL: EdgeKind[][];
  edgeR: EdgeKind[][];
  doors: Set<string>;
  rooms: MapRoom[];
  furni: Furni[];
  decor: Decor[];
  solid: boolean[][];
  start: Pt;
  /** Primera fila del Archivo (ahí va el arco). null si no hay archivo. */
  archiveY: number | null;
  spine: { x0: number; x1: number };
  /** Luces de techo del pasillo (para la noche). */
  lamps: Pt[];
};

export const MAP = { W: 15, TOP: 5, HALL: 2, ROOM_W: 6, ROOM_D: 5, SPINE_X0: 6, SPINE_X1: 9 } as const;
const doorKey = (x: number, y: number, side: Side) => `${x},${y},${side}`;

export type MapInput = { slug: string; status: string }[];

export function buildMap(projects: MapInput): MapModel {
  const { W, TOP, HALL, ROOM_W, ROOM_D, SPINE_X0, SPINE_X1 } = MAP;
  const active = projects.filter((p) => zoneOf(p.status) === "active");
  const archive = projects.filter((p) => zoneOf(p.status) === "archive");
  type Slot = { p: { slug: string; status: string } | null; filler: RoomKind; zone: Zone };
  const slots: Slot[] = [
    ...active.map((p) => ({ p, filler: "project" as RoomKind, zone: "active" as Zone })),
    ...(active.length % 2 ? [{ p: null, filler: "kitchen" as RoomKind, zone: "active" as Zone }] : []),
  ];
  const archiveFrom = slots.length;
  slots.push(...archive.map((p) => ({ p, filler: "project" as RoomKind, zone: "archive" as Zone })));
  if (archive.length % 2) slots.push({ p: null, filler: "storage", zone: "archive" });
  const rows = slots.length / 2;
  const y0 = TOP + HALL;
  const H = y0 + Math.max(1, rows) * ROOM_D;

  const region = Array.from({ length: H }, () => new Array<string>(W).fill("hall"));
  const solid = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  const rooms: MapRoom[] = [];
  const furni: Furni[] = [];
  const decor: Decor[] = [];
  const doors = new Set<string>();
  let nid = 0;

  const addRoom = (r: MapRoom) => {
    for (let y = r.y; y < r.y + r.d; y++) for (let x = r.x; x < r.x + r.w; x++) region[y][x] = r.id;
    doors.add(doorKey(r.door.x, r.door.y, r.door.side));
    rooms.push(r);
    return r;
  };
  const put = (r: MapRoom | null, k: string, x: number, y: number, w = 1, d = 1, face: Facing = "y", isSolid = true) => {
    furni.push({ id: `f${nid++}`, k, x, y, w, d, room: r ? r.id : null, face, solid: isSolid });
    if (isSolid) for (let yy = y; yy < y + d; yy++) for (let xx = x; xx < x + w; xx++) solid[yy][xx] = true;
  };
  const hang = (r: MapRoom | null, k: string, side: Side, x: number, y: number, len = 1) =>
    decor.push({ id: `d${nid++}`, k, side, x, y, len, room: r ? r.id : null });

  // Fila de arriba: oficinas y recepción
  const office = (who: Who, x: number) =>
    addRoom({ id: `off-${who}`, kind: "office", who, x, y: 0, w: 5, d: TOP, door: { x: x + 2, y: TOP, side: "R" }, inside: { x: x + 2, y: TOP - 1 }, outside: { x: x + 2, y: TOP }, seat: { x: x + 2, y: 1 } });
  const fr = office("franco", 0);
  const rc = addRoom({ id: "recepcion", kind: "reception", x: 5, y: 0, w: 5, d: TOP, door: { x: 7, y: TOP, side: "R" }, inside: { x: 7, y: TOP - 1 }, outside: { x: 7, y: TOP } });
  const fe = office("federico", 10);
  for (const o of [fr, fe]) {
    const X = o.x;
    if (o.who === "franco") hang(o, "window", "L", 0, 1, 2);
    hang(o, "window", "R", X + 1, 0, 1);
    hang(o, "logo", "R", X + 3, 0, 1);
    put(o, "shelf", X + 4, 0, 1, 1, "y");
    put(o, "plant", X, 0, 1, 1, "y");
    put(o, "rug", X + 1, 2, 3, 2, "y", false);
    put(o, "chairBoss", X + 2, 1, 1, 1, "y");
    put(o, "desk", X + 1, 2, 3, 1, "y");
    put(o, "sofa", X, 3, 1, 2, "x");
    put(o, "lamp", X + 4, 4, 1, 1, "y");
  }
  hang(rc, "window", "R", 5, 0, 1);
  hang(rc, "ticker", "R", 6, 0, 3);
  hang(rc, "window", "R", 9, 0, 1);
  put(rc, "plant", 5, 0); put(rc, "plant", 9, 0);
  put(rc, "stool", 7, 1);
  put(rc, "counter", 6, 2, 3, 1, "y");
  put(rc, "rug", 6, 3, 3, 2, "y", false);

  // Pasillo principal
  put(null, "plant", 0, TOP); put(null, "plant", W - 1, TOP);
  put(null, "cooler", 4, TOP); put(null, "bench", 10, TOP, 2, 1, "y");

  // Salas de a dos, a los lados del pasillo central
  slots.forEach((s, i) => {
    const row = Math.floor(i / 2), left = i % 2 === 0;
    const x = left ? 0 : SPINE_X1, y = y0 + row * ROOM_D;
    const kind: RoomKind = s.p ? "project" : s.filler;
    const id = s.p ? `p-${s.p.slug}` : `${kind}-${i}`;
    const door = left ? { x: SPINE_X0, y: y + 2, side: "L" as Side } : { x: SPINE_X1, y: y + 2, side: "L" as Side };
    const r = addRoom({
      id, kind, x, y, w: ROOM_W, d: ROOM_D, slug: s.p?.slug, zone: s.zone, status: s.p?.status, column: left ? "left" : "right",
      door, inside: left ? { x: SPINE_X0 - 1, y: y + 2 } : { x: SPINE_X1, y: y + 2 }, outside: left ? { x: SPINE_X0, y: y + 2 } : { x: SPINE_X1 - 1, y: y + 2 },
    });
    furnishRoom(r, left, put, hang);
  });

  // Pasillo central: plantas contra las paredes de las salas, lejos de las puertas
  for (let row = 0; row < rows; row++) {
    const y = y0 + row * ROOM_D;
    if (row % 2 === 0) put(null, "plant", SPINE_X0, y);
    else put(null, "plant", SPINE_X1 - 1, y + ROOM_D - 1);
  }

  // Bordes: paredes y barandas
  const edgeL = Array.from({ length: H }, () => new Array<EdgeKind>(W).fill("none"));
  const edgeR = Array.from({ length: H }, () => new Array<EdgeKind>(W).fill("none"));
  // Atrás de cada sala va una pared (vidrio arriba); adelante, sólo una baranda
  // baja para que se vea adentro. El borde del edificio es la pared alta.
  const edgeBetween = (behind: string | null, front: string): EdgeKind => {
    if (behind === null) return "tall";
    if (behind === front) return "none";
    // La recepción está abierta al pasillo.
    if ((behind === "recepcion" && front === "hall") || (front === "recepcion" && behind === "hall")) return "none";
    return front !== "hall" ? "wall" : "rail";
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      edgeL[y][x] = edgeBetween(x === 0 ? null : region[y][x - 1], region[y][x]);
      edgeR[y][x] = edgeBetween(y === 0 ? null : region[y - 1][x], region[y][x]);
    }

  const archiveY = archive.length ? y0 + Math.floor(archiveFrom / 2) * ROOM_D : null;
  const lamps: Pt[] = [];
  for (let x = 1; x < W; x += 4) lamps.push({ x, y: TOP + 1 });
  for (let y = y0 + 2; y < H; y += 4) lamps.push({ x: 7, y });

  return { W, H, region, edgeL, edgeR, doors, rooms, furni, decor, solid, start: { x: 7, y: TOP + 1 }, archiveY, spine: { x0: SPINE_X0, x1: SPINE_X1 }, lamps };
}

type Put = (r: MapRoom | null, k: string, x: number, y: number, w?: number, d?: number, face?: Facing, isSolid?: boolean) => void;
type Hang = (r: MapRoom | null, k: string, side: Side, x: number, y: number, len?: number) => void;

/** Muebles de una sala de 6×5. Las de la izquierda tienen la ventana del edificio atrás; la puerta da al pasillo central. */
function furnishRoom(r: MapRoom, left: boolean, put: Put, hang: Hang) {
  const X = r.x, Y = r.y, st = r.status ?? "";
  if (r.kind === "kitchen") {
    hang(r, "poster", "R", X + 4, Y, 1);
    put(r, "kitchen", X + 1, Y, 3, 1, "y");
    put(r, "fridge", left ? X : X + 5, Y, 1, 1, "y");
    put(r, "table", X + 2, Y + 2, 2, 1, "y");
    put(r, "stool", X + 2, Y + 3); put(r, "stool", X + 3, Y + 3);
    put(r, "plant", left ? X : X + 5, Y + 4);
    return;
  }
  if (r.kind === "storage") {
    put(r, "boxes", X + 1, Y, 2, 1, "y");
    put(r, "boxes", X + 3, Y + 3, 2, 1, "y");
    return;
  }
  const archive = r.zone === "archive";
  // Base: escritorio con monitor, silla, planta, lámpara y alfombra del color del proyecto
  if (left) {
    hang(r, "window", "L", 0, Y + 1, 2);
    put(r, "desk", X, Y + 1, 1, 2, "x");
    put(r, "chair", X + 1, Y + 1, 1, 1, "x");
    put(r, "plant", X, Y);
    put(r, "lamp", X, Y + 4);
  } else {
    put(r, "desk", X + 1, Y, 2, 1, "y");
    put(r, "chair", X + 1, Y + 1, 1, 1, "y");
    put(r, "plant", X + 5, Y);
    put(r, "lamp", X + 5, Y + 4);
  }
  put(r, "rug", X + 2, Y + 2, 3, 2, "y", false);
  hang(r, "poster", left ? "R" : "L", left ? X + 1 : X, left ? Y : Y + 3, 1);
  // Lo que identifica la etapa
  const a = left ? X + 3 : X + 3; // primera columna libre contra la pared de atrás
  if (archive) {
    hang(r, "plaque", "R", a + 1, Y, 1);
    hang(r, "frame", "R", a - 1, Y, 1);
    put(r, "pedestal", X + 3, Y + 2);
    put(r, "vitrine", a + 1, Y, 1, 1, "y");
  } else if (st === "mantenimiento") {
    // El sitio en vivo colgado en la pared y el servidor que lo mantiene
    hang(r, "frame", "R", a - 1, Y, 1);
    put(r, "rack", a + 1, Y, 1, 1, "y");
    put(r, "shelf", a, Y, 1, 1, "y");
  } else if (st === "desarrollo") {
    put(r, "desk2", a, Y, 2, 1, "y");
    put(r, "chair", a, Y + 1, 1, 1, "y");
  } else if (st === "diseno") {
    hang(r, "moodboard", "R", a - 1, Y, 2);
    put(r, "drafting", a + 1, Y, 1, 1, "y");
    put(r, "stool", a + 1, Y + 1);
  } else if (st === "revision") {
    hang(r, "tv", "R", a - 1, Y, 3);
    put(r, "sofa", a, Y + 2, 2, 1, "y");
  } else if (st === "descubrimiento") {
    hang(r, "whiteboard", "R", a - 1, Y, 3);
    put(r, "table", a, Y + 1, 1, 1, "y");
    put(r, "stool", a + 1, Y + 1);
  } else {
    // Pausado: los muebles tapados con sábanas.
    put(r, "sofa", a, Y, 2, 1, "y");
  }
}

// --- Caminar -----------------------------------------------------------------------

export const inBounds = (m: MapModel, x: number, y: number) => x >= 0 && y >= 0 && x < m.W && y < m.H;
export const walkable = (m: MapModel, x: number, y: number) => inBounds(m, x, y) && !m.solid[y][x];

/** Se puede pasar de (x, y) a la vecina (nx, ny) si no hay pared, o si hay una puerta. */
export function canStep(m: MapModel, x: number, y: number, nx: number, ny: number): boolean {
  if (!walkable(m, nx, ny)) return false;
  let ex = 0, ey = 0, side: Side;
  if (nx === x + 1 && ny === y) { ex = nx; ey = ny; side = "L"; }
  else if (nx === x - 1 && ny === y) { ex = x; ey = y; side = "L"; }
  else if (ny === y + 1 && nx === x) { ex = nx; ey = ny; side = "R"; }
  else if (ny === y - 1 && nx === x) { ex = x; ey = y; side = "R"; }
  else return false;
  const kind = side === "L" ? m.edgeL[ey][ex] : m.edgeR[ey][ex];
  return kind === "none" || m.doors.has(doorKey(ex, ey, side));
}

export const hasDoor = (m: MapModel, x: number, y: number, side: Side) => m.doors.has(doorKey(x, y, side));

/** Camino más corto por la grilla (sin incluir el punto de partida). null si no se llega. */
export function findPath(m: MapModel, from: Pt, to: Pt): Pt[] | null {
  if (!walkable(m, to.x, to.y)) return null;
  const key = (x: number, y: number) => y * m.W + x;
  const prev = new Map<number, number>([[key(from.x, from.y), -1]]);
  const q: Pt[] = [from];
  for (let i = 0; i < q.length; i++) {
    const c = q[i];
    if (c.x === to.x && c.y === to.y) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = c.x + dx, ny = c.y + dy, k = key(nx, ny);
      if (!prev.has(k) && canStep(m, c.x, c.y, nx, ny)) {
        prev.set(k, key(c.x, c.y));
        q.push({ x: nx, y: ny });
      }
    }
  }
  const end = key(to.x, to.y);
  if (!prev.has(end)) return null;
  const path: Pt[] = [];
  for (let k = end; k !== key(from.x, from.y); k = prev.get(k) as number) path.push({ x: k % m.W, y: Math.floor(k / m.W) });
  return path.reverse();
}

export const roomAt = (m: MapModel, x: number, y: number): MapRoom | null =>
  inBounds(m, x, y) && m.region[y][x] !== "hall" ? m.rooms.find((r) => r.id === m.region[y][x]) ?? null : null;
