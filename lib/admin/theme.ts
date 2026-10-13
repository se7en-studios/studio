// Tema del panel (claro u oscuro). Se guarda en una cookie para que el servidor
// pinte el tema correcto desde el primer render, sin parpadeo. Puro: lo usan el
// layout (servidor) y la barra lateral (cliente).
export type Theme = "dark" | "light";

export const THEME_COOKIE = "admin-theme";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

/** Oscuro salvo que la cookie diga claro. */
export const parseTheme = (value: string | undefined): Theme =>
  value === "light" ? "light" : "dark";

export const otherTheme = (theme: Theme): Theme =>
  theme === "dark" ? "light" : "dark";

/** Valor para `document.cookie`: sólo vale dentro de /admin. */
export const themeCookie = (theme: Theme) =>
  `${THEME_COOKIE}=${theme}; path=/admin; max-age=${ONE_YEAR_S}; samesite=lax`;
