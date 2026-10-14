import localFont from "next/font/local";

// Las tipografías del sitio y la de los carteles de «En vivo». Van desde el
// repo (lib/fonts), no de Google Fonts: ver brand-fonts.ts.

// Archivo y Chivo Mono: familias de Omnibus-Type (Buenos Aires), en lugar de la
// Geist que trae por defecto create-next-app.
export const archivo = localFont({
  src: "./fonts/archivo-latin.woff2",
  weight: "100 900",
  variable: "--font-archivo",
});

export const chivoMono = localFont({
  src: "./fonts/chivo-mono-latin.woff2",
  weight: "100 900",
  variable: "--font-chivo-mono",
});

/** Silkscreen: la letra de píxeles del mapa de «En vivo» (panel y landing). */
export const pixel = localFont({
  src: "./fonts/silkscreen-latin-400.woff2",
  weight: "400",
  fallback: ["monospace"],
  adjustFontFallback: false,
  preload: false,
});
