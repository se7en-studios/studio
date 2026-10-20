// Los muñecos de «En vivo» en clave de dibujo animado: cabeza grande, ojos
// redondos, contorno de tinta y colores planos con una sombra. Son propios (no
// copian ninguna serie): Federico con el flequillo desordenado, camisa blanca
// y corbata negra; Franco con el pelo negro de flequillo recto, sweater beige y
// el cuello de la camisa; el guía con la remera violeta del estudio, gorra y
// credencial; las visitas, cada una con su ropa (sale de su id).
//
// Se dibujan mirando a la derecha y de frente (SE) o de espaldas (NE), con los
// pies en (0, 0); el arte (art.ts) espeja para SW/NW y guarda cada pose en un
// lienzo chico a la escala de la pantalla, así en cada cuadro es una sola copia.
// La parte de los looks es pura (sin DOM): la revisa scripts/check-oficinas.mjs.

export type Who = "federico" | "franco";
/** Quién se dibuja: un socio, el guía o una visita (`v:` y su id). */
export type ActorLook = Who | "guia" | `v:${string}`;
export type HairStyle = "federico" | "franco" | "cap" | "long" | "bun" | "afro" | "buzz" | "short" | "side";

export type ToonLook = {
  style: HairStyle;
  hair: string;
  hair2: string;
  skin: string;
  skin2: string;
  main: string;
  shade: string;
  /** Cuello de la camisa (null = remera, sin cuello). */
  collar: string | null;
  tie: string | null;
  pants: string;
  shoes: string;
  /** Manga larga (camisa, sweater) o corta (remera). */
  sleeves: "long" | "short";
  /** Sweater: los puños y la cintura con elástico. */
  knit?: boolean;
  /** Sonríe con los dientes (Federico). */
  grin?: boolean;
  glasses?: boolean;
  beard?: boolean;
  phones?: string;
  pack?: string;
  stripes?: string;
  /** La credencial del estudio colgada del cuello (el guía). */
  badge?: boolean;
};

/**
 * La pose: de espaldas, el paso (0–3, null = quieto), sentado, tipeando (0/1),
 * saludando (0/1), hablando (0/1), con el celular o parpadeando.
 */
export type ToonPose = {
  back: boolean;
  walk: number | null;
  sit: boolean;
  type: 0 | 1 | null;
  wave: 0 | 1 | null;
  talk: 0 | 1 | null;
  phone: boolean;
  blink: boolean;
};

export const INK = "#0c0a14";
/** Lo que ocupa un muñeco desde los pies, en px del mundo (con el brazo levantado y la sombra). */
export const TOON_BOX = { x0: -20, x1: 20, y0: -70, y1: 6 };
/** Lo mismo para el gato. */
export const CAT_BOX = { x0: -17, x1: 17, y0: -24, y1: 5 };

// --- Looks ----------------------------------------------------------------------

const LOOKS: Record<Who | "guia", ToonLook> = {
  federico: {
    style: "federico", hair: "#5b3a22", hair2: "#8c5c37", skin: "#f0c39c", skin2: "#d89f78",
    main: "#f6f5fb", shade: "#d6d4e4", collar: "#ffffff", tie: "#15141b", pants: "#23222e", shoes: "#121118",
    sleeves: "long", grin: true,
  },
  franco: {
    style: "franco", hair: "#141318", hair2: "#3b3a46", skin: "#dba67f", skin2: "#bd8660",
    main: "#d8c98f", shade: "#b9aa70", collar: "#fbfaf6", tie: null, pants: "#2a2d3a", shoes: "#121118",
    sleeves: "long", knit: true,
  },
  guia: {
    style: "cap", hair: "#ff4d2e", hair2: "#0b0b0c", skin: "#cf966f", skin2: "#b07650",
    main: "#1e1e21", shade: "#151517", collar: null, tie: null, pants: "#3d3d43", shoes: "#f2eee6",
    sleeves: "short", badge: true,
  },
};

