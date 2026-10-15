// Resumen de un pedido para verlo de un vistazo en el panel: título corto,
// prioridad por presupuesto, etiquetas y el próximo paso según su estado.
// Puro y sin dependencias: lo usan el servidor y el cliente.

export type BriefInput = {
  name: string;
  company: string;
  project_type: string;
  budget: string;
  timeline: string;
  idea: string;
  status: string;
  channel: string | null;
  created_at: string;
};

export type Priority = "alta" | "media" | "baja";

/** Primera oración de la idea, recortada a ~110 caracteres. */
export function headline(idea: string): string {
  const clean = idea.replace(/\s+/g, " ").trim();
  if (!clean) return "Sin descripción: pedir detalle.";
  const first = clean.split(/(?<=[.!?])\s/)[0];
  const text = first.length > 20 ? first : clean;
  return text.length > 110 ? `${text.slice(0, 107).trimEnd()}…` : text;
}

/**
 * Monto aproximado en USD que sugiere el rango elegido, para ordenar. Entiende
 * los rangos del sitio: «Menos de USD 1.500» o «< $1.500 USD» (un poco menos),
 * «USD 1.500 – 3.000» (el medio) y «Más de USD 6.000» o «$6.000+ USD» (un poco más).
 */
export function budgetValue(budget: string): number {
  const nums = (budget.match(/\d[\d.,]*/g) ?? []).map((n) => Number(n.replace(/[.,]/g, "")));
  if ((/más de/i.test(budget) || /\d\s*\+/.test(budget)) && nums[0]) return nums[0] * 1.5;
  if (nums.length >= 2) return (nums[0] + nums[1]) / 2;
  if ((/menos de/i.test(budget) || /^\s*</.test(budget)) && nums[0]) return nums[0] * 0.6;
  return nums[0] ?? 0;
}

/**
 * Plazo que pide apuro. Ojo con «semana»: el plazo por defecto de /start es
 * «Normal (2 a 4 semanas)» y no es urgente. Cuentan «urgente», «ya», «ASAP»,
 * «exprés», «esta semana», «menos de 2 semanas» o «en un mes» y parecidos.
 */
const URGENT = /urgente|asap|cuanto antes|expr[eé]s|\bya\b|esta semana|(menos de|en) (1|una|2|dos) semanas?|\b(1|un) mes\b/i;

export function priority(b: Pick<BriefInput, "budget" | "timeline">): Priority {
  const v = budgetValue(b.budget);
  const urgent = URGENT.test(b.timeline);
  if (v >= 3000 || (v >= 1500 && urgent)) return "alta";
  if (v >= 1500 || urgent) return "media";
  return "baja";
}

export function tags(b: BriefInput): string[] {
  return [
    b.project_type,
    b.budget && !/definir|no sé/i.test(b.budget) ? b.budget : "",
    b.timeline && !/flexible/i.test(b.timeline) ? b.timeline : "",
    b.company,
  ].filter(Boolean);
}

export function nextStep(b: BriefInput): string {
  const by = b.channel === "whatsapp" ? "por WhatsApp" : b.channel === "email" ? "por mail" : "";
  switch (b.status) {
    case "nuevo":
      return `Responder ${by || "hoy"}: presentarse y agendar una llamada de 15 min.`.replace("  ", " ");
    case "contactado":
      return "Definir alcance y mandar la propuesta con precio y plazo.";
    case "propuesta":
      return "Hacer seguimiento de la propuesta y resolver dudas.";
    case "ganado":
      return "Kickoff: accesos, contenidos y fecha de entrega.";
    default:
      return "Cerrado. Anotar por qué, para la próxima.";
  }
}

export function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `hace ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  const d = Math.round(s / 86400);
  return d === 1 ? "ayer" : `hace ${d} días`;
}
