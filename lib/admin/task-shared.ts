// Tipos y fechas de las tareas. Puro y sin dependencias de servidor: lo usan
// las páginas y los componentes de cliente.
import type { LeadOwner } from "./db";

export const PRIORITIES = ["alta", "media", "baja"] as const;
export type TaskPriority = (typeof PRIORITIES)[number];

/** Tareas que se repiten: al completarla se crea la siguiente. */
export const RECURS = ["semanal", "mensual"] as const;
export type TaskRecur = (typeof RECURS)[number];

export type Task = {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  notes: string;
  assignee: LeadOwner | null;
  /** YYYY-MM-DD, sin hora. */
  due: string | null;
  priority: TaskPriority;
  done_at: string | null;
  lead_id: string | null;
  project_slug: string | null;
  created_by: LeadOwner | null;
  /** «Esperando al cliente»: no cuenta como vencida. Sin daily-v1.sql llega false. */
  waiting: boolean;
  recur: TaskRecur | null;
};

export type TaskInput = Pick<
  Task,
  | "title"
  | "notes"
  | "assignee"
  | "due"
  | "priority"
  | "lead_id"
  | "project_slug"
> &
  Partial<Pick<Task, "waiting" | "recur">>;

/** Lo que se puede vincular a una tarea, para los selectores. */
export type TaskLinks = {
  leads: { id: string; name: string }[];
  projects: { slug: string; name: string }[];
};

export const TITLE_MAX = 200;
export const NOTES_MAX = 5000;

const TZ = "America/Argentina/Buenos_Aires";

/** YYYY-MM-DD de hoy (o de hoy + n días) en hora de Argentina. */
export function dayKey(offsetDays = 0, from = Date.now()) {
  return new Date(from + offsetDays * 86_400_000).toLocaleDateString("en-CA", {
    timeZone: TZ,
  });
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

export type Bucket =
  | "vencidas"
  | "hoy"
  | "semana"
  | "despues"
  | "sinfecha"
  | "esperando"
  | "hechas";

export const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "vencidas", label: "Vencidas" },
  { id: "hoy", label: "Hoy" },
  { id: "semana", label: "Próximos 7 días" },
  { id: "despues", label: "Más adelante" },
  { id: "sinfecha", label: "Sin fecha" },
  { id: "esperando", label: "Esperando al cliente" },
  { id: "hechas", label: "Hechas" },
];

export function bucket(
  t: Pick<Task, "due" | "done_at"> & { waiting?: boolean },
  today = dayKey(),
): Bucket {
  if (t.done_at) return "hechas";
  // La pelota está del otro lado: no se cuenta como vencida ni para hoy.
  if (t.waiting) return "esperando";
  if (!t.due) return "sinfecha";
  const d = daysBetween(today, t.due);
  if (d < 0) return "vencidas";
  if (d === 0) return "hoy";
  return d <= 7 ? "semana" : "despues";
}

/**
 * Fecha de la próxima vuelta de una tarea que se repite: un paso desde su
 * fecha (o desde hoy si no tenía) y, si eso ya pasó, los pasos que hagan falta
 * para no crearla vencida. Mensual conserva el día, recortado al fin de mes.
 */
export function nextDue(due: string | null, recur: TaskRecur, today = dayKey()) {
  const [y, m, d] = (due ?? today).split("-").map(Number);
  const day0 = d;
  let date = new Date(Date.UTC(y, m - 1, d));
  do {
    if (recur === "semanal") date = new Date(date.getTime() + 7 * 86_400_000);
    else {
      const ny = date.getUTCFullYear();
      const nm = date.getUTCMonth() + 1;
      const last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
      date = new Date(Date.UTC(ny, nm, Math.min(day0, last)));
    }
  } while (date.toISOString().slice(0, 10) < today);
  return date.toISOString().slice(0, 10);
}

