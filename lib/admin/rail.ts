// La barra del panel en la compu: angosta (sólo íconos) o abierta (con los
// nombres). Como el tema, va en una cookie para que el servidor la pinte bien
// desde el primer render, sin saltos. Puro: lo usan el layout y el marco.
export const RAIL_COOKIE = "admin-rail";
const ONE_YEAR_S = 60 * 60 * 24 * 365;

/** Angosta salvo que la cookie diga abierta. */
export const parseRailOpen = (value: string | undefined) => value === "open";

/** Valor para `document.cookie`: sólo vale dentro de /admin. */
export const railCookie = (open: boolean) =>
  `${RAIL_COOKIE}=${open ? "open" : "closed"}; path=/admin; max-age=${ONE_YEAR_S}; samesite=lax`;
