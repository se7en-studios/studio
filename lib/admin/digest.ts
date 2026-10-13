// Textos de los avisos del panel: resumen de la mañana, recordatorio de las 19 h y
// pedido nuevo. Puro y sin dependencias de servidor, para poder probarlo. Los avisos
// salen por un servicio externo: llevan solo conteos y títulos de posts del estudio,
// nunca nombres ni datos de clientes.
export type Notice = {
  title: string;
  message: string;
  /** Ruta del panel que abre al tocar el aviso. */
  path: string;
};

/** `date` es YYYY-MM-DD. */
export type PostDue = { title: string; date: string };

export type DigestInput = {
  posts: PostDue[];
  today: string;
  overdueTasks: number;
  dueTodayTasks: number;
  newLeads: number;
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