const SKINS: [string, string][] = [["#f4cfad", "#dcae88"], ["#ecbf98", "#d39e77"], ["#d9a57e", "#bd8661"], ["#bd8259", "#9e6643"], ["#8f5d3d", "#74482d"], ["#6c422a", "#55331f"]];
const HAIRS: [string, string][] = [["#17161c", "#3a3946"], ["#3f2919", "#6d4831"], ["#7b4b25", "#a36b3c"], ["#d9b56c", "#f1d394"], ["#bcb8c4", "#e0dce8"], ["#a4362c", "#cb5743"]];
/** Ropa de las visitas: tonos que conviven con la paleta del estudio. */
// Sin blanco ni beige: una visita no se tiene que confundir con un socio
const SHIRTS = ["#4f7fd0", "#3a9e7d", "#d9a441", "#d65a5a", "#2f3346", "#d97fae", "#47aeb0", "#7f8f45", "#3f6e8c", "#c46a3a"];
const PANTS = ["#23222e", "#2d3a5c", "#4a3c2c", "#565c66", "#1f3a33", "#3a2f52"];

const hash = (x: number, y: number) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1, 7), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 - k)))).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
};

const cache = new Map<string, ToonLook>();
function visitorLook(id: string): ToonLook {
  let n = 0;
  for (let i = 0; i < id.length; i++) n = (Math.imul(n, 31) + id.charCodeAt(i)) | 0;
  const pick = <T,>(arr: T[], k: number) => arr[Math.floor(hash(n, k) * arr.length)];
  const odds = (k: number, p: number) => hash(n, k) < p;
  const [skin, skin2] = pick(SKINS, 1), [hair, hair2] = pick(HAIRS, 2), main = pick(SHIRTS, 3);
  // Los peinados de los socios no: si no, una visita parecería Federico o Franco conectado
  const style = pick<HairStyle>(["short", "side", "cap", "long", "long", "bun", "afro", "buzz"], 4);
  const shirt = odds(15, 0.3);
  return {
    style,
    hair: style === "cap" ? pick(SHIRTS, 6) : hair,
    hair2: style === "cap" ? "#f3f1fb" : hair2,
    skin,
    skin2,
    main,
    shade: shade(main, 0.18),
    collar: shirt ? "#f3f1fb" : null,
    tie: null,
    pants: pick(PANTS, 5),
    shoes: hash(n, 7) > 0.5 ? "#f3f1fb" : "#121118",
    sleeves: shirt || odds(16, 0.25) ? "long" : "short",
    glasses: odds(8, 0.3),
    beard: style !== "long" && style !== "bun" && odds(9, 0.25),
    phones: style !== "cap" && odds(10, 0.18) ? pick(["#17161c", "#f3f1fb", "#ff4d2e", "#4f7fd0"], 11) : undefined,
    pack: odds(12, 0.3) ? pick(["#2f3346", "#c4553f", "#3a6b55", "#d9a441"], 13) : undefined,
    stripes: !shirt && odds(14, 0.25) ? "#f3f1fb" : undefined,
  };
}
/** El look de quien sea. El de una visita sale de su id: la misma persona se ve igual en cada señal. */
export function toonLook(who: ActorLook): ToonLook {
  if (!who.startsWith("v:")) return LOOKS[who as Who | "guia"];
  let v = cache.get(who);
  if (!v) cache.set(who, (v = visitorLook(who)));
  return v;
}

// --- Dibujo ---------------------------------------------------------------------

type G = CanvasRenderingContext2D;
const LW = 1.15;

function fillStroke(g: G, fill: string, lw = LW) {
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = lw;
  g.lineJoin = "round";
  g.stroke();
}
function ell(g: G, x: number, y: number, rx: number, ry: number, fill: string, lw: number | null = LW) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  if (lw === null) {
    g.fillStyle = fill;
    g.fill();
  } else fillStroke(g, fill, lw);
}
/** Un brazo o una pierna de fideo: un caño fino con su contorno. */
function limb(g: G, pts: [number, number][], w: number, fill: string) {
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.strokeStyle = INK;
  g.lineWidth = w + LW * 2;
  g.stroke();
  g.strokeStyle = fill;
  g.lineWidth = w;
  g.stroke();
  g.lineCap = "butt";
}
/** La mano: un mitón con el pulgar, como en los dibujos animados. */
function hand(g: G, x: number, y: number, skin: string, up = false) {
  ell(g, x, y, 2.5, 2.3, skin, 1);
  ell(g, x + 1.6, y + (up ? -1.6 : -1), 1, 1.3, skin, 0.9);
}

/**
 * El muñeco entero, mirando a la derecha, con los pies en (0, 0). Estilo
 * sitcom animada: cabeza alta, ojos saltones que se salen del perfil, nariz
 * larga, la mandíbula marcada y brazos y piernas finitos. Colores planos y
 * trazo fino de tinta: es una capa más arriba del fondo.
 */
