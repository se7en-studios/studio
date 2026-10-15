"use server";

import { after } from "next/server";
import { getSession } from "@/lib/admin/auth";
import { dateLabel, diff } from "@/lib/admin/changes";
import { fmt } from "@/lib/admin/finance-shared";
import {
  insertRequest,
  removePlan,
  removeRequest,
  savePlan,
  updateRequest,
} from "@/lib/admin/maintenance";
import {
  PRIORITY_LABEL,
  REQUEST_STATUS,
  cleanPlan,
  cleanRequest,
  durationLabel,
  type MaintRequest,
  type Plan,
  type PlanInput,
  type RequestInput,
  type RequestPriority,
  type RequestStatus,
} from "@/lib/admin/maintenance-shared";
import { PanelNotReady, getProject, logEvent } from "@/lib/admin/panel";
import { dayKey } from "@/lib/admin/task-shared";

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

const message = (e: unknown) =>
  e instanceof PanelNotReady || e instanceof Error
    ? e.message
    : "Algo falló. Probá de nuevo.";
const UUID = /^[0-9a-f-]{36}$/i;

const PLAN_SPECS = [
  { field: "amount" as const, label: "Abono" },
  { field: "currency" as const, label: "Moneda" },
  { field: "billing_day" as const, label: "Día de cobro" },
  { field: "includes" as const, label: "Incluye", long: true },
  { field: "hours_included" as const, label: "Horas incluidas" },
  {
    field: "active" as const,
    label: "Estado",
    format: (v: unknown) => (v ? "Activo" : "Pausado"),
  },
  { field: "start_date" as const, label: "Inicio", format: dateLabel },
  { field: "owner" as const, label: "Cobra" },
  {
    field: "domain_expires_on" as const,
    label: "Vence el dominio",
    format: dateLabel,
  },
];

/** Crea o edita el plan de mantenimiento de un proyecto. */
export async function savePlanAction(
  slug: string,
  input: Partial<PlanInput>,
): Promise<{ plan?: Plan; error?: string }> {
  try {
    const me = await guard();
    const project = await getProject(slug);
    if (!project) return { error: "Ese proyecto no existe." };
    const cleaned = cleanPlan(input);
    if (!cleaned.ok) return { error: cleaned.error };
    const { before, after: plan } = await savePlan(
      slug,
      cleaned.value,
      me.who,
      dayKey(),
    );
    const changes = before ? diff<Plan>(before, cleaned.value, PLAN_SPECS) : [];
    if (!before || changes.length)
      after(() =>
        logEvent({
          actor: me.who,
          kind: "mantenimiento",
          text: before
            ? `editó el plan de mantenimiento: ${changes.map((c) => c.label.toLowerCase()).join(", ")}`
            : `creó el plan de mantenimiento de ${fmt(plan.amount, plan.currency)} por mes`,
          project_slug: slug,
          changes,
        }),
      );
    return { plan };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Saca el plan. Los cobros ya generados quedan en Finanzas. */
export async function deletePlanAction(
  slug: string,
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    const gone = await removePlan(slug);
    if (!gone) return { error: "Ese plan ya no existe." };
    after(() =>
      logEvent({
        actor: me.who,
        kind: "mantenimiento",
        text: `sacó el plan de mantenimiento de ${fmt(gone.amount, gone.currency)} por mes`,
        project_slug: slug,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// --- Pedidos de los clientes -----------------------------------------------------

export async function createRequest(
  input: RequestInput,
): Promise<{ request?: MaintRequest; error?: string }> {
  try {
    const me = await guard();
    const cleaned = cleanRequest(input, true);
    if (!cleaned.ok) return { error: cleaned.error };
    if (!(await getProject(cleaned.value.project_slug!)))
      return { error: "Ese proyecto no existe." };
    const request = await insertRequest(cleaned.value, me.who);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "mantenimiento",
        text: `anotó el pedido de mantenimiento «${request.title}»`,
        project_slug: request.project_slug,
      }),
    );
    return { request };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function updateRequestAction(
  id: string,
  patch: RequestInput,
): Promise<{ request?: MaintRequest; error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Pedido inválido." };
    const cleaned = cleanRequest(patch, false);
    if (!cleaned.ok) return { error: cleaned.error };
    const { before, after: request } = await updateRequest(id, cleaned.value);
    const changes = diff<MaintRequest>(before, cleaned.value, [
      {
        field: "status",
        label: "Estado",
        format: (v) => REQUEST_STATUS[v as RequestStatus]?.label ?? String(v),
      },
      {
        field: "priority",
        label: "Prioridad",
        format: (v) => PRIORITY_LABEL[v as RequestPriority] ?? String(v),
      },
      { field: "title", label: "Título" },
      {
        field: "minutes",
        label: "Tiempo",
        format: (v) => durationLabel(Number(v)),
      },
      { field: "due", label: "Para", format: dateLabel },
      { field: "notes", label: "Notas", long: true },
    ]);
    if (changes.length) {
      const only = changes.length === 1 ? changes[0] : null;
      after(() =>
        logEvent({
          actor: me.who,
          kind: "mantenimiento",
          text:
            only?.field === "status"
              ? `pasó el pedido «${request.title}» a ${only.after}`
              : `actualizó el pedido «${request.title}»: ${changes.map((c) => c.label.toLowerCase()).join(", ")}`,
          project_slug: request.project_slug,
          changes,
        }),
      );
    }
    return { request };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteRequest(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(id)) return { error: "Pedido inválido." };
    const gone = await removeRequest(id);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "mantenimiento",
        text: `borró el pedido de mantenimiento «${gone.title}»`,
        project_slug: gone.project_slug,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}
