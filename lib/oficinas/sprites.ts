// Los muñecos de «En vivo» en pixel art, estilo Habbo: un cuerpo base de 16 ×
// 24 puntos al que se le suman capas (el pelo, la gorra, los anteojos, la
// barba, los auriculares, la mochila, la credencial) y las poses (caminar,
// saludar, el celular, sentado tipeando, los ojos cerrados). Puro, sin DOM:
// art.ts arma cada combinación una vez en un canvas chico y la reusa, y
// scripts/check-oficinas.mjs revisa que los dibujos estén bien armados.
//
// Las letras de los mapas: K contorno · S piel · s piel en sombra · E ojo ·
// M boca · W ropa · w ropa en sombra · X cuello (corbata o cuello de la
// camisa) · A mano · P pantalón · B zapatilla · # pelo · % brillo del pelo ·
// V visera · G marco de anteojos · g vidrio · Q auriculares · Z/z mochila ·
// F/f celular y su pantalla · L/D/O credencial del guía. «.» no cambia nada y
// «_» borra.

/** La grilla: 20 × 27. El cuerpo base va corrido 2 a la derecha y 3 abajo, para que entren el rodete, los rulos y la mano levantada. */
export const SPRITE_W = 20;
export const SPRITE_H = 27;
const BX = 2, BY = 3;

type Layer = { x?: number; y: number; rows: string[] };

const HEAD_FRONT = [
  "................",
  ".....KKKKKK.....",
  "...KKSSSSSSKK...",
  "..KSSSSSSSSSSK..",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSK.",
  "..KsSSSSSSSSSSK.",
  "..KsSSESSSSESSK.",
  ".KssSSESSSSESSK.",
  "..KsSSSSSSSSSSK.",
  "..KsSSSMMMMSSK..",
  "...KssSSSSSSK...",
  "....KKKssKKK....",
];
const HEAD_BACK = [
  "................",
  ".....KKKKKK.....",
  "...KKSSSSSSKK...",
  "..KSSSSSSSSSSK..",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSSKs",
  "..KSSSSSSSSSSSK.",
  "..KSSSSSSSSSSK..",
  "...KSSSSSSSSK...",
  "....KKKssKKK....",
];
const BODY_FRONT = [
  "..KKWWWXXWWWKK..",
  ".KwWWWWXXWWWWWK.",
  ".KwKWWWXXWWWKWK.",
  ".KwKwWWWWWWWKWK.",
  ".KAKwwwwwwwwKAK.",
];
const BODY_BACK = [
  "..KKWWWWWWWWKK..",
  ".KWWWWWWWWWWWwK.",
  ".KWKWWWWWWWWKwK.",
  ".KWKWWWWWWWwKwK.",
  ".KAKwwwwwwwwKAK.",
];
const LEGS_STAND = [
  "..K.KPPPKPPPKK..",
  "....KPPPKPPPK...",
  "....KPPPKPPPK...",
  "...KBBBBKBBBBK..",
  "...KKKKK.KKKKK..",
];
const LEGS_WALK = [
  "..K.KPPPKPPPKK..",
  "...KPPPK.KPPPK..",
  "..KPPPK...KPPPK.",
  ".KBBBBK...KBBBBK",
  ".KKKKK.....KKKKK",
];

