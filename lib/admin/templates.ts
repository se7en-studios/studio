// Plantillas de respuesta a un pedido (WhatsApp y mail) y los links para mandarlas.
// Puro y sin dependencias de servidor, para poder probarlo.
import type { LeadStatus } from "./db";

export type TemplateId = "primera" | "propuesta" | "seguimiento" | "gracias";

export type Template = {
  id: TemplateId;
  label: string;
  /** Cuándo conviene usarla. */
  hint: string;
  subject: string;
  body: string;
};

const SIGN = "Franco y Federico — Se7en Studio";

export const TEMPLATES: Template[] = [
  {
    id: "primera",
    label: "Primera respuesta",
    hint: "Cuando entra el pedido",
    subject: "Tu proyecto con Se7en Studio",
    body: `Hola {nombre}! Gracias por escribirnos.\n\nLeímos tu idea ({proyecto}) y nos encantaría charlarla. ¿Te queda bien una llamada de 15 minutos esta semana?\n\n${SIGN}`,
  },
  {
    id: "propuesta",
    label: "Enviar propuesta",
    hint: "Después de la primera charla",
    subject: "Propuesta para {proyecto}",
    body: `Hola {nombre}! Como quedamos, te paso la propuesta para {proyecto}: alcance, plazos y valor.\n\nCualquier duda la charlamos cuando quieras. Quedamos atentos a tu respuesta.\n\n${SIGN}`,
  },
  {
    id: "seguimiento",
    label: "Seguimiento",
    hint: "Si pasaron unos días sin respuesta",
    subject: "¿Pudiste ver la propuesta?",
    body: `Hola {nombre}! ¿Pudiste ver lo que te mandamos? Si te quedó alguna duda o querés ajustar algo, lo vemos esta semana.\n\n${SIGN}`,
  },
  {
    id: "gracias",
    label: "Arrancamos",
    hint: "Cuando se cierra",
    subject: "Arrancamos con {proyecto}",
    body: `¡Gracias {nombre}! Arrancamos con {proyecto}. En breve te pasamos los próximos pasos y cómo vamos a trabajar juntos.\n\n${SIGN}`,
  },
];

/** La plantilla que corresponde a la etapa en que está el pedido. */
export function suggestedTemplate(status: LeadStatus): TemplateId {
  return {
    nuevo: "primera",
    contactado: "propuesta",
    propuesta: "seguimiento",
    ganado: "gracias",
    perdido: "seguimiento",
  }[status] as TemplateId;
}

export type Vars = { nombre: string; proyecto: string };

/** Primer nombre y tipo de proyecto del pedido, con un texto neutro si falta. */
export function leadVars(l: {
  name: string;
  project_type?: string | null;
}): Vars {
  return {
    nombre: l.name.trim().split(/\s+/)[0] || "hola",
    proyecto: l.project_type?.trim() || "tu proyecto",
  };
}

export const fill = (text: string, v: Vars) =>
  text.replaceAll("{nombre}", v.nombre).replaceAll("{proyecto}", v.proyecto);

/**
 * El número listo para WhatsApp (código de país y 9 para celulares de Argentina), o null
 * si no se puede armar con seguridad: mejor no ofrecer el botón que abrir un chat equivocado.
 */
export function waNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length === 10) return `549${digits}`;
  if (/^549\d{10}$/.test(digits)) return digits;
  if (/^54\d{10}$/.test(digits)) return `549${digits.slice(2)}`;
  return null;
}

export const waLink = (phone: string | null | undefined, text: string) => {
  const n = waNumber(phone);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null;
};

export const mailLink = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
