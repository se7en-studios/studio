// Horas livianas (supabase/time.sql): el cronómetro y los tramos de cada socio.
// Usa la service role key: NUNCA importar este archivo desde un componente de cliente.
import type { LeadOwner } from "./db";
import { PanelNotReady, client } from "./panel";
import { manualStart, minutesBetween, type TimeEntry } from "./time-shared";

const COLUMNS =
  "id, who, project_slug, maintenance_request_id, started_at, ended_at, minutes, note";
const NOT_READY = "Falta correr supabase/time.sql en Supabase.";

function fail(e: { code?: string; message: string }): never {
  if (e.code === "PGRST205" || e.code === "42P01")
    throw new PanelNotReady(NOT_READY);
  throw new Error(e.message);
}

/** Los tramos de un proyecto, o todos. */
export async function listTime(slug?: string): Promise<TimeEntry[]> {
  let q = client().from("panel_time").select(COLUMNS);
  if (slug) q = q.eq("project_slug", slug);
  // ponytail: los últimos 3000 tramos alcanzan años de dos personas; si no, filtrar por fecha.
  const { data, error } = await q
    .order("started_at", { ascending: false })
    .limit(3000);
  if (error) fail(error);
  return data as TimeEntry[];
}

/** El cronómetro que tiene corriendo `who`, o null. */
export async function runningOf(who: LeadOwner): Promise<TimeEntry | null> {
  const { data, error } = await client()
    .from("panel_time")
    .select(COLUMNS)
    .eq("who", who)
    .is("ended_at", null)
    .maybeSingle();
  if (error) fail(error);
  return (data as TimeEntry | null) ?? null;
}

/** Frena el cronómetro de `who` (si tiene uno) y devuelve el tramo cerrado. */
export async function stopTimer(who: LeadOwner): Promise<TimeEntry | null> {
  const run = await runningOf(who);
  if (!run) return null;
  const now = new Date();
  const { data, error } = await client()
    .from("panel_time")
    .update({
      ended_at: now.toISOString(),
      minutes: minutesBetween(run.started_at, now.getTime()),
    })
    .eq("id", run.id)
    .is("ended_at", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return (data as TimeEntry | null) ?? null;
}

/**
 * Prende un cronómetro. Uno por persona: si tenía otro corriendo, primero lo
 * frena. El índice único de time.sql cubre dos pestañas a la vez (se reintenta una vez).
 */
export async function startTimer(
  who: LeadOwner,
  slug: string,
  requestId: string | null,
): Promise<{ running: TimeEntry; stopped: TimeEntry | null }> {
  const stopped = await stopTimer(who);
  const insert = () =>
    client()
      .from("panel_time")
      .insert({ who, project_slug: slug, maintenance_request_id: requestId })
      .select(COLUMNS)
      .single();
  let res = await insert();
  if (res.error?.code === "23505") {
    await stopTimer(who);
    res = await insert();
  }
  if (res.error) fail(res.error);
  return { running: res.data as TimeEntry, stopped };
}

export async function insertManual(
  who: LeadOwner,
  slug: string,
  requestId: string | null,
  v: { day: string; minutes: number; note: string },
): Promise<TimeEntry> {
  const start = manualStart(v.day);
  const { data, error } = await client()
    .from("panel_time")
    .insert({
      who,
      project_slug: slug,
      maintenance_request_id: requestId,
      started_at: start,
      ended_at: new Date(Date.parse(start) + v.minutes * 60_000).toISOString(),
      minutes: v.minutes,
      note: v.note,
    })
    .select(COLUMNS)
    .single();
  if (error) fail(error);
  return data as TimeEntry;
}

/** Edita un tramo cerrado propio (fecha, minutos, nota). null si no es suyo o no existe. */
export async function updateOwn(
  who: LeadOwner,
  id: string,
  v: { day: string; minutes: number; note: string },
): Promise<TimeEntry | null> {
  const start = manualStart(v.day);
  const { data, error } = await client()
    .from("panel_time")
    .update({
      started_at: start,
      ended_at: new Date(Date.parse(start) + v.minutes * 60_000).toISOString(),
      minutes: v.minutes,
      note: v.note,
    })
    .eq("id", id)
    .eq("who", who)
    .not("ended_at", "is", null)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return (data as TimeEntry | null) ?? null;
}

/** Borra un tramo propio. null si no es suyo o no existe. */
export async function removeOwn(
  who: LeadOwner,
  id: string,
): Promise<TimeEntry | null> {
  const { data, error } = await client()
    .from("panel_time")
    .delete()
    .eq("id", id)
    .eq("who", who)
    .select(COLUMNS)
    .maybeSingle();
  if (error) fail(error);
  return (data as TimeEntry | null) ?? null;
}
