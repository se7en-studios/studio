// La hora del estudio: todo el panel cuenta días y horas en Argentina, esté
// donde esté el servidor o el navegador. Puro y sin dependencias de servidor:
// lo usan el servidor y los componentes de cliente.

export const TZ = "America/Argentina/Buenos_Aires";

/** YYYY-MM-DD en hora de Argentina. */
export const dayIn = (d: Date | number | string) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

/** «Hoy», «Ayer» o «martes 6 de octubre», en hora de Argentina. */
export function dayLabel(iso: string) {
  const k = dayIn(iso);
  if (k === dayIn(Date.now())) return "Hoy";
  if (k === dayIn(Date.now() - 86_400_000)) return "Ayer";
  return new Date(iso).toLocaleDateString("es-AR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** «14:05» en hora de Argentina. */
export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-AR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
