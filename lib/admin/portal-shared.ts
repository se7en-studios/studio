// Portal del cliente: tipos, validación y lo que el cliente puede ver. Puro y
// sin dependencias de servidor: lo usan el portal, el panel y
// scripts/check-portal.mjs. Las consultas ya filtran por el cliente de la
// sesión; estas funciones son la segunda barrera y definen qué campos salen.
import { addMonths, monthOf } from "./calendar-shared";
import {
  minutesInMonth,
  type MaintRequest,
  type Plan,
} from "./maintenance-shared";
import type { SiteCheck } from "./site-health-shared";

// --- Aprobaciones -------------------------------------------------------------

export const APPROVAL_STATUS = {
  pendiente: { label: "Esperando respuesta", tone: "text-amber-300" },
  aprobado: { label: "Aprobado", tone: "text-emerald-300" },
  cambios: { label: "Pidió cambios", tone: "text-violet-300" },
} as const;
export type ApprovalStatus = keyof typeof APPROVAL_STATUS;
export type Decision = "aprobado" | "cambios";

export type Approval = {
  id: string;
  created_at: string;
  updated_at: string;
  project_slug: string;
  title: string;
  description: string;
  link: string;
  file_id: string | null;
  round: number;
  status: ApprovalStatus;
  requested_by: string | null;
};

export type ApprovalDecision = {
  id: string;
  created_at: string;
  approval_id: string;
  round: number;
  decision: Decision;
  comment: string;
  signer: string;
  ip: string;
};

export type ApprovalInput = {
  title: string;
  description: string;
  link: string;
  file_id: string | null;
};

const UUID = /^[0-9a-f-]{36}$/i;

/** Sólo http(s): un «javascript:» en un link que el cliente toca sería un XSS. */
export function cleanLink(raw: unknown): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (s.length > 500) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:"
      ? u.toString()
      : null;
  } catch {
    return null;
  }
}

export function cleanApproval(
  input: Partial<Record<keyof ApprovalInput, unknown>>,
): { ok: true; value: ApprovalInput } | { ok: false; error: string } {
  const title = String(input.title ?? "")
    .trim()
    .slice(0, 200);
  if (!title) return { ok: false, error: "Poné qué tiene que aprobar." };
  const link = cleanLink(input.link);
  if (link === null)
    return { ok: false, error: "El link tiene que empezar con https://." };
  const file = input.file_id ? String(input.file_id) : null;
  if (file && !UUID.test(file))
    return { ok: false, error: "Archivo inválido." };
  return {
    ok: true,
    value: {
      title,
      description: String(input.description ?? "")
        .trim()
        .slice(0, 4000),
      link,
      file_id: file,
    },
  };
}