export function drawToon(g: G, L: ToonLook, p: ToonPose) {
  const f = p.walk;
  const moving = f !== null;
  const bob = moving && f % 2 === 1 ? -1.1 : 0;
  const sy = p.sit ? 11 : 0;
  const by = bob + sy;
  const swing = moving ? [2.8, 0, -2.8, 0][f] : 0;

  if (!p.sit) ell(g, 0, 0, 11, 4, "rgba(11,11,12,0.3)", null);

  // Piernas y zapatos
  if (p.sit) {
    limb(g, [[-2, -5], [6.5, -5], [7, 1]], 4.2, L.pants);
    limb(g, [[2, -5.5], [9.5, -5.5], [10.5, 0.5]], 4.2, L.pants);
    ell(g, 8.6, 1.6, 3.6, 2, L.shoes);
    ell(g, 12, 1.2, 3.6, 2, L.shoes);
  } else {
    for (const side of [-1, 1] as const) {
      const sw = side === -1 ? swing : -swing;
      const up = moving && ((side === -1 && f === 0) || (side === 1 && f === 2)) ? 1.6 : 0;
      const x = side * 2.8 + sw;
      limb(g, [[side * 2.6, -15 + by], [x, -3 - up]], 4.2, L.pants);
      ell(g, x + (p.back ? -0.6 : 1.6), -1.8 - up, 3.9, 2.3, L.shoes);
    }
  }

  if (L.pack && p.back) {
    g.beginPath();
    g.roundRect(-6.5, -31 + by, 13, 14, 3.5);
    fillStroke(g, L.pack);
  }

  // Torso: hombros caídos y un poco de panza
  const top = -33 + by, waist = -15 + by;
  const torso = () => {
    g.beginPath();
    g.moveTo(-6.2, top + 1.5);
    g.quadraticCurveTo(-6.6, top - 0.6, -3.4, top - 0.6);
    g.lineTo(3.8, top - 0.6);
    g.quadraticCurveTo(7.2, top - 0.6, 7, top + 2.4);
    g.quadraticCurveTo(8.6, waist - 6, 7.8, waist);
    g.lineTo(-7.2, waist);
    g.quadraticCurveTo(-7.6, waist - 7, -6.2, top + 1.5);
    g.closePath();
  };
  torso();
  g.fillStyle = L.main;
  g.fill();
  g.save();
  torso();
  g.clip();
  if (L.stripes) {
    g.fillStyle = L.stripes;
    for (let yy = top + 4; yy < waist; yy += 4.2) g.fillRect(-9, yy, 18, 1.5);
  }
  if (L.knit) {
    g.fillStyle = L.shade;
    g.fillRect(-9, waist - 2.4, 18, 2.4);
    g.strokeStyle = L.shade;
    g.lineWidth = 0.55;
    for (let xx = -6; xx < 8; xx += 2) {
      g.beginPath();
      g.moveTo(xx, top + 4);
      g.lineTo(xx, waist - 3);
      g.stroke();
    }
  }
  g.restore();
  torso();
  g.strokeStyle = INK;
  g.lineWidth = LW;
  g.lineJoin = "round";
  g.stroke();

  if (!p.back) {
    if (L.collar) {
      for (const [a, b, c2] of [[[-3.6, top - 0.8], [1, top + 3.8], [-3.8, top + 2.6]], [[5.2, top - 0.8], [1, top + 3.8], [5.6, top + 2.4]]] as [number, number][][]) {
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.lineTo(c2[0], c2[1]);
        g.closePath();
        fillStroke(g, L.collar, 0.9);
      }
    }
    if (L.tie) {
      g.beginPath();
      g.moveTo(0.1, top + 3.4);
      g.lineTo(2, top + 3.4);
      g.lineTo(2.6, waist - 2.6);
      g.lineTo(1, waist - 0.6);
      g.lineTo(-0.6, waist - 2.6);
      g.closePath();
      fillStroke(g, L.tie, 0.9);
    }
    if (L.badge) {
      g.strokeStyle = "#f2eee6";
      g.lineWidth = 0.8;
      g.beginPath();
      g.moveTo(-2.4, top);
      g.lineTo(-0.8, top + 8.5);
      g.lineTo(1.6, top);
      g.stroke();
      g.beginPath();
      g.roundRect(-3.2, top + 8, 4.8, 6, 0.8);
      fillStroke(g, "#f2eee6", 0.9);
      g.fillStyle = "#ff4d2e";
      g.fillRect(-2.7, top + 8.6, 3.8, 1.6);
    }
    if (L.pack) {
      g.strokeStyle = L.pack;
      g.lineWidth = 1.8;
      for (const x of [-4.6, 5.4]) {
        g.beginPath();
        g.moveTo(x, top);
        g.lineTo(x * 1.05, waist - 1);
        g.stroke();
      }
    }
  }

  // Brazos de fideo
  const sleeve = L.sleeves === "long" ? L.main : L.skin;
  const shoulderY = top + 2.6;
  const arm = (side: -1 | 1, h: [number, number], elbow?: [number, number], up = false) => {
    const sh: [number, number] = [side * 6, shoulderY];
    const pts: [number, number][] = elbow ? [sh, elbow, h] : [sh, h];
    limb(g, pts, 3.3, sleeve);
    if (L.sleeves === "short") {
      const mid: [number, number] = elbow ?? [(sh[0] + h[0]) / 2, (sh[1] + h[1]) / 2];
      limb(g, [sh, [sh[0] + (mid[0] - sh[0]) * 0.45, sh[1] + (mid[1] - sh[1]) * 0.45]], 4.4, L.main);
    } else if (L.knit) {
      const prev = pts[pts.length - 2];
      limb(g, [[h[0] + (prev[0] - h[0]) * 0.2, h[1] + (prev[1] - h[1]) * 0.2], h], 3.6, L.shade);
    }
    hand(g, h[0], h[1], L.skin, up);
  };
  const aSwing = moving ? -swing * 1.1 : 0;
  if (p.sit && p.type !== null) {
    const k = p.type ? 1 : -1;
    arm(-1, [8, -21 + sy + k * 0.8], [-4.5, -22 + sy]);
    arm(1, [12.5, -21 + sy - k * 0.8], [8.5, -20 + sy]);
  } else if (p.phone && !p.back) {
    arm(-1, [-8.4 + aSwing, waist - 1]);
    arm(1, [6.4, top + 7.6], [8.6, top + 13]);
    g.beginPath();
    g.roundRect(3.8, top + 1.6, 4.4, 7.4, 1);
    fillStroke(g, "#1e1e21", 1);
    g.fillStyle = "#ffb199";
    g.fillRect(4.6, top + 2.5, 2.8, 5.2);
  } else {
    arm(-1, [-8.6 + aSwing, waist - 0.5]);
    if (p.wave !== null) arm(1, [12.5 + p.wave * 1.6, top - 9 - p.wave * 1.2], [10.5, top + 0.5], true);
    else arm(1, [8.8 - aSwing, waist - 0.5]);
  }

  // Cuello finito y la cabeza
  const hy = -47 + by;
  g.beginPath();
  g.rect(-1.6, top - 4.5, 4.4, 5);
  g.fillStyle = L.skin;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(-1.6, top - 4.5);
  g.lineTo(-1.6, top);
  g.moveTo(2.8, top - 4.5);
  g.lineTo(2.8, top);
  g.stroke();
  if (L.style === "long" || L.style === "bun") backHair(g, L, hy, p.back);
  if (p.back) {
    headBack(g, L, hy);
    hairBack(g, L, hy);
    return;
  }
  head(g, L, hy);
  hairFront(g, L, hy);
  face(g, L, hy, p);
  if (L.phones) {
    g.strokeStyle = L.phones;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, hy - 2, 11.6, Math.PI * 1.05, Math.PI * 1.85);
    g.stroke();
    ell(g, -4.6, hy + 0.6, 2.6, 3.6, L.phones, 1);
  }
}

