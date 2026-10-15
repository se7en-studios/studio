// Mantenimiento (supabase/maintenance.sql): planes, cobros mensuales y pedidos
// de los clientes. Usa la service role key: NUNCA importar este archivo desde un
// componente de cliente.
import { monthLabel } from "./calendar-shared";
import type { LeadOwner } from "./db";
import { currentFx, insertEntry } from "./finance";
import { cleanEntry, type Entry } from "./finance-shared";
import {
  dueCharges,
  type MaintRequest,
  type Plan,
  type PlanInput,
  type RequestInput,
} from "./maintenance-shared";
import { PanelNotReady, client } from "./panel";

const PLAN_COLUMNS =
  "project_slug, amount, currency, billing_day, includes, hours_included, active, start_date, billing_from, owner, domain_expires_on, updated_at, updated_by";
const REQUEST_COLUMNS =
  "id, created_at, updated_at, project_slug, title, notes, priority, status, minutes, due, done_at, created_by";
const NOT_READY = "Falta correr supabase/maintenance.sql en Supabase.";

const missingTable = (e: { code?: string }) =>
  e.code === "PGRST205" || e.code === "42P01";

function fail(e: { code?: string; message: string }): never {
  if (missingTable(e)) throw new PanelNotReady(NOT_READY);
  throw new Error(e.message);
}

/** numeric llega como string desde PostgREST. */
const toPlan = (r: Plan): Plan => ({
  ...r,
  amount: Number(r.amount),
  hours_included: r.hours_included == null ? null : Number(r.hours_included),
});

// --- Planes -------------------------------------------------------------------

export async function listPlans(): Promise<Plan[]> {
  const { data, error } = await client()
    .from("panel_maintenance_plans")
    .select(PLAN_COLUMNS)
    .limit(500);
  if (error) fail(error);
  return (data as Plan[]).map(toPlan);
}

export async function getPlan(slug: string): Promise<Plan | null> {
  const { data, error } = await client()
    .from("panel_maintenance_plans")
    .select(PLAN_COLUMNS)
    .eq("project_slug", slug)
    .maybeSingle();
  if (error) fail(error);
  return data ? toPlan(data as Plan) : null;
}

/**
 * Crea o edita el plan de un proyecto. Al crearlo o reactivarlo empieza a
 * generar cobros desde hoy (`billing_from`): los meses en pausa no se cobran.
 */
export async function savePlan(
  slug: string,
  input: PlanInput,
  by: LeadOwner,
  today: string,
): Promise<{ before: Plan | null; after: Plan }> {
  const before = await getPlan(slug);
  const restart = !before || (!before.active && input.active);
  const { data, error } = await client()
    .from("panel_maintenance_plans")
    .upsert({
      ...input,
      project_slug: slug,
      ...(restart ? { billing_from: today } : {}),
      updated_by: by,
      updated_at: new Date().toISOString(),
    })
    .select(PLAN_COLUMNS)
    .single();
  if (error) fail(error);
  return { before, after: toPlan(data as Plan) };
}