/** Lo que manda el cliente al aprobar o pedir cambios. Pedir cambios exige decir cuáles. */
export function cleanDecision(input: {
  decision?: unknown;
  comment?: unknown;
  signer?: unknown;
}):
  | { ok: true; value: { decision: Decision; comment: string; signer: string } }
  | { ok: false; error: string } {
  const decision =
    input.decision === "aprobado" || input.decision === "cambios"
      ? input.decision
      : null;
  if (!decision) return { ok: false, error: "Elegí aprobar o pedir cambios." };
  const signer = String(input.signer ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  if (signer.length < 2)
    return { ok: false, error: "Escribí tu nombre: queda en el registro." };
  const comment = String(input.comment ?? "")
    .trim()
    .slice(0, 4000);
  if (decision === "cambios" && !comment)
    return { ok: false, error: "Contanos qué cambios querés." };
  return { ok: true, value: { decision, comment, signer } };
}

// --- Pedidos de mantenimiento ---------------------------------------------------

export function cleanClientRequest(
  input: { project_slug?: unknown; title?: unknown; notes?: unknown },
  slugs: ReadonlySet<string>,
):
  | { ok: true; value: { project_slug: string; title: string; notes: string } }
  | { ok: false; error: string } {
  const slug = String(input.project_slug ?? "");
  // El proyecto tiene que ser uno del cliente de la sesión: nunca uno que venga del formulario sin chequear.
  if (!slugs.has(slug)) return { ok: false, error: "Elegí el proyecto." };
  const title = String(input.title ?? "")
    .trim()
    .slice(0, 200);
  if (title.length < 3)
    return { ok: false, error: "Contanos en una línea qué necesitás." };
  return {
    ok: true,
    value: {
      project_slug: slug,
      title,
      notes: String(input.notes ?? "")
        .trim()
        .slice(0, 4000),
    },
  };
}

/** Lo que ve el cliente de un pedido: sin el tiempo, la prioridad ni las notas del estudio. */
export type ClientRequest = Pick<
  MaintRequest,
  "id" | "created_at" | "project_slug" | "title" | "status" | "done_at"
>;

export const CLIENT_REQUEST_STATUS: Record<MaintRequest["status"], string> = {
  nuevo: "Recibido",
  en_curso: "En curso",
  esperando: "Esperando tu respuesta",
  hecho: "Listo",
};

export const clientRequests = (
  rows: MaintRequest[],
  slugs: ReadonlySet<string>,
): ClientRequest[] =>
  rows
    .filter((r) => slugs.has(r.project_slug))
    .map(({ id, created_at, project_slug, title, status, done_at }) => ({
      id,
      created_at,
      project_slug,
      title,
      status,
      done_at,
    }));

// --- Archivos ---------------------------------------------------------------------

export type FileRow = {
  id: string;
  created_at: string;
  project_slug: string;
  name: string;
  mime: string;
  size: number;
  path: string;
  client_visible?: boolean | null;
};

/** Sólo los marcados «lo ve el cliente» (true explícito: null o sin columna = privado) y de sus proyectos. */
export const clientFiles = <T extends FileRow>(
  rows: T[],
  slugs: ReadonlySet<string>,
): T[] =>
  rows.filter((f) => f.client_visible === true && slugs.has(f.project_slug));

// --- Cobros -----------------------------------------------------------------------

export type ChargeRow = {
  id: string;
  kind: string;
  occurred_on: string;
  currency: string;
  amount: number | string;
  description: string;
  project_slug: string | null;
  recurring: boolean;
  status?: string | null;
};

export type ClientCharge = {
  id: string;
  project_slug: string;
  description: string;
  amount: number;
  currency: string;
  /** YYYY-MM-DD: cuándo se cobró o cuándo vence. */
  date: string;
  state: "cobrado" | "pendiente" | "vencido";
};

/**
 * Los cobros del cliente: ingresos de sus proyectos, sin el plan recurrente
 * (no es un cobro) y SIN datos internos: ni la cotización, ni el socio que
 * cobró, ni quién lo cargó. Los pendientes primero, por vencimiento.
 */
export function clientCharges(
  rows: ChargeRow[],
  slugs: ReadonlySet<string>,
  today: string,
): ClientCharge[] {
  return rows
    .filter(
      (r) =>
        r.kind === "ingreso" &&
        !r.recurring &&
        r.project_slug &&
        slugs.has(r.project_slug),
    )
    .map((r) => {
      const paid = (r.status ?? "pagado") === "pagado";
      return {
        id: r.id,
        project_slug: r.project_slug as string,
        description: r.description || "Cobro",
        amount: Number(r.amount),
        currency: r.currency,
        date: r.occurred_on,
        state: paid
          ? "cobrado"
          : r.occurred_on < today
            ? "vencido"
            : "pendiente",
      } satisfies ClientCharge;
    })
    .sort(
      (a, b) =>
        Number(a.state === "cobrado") - Number(b.state === "cobrado") ||
        (a.state === "cobrado"
          ? b.date.localeCompare(a.date)
          : a.date.localeCompare(b.date)),
    );
}

// --- Reporte mensual ----------------------------------------------------------------

export type MonthlyReport = {
  slug: string;
  resolved: ClientRequest[];
  /** Horas usadas en el mes, con un decimal. */
  hours: number;
  /** null = sin tope o sin plan. */
  included: number | null;
  over: boolean;
  /** % de chequeos OK del mes; null si no hubo chequeos. */
  uptime: number | null;
  checks: number;
};

/** «YYYY-MM» válido y entre los últimos 12 meses; si no, el mes actual. */
export function reportMonth(raw: string | undefined, today: string): string {
  const now = monthOf(today);
  if (!raw || !/^\d{4}-(0[1-9]|1[0-2])$/.test(raw) || raw > now) return now;
  return raw < addMonths(now, -11) ? now : raw;
}

/** El reporte de un proyecto en el mes `ym`: pedidos resueltos, horas contra incluidas y uptime. */
export function monthlyReport(
  slug: string,
  ym: string,
  today: string,
  requests: MaintRequest[],
  plan: Pick<Plan, "hours_included" | "active"> | null,
  checks: Pick<SiteCheck, "project_slug" | "checked_at" | "ok">[],
): MonthlyReport {
  const mine = requests.filter((r) => r.project_slug === slug);
  const resolved = clientRequests(
    mine.filter(
      (r) =>
        r.status === "hecho" &&
        r.done_at &&
        monthOf(r.done_at.slice(0, 10)) === ym,
    ),
    new Set([slug]),
  ).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? ""));
  // En un mes pasado los pedidos abiertos no suman (minutesInMonth los cuenta en el mes de `today`).
  const hours =
    Math.round((minutesInMonth(mine, slug, ym, today) / 60) * 10) / 10;
  const included = plan?.active ? plan.hours_included : null;
  const inMonth = checks.filter(
    (c) => c.project_slug === slug && monthOf(c.checked_at.slice(0, 10)) === ym,
  );
  const ok = inMonth.filter((c) => c.ok).length;
  return {
    slug,
    resolved,
    hours,
    included,
    over: included !== null && hours > included,
    uptime: inMonth.length
      ? Math.round((ok / inMonth.length) * 1000) / 10
      : null,
    checks: inMonth.length,
  };
}

/** Hay algo real para mostrar en el reporte (si no, la sección no aparece). */
export const reportHasData = (r: MonthlyReport) =>
  r.resolved.length > 0 || r.hours > 0 || r.included !== null || r.checks > 0;
