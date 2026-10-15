// Tipos del Registro de cambios. Puro y sin dependencias de servidor: lo usan
// el servidor (panel.ts, oficinas.ts), las páginas y los componentes de cliente.

export const EVENT_KINDS = [
  "proyecto",
  "archivos",
  "tarea",
  "pedido",
  "finanzas",
  "cuentas",
  "contenido",
  "llamadas",
  "seguridad",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

/** Los únicos que acepta la base hasta correr supabase/panel-v3.sql. */
export const LEGACY_KINDS: readonly EventKind[] = ["archivos", "proyecto", "pedido", "tarea"];

/**
 * (Los ingresos al panel y el corte de sesiones también se reclasifican en
 * supabase/security-v2.sql.)
 *
 * Antes de los tipos nuevos, Finanzas, Cuentas, Contenido, Llamadas y la copia
 * de seguridad se anotaban como «proyecto». Por el texto se sabe qué eran. Son
 * las mismas reglas con las que supabase/panel-v3.sql reclasifica los viejos:
 * si se cambia una, cambiar la otra.
 */
const BY_TEXT: [EventKind, RegExp][] = [
  ["finanzas", /^((cargó|editó|borró) un (costo|ingreso)|marcó como (pagado|cobrado)|(agregó|actualizó|quitó) la herramienta |(registró|editó|borró) un cobro)/],
  ["cuentas", / (en|de) Cuentas$/],
  ["contenido", / en Instagram$/],
  ["llamadas", /^llamó a .+ por Meet$/],
  ["seguridad", /^(descargó una copia de seguridad|entró al panel|no pudo entrar al panel|cerró todas las sesiones)/],
];

/** El tipo real de un evento. Sólo los «proyecto» pueden ser otra cosa anotada con el tipo viejo. */
export function kindOf(kind: EventKind, text: string): EventKind {
  if (kind !== "proyecto") return kind;
  return BY_TEXT.find(([, re]) => re.test(text))?.[0] ?? kind;
}
