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
    style: "cap", hair: "#2a2238", hair2: "#8b5cf6", skin: "#cf966f", skin2: "#b07650",
    main: "#7c4dff", shade: "#5f35d6", collar: null, tie: null, pants: "#262a3c", shoes: "#f3f1fb",
    sleeves: "short", badge: true,
  },
};

const SKINS: [string, string][] = [["#f4cfad", "#dcae88"], ["#ecbf98", "#d39e77"], ["#d9a57e", "#bd8661"], ["#bd8259", "#9e6643"], ["#8f5d3d", "#74482d"], ["#6c422a", "#55331f"]];
const HAIRS: [string, string][] = [["#17161c", "#3a3946"], ["#3f2919", "#6d4831"], ["#7b4b25", "#a36b3c"], ["#d9b56c", "#f1d394"], ["#bcb8c4", "#e0dce8"], ["#a4362c", "#cb5743"]];
/** Ropa de las visitas: tonos que conviven con la paleta del estudio. */
// Sin blanco ni beige: una visita no se tiene que confundir con un socio
const SHIRTS = ["#4f7fd0", "#3a9e7d", "#d9a441", "#8f63d6", "#d65a5a", "#2f3346", "#d97fae", "#47aeb0", "#7f8f45", "#5b5bd6", "#c46a3a"];
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
    phones: style !== "cap" && odds(10, 0.18) ? pick(["#17161c", "#f3f1fb", "#8b5cf6", "#4f7fd0"], 11) : undefined,
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
const LW = 1.6;

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
/** Un brazo o una pierna: un caño redondeado con su contorno. */
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