/** La cabeza de perfil a tres cuartos: nuca redonda, frente alta y la mandíbula que sale para adelante. */
function headPath(g: G, hy: number) {
  g.beginPath();
  g.moveTo(-7.8, hy + 4);
  g.bezierCurveTo(-9.6, hy - 2, -9.4, hy - 10, -5.6, hy - 13.4);
  g.bezierCurveTo(-1.6, hy - 16.4, 6.4, hy - 15.4, 9, hy - 10.6);
  g.lineTo(10.4, hy - 1);
  g.bezierCurveTo(13.6, hy + 1.4, 13.8, hy + 8, 10.6, hy + 10);
  g.bezierCurveTo(7.4, hy + 11.8, 1.4, hy + 11.2, -1.6, hy + 8.6);
  g.bezierCurveTo(-3.6, hy + 7, -6, hy + 6.2, -7.8, hy + 4);
  g.closePath();
}
function head(g: G, L: ToonLook, hy: number) {
  headPath(g, hy);
  fillStroke(g, L.skin);
  // La oreja, atrás
  ell(g, -4.8, hy + 0.8, 2.4, 3.2, L.skin, 1);
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.beginPath();
  g.arc(-4.6, hy + 0.9, 1.2, Math.PI * 0.6, Math.PI * 1.5);
  g.stroke();
}
function headBack(g: G, L: ToonLook, hy: number) {
  g.beginPath();
  g.moveTo(-8.6, hy + 4);
  g.bezierCurveTo(-10.4, hy - 4, -9, hy - 13.6, 0, hy - 14.8);
  g.bezierCurveTo(9, hy - 13.6, 10.4, hy - 4, 8.6, hy + 4);
  g.bezierCurveTo(6, hy + 9.4, -6, hy + 9.4, -8.6, hy + 4);
  g.closePath();
  fillStroke(g, L.skin);
  for (const x of [-9.2, 9.2]) ell(g, x, hy + 0.6, 2, 3, L.skin, 1);
}

