// Oficinas («En vivo»): el estudio como un mapa isométrico donde cada proyecto
// es una sala. Puro y sin DOM: lo usan el servidor (lib/admin/oficinas.ts), el
// mapa (app/admin/oficinas) y scripts/check-oficinas.mjs, que lo importa directo
// con Node. Por eso acá sólo hay imports de tipos.
import type { LeadOwner } from "./db";
import { TZ, dayIn } from "./tz";

export type Who = LeadOwner;
export const WHO: readonly Who[] = ["federico", "franco"];
export const otherOf = (w: Who): Who => (w === "federico" ? "franco" : "federico");

// --- Tiempo ------------------------------------------------------------------

export { TZ };
const DAY = 86_400_000;

/** YYYY-MM-DD en hora de Argentina. */
export const dayKey = (ms: number) => dayIn(ms);
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
/** Ritmo con que se apaga: un sitio en mantenimiento pide un vistazo por semana, no todos los días. */
export type Pace = Zone | "maintenance";
export const paceOf = (status: string): Pace => (status === "mantenimiento" ? "maintenance" : zoneOf(status));

/**
 * 0 = recién visitada, 1 = apagada del todo.
 * En curso: empieza al tercer día y se apaga al mes. Mantenimiento: desde la
 * semana, del todo a las seis. Archivo: desde las dos semanas, del todo a los
 * tres meses. Nunca visitada = apagada.
 */
