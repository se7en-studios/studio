import localFont from "next/font/local";

// Tipografías del rediseño de la landing (components/rd). Archivo con eje de
// ancho (wdth 62–125) para los titulares, e Instrument Serif itálica para el
// acento. Chivo Mono ya la carga el layout raíz (--font-chivo-mono).
export const wide = localFont({
  src: "./rd-fonts/archivo-wdth-latin.woff2",
  weight: "100 900",
  variable: "--font-wide",
});

export const serif = localFont({
  src: "./rd-fonts/instrument-serif-latin-italic-400.woff2",
  weight: "400",
  style: "italic",
  variable: "--font-serif",
});