export async function removePlan(slug: string): Promise<Plan | null> {
  const { data, error } = await client()
    .from("panel_maintenance_plans")
    .delete()
    .eq("project_slug", slug)
    .select(PLAN_COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return data ? toPlan(data as Plan) : null;
}

// --- Cobros mensuales -----------------------------------------------------------

/** slug → id del ingreso de Finanzas generado para el mes `period` (YYYY-MM). */
export async function chargesOf(
  period: string,
): Promise<Map<string, string | null>> {
  const { data, error } = await client()
    .from("panel_maintenance_charges")
    .select("project_slug, finance_id")
    .eq("period", period);
  if (error) fail(error);
  return new Map(
    (data as { project_slug: string; finance_id: string | null }[]).map((r) => [
      r.project_slug,
      r.finance_id,
    ]),
  );
}

/** Estado y fecha de esos ingresos (los que no estén, se borraron en Finanzas). */
export async function chargeEntries(
  ids: string[],
): Promise<Map<string, Pick<Entry, "status" | "occurred_on">>> {
  if (!ids.length) return new Map();
  const { data, error } = await client()
    .from("panel_finance")
    .select("id, status, occurred_on")
    .in("id", ids);
  if (error) fail(error);
  return new Map(
    (
      data as {
        id: string;
        status: Entry["status"] | null;
        occurred_on: string;
      }[]
    ).map((r) => [
      r.id,
      { status: r.status ?? "pagado", occurred_on: r.occurred_on },
    ]),
  );
}

/**
 * Genera los cobros de mantenimiento que falten: un ingreso PENDIENTE en
 * Finanzas por plan activo y mes, con la fecha del día de cobro. Idempotente:
 * la clave (proyecto, mes) de panel_maintenance_charges se reserva antes de
 * crear el ingreso, así dos pestañas o el cron no generan dos. Nunca lo da por
 * cobrado. Devuelve cuántos generó.
 */
export async function ensureCharges(today: string): Promise<number> {
  const c = client();
  const plans = (await listPlans()).filter((p) => p.active);
  if (!plans.length) return 0;
  const { data, error } = await c
    .from("panel_maintenance_charges")
    .select("project_slug, period")
    .in(
      "project_slug",
      plans.map((p) => p.project_slug),
    )
    .order("period", { ascending: false })
    .limit(1000);
  if (error) fail(error);
  const done = new Set(
    (data as { project_slug: string; period: string }[]).map(
      (r) => `${r.project_slug}|${r.period}`,
    ),
  );
  const due = dueCharges(plans, done, today);
  if (!due.length) return 0;

  const { fx, source } = await currentFx();
  if (!fx) {
    console.error(
      "[mantenimiento] sin cotización: los cobros del mes se generan en la próxima visita.",
    );
    return 0;
  }
  let made = 0;
  for (const d of due) {
    const entry = cleanEntry({
      kind: "ingreso",
      category: "mantenimiento",
      currency: d.currency,
      amount: d.amount,
      fx,
      fx_source: source,
      occurred_on: d.due_on,
      description: `Abono de ${monthLabel(d.period)}`,
      project_slug: d.project_slug,
      recurring: false,
      until: null,
      owner: d.owner,
      status: "pendiente",
    });
    if (!entry.ok) {
      console.error(
        "[mantenimiento] cobro inválido:",
        d.project_slug,
        entry.error,
      );
      continue;
    }
    // Reservar el mes: si otro ya lo reservó, no vuelve nada y se saltea.
    const claim = await c
      .from("panel_maintenance_charges")
      .upsert(
        { project_slug: d.project_slug, period: d.period },
        { onConflict: "project_slug,period", ignoreDuplicates: true },
      )
      .select("project_slug");
    if (claim.error) fail(claim.error);
    if (!claim.data?.length) continue;
    // insertEntry reintenta sin las columnas de finance-v5.sql si todavía no se corrió.
    const ins = await insertEntry(entry.value, null).then(
      (data) => ({ data, error: null }),
      (e: unknown) => ({ data: null, error: { message: e instanceof Error ? e.message : String(e) } }),
    );
    if (ins.error || !ins.data) {
      // Sin el ingreso, se libera el mes para reintentar en la próxima.
      await c
        .from("panel_maintenance_charges")
        .delete()
        .eq("project_slug", d.project_slug)
        .eq("period", d.period);
      console.error("[mantenimiento] generar cobro:", ins.error?.message);
      continue;
    }
    const link = await c
      .from("panel_maintenance_charges")
      .update({ finance_id: ins.data.id })
      .eq("project_slug", d.project_slug)
      .eq("period", d.period);
    if (link.error)
      console.error("[mantenimiento] vincular cobro:", link.error.message);
    made++;
  }
  return made;
}

// --- Pedidos de los clientes -------------------------------------------------------

export async function listRequests(slug?: string): Promise<MaintRequest[]> {
  let q = client().from("panel_maintenance_requests").select(REQUEST_COLUMNS);
  if (slug) q = q.eq("project_slug", slug);
  // ponytail: los abiertos + los últimos 300; si la cola crece, paginar los hechos.
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(300);
  if (error) fail(error);
  return data as MaintRequest[];
}

export async function insertRequest(
  input: RequestInput,
  by: LeadOwner,
): Promise<MaintRequest> {
  const { data, error } = await client()
    .from("panel_maintenance_requests")
    .insert({
      ...input,
      created_by: by,
      ...(input.status === "hecho"
        ? { done_at: new Date().toISOString() }
        : {}),
    })
    .select(REQUEST_COLUMNS)
    .single();
  if (error) fail(error);
  return data as MaintRequest;
}

/** Al pasar a «hecho» guarda cuándo; al reabrirlo, lo borra. */
export async function updateRequest(
  id: string,
  patch: RequestInput,
): Promise<{ before: MaintRequest; after: MaintRequest }> {
  const c = client();
  const cur = await c
    .from("panel_maintenance_requests")
    .select(REQUEST_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (cur.error) fail(cur.error);
  if (!cur.data) throw new Error("Ese pedido ya no existe.");
  const before = cur.data as MaintRequest;
  const now = new Date().toISOString();
  const closing =
    patch.status && patch.status !== before.status
      ? { done_at: patch.status === "hecho" ? now : null }
      : {};
  const { data, error } = await c
    .from("panel_maintenance_requests")
    .update({ ...patch, ...closing, updated_at: now })
    .eq("id", id)
    .select(REQUEST_COLUMNS)
    .single();
  if (error) fail(error);
  return { before, after: data as MaintRequest };
}

export async function removeRequest(id: string): Promise<MaintRequest> {
  const { data, error } = await client()
    .from("panel_maintenance_requests")
    .delete()
    .eq("id", id)
    .select(REQUEST_COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Ese pedido ya no existe.");
  return data as MaintRequest;
}