/** El pelo de cada peinado, de frente y de espaldas. `y` cuenta desde la primera fila de la cabeza. */
const HAIR: Record<string, { front: Layer[]; back: Layer[] }> = {
  federico: {
    front: [{ y: 1, rows: [".....KKKKKK.....", "...KK######KK...", "..K##%%%#####K..", "..K###########K.", "..K#######..##K.", "..K####.......K.", "..K#..........K."] }],
    back: [{ y: 1, rows: [".....KKKKKK.....", "...KK######KK...", "..K##%%%#####K..", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K##########%K."] }],
  },
  franco: {
    front: [{ y: 0, rows: ["....K.K.K.K.....", "...K#K#K#K#K....", "..K##########K..", "..K##%##%####K..", "..K###########K.", "..K###########K.", "..K#..........K.", "..K#..........K."] }],
    back: [{ y: 0, rows: ["....K.K.K.K.....", "...K#K#K#K#K....", "..K##########K..", "..K##%##%####K..", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K##########%K."] }],
  },
  cap: {
    front: [{ y: 1, rows: ["......KKKK......", "....KK####KK....", "...K###%%###K...", "..K####%%####K..", "..K##########K..", "..KVVVVVVVVVVVVK"] }],
    back: [{ y: 1, rows: ["......KKKK......", "....KK####KK....", "...K########K...", "..K##########K..", "..K##########K..", "..K#VVVVVVVV#K.."] }],
  },
  long: {
    front: [{ y: 1, rows: [".....KKKKKK.....", "...KK######KK...", "..K###%%%#####K.", ".K#############K", ".K#####....####K", ".K##..........#K", ".K##..........#K", ".K#...........#K", ".K#...........#K", ".K#...........#K", ".K##........##K.", ".K###......###K.", ".K####KssK####K."] }],
    back: [{ y: 1, rows: [".....KKKKKK.....", "...KK######KK...", "..K###%%%#####K.", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".K#############K", ".KK###########KK", "...KKKKKKKKKK..."] }],
  },
  bun: {
    front: [{ y: -2, rows: ["......KKK.......", ".....K###K......", ".....K#%#K......", "......KKK.......", "...KK######KK...", "..K##%%######K..", "..K###########K.", "..K###.....###K.", "..K#..........K."] }],
    back: [{ y: -2, rows: ["......KKK.......", ".....K###K......", ".....K#%#K......", "......KKK.......", "...KK######KK...", "..K##%%######K..", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K##########%K."] }],
  },
  afro: {
    front: [{ y: -2, rows: ["...KKK.KK.KKK...", "..K###K##K###K..", ".K############K.", "K##%#####%#####K", "K##############K", "K##############K", "K##############K", "K####......####K", ".K#.........###K", ".K#..........##K", "..K#..........K."] }],
    back: [{ y: -2, rows: ["...KKK.KK.KKK...", "..K###K##K###K..", ".K############K.", "K##%#####%#####K", "K##############K", "K##############K", "K##############K", "K##############K", "K##############K", "K##############K", "K##############K", ".K############K.", "..KK########KK.."] }],
  },
  buzz: {
    front: [{ y: 1, rows: [".....KKKKKK.....", "...KK######KK...", "..K##########K..", "..K#.........#K."] }],
    back: [{ y: 1, rows: [".....KKKKKK.....", "...KK######KK...", "..K##########K..", "..K###########K.", "..K###########K.", "..K###########K.", "..K###########K.", "..K#.........#K."] }],
  },
};

const GLASSES: Layer = { y: 7, rows: ["....GGGG.GGGG...", "..GGGgEGGGgEG...", "....GgEG.GgEG..."] };
const BEARD: Layer = { y: 10, rows: ["...#.........#..", "...####MMMM##...", "....########....", ".....K####K....."] };
const PHONES_FRONT: Layer = { y: 0, rows: [".....QQQQQQ.....", "....Q......Q....", "...Q............", "...Q............", "...Q............", "...Q............", "...Q............", "..Q.............", ".QQ.............", ".QQ.............", ".QQ............."] };
const PHONES_BACK: Layer = { y: 0, rows: [".....QQQQQQ.....", "....Q......Q....", "...........Q....", "............Q...", "............Q...", "............Q...", "............Q...", ".............Q..", "..............QQ", "..............QQ", "..............QQ"] };
const PACK_BACK: Layer = { y: 14, rows: ["....KKKKKKKK....", "....KZZZZZZK....", "....KZzzzzZK....", "....KZZZZZZK....", "....KKKKKKKK...."] };
const PACK_FRONT: Layer = { y: 14, rows: ["....z......z....", "....z......z....", "....z......z....", "....z......z...."] };
const BADGE: Layer = { y: 14, rows: [".......L........", ".......L........", ".......DD.......", ".......DO......."] };

/** El brazo de adelante levantado (dos posiciones de la mano) y el celular frente a la cara. Borran el brazo de abajo. */
const ARM_DOWN_CLEAR = [".............__...", ".............__...", ".............__...", ".............__..."];
const WAVE: Layer[] = [
  { y: 9, rows: ["...............KK.", "..............KAAK", "..............KAAK", "..............KWWK", "..............KWK.", ".............KWWK.", "..............WK..", ...ARM_DOWN_CLEAR] },
  { y: 9, rows: ["..............KK..", ".............KAAK.", ".............KAAK.", "..............KWWK", "..............KWK.", ".............KWWK.", "..............WK..", ...ARM_DOWN_CLEAR] },
];
const PHONE: Layer = { y: 11, rows: [".............KFFK.", ".............KffK.", ".............KffK.", ".............KAAK.", "..............WK..", ...ARM_DOWN_CLEAR] };
const TYPE: Layer[] = [
  { y: 17, rows: [".............A..", ".............K.."] },
  { y: 17, rows: ["..A.............", "..K............."] },
];

export type SpriteLook = {
  style: string;
  hair: string;
  hair2: string;
  skin: string;
  skin2: string;
  main: string;
  shade: string;
  collar: string;
  tie: string | null;
  pants: string;
  shoes: string;
  glasses?: boolean;
  beard?: boolean;
  phones?: string;
  pack?: string;
  stripes?: string;
  badge?: boolean;
};
export type SpritePose = {
  back: boolean;
  /** 0 parado, 1 paso. */
  walk: 0 | 1;
  /** Saludando: qué posición de la mano (null = no saluda). */
  wave: 0 | 1 | null;
  phone: boolean;
  /** Sentado: sin piernas. `type` 0/1: tipeando, con una mano y después la otra. */
  sit: boolean;
  type: 0 | 1 | null;
  blink: boolean;
};

/** Cada punto de la grilla: un color o null (transparente). */
export function composeSprite(L: SpriteLook, p: SpritePose): (string | null)[][] {
  const g: string[][] = Array.from({ length: SPRITE_H }, () => new Array<string>(SPRITE_W).fill("."));
  const put = (layer: Layer) => {
    const x0 = BX + (layer.x ?? 0), y0 = BY + layer.y;
    layer.rows.forEach((row, dy) => {
      const y = y0 + dy;
      if (y < 0 || y >= SPRITE_H) return;
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row[dx], x = x0 + dx;
        if (ch === "." || x < 0 || x >= SPRITE_W) continue;
        g[y][x] = ch;
      }
    });
  };
  const front = !p.back;
  put({ y: 0, rows: front ? HEAD_FRONT : HEAD_BACK });
  put({ y: 14, rows: front ? BODY_FRONT : BODY_BACK });
  if (!p.sit) put({ y: 19, rows: p.walk ? LEGS_WALK : LEGS_STAND });
  if (L.stripes) for (const y of [BY + 15, BY + 17]) g[y] = g[y].map((c) => (c === "W" ? "R" : c));
  if (L.pack) put(front ? PACK_FRONT : PACK_BACK);
  if (L.badge && front) put(BADGE);
  const hair = HAIR[L.style] ?? HAIR.federico;
  for (const layer of front ? hair.front : hair.back) put(layer);
  if (front && L.beard) put(BEARD);
  if (front && L.glasses) put(GLASSES);
  if (L.phones) put(front ? PHONES_FRONT : PHONES_BACK);
  if (p.wave !== null) put(WAVE[p.wave]);
  else if (p.phone && front) put(PHONE);
  else if (p.sit && p.type !== null) put(TYPE[p.type]);
  // Ojos cerrados: queda sólo la fila de abajo de cada ojo
  if (p.blink && front) for (let x = 0; x < SPRITE_W; x++) if (g[BY + 8][x] === "E") g[BY + 8][x] = "S";
  const tieRows = new Set([BY + 14, BY + 15, BY + 16]);
  const color = (ch: string, y: number): string | null => {
    switch (ch) {
      case "K": return OUTLINE;
      case "S": case "A": return L.skin;
      case "s": return L.skin2;
      case "E": return "#2a1d1a";
      case "M": return L.beard ? "#e9c3a5" : "#9a5442";
      case "W": return L.main;
      case "w": return L.shade;
      case "R": return L.stripes ?? L.main;
      case "X": return L.tie && tieRows.has(y) ? L.tie : y === BY + 14 ? L.collar : L.main;
      case "P": return L.pants;
      case "B": return L.shoes;
      case "#": return L.hair;
      case "%": return L.hair2;
      case "V": return "#101014";
      case "G": return "#17171c";
      case "g": return "#a9cbe0";
      case "Q": return L.phones ?? "#17171c";
      case "Z": return L.pack ?? "#2b2f3a";
      case "z": return L.pack ? shadeOf(L.pack) : "#1f2129";
      case "F": return "#1b1b22";
      case "f": return "#9fd3ff";
      case "L": case "D": return "#f4efe6";
      case "O": return "#ff4d2e";
      default: return null;
    }
  };
  const out = g.map((row, y) => row.map((ch) => color(ch, y)));
  return selout(out, (y, x) => g[y][x] === "K");
}

/**
 * Contorno selectivo, como en Habbo: el contorno de afuera queda casi negro,
 * pero las líneas de adentro (entre el brazo y el cuerpo, entre las piernas,
 * el borde de la cara contra el pelo) toman un tono oscuro del color de al lado.
 */
function selout(m: (string | null)[][], isLine: (y: number, x: number) => boolean) {
  const H = m.length, W = m[0].length;
  const at = (y: number, x: number) => (y >= 0 && y < H && x >= 0 && x < W ? m[y][x] : null);
  return m.map((row, y) =>
    row.map((col, x) => {
      if (!col || !isLine(y, x)) return col;
      const around = [at(y - 1, x), at(y + 1, x), at(y, x - 1), at(y, x + 1)];
      if (around.some((c) => !c)) return col;
      const fills = around.filter((c): c is string => !!c && c !== OUTLINE);
      return fills.length ? darken(fills[fills.length - 1], 0.45) : col;
    }),
  );
}
const OUTLINE = "#1c1418";
function darken(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * k).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

function shadeOf(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.round(c * 0.72).toString(16).padStart(2, "0");
  return `#${f(n >> 16)}${f((n >> 8) & 255)}${f(n & 255)}`;
}

// --- El gato ----------------------------------------------------------------------------

/** El gato de costado mirando a la derecha (parado, con un paso) y hecho ovillo. */
export const CAT_W = 18;
const CAT_BODY = ["..............K..K", "............KOKKOK", "............KOOOOK", "............KOEOEK", "..K.........KOOnOK", ".KOK.KKKKKKKKOOOOK", ".KOKKOOrOOrOOKKKK.", "..KOOOOOOOOOOOOK..", "..KOOOOOOOOOOOOK..", "..KOOCCCCCCCOOOK.."];
const CAT_LEGS = [["...KOOK....KOOK...", "...KKKK....KKKK..."], ["..KOOK......KOOK..", ".KKKK........KKKK."]];
const CAT_SLEEP = ["..................", "..................", "..................", "..................", "............K..K..", "....KKKKKKKKOKKOK.", "...KOOrOOrOOKOOOOK", "..KOOOOOOOOOKOKKOK", ".KOOOOOOOOOOKOOOOK", ".KOKKKKKKKOOOKKKK.", ".KOOOOOOOOKKKK....", "..KKKKKKKK........"];
export function catSprite(frame: 0 | 1 | "sleep"): (string | null)[][] {
  const rows = frame === "sleep" ? CAT_SLEEP : [...CAT_BODY, ...CAT_LEGS[frame]];
  const pal: Record<string, string> = { K: OUTLINE, O: "#e08a3c", r: "#b8662a", C: "#f6dcb8", E: "#26301c", n: "#e07a7a" };
  return selout(
    rows.map((row) => [...row].map((ch) => pal[ch] ?? null)),
    (y, x) => rows[y][x] === "K",
  );
}

/** Para scripts/check-oficinas.mjs: todos los mapas, con el ancho que tienen que tener. */
export const SPRITE_MAPS: { name: string; rows: string[]; width: number }[] = [
  { name: "HEAD_FRONT", rows: HEAD_FRONT, width: 16 },
  { name: "HEAD_BACK", rows: HEAD_BACK, width: 16 },
  { name: "BODY_FRONT", rows: BODY_FRONT, width: 16 },
  { name: "BODY_BACK", rows: BODY_BACK, width: 16 },
  { name: "LEGS_STAND", rows: LEGS_STAND, width: 16 },
  { name: "LEGS_WALK", rows: LEGS_WALK, width: 16 },
  ...Object.entries(HAIR).flatMap(([k, h]) => [...h.front.map((l, i) => ({ name: `HAIR.${k}.front${i}`, rows: l.rows, width: 16 })), ...h.back.map((l, i) => ({ name: `HAIR.${k}.back${i}`, rows: l.rows, width: 16 }))]),
  { name: "GLASSES", rows: GLASSES.rows, width: 16 },
  { name: "BEARD", rows: BEARD.rows, width: 16 },
  { name: "PHONES_FRONT", rows: PHONES_FRONT.rows, width: 16 },
  { name: "PHONES_BACK", rows: PHONES_BACK.rows, width: 16 },
  { name: "PACK_BACK", rows: PACK_BACK.rows, width: 16 },
  { name: "PACK_FRONT", rows: PACK_FRONT.rows, width: 16 },
  { name: "BADGE", rows: BADGE.rows, width: 16 },
  ...WAVE.map((l, i) => ({ name: `WAVE${i}`, rows: l.rows, width: 18 })),
  { name: "PHONE", rows: PHONE.rows, width: 18 },
  ...TYPE.map((l, i) => ({ name: `TYPE${i}`, rows: l.rows, width: 16 })),
  { name: "CAT_BODY", rows: CAT_BODY, width: CAT_W },
  ...CAT_LEGS.map((rows, i) => ({ name: `CAT_LEGS${i}`, rows, width: CAT_W })),
  { name: "CAT_SLEEP", rows: CAT_SLEEP, width: CAT_W },
];
