// Textos de los avisos del panel: resumen de la mañana, recordatorio de las 19 h y
// pedido nuevo. Puro y sin dependencias de servidor, para poder probarlo. Los avisos
// salen por un servicio externo: llevan solo conteos y títulos de posts del estudio,
// nunca nombres ni datos de clientes.
import type { SiteAlert } from "./site-health-shared";
export type Notice = {
  title: string;
  message: string;
  /** Ruta del panel que abre al tocar el aviso. */
  path: string;
  /** Dirección completa que abre en lugar de la ruta (por ejemplo, una sala de Meet). */
  url?: string;
  /** Etiquetas del aviso (ntfy): las llamadas llevan quién llama y a quién. */
  tags?: string[];
};

/** `date` es YYYY-MM-DD. */
export type PostDue = { title: string; date: string };

/** Una herramienta que renueva en `days` días (0 = hoy). Sin montos: el aviso sale por un servicio externo. */
export type Renewal = { name: string; days: number };

export type DigestInput = {
  posts: PostDue[];
  today: string;
  overdueTasks: number;
  dueTodayTasks: number;
  newLeads: number;
  renewals?: Renewal[];
  /** Primer día del mes: recuerda bajar la copia de seguridad. */
  backupDue?: boolean;
  /** Cobros pendientes con la fecha ya pasada: cuántos y el total en USD, sin clientes. */
  lateCharges?: { count: number; usd: number };
  /** Alertas de los sitios (siteAlerts): en el aviso van sólo contadas, sin el sitio. */
  siteAlerts?: SiteAlert[];
};

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
const bullets = (lines: string[]) => lines.map((l) => `• ${l}`).join("\n");

function taskLine(overdue: number, today: number): string | null {
  if (overdue && today)
    return `${plural(overdue, "tarea vencida", "tareas vencidas")} y ${today} para hoy`;
  if (overdue) return plural(overdue, "tarea vencida", "tareas vencidas");
  if (today) return `${plural(today, "tarea", "tareas")} para hoy`;
  return null;
}

const when = (days: number) =>
  days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;

/** Una línea por fecha: «Renueva mañana: Vercel, Claude». */
function renewalLines(renewals: Renewal[]): string[] {
  const byDays = new Map<number, string[]>();
  for (const r of renewals) byDays.set(r.days, [...(byDays.get(r.days) ?? []), r.name]);
  return [...byDays]
    .sort(([a], [b]) => a - b)
    .map(([days, names]) => `Renueva ${when(days)}: ${names.join(", ")}`);
}

/** «2 sitios caídos», «SSL por vencer en 1 sitio»: cuántos, nunca cuáles (son de clientes). */
function siteLines(alerts: SiteAlert[]): string[] {
  const n = (kind: SiteAlert["kind"]) => alerts.filter((a) => a.kind === kind).length;
  const down = n("caido"), slow = n("lento"), ssl = n("ssl"), domain = n("dominio"), visual = n("visual");
  return [
    down ? plural(down, "sitio caído", "sitios caídos") : null,
    visual ? `${plural(visual, "sitio", "sitios")} que se ${visual === 1 ? "ve" : "ven"} distinto` : null,
    slow ? plural(slow, "sitio lento", "sitios lentos") : null,
    ssl ? `SSL por vencer en ${plural(ssl, "sitio", "sitios")}` : null,
    domain ? `Dominio por vencer en ${plural(domain, "sitio", "sitios")}` : null,
  ].filter((l): l is string => l !== null);
}

/** Lo que hay para hoy, a la mañana. null si no hay nada: un aviso vacío es ruido. */
export function morningDigest(i: DigestInput): Notice | null {
  const late = i.posts.filter((p) => p.date < i.today);
  const lines = [
    ...i.posts
      .filter((p) => p.date === i.today)
      .map((p) => `Hoy 19 h: ${p.title}`),
    late.length
      ? `${plural(late.length, "post atrasado", "posts atrasados")} sin publicar`
      : null,
    taskLine(i.overdueTasks, i.dueTodayTasks),
    i.newLeads
      ? `${plural(i.newLeads, "pedido", "pedidos")} sin responder`
      : null,
    i.lateCharges?.count
      ? `${plural(i.lateCharges.count, "cobro vencido", "cobros vencidos")}: USD ${Math.round(i.lateCharges.usd).toLocaleString("es-AR")}`
      : null,
    ...renewalLines(i.renewals ?? []),
    ...siteLines(i.siteAlerts ?? []),
    i.backupDue ? "Toca bajar la copia de seguridad del mes (Avisos → Copia de seguridad)" : null,
  ].filter((l): l is string => l !== null);
  return lines.length
    ? {
        title: "Buen día: esto es lo de hoy",
        message: bullets(lines),
        path: "/admin",
      }
    : null;
}

/** A la tarde: los posts de hoy que siguen sin publicarse. null si no falta ninguno. */
export function eveningReminder(
  posts: PostDue[],
  today: string,
): Notice | null {
  const todays = posts.filter((p) => p.date === today);
  if (!todays.length) return null;
  return {
    title: todays.length === 1 ? "Falta publicar hoy" : "Faltan publicar hoy",
    message: bullets(todays.map((p) => p.title)),
    path: "/admin/contenido",
  };
}

/** Un pedido entró por la web. Sin nombre: solo por dónde llegó. */
export function newLeadNotice(channel: string | null | undefined): Notice {
  return {
    title: "Pedido nuevo",
    message:
      channel === "whatsapp"
        ? "Llegó por WhatsApp. Conviene responder rápido."
        : "Llegó por la web. Conviene responder rápido.",
    path: "/admin/pedidos",
  };
}

/** Largo máximo de un aviso suelto que se manda a mano. */
export const NOTE_MAX = 280;

export type ChatKind = "general" | "proyecto" | "pedido";

/** Un mensaje nuevo para el otro. Sin el texto ni el nombre del cliente: solo de quién y dónde. */
export function messageNotice(from: string, kind: ChatKind, path = "/admin/mensajes"): Notice {
  const where =
    kind === "general" ? "en la conversación general" : kind === "proyecto" ? "en un proyecto" : "en un pedido";
  return { title: `${from} te escribió`, message: `Mensaje nuevo ${where}.`, path };
}

/** Se registró un cobro en un proyecto. Sin monto ni nombre del proyecto. */
export function paymentNotice(from: string): Notice {
  return { title: `${from} registró un cobro`, message: "Entró un cobro en un proyecto.", path: "/admin/finanzas" };
}

/** Te pasaron una tarea. Sin el título: puede nombrar a un cliente. */
export function taskAssignedNotice(from: string): Notice {
  return { title: `${from} te pasó una tarea`, message: "Tenés una tarea nueva.", path: "/admin/tareas" };
}

/** Un aviso suelto escrito a mano: es el texto que eligió quien lo manda. */
export function noteNotice(from: string, text: string): Notice {
  return { title: `Aviso de ${from}`, message: text.trim().slice(0, NOTE_MAX), path: "/admin" };
}
