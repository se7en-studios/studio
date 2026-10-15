// Pestañas de Finanzas: van en la URL (?tab=). Sin "use client": las usa también la página (servidor).
export const TABS = ["resumen", "movimientos", "pendientes", "herramientas"] as const;
export type Tab = (typeof TABS)[number];