function face(g: G, L: ToonLook, hy: number, p: ToonPose) {
  const down = p.phone ? 1.6 : 0;
  // La boca, en la mandíbula
  const mx = 9.6, my = hy + 6;
  if (p.talk === 1) {
    g.beginPath();
    g.moveTo(mx - 3.4, my - 1);
    g.quadraticCurveTo(mx + 0.6, my + 5.4, mx + 3.4, my - 1.2);
    g.closePath();
    fillStroke(g, "#3a1626", 1);
    ell(g, mx, my + 1.6, 1.4, 0.7, "#e0607a", null);
  } else if (L.grin) {
    g.beginPath();
    g.moveTo(mx - 3.8, my - 1.2);
    g.quadraticCurveTo(mx, my - 0.2, mx + 3.4, my - 1.6);
    g.quadraticCurveTo(mx + 0.4, my + 4, mx - 3.8, my - 1.2);
    fillStroke(g, "#ffffff", 1);
  } else {
    g.beginPath();
    g.moveTo(mx - 3.4, my - 0.6);
    g.quadraticCurveTo(mx, my + 2.4, mx + 3, my - 1.2);
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    g.lineCap = "round";
    g.stroke();
    g.lineCap = "butt";
  }
  if (L.beard) {
    g.beginPath();
    g.moveTo(-1.4, hy + 3);
    g.bezierCurveTo(2, hy + 4, 9, hy + 2.6, 12.4, hy + 3);
    g.bezierCurveTo(13.6, hy + 8, 11, hy + 11, 6, hy + 11);
    g.bezierCurveTo(2, hy + 11, -1, hy + 9.6, -1.4, hy + 3);
    g.closePath();
    g.fillStyle = L.hair;
    g.globalAlpha = 0.85;
    g.fill();
    g.globalAlpha = 1;
  }
  // La nariz larga, para adelante
  g.beginPath();
  g.moveTo(9, hy - 2);
  g.bezierCurveTo(12, hy - 2.6, 15.6, hy - 1.4, 15.2, hy + 1);
  g.bezierCurveTo(14.8, hy + 2.8, 11.6, hy + 2.8, 9.6, hy + 2);
  fillStroke(g, L.skin, 1.05);
  // Los ojos saltones: el de atrás primero, el de adelante se sale del perfil
  for (const [ex, ey, r] of [[3.4, hy - 5.4, 4.3], [8.8, hy - 5, 4.5]] as [number, number, number][]) {
    ell(g, ex, ey, r, r, "#ffffff", 1.05);
    if (p.blink) {
      // Los párpados bajan: la mitad de arriba del color de la piel
      g.save();
      g.beginPath();
      g.arc(ex, ey, r - 0.5, 0, Math.PI * 2);
      g.clip();
      g.fillStyle = L.skin;
      g.fillRect(ex - r, ey - r, r * 2, r + 0.6);
      g.restore();
      g.strokeStyle = INK;
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(ex - r + 0.4, ey + 0.6);
      g.lineTo(ex + r - 0.4, ey + 0.6);
      g.stroke();
    } else ell(g, ex + 1.4, ey + 0.4 + down, 1.15, 1.25, INK, null);
  }
  if (L.glasses) {
    g.strokeStyle = INK;
    g.lineWidth = 1.1;
    for (const [ex, ey, r] of [[3.4, hy - 5.4, 5.2], [8.8, hy - 5, 5.4]] as [number, number, number][]) {
      g.beginPath();
      g.arc(ex, ey, r, 0, Math.PI * 2);
      g.stroke();
    }
  }
}

