import {
  Anton,
  Barlow_Condensed,
  Outfit,
  Playfair_Display,
  Plus_Jakarta_Sans,
} from "next/font/google";
import localFont from "next/font/local";

// Tipografías de marca de cada proyecto, las mismas que usan sus sitios.
// Sólo las usa la rueda de Trabajo para el nombre y la frase del proyecto
// activo. `preload: false`: el navegador baja cada una recién cuando aparece
// el proyecto que la usa, no en la primera carga de la página.

const anton = Anton({ subsets: ["latin"], weight: "400", preload: false });
// Bricolage va desde el repo (lib/fonts): pedírsela a Google en cada build
// hacía fallar el CI de vez en cuando. Es la variable latina de Google Fonts.
const bricolage = localFont({
  src: "./fonts/bricolage-grotesque-latin.woff2",
  weight: "200 800",
  preload: false,
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal", "italic"],
  preload: false,
});
const barlow = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["800", "900"],
  style: ["normal", "italic"],
  preload: false,
});
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["800"],
  preload: false,
});
const outfit = Outfit({ subsets: ["latin"], weight: ["300", "500"], preload: false });

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