/** El muñeco entero, mirando a la derecha, con los pies en (0, 0). */
export function drawToon(g: G, L: ToonLook, p: ToonPose) {
  const f = p.walk;
  const moving = f !== null;
  // Al dar el paso el cuerpo sube un poco; sentado, baja hasta la silla
  const lift = moving && f % 2 === 1 ? -1.2 : 0;
  const sy = p.sit ? 10 : 0;
  const by = lift + sy;
  const swing = moving ? [2.4, 0, -2.4, 0][f] : 0;

  // Sombra
  if (!p.sit) ell(g, 0, 0, 12.5, 4.6, "rgba(6,4,16,0.32)", null);

  // Piernas y zapatos
  if (p.sit) {
    // Sentado: los muslos para adelante y las piernas colgando (la mesa las tapa casi siempre)
    limb(g, [[-2.5, -7], [6.5, -6.5], [7.5, 1]], 5.4, L.pants);
    limb(g, [[2.5, -7.5], [10, -7], [11, 0.5]], 5.4, L.pants);
    ell(g, 9, 1.8, 4, 2.2, L.shoes);
    ell(g, 12.5, 1.4, 4, 2.2, L.shoes);
  } else {
    const back = p.back;
    for (const side of [-1, 1] as const) {
      const sw = side === -1 ? swing : -swing;
      const up = moving && ((side === -1 && f === 0) || (side === 1 && f === 2)) ? 1.6 : 0;
      const x = side * 3.3 + sw;
      limb(g, [[side * 3.1, -16 + by], [x, -3.2 - up]], 5.6, L.pants);
      ell(g, x + (back ? -0.6 : 1.3), -1.7 - up, 4.3, 2.5, L.shoes);
    }
  }

  // Mochila (de frente se ven las tiras; de espaldas, la mochila)
  if (L.pack && p.back) {
    g.beginPath();
    g.roundRect(-7.5, -34 + by, 15, 16, 4);
    fillStroke(g, L.pack);
  }

  // Torso
  const top = -35.5 + by, waist = -16.5 + by;
  const torso = () => {
    g.beginPath();
    g.moveTo(-9.6, top + 4);
    g.quadraticCurveTo(-9.8, top, -5.5, top);
    g.lineTo(5.5, top);
    g.quadraticCurveTo(9.8, top, 9.6, top + 4);
    g.lineTo(8.2, waist);
    g.lineTo(-8.2, waist);
    g.closePath();
  };
  torso();
  g.fillStyle = L.main;
  g.fill();
  g.save();
  torso();
  g.clip();
  // Volumen: el costado de atrás en sombra
  g.fillStyle = L.shade;
  if (p.back) g.fillRect(-10, top, 6, 30);
  else g.fillRect(3.5, top, 7, 30);
  if (L.stripes) {
    g.fillStyle = L.stripes;
    for (let yy = top + 6; yy < waist; yy += 4.5) g.fillRect(-10, yy, 20, 1.6);
  }
  if (L.knit) {
    g.fillStyle = L.shade;
    g.fillRect(-10, waist - 2.6, 20, 2.6);
    g.strokeStyle = shade(L.main, 0.12);
    g.lineWidth = 0.6;
    for (let xx = -8; xx < 9; xx += 2.2) {
      g.beginPath();
      g.moveTo(xx, top + 6);
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
    // Cuello de la camisa y corbata
    if (L.collar) {
      g.beginPath();
      g.moveTo(-4.4, top - 0.4);
      g.lineTo(0.8, top + 4.6);
      g.lineTo(-1.6, top + 6.2);
      g.lineTo(-5.8, top + 1.2);
      g.closePath();
      fillStroke(g, L.collar, 1.1);
      g.beginPath();
      g.moveTo(5.6, top - 0.4);
      g.lineTo(0.8, top + 4.6);
      g.lineTo(3.4, top + 6.2);
      g.lineTo(7, top + 1.2);
      g.closePath();
      fillStroke(g, L.collar, 1.1);
    }
    if (L.tie) {
      g.beginPath();
      g.moveTo(-0.6, top + 4.4);
      g.lineTo(2.2, top + 4.4);
      g.lineTo(2.9, waist - 3);
      g.lineTo(0.8, waist - 0.6);
      g.lineTo(-1.3, waist - 3);
      g.closePath();
      fillStroke(g, L.tie, 1);
    }
    if (L.badge) {
      g.strokeStyle = "#f3f1fb";
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-3.2, top + 0.5);
      g.lineTo(-1.4, top + 10);
      g.lineTo(1.2, top + 0.5);
      g.stroke();
      g.beginPath();
      g.roundRect(-3.9, top + 9.6, 5.2, 6.6, 1);
      fillStroke(g, "#f3f1fb", 1);
      g.fillStyle = "#8b5cf6";
      g.fillRect(-3.4, top + 10.2, 4.2, 1.6);
    }
    if (L.pack) {
      g.strokeStyle = L.pack;
      g.lineWidth = 2;
      for (const x of [-6.2, 6.6]) {
        g.beginPath();
        g.moveTo(x, top + 0.5);
        g.lineTo(x * 0.92, waist - 1);
        g.stroke();
      }
    }
  }

  // Brazos
  const sleeve = L.sleeves === "long" ? L.main : L.skin;
  const shoulderY = top + 3.5;
  const arm = (side: -1 | 1, hand: [number, number], elbow?: [number, number]) => {
    const sh: [number, number] = [side * 8.6, shoulderY];
    const pts: [number, number][] = elbow ? [sh, elbow, hand] : [sh, hand];
    if (L.sleeves === "short") {
      // La manga corta: el primer tramo con la remera
      const mid: [number, number] = elbow ?? [(sh[0] + hand[0]) / 2, (sh[1] + hand[1]) / 2];
      limb(g, pts, 5, L.skin);
      limb(g, [sh, [sh[0] + (mid[0] - sh[0]) * 0.55, sh[1] + (mid[1] - sh[1]) * 0.55]], 5.6, L.main);
    } else {
      limb(g, pts, 5, sleeve);
      if (L.knit) {
        const k: [number, number] = [hand[0] + (pts[pts.length - 2][0] - hand[0]) * 0.22, hand[1] + (pts[pts.length - 2][1] - hand[1]) * 0.22];
        limb(g, [k, hand], 4.2, L.shade);
      }
    }
    ell(g, hand[0], hand[1], 2.7, 2.7, L.skin, 1.2);
  };
  const aSwing = moving ? -swing * 1.1 : 0;
  if (p.sit && p.type !== null) {
    const k = p.type ? 1 : -1;
    arm(-1, [8, -24 + sy + k * 0.8], [-6, -24 + sy]);
    arm(1, [13.5, -24 + sy - k * 0.8], [9, -22 + sy]);
  } else if (p.phone && !p.back) {
    arm(-1, [-9.5 + aSwing, waist - 1]);
    arm(1, [6, top + 9], [9.5, top + 15]);
    // El celular, con la pantalla prendida
    g.beginPath();
    g.roundRect(3.4, top + 3.2, 5, 8, 1.2);
    fillStroke(g, "#1b1a24", 1.1);
    g.fillStyle = "#a78bfa";
    g.fillRect(4.3, top + 4.2, 3.2, 5.6);
  } else {
    arm(-1, [-10.2 + aSwing, waist - 1.5]);
    if (p.wave !== null) arm(1, [14 + p.wave * 1.6, top - 9 - p.wave * 1.4], [12, top + 2]);
    else arm(1, [10.2 - aSwing, waist - 1.5]);
  }

  // Cuello y cabeza
  const hy = -49 + by; // centro de la cabeza
  g.beginPath();
  g.rect(-2.8, top - 3.5, 5.8, 4.5);
  g.fillStyle = L.skin2;
  g.fill();
  if (L.style === "long" || L.style === "bun") backHair(g, L, hy, p.back);
  head(g, L, hy);
  if (p.back) {
    ears(g, L, hy, true);
    hairBack(g, L, hy);
    return;
  }
  ears(g, L, hy, false);
  face(g, L, hy, p);
  hairFront(g, L, hy);
  if (L.glasses) {
    g.strokeStyle = INK;
    g.lineWidth = 1.2;
    for (const ex of [-2.2, 5.4]) {
      g.beginPath();
      g.roundRect(ex - 3.3, hy - 2.6, 6.6, 5.6, 1.6);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(1.1, hy - 0.4);
    g.lineTo(2.1, hy - 0.4);
    g.stroke();
  }
  if (L.phones) {
    g.strokeStyle = L.phones;
    g.lineWidth = 2.2;
    g.beginPath();
    g.arc(0.5, hy - 2, 12.6, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    ell(g, -11.5, hy + 0.5, 2.6, 4, L.phones, 1.1);
  }
}

function head(g: G, L: ToonLook, hy: number) {
  g.beginPath();
  g.roundRect(-11.5, hy - 11.5, 23, 23, [10.5, 10.5, 9, 9]);
  fillStroke(g, L.skin);
  // Sombra suave del costado
  g.save();
  g.beginPath();
  g.roundRect(-11.5, hy - 11.5, 23, 23, [10.5, 10.5, 9, 9]);
  g.clip();
  g.fillStyle = L.skin2;
  g.globalAlpha = 0.45;
  g.fillRect(-12, hy + 6.5, 24, 6);
  g.globalAlpha = 1;
  g.restore();
}

function ears(g: G, L: ToonLook, hy: number, back: boolean) {
  if (L.style === "long" || L.style === "afro") return;
  for (const x of back ? [-11.4, 11.4] : [-11.2]) {
    ell(g, x, hy + 1, 2.4, 3.4, L.skin, 1.2);
    ell(g, x, hy + 1, 0.9, 1.6, L.skin2, null);
  }
}

function face(g: G, L: ToonLook, hy: number, p: ToonPose) {
  const look = p.phone ? 0.9 : 0;
  // Ojos grandes, corridos hacia donde mira
  for (const ex of [-2.2, 5.4]) {
    if (p.blink) {
      g.strokeStyle = INK;
      g.lineWidth = 1.4;
      g.beginPath();
      g.arc(ex, hy - 0.6, 2.6, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    } else {
      ell(g, ex, hy - 1, 3, 3.7, "#ffffff", 1.15);
      ell(g, ex + 0.9, hy - 0.4 + look, 1.55, 1.75, INK, null);
      ell(g, ex + 0.4, hy - 1.3 + look, 0.5, 0.5, "#ffffff", null);
    }
  }
  // Cejas
  g.strokeStyle = shade(L.hair, -0.05);
  g.lineCap = "round";
  g.lineWidth = 1.7;
  for (const ex of [-2.2, 5.4]) {
    g.beginPath();
    g.moveTo(ex - 2.4, hy - 6);
    g.lineTo(ex + 2.3, hy - 6.6);
    g.stroke();
  }
  g.lineCap = "butt";
  // Nariz
  g.beginPath();
  g.moveTo(8.2, hy + 0.2);
  g.quadraticCurveTo(10.8, hy + 2.6, 8.4, hy + 3.9);
  g.fillStyle = L.skin2;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 1.05;
  g.stroke();
  // Boca: la sonrisa de siempre, o abierta si está hablando
  const mx = 3.4, my = hy + 6.4;
  if (p.talk !== null && p.talk === 1) {
    ell(g, mx, my + 0.4, 2.6, 2.2, "#3a1626", 1.1);
    ell(g, mx, my + 1.4, 1.5, 0.8, "#e0607a", null);
  } else if (L.grin) {
    g.beginPath();
    g.moveTo(mx - 3.6, my - 0.6);
    g.quadraticCurveTo(mx, my + 0.1, mx + 3.8, my - 0.9);
    g.quadraticCurveTo(mx + 0.4, my + 5, mx - 3.6, my - 0.6);
    fillStroke(g, "#ffffff", 1.1);
  } else {
    g.beginPath();
    g.moveTo(mx - 3, my - 0.5);
    g.quadraticCurveTo(mx + 0.2, my + 2.6, mx + 3.2, my - 0.8);
    g.strokeStyle = INK;
    g.lineWidth = 1.3;
    g.lineCap = "round";
    g.stroke();
    g.lineCap = "butt";
  }
  if (L.beard) {
    g.beginPath();
    g.moveTo(-10.6, hy + 2);
    g.quadraticCurveTo(-9, hy + 12, 1, hy + 11.8);
    g.quadraticCurveTo(10, hy + 11.5, 11, hy + 3);
    g.quadraticCurveTo(8, hy + 9.5, 3.4, hy + 9);
    g.quadraticCurveTo(-4, hy + 9.8, -10.6, hy + 2);
    fillStroke(g, L.hair, 1.1);
  }
}

/** El pelo, de frente. Lo que define a cada uno: el flequillo. */
function hairFront(g: G, L: ToonLook, hy: number) {
  const H = L.hair, H2 = L.hair2;
  g.beginPath();
  switch (L.style) {
    case "federico": {
      // Castaño, con volumen arriba y el flequillo desordenado en puntas
      g.moveTo(-11.8, hy + 3.5);
      g.quadraticCurveTo(-13.6, hy - 9, -6, hy - 14.6);
      g.quadraticCurveTo(2, hy - 17.4, 9, hy - 14);
      g.quadraticCurveTo(13.8, hy - 10, 12.2, hy - 1.5);
      g.lineTo(10.4, hy - 5.6);
      g.lineTo(8.6, hy - 2.6);
      g.lineTo(6.6, hy - 6.4);
      g.lineTo(3.8, hy - 3);
      g.lineTo(1.6, hy - 6.8);
      g.lineTo(-1.6, hy - 3.6);
      g.lineTo(-3.6, hy - 7);
      g.lineTo(-6.8, hy - 4.6);
      g.lineTo(-8.6, hy - 6.6);
      g.lineTo(-10, hy - 2);
      g.closePath();
      fillStroke(g, H);
      g.strokeStyle = H2;
      g.lineWidth = 1.3;
      g.lineCap = "round";
      for (const [x0, y0, x1, y1] of [[-6, -12.4, -1.8, -13.6], [1.6, -14, 6.4, -12.2]]) {
        g.beginPath();
        g.moveTo(x0, hy + y0);
        g.lineTo(x1, hy + y1);
        g.stroke();
      }
      g.lineCap = "butt";
      break;
    }
    case "franco": {
      // Negro, alto y texturado, con el flequillo recto y los costados rebajados
      g.save();
      g.beginPath();
      g.roundRect(-11.5, hy - 11.5, 23, 23, [10.5, 10.5, 9, 9]);
      g.clip();
      g.fillStyle = "rgba(40,30,36,0.55)";
      g.fillRect(-12, hy - 5, 3.4, 8);
      g.restore();
      g.beginPath();
      g.moveTo(-11.4, hy - 3.2);
      g.quadraticCurveTo(-13.2, hy - 10, -9.6, hy - 13.6);
      g.quadraticCurveTo(-8.6, hy - 17.4, -4.6, hy - 16.6);
      g.quadraticCurveTo(-2.4, hy - 19.2, 1.4, hy - 17.8);
      g.quadraticCurveTo(4.6, hy - 19.4, 7.6, hy - 16.6);
      g.quadraticCurveTo(11.6, hy - 16.2, 12.2, hy - 11.6);
      g.quadraticCurveTo(13.8, hy - 7.6, 12, hy - 3.4);
      g.lineTo(11.4, hy - 4.6);
      g.quadraticCurveTo(0.5, hy - 3.2, -10.6, hy - 4.4);
      g.closePath();
      fillStroke(g, H);
      g.strokeStyle = H2;
      g.lineWidth = 1.1;
      for (const [x, y] of [[-6.5, -13.2], [-1.5, -14.6], [3.6, -14.2], [8.2, -12.2], [-3.8, -10], [1.6, -10.6], [6.2, -9.2]]) {
        g.beginPath();
        g.arc(x, hy + y, 1.6, Math.PI * 1.1, Math.PI * 1.9);
        g.stroke();
      }
      break;
    }
    case "cap": {
      // Gorra con visera hacia adelante
      g.moveTo(-11.8, hy - 2);
      g.quadraticCurveTo(-12.4, hy - 15.6, 0.5, hy - 15.8);
      g.quadraticCurveTo(12.6, hy - 15.6, 12, hy - 4.4);
      g.closePath();
      fillStroke(g, H);
      g.beginPath();
      g.moveTo(5, hy - 5.2);
      g.quadraticCurveTo(16, hy - 6.8, 18, hy - 3.4);
      g.quadraticCurveTo(12, hy - 2.2, 5, hy - 3.6);
      g.closePath();
      fillStroke(g, shade(H, 0.25), 1.3);
      ell(g, -1, hy - 10, 2.4, 2.4, H2, 1);
      break;
    }
    case "long":
    case "bun": {
      g.moveTo(-11.8, hy + 2);
      g.quadraticCurveTo(-13, hy - 14, 0.5, hy - 14.6);
      g.quadraticCurveTo(13.4, hy - 14, 12, hy - 2);
      g.quadraticCurveTo(7, hy - 7.6, 1, hy - 6.6);
      g.quadraticCurveTo(-6, hy - 6.4, -11.8, hy + 2);
      g.closePath();
      fillStroke(g, H);
      if (L.style === "bun") ell(g, -1, hy - 16.8, 5, 4.2, H, LW);
      break;
    }
    case "afro":
      cloud(g, [[-10, -6, 6], [-7, -13, 6.5], [0, -16, 7], [7, -13, 6.5], [10.5, -6, 5.6]], hy, H);
      break;
    case "buzz": {
      g.moveTo(-11.4, hy - 2);
      g.quadraticCurveTo(-12, hy - 13.6, 0.5, hy - 13.4);
      g.quadraticCurveTo(12.4, hy - 13.6, 11.8, hy - 2.6);
      g.quadraticCurveTo(0.5, hy - 9, -11.4, hy - 2);
      g.closePath();
      fillStroke(g, H, 1.2);
      break;
    }
    case "short": {
      // Corto y parejo, con el flequillo redondeado
      g.moveTo(-11.8, hy + 1);
      g.quadraticCurveTo(-13.2, hy - 14.6, 0.5, hy - 15.4);
      g.quadraticCurveTo(13.6, hy - 14.6, 12, hy + 0.5);
      g.quadraticCurveTo(11, hy - 6.4, 4, hy - 6.6);
      g.quadraticCurveTo(-4, hy - 5.4, -9.6, hy - 5.6);
      g.quadraticCurveTo(-11, hy - 3, -11.8, hy + 1);
      g.closePath();
      fillStroke(g, H);
      break;
    }
    case "side": {
      // Raya al costado: el pelo cae de derecha a izquierda
      g.moveTo(-11.8, hy + 0.5);
      g.quadraticCurveTo(-13.4, hy - 14.4, -1, hy - 15.6);
      g.quadraticCurveTo(13.2, hy - 15.4, 12.2, hy - 1);
      g.lineTo(10.6, hy - 9.2);
      g.quadraticCurveTo(2, hy - 10.6, -5.4, hy - 4.2);
      g.quadraticCurveTo(-9, hy - 2.4, -11.8, hy + 0.5);
      g.closePath();
      fillStroke(g, H);
      g.strokeStyle = L.hair2;
      g.lineWidth = 1.2;
      g.beginPath();
      g.moveTo(8.6, hy - 13);
      g.quadraticCurveTo(2, hy - 12, -3, hy - 7.4);
      g.stroke();
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
  g.strokeStyle = "#8b5cf6";
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