/** El pelo, de frente. Lo que define a cada uno es el flequillo. */
function hairFront(g: G, L: ToonLook, hy: number) {
  const H = L.hair, H2 = L.hair2;
  g.beginPath();
  switch (L.style) {
    case "federico": {
      // Castaño y desordenado, con puntas para arriba y el flequillo para adelante
      g.moveTo(-8.2, hy + 2);
      g.lineTo(-9.4, hy - 6);
      g.lineTo(-8.6, hy - 12.4);
      g.lineTo(-7.4, hy - 16.6);
      g.lineTo(-4.4, hy - 15.4);
      g.lineTo(-2.4, hy - 19.4);
      g.lineTo(0.6, hy - 16);
      g.lineTo(3.6, hy - 19.6);
      g.lineTo(5.4, hy - 15.4);
      g.lineTo(9.2, hy - 17.2);
      g.lineTo(9.4, hy - 12.6);
      g.lineTo(12.8, hy - 11);
      g.lineTo(9.6, hy - 9);
      g.lineTo(7, hy - 10.4);
      g.lineTo(4.6, hy - 8.6);
      g.lineTo(2, hy - 10.6);
      g.lineTo(-0.6, hy - 9);
      g.lineTo(-3.6, hy - 6.6);
      g.lineTo(-5.4, hy - 2.4);
      g.closePath();
      fillStroke(g, H);
      g.strokeStyle = H2;
      g.lineWidth = 1.1;
      g.lineCap = "round";
      for (const [x0, y0, x1, y1] of [[-5.6, -11, -2.6, -14], [1.4, -12.4, 4.2, -15.2]]) {
        g.beginPath();
        g.moveTo(x0, hy + y0);
        g.lineTo(x1, hy + y1);
        g.stroke();
      }
      g.lineCap = "butt";
      break;
    }
    case "franco": {
      // Negro, con volumen arriba, el flequillo recto y los costados rebajados
      g.moveTo(-8.6, hy + 1);
      g.bezierCurveTo(-10.6, hy - 6, -9.6, hy - 15, -3, hy - 17.4);
      g.bezierCurveTo(2, hy - 19.4, 9.6, hy - 17.4, 11.4, hy - 11.6);
      g.lineTo(11.6, hy - 8.6);
      g.lineTo(-1.4, hy - 8.4);
      g.lineTo(-3.8, hy - 6.4);
      g.lineTo(-6.2, hy - 1.6);
      g.closePath();
      fillStroke(g, H);
      g.strokeStyle = H2;
      g.lineWidth = 1;
      for (const [x, y] of [[-5.6, -13.4], [-1, -15.4], [3.8, -15.2], [8, -13], [-3, -11], [1.8, -11.6], [6.2, -10.6]]) {
        g.beginPath();
        g.arc(x, hy + y, 1.5, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
      break;
    }
    case "cap": {
      // Gorra con la visera para adelante
      g.moveTo(-8.8, hy - 4);
      g.bezierCurveTo(-9.6, hy - 14, -2, hy - 17.6, 3, hy - 16.6);
      g.bezierCurveTo(8.6, hy - 15.6, 10.4, hy - 11, 10.2, hy - 8.4);
      g.lineTo(-8.8, hy - 6);
      g.closePath();
      fillStroke(g, H);
      g.beginPath();
      g.moveTo(8, hy - 9.4);
      g.quadraticCurveTo(15.6, hy - 10.4, 17.4, hy - 7.6);
      g.quadraticCurveTo(12.6, hy - 6.6, 7.4, hy - 7.6);
      g.closePath();
      fillStroke(g, shade(H, 0.22), 1.05);
      ell(g, 1, hy - 12, 2.2, 2.2, H2, 0.9);
      break;
    }
    case "long":
    case "bun":
    case "short":
    case "side": {
      g.moveTo(-8.6, hy + 2);
      g.bezierCurveTo(-10.6, hy - 6, -9.4, hy - 15, -2.4, hy - 16.6);
      g.bezierCurveTo(4.6, hy - 17.8, 10.6, hy - 14.6, 11, hy - 8.4);
      if (L.style === "side") {
        g.lineTo(8.6, hy - 9.6);
        g.quadraticCurveTo(2.6, hy - 12.6, -2.6, hy - 7.4);
      } else g.quadraticCurveTo(4, hy - 10.6, -2.6, hy - 8.4);
      g.lineTo(-5.6, hy - 2.4);
      g.closePath();
      fillStroke(g, H);
      if (L.style === "bun") ell(g, -3.6, hy - 17.4, 4.6, 3.8, H, LW);
      break;
    }
    case "afro":
      cloud(g, [[-7.6, -6, 6.4], [-4.6, -13.6, 7], [2.4, -16, 7.4], [8.6, -12.6, 6], [-8.4, 1, 4.4]], hy, H);
      break;
    case "buzz": {
      g.moveTo(-8.4, hy - 1);
      g.bezierCurveTo(-9.4, hy - 10, -4, hy - 15.4, 1, hy - 15);
      g.bezierCurveTo(6.6, hy - 14.6, 9.8, hy - 11.4, 9.8, hy - 8.8);
      g.quadraticCurveTo(2, hy - 10.6, -4.4, hy - 6.4);
      g.closePath();
      g.fillStyle = H;
      g.globalAlpha = 0.85;
      g.fill();
      g.globalAlpha = 1;
      break;
    }
  }
}

/** Una nube de círculos con un solo contorno por fuera (el afro): primero la tinta un poco más grande, después el pelo. */
function cloud(g: G, blobs: [number, number, number][], hy: number, fill: string) {
  for (const [col, k] of [[INK, LW], [fill, 0]] as [string, number][]) {
    g.beginPath();
    for (const [x, y, r] of blobs) {
      g.moveTo(x + r + k, hy + y);
      g.arc(x, hy + y, r + k, 0, Math.PI * 2);
    }
    g.fillStyle = col;
    g.fill();
  }
}

/** El pelo largo va también por detrás de la cabeza. */
function backHair(g: G, L: ToonLook, hy: number, back: boolean) {
  g.beginPath();
  g.roundRect(-13, hy - 12, 26, back ? 30 : 27, [11, 11, 4, 4]);
  fillStroke(g, L.hair);
}

/** El pelo visto de atrás. */
function hairBack(g: G, L: ToonLook, hy: number) {
  const H = L.hair;
  g.beginPath();
  switch (L.style) {
    case "federico":
      g.moveTo(-11.8, hy + 4);
      g.quadraticCurveTo(-13.8, hy - 12, 0, hy - 16.4);
      g.quadraticCurveTo(13.8, hy - 12, 11.8, hy + 4);
      g.lineTo(9, hy + 2.4);
      g.lineTo(6, hy + 5.4);
      g.lineTo(3, hy + 3);
      g.lineTo(0, hy + 6);
      g.lineTo(-3, hy + 3);
      g.lineTo(-6, hy + 5.4);
      g.lineTo(-9, hy + 2.4);
      g.closePath();
      fillStroke(g, H);
      break;
    case "franco":
      g.moveTo(-11.6, hy - 1);
      g.quadraticCurveTo(-13.4, hy - 13, -6, hy - 16.8);
      g.quadraticCurveTo(0.5, hy - 19.6, 7, hy - 16.8);
      g.quadraticCurveTo(13.4, hy - 13, 11.6, hy - 1);
      g.quadraticCurveTo(0, hy + 1.4, -11.6, hy - 1);
      g.closePath();
      fillStroke(g, H);
      g.fillStyle = "rgba(40,30,36,0.55)";
      g.fillRect(-10, hy, 20, 5);
      break;
    case "cap":
      g.moveTo(-11.8, hy - 1);
      g.quadraticCurveTo(-12.4, hy - 15.6, 0.5, hy - 15.8);
      g.quadraticCurveTo(12.6, hy - 15.6, 12, hy - 1);
      g.closePath();
      fillStroke(g, H);
      g.beginPath();
      g.rect(-3, hy - 2.4, 6, 2.4);
      fillStroke(g, L.hair2, 1);
      break;
    case "afro":
      cloud(g, [[-9, -5, 7], [-6, -13, 7], [1, -16, 7.5], [8, -12, 7], [10, -4, 6.5], [0, -6, 8]], hy, H);
      break;
    case "buzz":
      g.roundRect(-11.5, hy - 13.6, 23, 17, [10.5, 10.5, 6, 6]);
      fillStroke(g, H, 1.2);
      break;
    case "short":
    case "side":
      g.roundRect(-12.2, hy - 15.2, 24.4, 20, [11, 11, 6, 6]);
      fillStroke(g, H);
      break;
    default:
      g.roundRect(-12.6, hy - 14.6, 25.2, 30, [11, 11, 5, 5]);
      fillStroke(g, H);
      if (L.style === "bun") ell(g, 0.5, hy - 16.4, 5, 4.2, H, LW);
  }
}

// --- El gato del estudio ----------------------------------------------------------

/** El gato del estudio (negro, de pechera y patas blancas, collar violeta), mirando a la derecha. `frame` 0/1 es el paso. */
export function drawCat(g: G, frame: 0 | 1 | "sleep" | "sit") {
  const BLACK = "#22202c", WHITE = "#f3f1fb";
  ell(g, 0, 0.5, 11, 3.6, "rgba(6,4,16,0.3)", null);
  if (frame === "sleep") {
    // Hecho un ovillo, con la cola por delante
    ell(g, -1, -5.4, 11, 6, BLACK);
    g.beginPath();
    g.moveTo(-10, -2.4);
    g.quadraticCurveTo(-2, 2.4, 9.6, -1.8);
    g.strokeStyle = INK;
    g.lineWidth = 5.4;
    g.lineCap = "round";
    g.stroke();
    g.strokeStyle = BLACK;
    g.lineWidth = 2.4;
    g.stroke();
    g.lineCap = "butt";
    ell(g, 7.5, -6.6, 5.2, 4.6, BLACK);
    for (const [x0, x1] of [[4.2, 6.4], [8.6, 10.8]]) {
      g.beginPath();
      g.moveTo(x0, -9.6);
      g.lineTo((x0 + x1) / 2, -13.6);
      g.lineTo(x1, -9.6);
      g.closePath();
      fillStroke(g, BLACK, 1.2);
    }
    g.strokeStyle = WHITE;
    g.lineWidth = 0.9;
    for (const ex of [6, 9.6]) {
      g.beginPath();
      g.arc(ex, -7, 1.1, 0.1 * Math.PI, 0.9 * Math.PI);
      g.stroke();
    }
    ell(g, 7.8, -4.4, 2, 1.2, WHITE, null);
    return;
  }
  const step = frame === 1 ? 1 : 0;
  // Cola parada con la punta curva
  g.beginPath();
  g.moveTo(-8, -8);
  g.quadraticCurveTo(-14, -12, -12, -19.5);
  g.strokeStyle = INK;
  g.lineWidth = 4.6;
  g.lineCap = "round";
  g.stroke();
  g.strokeStyle = BLACK;
  g.lineWidth = 2;
  g.stroke();
  g.lineCap = "butt";
  // Patas
  if (frame !== "sit") {
    for (const [x, k] of [[-6, step], [-2.6, 1 - step], [4.4, 1 - step], [7.6, step]] as [number, number][]) {
      limb(g, [[x, -6], [x + (k ? 1.4 : -1), -1.4]], 2.6, BLACK);
      ell(g, x + (k ? 1.6 : -0.8), -0.9, 1.9, 1.2, WHITE, 0.9);
    }
  }
  // Cuerpo
  ell(g, 0, frame === "sit" ? -6 : -8.6, frame === "sit" ? 8 : 9.4, 5.4, BLACK);
  ell(g, 6.4, frame === "sit" ? -5 : -7.6, 2.8, 3.4, WHITE, null);
  // Cabeza, orejas y collar
  const hx = 9, hy = frame === "sit" ? -14 : -15;
  g.strokeStyle = "#ff4d2e";
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(hx - 0.6, hy + 2.4, 4.4, 0.2 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  for (const [x0, x1] of [[hx - 5, hx - 1.8], [hx + 0.8, hx + 4.4]]) {
    g.beginPath();
    g.moveTo(x0, hy - 2.6);
    g.lineTo((x0 + x1) / 2 + 0.4, hy - 8);
    g.lineTo(x1, hy - 2.6);
    g.closePath();
    fillStroke(g, BLACK, 1.2);
  }
  ell(g, hx, hy, 5.6, 5, BLACK);
  ell(g, hx + 1.2, hy + 2.2, 2.6, 1.8, WHITE, null);
  for (const ex of [hx - 1.8, hx + 2.4]) {
    ell(g, ex, hy - 0.8, 1.5, 1.8, WHITE, null);
    ell(g, ex + 0.4, hy - 0.6, 0.7, 1.2, INK, null);
  }
  ell(g, hx + 1.4, hy + 1.2, 0.8, 0.6, "#e07a9a", null);
}