/** «hoy», «mañana», «hace 3 días», «vie 10 oct». */
export function dueLabel(due: string, today = dayKey()) {
  const d = daysBetween(today, due);
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  if (d === -1) return "ayer";
  if (d < 0) return `hace ${-d} días`;
  const date = new Date(`${due}T12:00:00`);
  return date
    .toLocaleDateString("es-AR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    .replace(/\./g, "");
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  alta: 0,
  media: 1,
  baja: 2,
};

/** Abiertas: por fecha (sin fecha al final) y prioridad. Hechas: la más reciente primero. */
export function compareTasks(a: Task, b: Task) {
  if (a.done_at || b.done_at)
    return (b.done_at ?? "").localeCompare(a.done_at ?? "");
  if (a.due !== b.due) return (a.due ?? "9999").localeCompare(b.due ?? "9999");
  return (
    PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
    a.created_at.localeCompare(b.created_at)
  );
}

/** Valida y recorta lo que llega del cliente. Tira error con un mensaje para mostrar. */
export function cleanInput(
  input: Partial<TaskInput>,
  owners: readonly string[],
): Partial<TaskInput> {
  const out: Partial<TaskInput> = {};
  if (input.title !== undefined) {
    const title = String(input.title).trim().slice(0, TITLE_MAX);
    if (!title) throw new Error("La tarea necesita un título.");
    out.title = title;
  }
  if (input.notes !== undefined)
    out.notes = String(input.notes).slice(0, NOTES_MAX);
  if (input.assignee !== undefined) {
    if (input.assignee !== null && !owners.includes(input.assignee))
      throw new Error("Responsable inválido.");
    out.assignee = input.assignee;
  }
  if (input.due !== undefined) {
    if (input.due !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.due))
      throw new Error("Fecha inválida.");
    out.due = input.due || null;
  }
  if (input.priority !== undefined) {
    if (!PRIORITIES.includes(input.priority))
      throw new Error("Prioridad inválida.");
    out.priority = input.priority;
  }
  if (input.lead_id !== undefined) {
    if (input.lead_id !== null && !/^[0-9a-f-]{36}$/i.test(input.lead_id))
      throw new Error("Pedido inválido.");
    out.lead_id = input.lead_id;
  }
  if (input.project_slug !== undefined) {
    if (
      input.project_slug !== null &&
      !/^[a-z0-9-]{1,64}$/.test(input.project_slug)
    )
      throw new Error("Proyecto inválido.");
    out.project_slug = input.project_slug;
  }
  if (input.waiting !== undefined) out.waiting = Boolean(input.waiting);
  if (input.recur !== undefined) {
    if (input.recur !== null && !RECURS.includes(input.recur))
      throw new Error("Repetición inválida.");
    out.recur = input.recur;
  }
  return out;
}

// Plantillas de tareas por tipo de proyecto. Al crear un proyecto se elige una
// y se cargan sus tareas, empezando por el kickoff (dominio, hosting, accesos,
// analytics).

type Step = {
  title: string;
  /** Días desde hoy. */ in: number;
  priority?: TaskPriority;
};

const KICKOFF: Step[] = [
  {
    title: "Kickoff: dominio (quién lo tiene, accesos al registrador)",
    in: 2,
    priority: "alta",
  },
  {
    title: "Kickoff: hosting y deploy (Vercel / servidor del cliente)",
    in: 2,
    priority: "alta",
  },
  {
    title: "Kickoff: accesos del cliente cargados en Cuentas",
    in: 3,
    priority: "alta",
  },
  { title: "Kickoff: analytics (GA4 / Search Console) y píxeles", in: 5 },
  { title: "Kickoff: contenidos, logo y textos del cliente", in: 5 },
];

export const TASK_TEMPLATES = {
  landing: {
    label: "Landing",
    steps: [
      ...KICKOFF,
      { title: "Estructura y copy de la landing", in: 7 },
      { title: "Diseño de la landing", in: 10 },
      { title: "Desarrollo y responsive", in: 14 },
      { title: "SEO básico, formulario y WhatsApp probados", in: 16 },
      { title: "Revisión con el cliente", in: 18 },
      { title: "Publicar y conectar el dominio", in: 21, priority: "alta" },
    ],
  },
  webapp: {
    label: "Web app",
    steps: [
      ...KICKOFF,
      {
        title: "Alcance y flujos principales cerrados con el cliente",
        in: 7,
        priority: "alta",
      },
      { title: "Modelo de datos y auth", in: 10 },
      { title: "Diseño de pantallas clave", in: 14 },
      { title: "Primera versión navegable para el cliente", in: 28 },
      { title: "Panel de administración", in: 35 },
      { title: "QA, permisos y backups", in: 40 },
      { title: "Lanzamiento y monitoreo", in: 45, priority: "alta" },
    ],
  },
  movil: {
    label: "App móvil",
    steps: [
      ...KICKOFF,
      {
        title: "Cuentas de Apple Developer y Google Play del cliente",
        in: 5,
        priority: "alta",
      },
      {
        title: "Alcance y flujos principales cerrados con el cliente",
        in: 7,
        priority: "alta",
      },
      { title: "Diseño de pantallas clave", in: 14 },
      { title: "Build de prueba (TestFlight / prueba interna)", in: 30 },
      { title: "Fichas de las tiendas: textos, capturas, ícono", in: 38 },
      { title: "Publicación en las tiendas", in: 45, priority: "alta" },
    ],
  },
} satisfies Record<string, { label: string; steps: Step[] }>;

export type TemplateId = keyof typeof TASK_TEMPLATES;

export const isTemplate = (v: unknown): v is TemplateId =>
  typeof v === "string" && Object.hasOwn(TASK_TEMPLATES, v);

/** Las tareas de la plantilla para un proyecto, con fechas a partir de `from`. */
export function templateTasks(
  id: TemplateId,
  projectSlug: string,
  from = Date.now(),
): TaskInput[] {
  return TASK_TEMPLATES[id].steps.map((s) => ({
    title: s.title,
    notes: "",
    assignee: null,
    due: dayKey(s.in, from),
    priority: s.priority ?? "media",
    lead_id: null,
    project_slug: projectSlug,
  }));
}
