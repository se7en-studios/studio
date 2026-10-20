// Generado por scripts/personajes.mjs: no editar a mano.
// Cada cuadro: [x, y, ancho, alto, pies x, pies y] dentro de la lámina, en px.
export type SheetFrame = [number, number, number, number, number, number];
export type Sheet = { src: string; height: number; frames: Record<string, SheetFrame> };
export const SHEETS: Record<"federico" | "franco" | "guia" | "visita", Sheet> = {
  "federico": {
    "src": "/en-vivo/personajes/federico.webp?v=mvh9eztj",
    "height": 192,
    "frames": {
      "idle": [
        2,
        2,
        55,
        192,
        27.2,
        192
      ],
      "walk0": [
        61,
        5,
        86,
        189,
        60.6,
        189.2
      ],
      "walk1": [
        151,
        8,
        71,
        186,
        41.5,
        186.3
      ],
      "walk2": [
        226,
        6,
        71,
        188,
        39.4,
        188.3
      ],
      "walk3": [
        301,
        7,
        97,
        187,
        51.3,
        187.3
      ],
      "back": [
        402,
        3,
        53,
        191,
        34.3,
        191.4
      ],
      "sit": [
        459,
        9,
        73,
        185,
        44.8,
        185
      ],
      "wave0": [
        536,
        2,
        83,
        192,
        27.3,
        191.9
      ],
      "phone0": [
        623,
        3,
        56,
        191,
        24.7,
        191.4
      ],
      "phone1": [
        683,
        2,
        56,
        192,
        23.8,
        191.9
      ],
      "talk0": [
        743,
        2,
        77,
        192,
        27.2,
        191.9
      ],
      "talk1": [
        824,
        2,
        81,
        192,
        27.2,
        191.9
      ],
      "talk2": [
        909,
        2,
        76,
        192,
        27.1,
        191.9
      ],
      "talk3": [
        989,
        2,
        78,
        192,
        27.4,
        191.9
      ]
    }
  },
  "franco": {
    "src": "/en-vivo/personajes/franco.webp?v=mvh9f5qm",
    "height": 192,
    "frames": {
      "idle": [
        2,
        2,
        52,
        192,
        26.9,
        192
      ],
      "walk0": [
        58,
        4,
        73,
        190,
        50.7,
        190.1
      ],
      "back": [
        135,
        5,
        54,
        189,
        21.9,
        189
      ],
      "sit": [
        193,
        8,
        83,
        186,
        48.5,
        186.5
      ],
      "wave0": [
        280,
        2,
        84,
        192,
        27.2,
        191.8
      ],
      "phone0": [
        368,
        2,
        55,
        192,
        24.5,
        191.9
      ],
      "phone1": [
        427,
        2,
        58,
        192,
        25.7,
        191.9
      ],
      "talk0": [
        489,
        2,
        83,
        192,
        26.9,
        192
      ],
      "talk1": [
        576,
        2,
        80,
        192,
        26.9,
        192
      ]
    }
  },
  "guia": {
    "src": "/en-vivo/personajes/guia.webp?v=mvh9feqs",
    "height": 192,
    "frames": {
      "idle": [
        2,
        2,
        50,
        192,
        21.7,
        192
      ],
      "walk0": [
        56,
        5,
        72,
        189,
        41.8,
        189
      ],
      "back": [
        132,
        5,
        49,
        189,
        30.2,
        189
      ],
      "wave0": [
        185,
        2,
        72,
        192,
        21.7,
        192.2
      ],
      "wave1": [
        261,
        2,
        76,
        192,
        21.7,
        192.2
      ],
      "phone0": [
        341,
        9,
        61,
        185,
        21.7,
        185.1
      ],
      "phone1": [
        406,
        2,
        55,
        192,
        21.9,
        192.1
      ],
      "phone2": [
        465,
        2,
        54,
        192,
        21.7,
        192.1
      ],
      "talk0": [
        523,
        2,
        76,
        192,
        21.7,
        192.1
      ],
      "talk1": [
        603,
        2,
        66,
        192,
        21.7,
        192.1
      ],
      "talk2": [
        673,
        2,
        75,
        192,
        21.7,
        192.1
      ],
      "talk3": [
        752,
        2,
        76,
        192,
        21.7,
        192.1
      ]
    }
  },
  "visita": {
    "src": "/en-vivo/personajes/visita.webp?v=mvh9fkte",
    "height": 192,
    "frames": {
      "idle": [
        2,
        2,
        51,
        192,
        22.9,
        192
      ],
      "walk0": [
        57,
        6,
        82,
        188,
        57.1,
        188.3
      ],
      "walk1": [
        143,
        9,
        83,
        185,
        39.1,
        185.4
      ],
      "back": [
        230,
        4,
        51,
        190,
        31.9,
        190.4
      ],
      "wave0": [
        285,
        2,
        77,
        192,
        22.9,
        191.9
      ],
      "wave1": [
        366,
        2,
        78,
        192,
        22.9,
        192
      ],
      "phone0": [
        448,
        3,
        53,
        191,
        20.9,
        191.5
      ],
      "phone1": [
        505,
        2,
        52,
        192,
        20.3,
        192
      ],
      "phone2": [
        561,
        2,
        53,
        192,
        21.7,
        192
      ],
      "think0": [
        618,
        2,
        48,
        192,
        19.6,
        192.1
      ],
      "think1": [
        670,
        2,
        70,
        192,
        36.1,
        192
      ],
      "talk0": [
        744,
        2,
        73,
        192,
        25.4,
        192.4
      ],
      "talk1": [
        821,
        2,
        51,
        192,
        23,
        191.9
      ]
    }
  }
};
