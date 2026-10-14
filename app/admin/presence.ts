// La sala del mapa de «En vivo» en la que está quien usa el panel. La escribe
// oficinas/view.tsx al entrar y salir de una sala; la lee el shell para la
// señal de presencia (ver lib/admin/presencia.ts). Sólo cliente.
let room: string | null = null;
const listeners = new Set<() => void>();

export function setMapRoom(slug: string | null) {
  if (slug === room) return;
  room = slug;
  for (const fn of listeners) fn();
}

export const mapRoom = () => room;

/** Avisa cuando cambia la sala. Devuelve cómo dejar de escuchar. */
export function onMapRoom(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
