// Calendario del panel: tipos y fechas puras (sin servidor) para la página y el
// componente de cliente. Junta posts de Instagram, tareas y entregas de proyectos.
import type { ContentKind } from "./content-shared";
import type { LeadOwner } from "./db";
import type { TaskPriority } from "./task-shared";

export type EventType = "post" | "task" | "seguimiento" | "entrega" | "renovacion";

export const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: "post", label: "Posts" },
  { id: "task", label: "Tareas" },
  { id: "seguimiento", label: "Seguimientos" },
  { id: "entrega", label: "Entregas" },
  { id: "renovacion", label: "Renovaciones" },
];

/** Valor del filtro de proyecto para lo que no pertenece a ninguno. */
export const NO_PROJECT = "__sin-proyecto";

export type CalEvent = {
  key: string;
  id: string;
  type: EventType;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  project: string | null;
  owner: LeadOwner | null;
  done: boolean;
  kind?: ContentKind;
  priority?: TaskPriority;
  accent?: string;
  /** Texto de apoyo de la fila (de una renovación: lo que cuesta). */
  detail?: string;
  /** Pedido al que pertenece un seguimiento. */
  lead?: { id: string; name: string } | null;
};

export type CalPost = {
  id: string;
  post_date: string;
  kind: ContentKind;
  title: string;
  pinned: boolean;
  done_at: string | null;
  /** Proyecto que nombra el título («Caso: Takefyy»), si alguno. */
  project: string | null;
};

export type Delivery = {
  slug: string;
  name: string;
  accent: string;
  /** YYYY-MM-DD */
  due: string;
  owner: LeadOwner | null;
  done: boolean;
};

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Las palabras de un texto, sin tildes ni signos, con un espacio a cada lado. */
const words = (s: string) => ` ${plain(s).replace(/[^a-z0-9]+/g, " ").trim()} `;

/** Slug del proyecto cuyo nombre aparece en el título; el nombre más largo gana. */
const MIN_KEYWORD = 4;

export function projectOfTitle(
  title: string,
  projects: { slug: string; name: string }[],
): string | null {
  // Por palabras completas: «pone» no tiene que encontrarse en «componente».
  const t = words(title);
  const has = (phrase: string) => phrase.trim() !== "" && t.includes(words(phrase));
  const byLength = [...projects].sort((a, b) => b.name.length - a.name.length);
  const exact = byLength.find((p) => has(p.name) || has(p.slug.replaceAll("-", " ")));
  // «La web de Apex» nombra al proyecto «Apex Performance» sólo por su primera palabra.
  const firstWord = byLength.find((p) => {
    const w = words(p.name).trim().split(" ")[0];
    return w.length >= MIN_KEYWORD && has(w);
  });
  return (exact ?? firstWord)?.slug ?? null;
}

// --- Fechas ----------------------------------------------------------------

const DAY_MS = 86_400_000;
const utc = (key: string) => Date.parse(`${key}T00:00:00Z`);
const key = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const addDays = (day: string, n: number) => key(utc(day) + n * DAY_MS);
export const monthOf = (day: string) => day.slice(0, 7);

export function addMonths(ym: string, n: number): string {
  const d = new Date(`${ym}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

/** Lunes a domingo, las semanas completas que tocan el mes. */
export function monthGrid(ym: string): string[] {
  const first = utc(`${ym}-01`);
  const last = utc(addDays(`${addMonths(ym, 1)}-01`, -1));
  const lead = (new Date(first).getUTCDay() + 6) % 7;
  const tail = 6 - ((new Date(last).getUTCDay() + 6) % 7);
  const total = (last - first) / DAY_MS + 1 + lead + tail;
  return Array.from({ length: total }, (_, i) =>
    key(first + (i - lead) * DAY_MS),
  );
}

export const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export function monthLabel(ym: string) {
  return new Date(`${ym}-01T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export function dayTitle(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("es-AR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export const dayNumber = (day: string) => Number(day.slice(8));

export function groupByDay(events: CalEvent[]): Map<string, CalEvent[]> {
  const out = new Map<string, CalEvent[]>();
  for (const e of events) out.set(e.date, [...(out.get(e.date) ?? []), e]);
  return out;
}

/** Las tareas y los seguimientos de pedidos se tildan, se editan y se arrastran igual. */
export const isTaskLike = (e: Pick<CalEvent, "type">) => e.type === "task" || e.type === "seguimiento";
