// Plantillas del primer mensaje a un prospecto. Puro: lo usan las páginas, los
// componentes de cliente y scripts/check-prospect-templates.mjs.

/** «primero»: el primer mensaje. «seguimiento»: para los que ya se contactaron y no contestaron. */
export type TemplateKind = "primero" | "seguimiento";
export const TEMPLATE_KINDS: { id: TemplateKind; label: string; hint: string }[] = [
  { id: "primero", label: "Primer mensaje", hint: "Al escribirle por primera vez a un prospecto." },
  { id: "seguimiento", label: "Seguimiento", hint: "Para los que ya contactaste y no contestaron (contactados y en charla)." },
];

export type ProspectTemplate = { id: string; name: string; body: string; active: boolean; kind: TemplateKind };

export const NAME_MAX = 60;
export const BODY_MAX = 1000;

/** Lo que se puede poner entre llaves en una plantilla. */
export const TEMPLATE_VARIABLES = [
  { key: "nombre", hint: "El nombre del negocio" },
  { key: "ciudad", hint: "Su ciudad" },
  { key: "rubro", hint: "Su rubro" },
  { key: "yo", hint: "Tu nombre" },
  { key: "dias", hint: "Hace cuántos días se le escribió (seguimiento)" },
] as const;

const KNOWN = new Set<string>(TEMPLATE_VARIABLES.map((v) => v.key));

/** Reemplaza {nombre}, {ciudad}… Lo que no se conoce queda como está, para que se note. */
export function renderTemplate(
  body: string,
  vars: Record<string, string>,
): string {
  return body
    .replace(/\{(\w+)\}/g, (whole, key: string) => vars[key] ?? whole)
    .trim();
}

/** Variables escritas en la plantilla que no existen (un error de tipeo, por ejemplo {nombr}). */
export function unknownVariables(body: string): string[] {
  const found = [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  return [...new Set(found.filter((k) => !KNOWN.has(k)))];
}

/** `days`: hace cuántos días se le escribió; sin el dato, «hace unos días». */
export function templateVars(
  lead: { name: string; city: string; category: string },
  who: string,
  days?: number | null,
): Record<string, string> {
  return {
    nombre: lead.name,
    ciudad: lead.city,
    rubro: lead.category.toLowerCase().replace(" & ", " y "),
    yo: who,
    dias: days && days > 1 ? String(days) : "unos",
  };
}

/**
 * Para no escribir siempre con la misma estructura: una al azar entre las activas, sin repetir
 * la última que se usó (si hay más de una). `rnd` se puede inyectar para probarlo.
 */
export function pickTemplate(
  templates: ProspectTemplate[],
  lastId: string | null,
  kind: TemplateKind = "primero",
  rnd: () => number = Math.random,
): ProspectTemplate | null {
  const active = templates.filter((t) => t.active && t.kind === kind);
  if (!active.length) return null;
  const pool =
    active.length > 1 ? active.filter((t) => t.id !== lastId) : active;
  return pool[Math.min(pool.length - 1, Math.floor(rnd() * pool.length))];
}

/** Las que se cargan la primera vez: cortas, amables y sin números inventados ni venta dura. */
export const DEFAULT_TEMPLATES: ProspectTemplate[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Saludo y curiosidad",
    active: true,
    kind: "primero",
    body: "Hola, ¿qué tal? Les escribo de Se7en Studio, somos un equipo de Catriel que arma páginas web y sistemas de reservas para negocios de la zona. Estuve viendo {nombre} y me gustó lo que hacen. ¿Con quién puedo charlar un minuto sobre cómo organizan hoy las consultas y las reservas?",
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Un cumplido y una pregunta",
    active: true,
    kind: "primero",
    body: "Hola, soy {yo} de Se7en Studio. Pasé por {nombre} y me pareció un trabajo muy prolijo. Una consulta nomás: ¿hoy reciben los pedidos o las reservas todo por WhatsApp, o tienen algo armado? Pregunto porque ayudamos a negocios de {ciudad} a ordenar eso sin complicarse.",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Sin compromiso",
    active: true,
    kind: "primero",
    body: "Buenas, {yo} de Se7en Studio. Sé que seguramente reciben mil mensajes, así que voy corto: armamos webs simples para negocios como {nombre} y puedo prepararles una demo gratis para que la vean sin ningún compromiso. ¿Les interesa que se las mande?",
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Vecino de la zona",
    active: true,
    kind: "primero",
    body: "Hola, ¿cómo están? Soy {yo}, también de la zona (Se7en Studio, Catriel). Estamos haciendo webs y sistemas de reservas para negocios de {ciudad} y me acordé de {nombre}. ¿Les cuento en dos líneas de qué se trata? Si no es el momento, sin problema.",
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "Caso Muzzaga (pádel)",
    active: true,
    kind: "primero",
    body: "Hola, soy {yo} de Se7en Studio. Hace poco armamos el sistema de reservas de Muzzaga Pádel y pensé que a {nombre} le podría servir algo parecido. ¿Les muestro cómo quedó? Les lleva un minuto.",
  },
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Retomo el mensaje",
    active: true,
    kind: "seguimiento",
    body: "Hola, ¿cómo andan? Soy {yo} de Se7en Studio. Les escribí hace {dias} días por lo de {nombre}. Seguro estuvieron a mil, así que no los quiero molestar: ¿les sirve que les cuente en dos líneas de qué se trata?",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Una idea concreta",
    active: true,
    kind: "seguimiento",
    body: "Hola, {yo} de Se7en Studio de nuevo. No quiero ser insistente, solo dejarles una idea concreta para {nombre}: una web simple donde sus clientes consulten y pidan por WhatsApp sin vueltas. Si les interesa, les armo una demo sin costo.",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Cierro por mi lado",
    active: true,
    kind: "seguimiento",
    body: "Hola, soy {yo}. Por si mi mensaje se perdió entre tantos: sigo a disposición para charlar sobre {nombre} cuando les quede cómodo. Y si no es para ustedes, sin problema: avísenme y no los molesto más.",
  },
];
