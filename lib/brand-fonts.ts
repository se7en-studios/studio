import localFont from "next/font/local";

// Tipografías de marca de cada proyecto, las mismas que usan sus sitios.
// Sólo las usa la rueda de Trabajo para el nombre y la frase del proyecto
// activo. `preload: false`: el navegador baja cada una recién cuando aparece
// el proyecto que la usa, no en la primera carga de la página.
//
// Van desde el repo (lib/fonts), no de Google Fonts: pedírselas a Google en
// cada build hacía fallar el CI de vez en cuando. Son los mismos archivos
// latinos que sirve Google, con los mismos pesos.

const anton = localFont({ src: "./fonts/anton-latin-400.woff2", weight: "400", preload: false });
const bricolage = localFont({ src: "./fonts/bricolage-grotesque-latin.woff2", weight: "200 800", preload: false });
const playfair = localFont({
  src: [
    { path: "./fonts/playfair-display-latin-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/playfair-display-latin-italic-600.woff2", weight: "600", style: "italic" },
  ],
  preload: false,
  adjustFontFallback: "Times New Roman",
});
const barlow = localFont({
  src: [
    { path: "./fonts/barlow-condensed-latin-800.woff2", weight: "800", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-900.woff2", weight: "900", style: "normal" },
    { path: "./fonts/barlow-condensed-latin-italic-800.woff2", weight: "800", style: "italic" },
    { path: "./fonts/barlow-condensed-latin-italic-900.woff2", weight: "900", style: "italic" },
  ],
  preload: false,
});
const jakarta = localFont({ src: "./fonts/plus-jakarta-sans-latin-800.woff2", weight: "800", preload: false });
const outfit = localFont({ src: "./fonts/outfit-latin.woff2", weight: "100 900", preload: false });

export const brandFonts = {
  anton: anton.className,
  bricolage: bricolage.className,
  playfair: playfair.className,
  barlow: barlow.className,
  jakarta: jakarta.className,
  outfit: outfit.className,
} as const;

export type BrandFont = keyof typeof brandFonts;

/** Las mismas por familia, para dibujarlas en un canvas (las salas de «En vivo»). */
export const brandFamilies: Record<BrandFont, string> = {
  anton: anton.style.fontFamily,
  bricolage: bricolage.style.fontFamily,
  playfair: playfair.style.fontFamily,
  barlow: barlow.style.fontFamily,
  jakarta: jakarta.style.fontFamily,
  outfit: outfit.style.fontFamily,
};