export function fadeOf(days: number | null, pace: Pace = "active"): number {
  if (days === null) return 1;
  const f = pace === "archive" ? (days - 14) / 76 : pace === "maintenance" ? (days - 7) / 35 : (days - 2) / 28;
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

/**
 * La marca de un caso: su tipografía (clave de lib/brand-fonts.ts), el logo
 * completo y el ícono (rutas de /public; null si no hay). La alfombra, el
 * felpudo, el cartel y la compu de la sala van con ella.
 */
export type OfiBrand = { font: string; weight: number; uppercase: boolean; highlight: string; logo: string | null; mark: string | null };

export type OfiProject = {
  slug: string;
  name: string;
  category: string;
  /** La frase de marca del caso (vacía en los proyectos del panel). Ayuda a elegir el tema de la sala. */
  tagline: string;
  client: string;
  accent: string;
  /** Captura del sitio (casos) o la última imagen subida al panel. La tele de la sala la muestra desde afuera. */
  cover: string | null;
  /** El sitio publicado y la grabación recorriéndolo (sólo casos): la tele la pasa cuando estás adentro. */
  url: string | null;
  video: string | null;
  /**
   * La captura automática más nueva del sitio (la página entera, ver
   * scripts/capturar-sitios.mjs). Si hay, la tele la recorre en lugar de la
   * grabación y la muestra desde afuera en lugar de `cover`.
   */
  capture: { url: string; width: number; height: number; capturedAt: string } | null;
  /** null en los proyectos del panel: usan una letra genérica. */
  brand: OfiBrand | null;
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

/**
 * La visita que cuenta: la más nueva entre entrar a la sala, leer su chat y mi
 * último cambio en el proyecto. Trabajar desde la ficha también la prende.
 */
export function resolveVisit(row: string | null, read: string | null, ownEvent: string | null): string | null {
  return [row, read, ownEvent].reduce<string | null>((a, b) => (b && (!a || b > a) ? b : a), null);
}

/** Novedades de la sala: lo que hizo el otro después de mi última visita. */
export function newSince(events: OfiEvent[], who: Who, since: string | null, now: number) {
  return events.filter((e) => e.actor !== who && Date.parse(e.createdAt) <= now && (!since || e.createdAt > since)).length;
}

export type RoomLook = { days: number | null; fade: number; badge: number };

export function lookOf(p: Pick<OfiProject, "status" | "events">, visit: string | null, who: Who, now: number): RoomLook {
  const days = daysSince(visit, now);
  return { days, fade: fadeOf(days, paceOf(p.status)), badge: newSince(p.events, who, visit, now) };
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
    const cand = { slug: p.slug, name: p.name, days, fade: fadeOf(days, paceOf(p.status)) };
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

/** Los casos que van primero en el ala de proyectos, al lado del estudio: los que hoy más muestran. */
export const FEATURED = ["apex-ai", "takefyy", "pone-la-pava", "pravilo"];
/** El orden de las salas: los destacados primero (en ese orden) y después por nombre. Igual en el panel y en la landing. */
export function byRoomOrder(a: { slug: string; name: string }, b: { slug: string; name: string }) {
  const fa = FEATURED.indexOf(a.slug), fb = FEATURED.indexOf(b.slug);
  if (fa !== fb) return fa < 0 ? 1 : fb < 0 ? -1 : fa - fb;
  return a.name.localeCompare(b.name, "es");
}

// --- Cartel LED de la recepción ------------------------------------------------------

/** Un tramo del cartel con su color (null = el ámbar del cartel). */
export type LedPart = { text: string; color: string | null };
/** Un mensaje: el cartel lo deja quieto si entra entero y si no lo pasa de derecha a izquierda. */
export type LedMsg = LedPart[];

/** Lo que el cartel sabe escribir: mayúsculas de la letra pixel, sin flechas ni comillas españolas. */
export const ledText = (s: string) =>
  s
    .toUpperCase()
    .replace(/→/g, ">")
    .replace(/[«»“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();

/**
 * Lo que pasa por el cartel: la hora (si se pasa `now`), la marca y el nombre
 * de cada proyecto en su color. Nada más: el cartel es una pared y se ve de
 * afuera (la landing, una pantalla compartida). Ni movimientos, ni mensajes,
 * ni cuánto hace que no entramos a una sala.
 */
export function ledMessages(projects: Pick<OfiProject, "name" | "accent">[], now?: number): LedMsg[] {
  const out: LedMsg[] = [];
  if (now !== undefined) out.push([{ text: new Date(now).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }), color: null }]);
  out.push([{ text: "SE7EN STUDIO", color: "#ff4d2e" }]);
  for (const p of projects) out.push([{ text: ledText(p.name), color: p.accent }]);
  return out;
}

// --- Tema de cada sala -------------------------------------------------------------

/** Lo que cuenta cada sala sobre su proyecto: la pieza del centro y el cuadro de la pared. */
export type Theme = "padel" | "mate" | "gym" | "yoga" | "inmobiliaria" | "clima" | "phones" | "carta" | "studio";

/** Sale del nombre, la categoría y la frase del proyecto. Sin pistas, «studio» (la sala de siempre). */
export function themeOf(p: { name: string; category: string; tagline?: string }): Theme {
  const t = `${p.name} ${p.category} ${p.tagline ?? ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  if (/padel/.test(t)) return "padel";
  if (/\bmate\b|pava|yerba/.test(t)) return "mate";
  if (/entrenador|gimnasio|\bgym\b/.test(t)) return "gym";
  if (/movilidad|entrenamiento|yoga|pilates/.test(t)) return "yoga";
  if (/inmobiliari|inversion|propiedad/.test(t)) return "inmobiliaria";
  if (/clim|satelit|incendio/.test(t)) return "clima";
  if (/iphone|celular|smartphone/.test(t)) return "phones";
  if (/carta|restaurant|pedidos|menu/.test(t)) return "carta";
  return "studio";
}

// --- El plano ------------------------------------------------------------------
//
// Grilla isométrica: x baja hacia la derecha, y baja hacia la izquierda. Las
// paredes no ocupan baldosas: van en los bordes. Cada baldosa (x, y) es dueña
// de sus dos bordes de atrás: «L» (entre x−1 y x) y «R» (entre y−1 e y).
//
// No es un rectángulo: son sectores sueltos con jardín entre medio («out», no se
// camina), unidos por el hall y el eje.
//
//   arriba   Desarrollo (el escritorio de Franco) · Recepción · Diseño &
//            creatividad (el de Federico), cada uno a su altura
//   y 7–9    El hall que los une
//   y 10–14  Reuniones (vidriada) · el eje · Chill-out (abierto al eje)
//   y 15–16  Jardín: el eje lo cruza como un puente
//   y 17…    El ala de proyectos: salas de a dos a los lados del eje, primero
//            las de En curso y después, pasando el arco, el Archivo.

export type EdgeKind = "none" | "rail" | "wall" | "tall" | "glass";
export type Side = "L" | "R";
export type Pt = { x: number; y: number };
export type RoomKind = "office" | "reception" | "project" | "kitchen" | "storage" | "meeting" | "lounge";
/** Las dos áreas de trabajo del estudio. Cada socio tiene su escritorio en la suya (data/team.ts). */
export type Area = "dev" | "design";
export const AREA_OF: Record<Who, Area> = { franco: "dev", federico: "design" };
export const AREA_NAME: Record<Area, string> = { dev: "Desarrollo", design: "Diseño" };

export type MapRoom = {
  id: string;
  kind: RoomKind;
  x: number;
  y: number;
  w: number;
  d: number;
  slug?: string;
  who?: Who;
  /** Las oficinas: de qué es el área donde está el escritorio del socio. */
  area?: Area;
  zone?: Zone;
  status?: string;
  theme?: Theme;
  /** Lado del pasillo central (salas de proyecto, Reuniones y Chill-out). */
  column?: "left" | "right";
  /** La puerta es el borde `side` de la baldosa (x, y). */
  door: Pt & { side: Side };
  /** Primera baldosa adentro y la de afuera, frente a la puerta. */
  inside: Pt;
  outside: Pt;
  /** Donde se sienta el dueño de la oficina. */
  seat?: Pt;
};

/** El nombre de una sala que no es de un proyecto (las de proyecto llevan el del proyecto). */
export function studioRoomName(r: Pick<MapRoom, "kind" | "area">): string {
  switch (r.kind) {
    case "office":
      return AREA_NAME[r.area ?? "dev"];
    case "reception":
      return "Recepción";
    case "meeting":
      return "Reuniones";
    case "lounge":
      return "Chill-out";
    case "kitchen":
      return "Cocina";
    case "storage":
      return "Depósito";
    default:
      return "Sala";
  }
}

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

/** Lo que va pintado en el piso (alfombras, la cancha): no ocupa lugar y se dibuja antes que todo. */
export const DECALS = new Set(["rug", "court", "yogamat", "doormat", "pond"]);

/** Cuadros, pizarrones, ventanas: van pintados sobre una pared. */
/** `tall`: si cuelga de una pared alta (el borde de atrás de un sector); lo pone buildMap. */
export type Decor = { id: string; k: string; side: Side; x: number; y: number; len: number; room: string | null; tall?: boolean };

export type MapModel = {
  W: number;
  H: number;
  /** id de sala, "hall" o "out" (el jardín). */
  region: string[][];
  edgeL: EdgeKind[][];
  edgeR: EdgeKind[][];
  doors: Set<string>;
  rooms: MapRoom[];
  furni: Furni[];
  decor: Decor[];
  solid: boolean[][];
  start: Pt;
  /** Primera fila del ala de proyectos (ahí va el arco de entrada). */
  wingY: number;
  /** Primera fila del Archivo (ahí va el arco). null si no hay archivo. */
  archiveY: number | null;
  spine: { x0: number; x1: number };
  /** Luces de techo del pasillo (para la noche). */
  lamps: Pt[];
  /** Dónde hay jardín: alrededor de los sectores y de lo plantado. Más allá, nada (el contorno no es un rectángulo). */
  ground: boolean[][];
};

export const MAP = { W: 22, ROOM_W: 6, ROOM_D: 5, SPINE_X0: 8, SPINE_X1: 11, PLAZA_Y: 7, STUDIO_Y: 11, WING_Y: 18 } as const;
/** Lo que no es edificio: el jardín entre los sectores. */
export const OUT = "out";
const doorKey = (x: number, y: number, side: Side) => `${x},${y},${side}`;

export type MapInput = { slug: string; status: string; theme?: Theme }[];

export function buildMap(projects: MapInput): MapModel {
  const { W, ROOM_W, ROOM_D, SPINE_X0, SPINE_X1, PLAZA_Y, STUDIO_Y, WING_Y } = MAP;
  const active = projects.filter((p) => zoneOf(p.status) === "active");
  const archive = projects.filter((p) => zoneOf(p.status) === "archive");
  type Slot = { p: { slug: string; status: string; theme?: Theme } | null; filler: RoomKind; zone: Zone };
  const slots: Slot[] = [
    ...active.map((p) => ({ p, filler: "project" as RoomKind, zone: "active" as Zone })),
    ...(active.length % 2 ? [{ p: null, filler: "kitchen" as RoomKind, zone: "active" as Zone }] : []),
  ];
  const archiveFrom = slots.length;
  slots.push(...archive.map((p) => ({ p, filler: "project" as RoomKind, zone: "archive" as Zone })));
  if (archive.length % 2) slots.push({ p: null, filler: "storage", zone: "archive" });
  const rows = slots.length / 2;
  const H = WING_Y + Math.max(1, rows) * ROOM_D;
  const WL = SPINE_X0 - ROOM_W; // la columna izquierda del ala (y de Reuniones)

  // Todo empieza como jardín («out»); los sectores y los pasillos se recortan encima
  const region = Array.from({ length: H }, () => new Array<string>(W).fill(OUT));
  const solid = Array.from({ length: H }, () => new Array<boolean>(W).fill(false));
  const rooms: MapRoom[] = [];
  const furni: Furni[] = [];
  const decor: Decor[] = [];
  const doors = new Set<string>();
  let nid = 0;

  const hall = (x0: number, y0: number, w: number, d: number) => {
    for (let y = y0; y < y0 + d; y++) for (let x = x0; x < x0 + w; x++) region[y][x] = "hall";
  };
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

  // --- Las islas del estudio, con jardín entre medio ---
  // Recepción, arriba en el medio, abierta a la plaza: el logo, la frase y el cartel LED en la pared del fondo
  const rc = addRoom({ id: "recepcion", kind: "reception", x: 8, y: 1, w: 6, d: 6, door: { x: 11, y: PLAZA_Y, side: "R" }, inside: { x: 11, y: PLAZA_Y - 1 }, outside: { x: 11, y: PLAZA_Y } });
  // La plaza delante de la recepción, y las pasarelas a Desarrollo (izquierda) y a Diseño (derecha)
  hall(6, PLAZA_Y, 9, STUDIO_Y - PLAZA_Y);
  hall(5, PLAZA_Y, 1, 2);
  hall(15, PLAZA_Y, 1, 1);
  const office = (who: Who, x: number, y: number, w: number, d: number, door: Pt & { side: Side }, inside: Pt, outside: Pt) =>
    addRoom({ id: `off-${who}`, kind: "office", who, area: AREA_OF[who], x, y, w, d, door, inside, outside, seat: { x: x + 2, y: y + 1 } });
  // Desarrollo: el escritorio de Franco, la pantalla del deploy, la pizarra de la arquitectura y el rack
  const dev = office("franco", 0, 5, 5, 5, { x: 5, y: PLAZA_Y, side: "L" }, { x: 4, y: PLAZA_Y }, { x: 5, y: PLAZA_Y });
  // Diseño & creatividad: el escritorio de Federico, el atril y las muestras de color
  const des = office("federico", 16, 2, 6, 6, { x: 16, y: PLAZA_Y, side: "L" }, { x: 16, y: PLAZA_Y }, { x: 15, y: PLAZA_Y });

  {
    const X = dev.x, Y = dev.y;
    put(dev, "rug", X + 1, Y + 2, 3, 2, "y", false);
    put(dev, "chairBoss", X + 2, Y + 1, 1, 1, "y");
    put(dev, "desk", X + 1, Y + 2, 3, 1, "y");
    hang(dev, "window", "R", X + 1, Y, 1);
    hang(dev, "codewall", "R", X + 2, Y, 2);
    hang(dev, "window", "L", X, Y + 1, 2);
    hang(dev, "archboard", "L", X, Y + 3, 2);
    put(dev, "plant", X, Y);
    put(dev, "rack", X + 4, Y, 1, 1, "y");
    put(dev, "deploy", X, Y + 4);
    put(dev, "beanbag", X + 3, Y + 4);
    put(dev, "lamp", X + 4, Y + 4, 1, 1, "y");
  }
  {
    const X = des.x, Y = des.y;
    put(des, "rug", X + 1, Y + 2, 3, 2, "y", false);
    put(des, "chairBoss", X + 2, Y + 1, 1, 1, "y");
    put(des, "desk", X + 1, Y + 2, 3, 1, "y");
    hang(des, "window", "R", X + 1, Y, 1);
    hang(des, "moodboard", "R", X + 2, Y, 2);
    hang(des, "swatches", "R", X + 4, Y, 1);
    hang(des, "window", "R", X + 5, Y, 1);
    put(des, "plant", X, Y); put(des, "plant", X + 5, Y);
    put(des, "easel", X + 4, Y + 2, 1, 1, "y");
    put(des, "drafting", X + 5, Y + 1, 1, 1, "y");
    put(des, "beanbag", X + 5, Y + 4);
    put(des, "lamp", X + 5, Y + 5, 1, 1, "y");
  }
  hang(rc, "slogan", "R", rc.x, rc.y, 6);
  hang(rc, "studiologo", "R", rc.x + 1, rc.y, 4);
  hang(rc, "ticker", "R", rc.x + 1, rc.y, 4);
  put(rc, "plant", rc.x, rc.y); put(rc, "plant", rc.x + 5, rc.y);
  put(rc, "stool", rc.x + 2, rc.y + 1);
  put(rc, "counter", rc.x + 1, rc.y + 2, 4, 1, "y");
  put(rc, "rug", rc.x + 1, rc.y + 3, 4, 2, "y", false);
  put(rc, "sofa", rc.x, rc.y + 3, 1, 2, "x");

  // La plaza: el bidón, un banco y plantas
  put(null, "cooler", 6, PLAZA_Y); put(null, "bench", 12, STUDIO_Y - 1, 2, 1, "y");
  put(null, "plant", 6, STUDIO_Y - 1); put(null, "plant", 14, STUDIO_Y - 1);

  // Reuniones (vidriada, con la pantalla de la charla) y Chill-out (abierto al eje), a los lados del eje
  const sy = STUDIO_Y;
  const meet = addRoom({ id: "reuniones", kind: "meeting", x: WL, y: sy, w: ROOM_W, d: ROOM_D, column: "left", door: { x: SPINE_X0, y: sy + 2, side: "L" }, inside: { x: SPINE_X0 - 1, y: sy + 2 }, outside: { x: SPINE_X0, y: sy + 2 } });
  hang(meet, "slides", "L", WL, sy + 1, 3);
  put(meet, "plant", WL, sy);
  put(meet, "rug", WL + 1, sy + 1, 4, 3, "y", false);
  put(meet, "meettable", WL + 1, sy + 2, 4, 1, "y");
  put(meet, "stool", WL + 2, sy + 1); put(meet, "stool", WL + 4, sy + 1);
  put(meet, "chair", WL + 2, sy + 3, 1, 1, "y"); put(meet, "chair", WL + 3, sy + 3, 1, 1, "y");
  put(meet, "lamp", WL, sy + ROOM_D - 1);
  const lounge = addRoom({ id: "lounge", kind: "lounge", x: SPINE_X1, y: sy, w: ROOM_W, d: ROOM_D, column: "right", door: { x: SPINE_X1, y: sy + 2, side: "L" }, inside: { x: SPINE_X1, y: sy + 2 }, outside: { x: SPINE_X1 - 1, y: sy + 2 } });
  put(lounge, "rug", SPINE_X1 + 1, sy + 1, 4, 3, "y", false);
  put(lounge, "coffeebar", SPINE_X1, sy, 1, 1, "y");
  put(lounge, "sofa", SPINE_X1 + 2, sy, 2, 1, "y");
  put(lounge, "arcade", SPINE_X1 + 5, sy, 1, 1, "y");
  put(lounge, "lowtable", SPINE_X1 + 2, sy + 2, 2, 1, "y");
  put(lounge, "beanbag", SPINE_X1 + 1, sy + 3);
  put(lounge, "beanbag", SPINE_X1 + 4, sy + 3);
  put(lounge, "plant", SPINE_X1 + 5, sy + ROOM_D - 1);
  put(lounge, "lamp", SPINE_X1 + 1, sy + ROOM_D - 1);

  // El eje: sale de la plaza, pasa entre Reuniones y Chill-out, cruza el jardín y recorre el ala
  hall(SPINE_X0, sy, SPINE_X1 - SPINE_X0, H - sy);

  // --- El ala de proyectos: salas de a dos, a los lados del eje ---
  slots.forEach((s, i) => {
    const row = Math.floor(i / 2), left = i % 2 === 0;
    const x = left ? WL : SPINE_X1, y = WING_Y + row * ROOM_D;
    const kind: RoomKind = s.p ? "project" : s.filler;
    const id = s.p ? `p-${s.p.slug}` : `${kind}-${i}`;
    const door = left ? { x: SPINE_X0, y: y + 2, side: "L" as Side } : { x: SPINE_X1, y: y + 2, side: "L" as Side };
    const r = addRoom({
      id, kind, x, y, w: ROOM_W, d: ROOM_D, slug: s.p?.slug, zone: s.zone, status: s.p?.status, theme: s.p?.theme ?? "studio", column: left ? "left" : "right",
      door, inside: left ? { x: SPINE_X0 - 1, y: y + 2 } : { x: SPINE_X1, y: y + 2 }, outside: left ? { x: SPINE_X0, y: y + 2 } : { x: SPINE_X1 - 1, y: y + 2 },
    });
    furnishRoom(r, left, put, hang);
  });
  // Plantas en el eje, contra las paredes de las salas y lejos de las puertas
  for (let row = 0; row < rows; row++) {
    const y = WING_Y + row * ROOM_D;
    if (row % 2 === 0) put(null, "plant", SPINE_X0, y);
    else put(null, "plant", SPINE_X1 - 1, y + ROOM_D - 1);
  }

  // --- El jardín entre las islas: árboles, arbustos y un estanque ---
  const garden = (k: string, x: number, y: number, w = 1, d = 1) => {
    if (x < 0 || y < 0 || x + w > W || y + d > H) return;
    for (let yy = y; yy < y + d; yy++) for (let xx = x; xx < x + w; xx++) if (region[yy][xx] !== OUT || solid[yy][xx]) return;
    put(null, k, x, y, w, d, "y", k !== "pond");
  };
  garden("pond", 17, 9, 2, 2);
  for (const [x, y] of [[1, 3], [3, 2], [7, 2], [7, 5], [14, 2], [15, 5], [20, 9], [16, 10], [1, 12], [3, 16], [14, 17], [18, 12], [19, 15], [6, 17]]) garden("tree", x, y);
  for (const [x, y] of [[5, 5], [5, 9], [10, 0], [12, 0], [14, 4], [0, 11], [0, 14], [12, 16], [16, 16], [18, 14], [2, 0], [21, 9]]) garden("bush", x, y);
  for (let y = WING_Y + 1; y < H - 1; y += 4) {
    garden(y % 8 === 3 ? "bush" : "tree", WL - 2 + ((y >> 2) % 2), y);
    garden(y % 8 === 3 ? "tree" : "bush", SPINE_X1 + ROOM_W + 1 + ((y >> 2) % 2), y + 1);
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (region[y][x] === OUT) solid[y][x] = true;
  // El jardín se dibuja sólo cerca de las islas y de lo plantado
  const planted = furni.filter((f) => f.room === null && (f.k === "tree" || f.k === "bush" || f.k === "pond"));
  const ground = region.map((row, y) =>
    row.map((id, x) => {
      if (id !== OUT) return true;
      for (let yy = y - 2; yy <= y + 2; yy++) for (let xx = x - 2; xx <= x + 2; xx++) if (yy >= 0 && xx >= 0 && yy < H && xx < W && region[yy][xx] !== OUT) return true;
      return planted.some((f) => x >= f.x - 1 && x <= f.x + f.w && y >= f.y - 1 && y <= f.y + f.d);
    }),
  );

  // --- Bordes: paredes, vidrios y barandas ---
  const edgeL = Array.from({ length: H }, () => new Array<EdgeKind>(W).fill("none"));
  const edgeR = Array.from({ length: H }, () => new Array<EdgeKind>(W).fill("none"));
  const built = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && region[y][x] !== OUT;
  const behindFree = (side: Side, x: number, y: number) => {
    if (side === "L") for (let xx = 0; xx < x; xx++) if (built(xx, y)) return false;
    if (side === "R") for (let yy = 0; yy < y; yy++) if (built(x, yy)) return false;
    return true;
  };
  // Un costado de sala es «el fondo del edificio» (pared alta) si no hay nada construido detrás en ninguna de sus baldosas
  const roomBack = (r: MapRoom, side: Side) => {
    if (side === "L") for (let y = r.y; y < r.y + r.d; y++) if (!behindFree("L", r.x, y)) return false;
    if (side === "R") for (let x = r.x; x < r.x + r.w; x++) if (!behindFree("R", x, r.y)) return false;
    return true;
  };
  const byId = new Map(rooms.map((r) => [r.id, r]));
  // Atrás de cada sala va una media pared (o la alta, si es el fondo); adelante, nada:
  // se ve adentro. Los pasillos que dan al jardín, una baranda baja. La recepción, Diseño y
  // el Chill-out son abiertos al hall; Reuniones es vidriada (menos la pared de la pantalla).
  const edgeBetween = (side: Side, behind: string | null, front: string): EdgeKind => {
    if (front === OUT) return "none";
    const fr = byId.get(front);
    let kind: EdgeKind;
    if (behind === null || behind === OUT) kind = !fr ? "rail" : roomBack(fr, side) ? "tall" : "wall";
    else if (behind === front) return "none";
    else {
      const pair = (a: string, b: string) => (behind === a && front === b) || (behind === b && front === a);
      if (pair("recepcion", "hall")) return "none";
      if (pair("off-federico", "hall") && side === "L") return "none";
      if (pair("lounge", "hall")) return side === "L" ? "none" : "rail";
      kind = front !== "hall" ? "wall" : "rail";
    }
    if ((behind === "reuniones" || front === "reuniones") && kind !== "tall") return "glass";
    return kind;
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      edgeL[y][x] = edgeBetween("L", x === 0 ? null : region[y][x - 1], region[y][x]);
      edgeR[y][x] = edgeBetween("R", y === 0 ? null : region[y - 1][x], region[y][x]);
    }
  // Lo que cuelga de una pared alta va más arriba (ventanas, carteles, pantallas)
  for (const dc of decor) dc.tall = (dc.side === "L" ? edgeL[dc.y][dc.x] : edgeR[dc.y][dc.x]) === "tall";

  const archiveY = archive.length ? WING_Y + Math.floor(archiveFrom / 2) * ROOM_D : null;
  const mid = SPINE_X0 + 1;
  const lamps: Pt[] = [{ x: 7, y: PLAZA_Y + 2 }, { x: 13, y: PLAZA_Y + 1 }];
  for (let y = sy + 2; y < H; y += 4) lamps.push({ x: mid, y });

  return { W, H, region, edgeL, edgeR, doors, rooms, furni, decor, solid, start: { x: mid, y: PLAZA_Y + 1 }, wingY: WING_Y, archiveY, spine: { x0: SPINE_X0, x1: SPINE_X1 }, lamps, ground };
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
    hang(r, "window", "L", X, Y + 1, 2);
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
  // La marca: el felpudo del lado del pasillo (cada puerta se reconoce al pasar)
  // y, en las de la izquierda, el cartel con el nombre arriba de la lámpara.
  put(r, "doormat", r.outside.x, r.outside.y, 1, 1, "x", false);
  if (left) hang(r, "brand", "L", X, Y + 3, 2);
  // La tele con el sitio: contra el fondo en las de la izquierda; en las de la
  // derecha, contra la pared de la puerta, al lado del escritorio.
  if (left) put(r, "tvstand", X + 1, Y, 2, 1, "y");
  else put(r, "tvstand", X, Y, 1, 2, "x");
  // El piso y el cuadro de la pared cuentan de qué es el proyecto. La alfombra
  // con el nombre va contra el fondo y sin nada encima: lo de adelante de la
  // sala (y lo alto de la sala de adelante) taparía las letras.
  const theme = r.theme ?? "studio";
  if (theme === "padel") put(r, "court", X + 1, Y + 2, 4, 2, "y", false);
  else put(r, "rug", X + 2, Y + 1, 3, 2, "y", false);
  if (theme === "yoga") put(r, "yogamat", X + 2, Y + 3, 1, 2, "y", false);
  // El cuadro del rubro: en la pared alta, en la esquina del fondo (las de la
  // izquierda); pasando la puerta (las de la derecha). Nunca atrás de la tele.
  const WALL_ART: Partial<Record<Theme, string>> = { padel: "rackets", gym: "plan", inmobiliaria: "blueprint", clima: "mapscreen", carta: "menuboard" };
  hang(r, WALL_ART[theme] ?? "poster", "L", X, left ? Y : Y + 3, 1);
  // Lo que identifica la etapa. Lo que se cuelga empieza después de la tele en
  // las de la izquierda.
  const a = X + 3; // primera columna libre contra la pared de atrás
  const wx = left ? a : a - 1;
  if (archive) {
    hang(r, "plaque", "R", a + 1, Y, 1);
    if (theme === "padel") put(r, "pedestal", X + 1, Y + 4); // fuera de la cancha
    else put(r, "pedestal", X + 2, Y + 3);
    put(r, "vitrine", a + 1, Y, 1, 1, "y");
  } else if (st === "mantenimiento") {
    // El servidor que mantiene el sitio y, al lado, algo del rubro (así las
    // salas en mantenimiento no son todas iguales)
    put(r, "rack", a + 1, Y, 1, 1, "y");
    const SIDE: Partial<Record<Theme, string>> = { padel: "vitrine", gym: "dumbbells", inmobiliaria: "cabinet", phones: "boxes", carta: "espresso", yoga: "plant" };
    put(r, SIDE[theme] ?? "shelf", a, Y, 1, 1, "y");
  } else if (st === "desarrollo") {
    put(r, "desk2", a, Y, 2, 1, "y");
    put(r, "chair", a, Y + 1, 1, 1, "y");
  } else if (st === "diseno") {
    hang(r, "moodboard", "R", wx, Y, 2);
    put(r, "drafting", a + 1, Y, 1, 1, "y");
    put(r, "stool", a + 1, Y + 1);
  } else if (st === "revision") {
    hang(r, "tv", "R", wx, Y, 3);
    put(r, "sofa", a, Y + 3, 2, 1, "y");
  } else if (st === "descubrimiento") {
    hang(r, "whiteboard", "R", wx, Y, 3);
    put(r, "table", a, Y + 3, 1, 1, "y");
    put(r, "stool", a + 1, Y + 3);
  } else {
    // Pausado: los muebles tapados con sábanas.
    put(r, "sofa", a, Y, 2, 1, "y");
  }
  // La pieza del centro, según el tema (el archivo, la revisión y el
  // descubrimiento ya tienen algo ahí). Va adelante a la izquierda de la
  // alfombra: lo alto tapa lo que tiene atrás en diagonal, y ahí no hay letras.
  if (archive || st === "revision" || st === "descubrimiento") return;
  if (theme === "padel") put(r, "balls", X + 1, Y + 4);
  else if (theme === "gym") put(r, "squatrack", X + 1, left ? Y + 3 : Y + 4, 2, 1, "y"); // en las de la derecha, lejos de la puerta
  else if (theme === "yoga") put(r, "yogaprops", X + 1, Y + 4);
  else if (theme !== "studio") put(r, theme === "mate" ? "matetable" : theme === "inmobiliaria" ? "maquette" : theme === "clima" ? "globe" : theme === "phones" ? "phonetable" : "cafetable", X + 2, Y + 3);
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
