// Portal del cliente (supabase/portal.sql): links de acceso, sesión del portal,
// aprobaciones y los datos que ve el cliente. Usa la service role key: NUNCA
// importar este archivo desde un componente de cliente.
//
// Regla de seguridad: toda lectura o escritura del lado del portal recibe el
// client_id de la SESIÓN (nunca uno que venga del navegador) y filtra por los
// proyectos de ese cliente en la consulta misma.
import { cache } from "react";
import { cookies } from "next/headers";
import type { Change } from "./changes";
import type { LeadOwner } from "./db";
import type { Plan } from "./maintenance-shared";
import { PanelNotReady, client as sb, projectNames, sign } from "./panel";
import type { MaintRequest } from "./maintenance-shared";
import { defaultState, type ProjectStatus } from "./project-shared";
import {
  clientCharges,
  clientFiles,
  type Approval,
  type ApprovalDecision,
  type ApprovalInput,
  type ChargeRow,
  type Decision,
  type FileRow,
} from "./portal-shared";
import {
  csrfToken,
  hashToken,
  newToken,
  parseSession,
  portalKey,
  sessionHours,
  sessionValue,
} from "./portal-token";
import type { SiteCheck } from "./site-health-shared";

const NOT_READY = "Falta correr supabase/portal.sql en Supabase.";
const COOKIE = "se7en_portal";
const TOUCH_MS = 10 * 60_000;

const missing = (e: { code?: string; message?: string }) =>
  e.code === "PGRST205" ||
  e.code === "42P01" ||
  e.code === "42703" ||
  e.code === "PGRST204";

function fail(e: { code?: string; message: string }): never {
  if (missing(e)) throw new PanelNotReady(NOT_READY);
  throw new Error(e.message);
}

export const portalSecret = () => portalKey(process.env);

// --- Links (desde el panel) -----------------------------------------------------

export type PortalLink = {
  id: string;
  created_at: string;
  created_by: LeadOwner | null;
  last_used_at: string | null;
};

export async function getLink(clientId: string): Promise<PortalLink | null> {
  const { data, error } = await sb()
    .from("panel_portal_links")
    .select("id, created_at, created_by, last_used_at")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) fail(error);
  return (data as PortalLink | null) ?? null;
}

/** Link nuevo: borra el anterior (y con él las sesiones abiertas) y devuelve el token, que no se guarda. */
export async function createLink(
  clientId: string,
  by: LeadOwner,
): Promise<string> {
  await revokeLink(clientId);
  const token = newToken();
  const { error } = await sb()
    .from("panel_portal_links")
    .insert({
      client_id: clientId,
      token_hash: hashToken(token),
      created_by: by,
    });
  if (error) fail(error);
  return token;
}

export async function revokeLink(clientId: string): Promise<boolean> {
  const { data, error } = await sb()
    .from("panel_portal_links")
    .delete()
    .eq("client_id", clientId)
    .select("id");
  if (error) fail(error);
  return Boolean(data?.length);
}

// --- Sesión del portal ---------------------------------------------------------

/** El link de ese token, o null. Se busca por el hash: el token nunca toca la base. */
export async function linkByToken(
  token: string,
): Promise<{ id: string; client_id: string } | null> {
  const { data, error } = await sb()
    .from("panel_portal_links")
    .select("id, client_id")
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (error) fail(error);
  return (data as { id: string; client_id: string } | null) ?? null;
}

export async function startPortalSession(link: {
  id: string;
  client_id: string;
}) {
  const key = portalSecret();
  if (!key) throw new Error("Portal apagado.");
  const exp =
    Date.now() + sessionHours(process.env.PORTAL_SESSION_HOURS) * 3_600_000;
  // Cookie propia, separada de la del panel (otra clave, otro nombre, sólo en /portal).
  (await cookies()).set(
    COOKIE,
    sessionValue(link.id, link.client_id, exp, key),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/portal",
      expires: new Date(exp),
    },
  );
  await sb()
    .from("panel_portal_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", link.id);
}

export async function endPortalSession() {
  (await cookies()).delete({ name: COOKIE, path: "/portal" });
}

export type PortalSession = { clientId: string; csrf: string; mac: string };

/**
 * La sesión del portal o null. Además de la firma y el vencimiento, el link
 * tiene que seguir existiendo para ese cliente: revocarlo o regenerarlo corta
 * las sesiones abiertas en el acto.
 */
export const getPortalSession = cache(
  async function getPortalSession(): Promise<PortalSession | null> {
    const key = portalSecret();
    if (!key) return null;
    const s = parseSession((await cookies()).get(COOKIE)?.value, key);
    if (!s) return null;
    const { data, error } = await sb()
      .from("panel_portal_links")
      .select("id, last_used_at")
      .eq("id", s.linkId)
      .eq("client_id", s.clientId)
      .maybeSingle();
    if (error) {
      if (!missing(error)) console.error("[portal] sesión:", error.message);
      return null;
    }
    if (!data) return null;
    const last = (data as { last_used_at: string | null }).last_used_at;
    if (!last || Date.now() - Date.parse(last) > TOUCH_MS)
      await sb()
        .from("panel_portal_links")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", s.linkId);
    return { clientId: s.clientId, csrf: csrfToken(s, key), mac: s.mac };
  },
);

// --- Lo que ve el cliente ---------------------------------------------------------

export type PortalProject = {
  slug: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  due: string | null;
};

/** Los proyectos del cliente de la sesión. Es la lista que acota todo lo demás. */
export async function clientProjects(
  clientId: string,
): Promise<PortalProject[]> {
  const { data, error } = await sb()
    .from("panel_project_state")
    .select("slug, status, progress, due")
    .eq("client_id", clientId)
    .limit(100);
  if (error) fail(error);
  const names = await projectNames();
  return (
    data as {
      slug: string;
      status: ProjectStatus;
      progress: number | string;
      due: string | null;
    }[]
  ).map((r) => ({
    slug: r.slug,
    name: names[r.slug] ?? r.slug,
    status: r.status ?? defaultState(r.slug, false).status,
    progress: Number(r.progress ?? 0),
    due: r.due,
  }));
}

export type PortalFile = {
  id: string;
  name: string;
  mime: string;
  size: number;
  created_at: string;
  project_slug: string;
  url: string | null;
};

const REQUEST_COLUMNS =
  "id, created_at, updated_at, project_slug, title, notes, priority, status, minutes, due, done_at, created_by";

/** Todo lo del portal en paralelo. Lo que falte (una tabla sin crear) llega vacío. */
export async function portalData(slugs: string[], today: string, ym: string) {
  const c = sb();
  const set = new Set(slugs);
  const empty =
    <T>(label: string) =>
    (r: {
      data: unknown;
      error: { code?: string; message: string } | null;
    }): T[] => {
      if (r.error) {
        if (!missing(r.error))
          console.error(`[portal] ${label}:`, r.error.message);
        return [];
      }
      return r.data as T[];
    };
  if (!slugs.length)
    return {
      approvals: [],
      decisions: [],
      requests: [],
      files: [],
      charges: [],
      plans: [],
      checks: [],
      approvalFiles: new Map<string, string>(),
    };
  const monthStart = `${ym}-01T00:00:00Z`;
  const [approvals, requests, files, finance, plans, checks] =
    await Promise.all([
      c
        .from("panel_approvals")
        .select(
          "id, created_at, updated_at, project_slug, title, description, link, file_id, round, status, requested_by",
        )
        .in("project_slug", slugs)
        .order("created_at", { ascending: false })
        .limit(200)
        .then(empty<Approval>("aprobaciones")),
      c
        .from("panel_maintenance_requests")
        .select(REQUEST_COLUMNS)
        .in("project_slug", slugs)
        .order("created_at", { ascending: false })
        .limit(300)
        .then(empty<MaintRequest>("pedidos")),
      c
        .from("panel_files")
        .select(
          "id, created_at, project_slug, name, mime, size, path, client_visible",
        )
        .in("project_slug", slugs)
        .eq("client_visible", true)
        .order("created_at", { ascending: false })
        .limit(200)
        .then(empty<FileRow>("archivos")),
      readCharges(slugs),
      c
        .from("panel_maintenance_plans")
        .select("project_slug, hours_included, active")
        .in("project_slug", slugs)
        .then(
          empty<Pick<Plan, "project_slug" | "hours_included" | "active">>(
            "planes",
          ),
        ),
      c
        .from("panel_site_checks")
        .select("project_slug, checked_at, ok, ms, status_code")
        .in("project_slug", slugs)
        .gte("checked_at", monthStart)
        .order("checked_at", { ascending: false })
        .limit(2000)
        .then(empty<SiteCheck>("salud")),
    ]);
  const mineApprovals = approvals.filter((a) => set.has(a.project_slug));
  const decisions = mineApprovals.length
    ? await c
        .from("panel_approval_decisions")
        .select(
          "id, created_at, approval_id, round, decision, comment, signer, ip",
        )
        .in(
          "approval_id",
          mineApprovals.map((a) => a.id),
        )
        .order("created_at")
        .then(empty<ApprovalDecision>("decisiones"))
    : [];
  // Archivos adjuntos a las aprobaciones: se firman aunque no estén marcados, pedir la aprobación ya es compartirlos.
  const fileIds = mineApprovals
    .map((a) => a.file_id)
    .filter((x): x is string => Boolean(x));
  const attached = fileIds.length
    ? await c
        .from("panel_files")
        .select("id, path, project_slug")
        .in("id", fileIds)
        .in("project_slug", slugs)
        .then(
          empty<{ id: string; path: string; project_slug: string }>("adjuntos"),
        )
    : [];
  const visible = clientFiles(files, set);
  const urls = await sign([
    ...visible.map((f) => f.path),
    ...attached.map((f) => f.path),
  ]);
  return {
    approvals: mineApprovals,
    decisions,
    requests,
    files: visible.map(
      ({ path, client_visible: _v, ...f }) => (
        void _v,
        { ...f, size: Number(f.size), url: urls.get(path) ?? null }
      ),
    ) as PortalFile[],
    charges: clientCharges(finance, set, today),
    plans: plans.map((p) => ({
      ...p,
      hours_included:
        p.hours_included == null ? null : Number(p.hours_included),
    })),
    checks,
    approvalFiles: new Map(
      attached.flatMap((f) =>
        urls.get(f.path) ? [[f.id, urls.get(f.path) as string] as const] : [],
      ),
    ),
  };
}

/** Ingresos de esos proyectos con las columnas que el cliente puede ver (sin finance-v2 no hay estado: cuentan cobrados). */
async function readCharges(slugs: string[]): Promise<ChargeRow[]> {
  const base =
    "id, kind, occurred_on, currency, amount, description, project_slug, recurring";
  const run = (cols: string) =>
    sb()
      .from("panel_finance")
      .select(cols)
      .eq("kind", "ingreso")
      .in("project_slug", slugs)
      .order("occurred_on", { ascending: false })
      .limit(500);
  let res = await run(`${base}, status`);
  if (res.error?.code === "42703") res = await run(base);
  if (res.error) {
    if (!missing(res.error))
      console.error("[portal] cobros:", res.error.message);
    return [];
  }
  return res.data as unknown as ChargeRow[];
}

// --- Acciones del cliente -----------------------------------------------------------

/** Registra la decisión. La aprobación tiene que ser de un proyecto del cliente y estar pendiente. */
export async function decideApproval(
  slugs: string[],
  clientId: string,
  approvalId: string,
  d: { decision: Decision; comment: string; signer: string },
  meta: { ip: string; ua: string },
): Promise<Approval> {
  const c = sb();
  const cur = await c
    .from("panel_approvals")
    .select("id, project_slug, title, round, status")
    .eq("id", approvalId)
    .in("project_slug", slugs)
    .maybeSingle();
  if (cur.error) fail(cur.error);
  const a = cur.data as Pick<
    Approval,
    "id" | "project_slug" | "title" | "round" | "status"
  > | null;
  if (!a) throw new Error("Esa aprobación no existe.");
  if (a.status !== "pendiente")
    throw new Error("Esa aprobación ya tiene respuesta.");
  // Sólo pasa si sigue pendiente en esa misma ronda: dos clics no registran dos decisiones.
  const upd = await c
    .from("panel_approvals")
    .update({ status: d.decision, updated_at: new Date().toISOString() })
    .eq("id", a.id)
    .eq("status", "pendiente")
    .eq("round", a.round)
    .select(
      "id, created_at, updated_at, project_slug, title, description, link, file_id, round, status, requested_by",
    )
    .maybeSingle();
  if (upd.error) fail(upd.error);
  if (!upd.data) throw new Error("Esa aprobación ya tiene respuesta.");
  const ins = await c.from("panel_approval_decisions").insert({
    approval_id: a.id,
    round: a.round,
    decision: d.decision,
    comment: d.comment,
    signer: d.signer,
    client_id: clientId,
    ip: meta.ip.slice(0, 64),
    user_agent: meta.ua.slice(0, 300),
  });
  if (ins.error) {
    // Sin el registro no vale la decisión: se vuelve a pendiente.
    await c
      .from("panel_approvals")
      .update({ status: "pendiente" })
      .eq("id", a.id);
    fail(ins.error);
  }
  return upd.data as Approval;
}

/** Pedido de mantenimiento del cliente: a la cola de siempre, con origen «cliente». */
export async function insertClientRequest(r: {
  project_slug: string;
  title: string;
  notes: string;
}): Promise<void> {
  const c = sb();
  let { error } = await c
    .from("panel_maintenance_requests")
    .insert({ ...r, source: "cliente" });
  // Sin portal.sql no está la columna de origen: entra igual (created_by vacío = vino del cliente).
  if (error && (error.code === "42703" || error.code === "PGRST204"))
    ({ error } = await c.from("panel_maintenance_requests").insert(r));
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01")
      throw new PanelNotReady(
        "Falta correr supabase/maintenance.sql en Supabase.",
      );
    throw new Error(error.message);
  }
}

/**
 * Línea en el Registro por algo que hizo el cliente (sin socio: actor vacío).
 * Nunca rompe la acción: si falla, queda en el log.
 */
export async function logClientEvent(
  text: string,
  slug: string,
  changes: Change[] = [],
) {
  const c = sb();
  const row = {
    actor: null,
    kind: "proyecto",
    text,
    project_slug: slug,
    paths: [],
  };
  let { error } = await c.from("panel_events").insert({ ...row, changes });
  if (error && (error.code === "42703" || error.code === "PGRST204"))
    ({ error } = await c.from("panel_events").insert(row));
  if (error) console.error("[portal] registro:", error.message);
}

// --- Aprobaciones y archivos (desde el panel) ---------------------------------------

export async function listApprovals(
  slug: string,
): Promise<{ approvals: Approval[]; decisions: ApprovalDecision[] }> {
  const c = sb();
  const { data, error } = await c
    .from("panel_approvals")
    .select(
      "id, created_at, updated_at, project_slug, title, description, link, file_id, round, status, requested_by",
    )
    .eq("project_slug", slug)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) fail(error);
  const approvals = data as Approval[];
  if (!approvals.length) return { approvals, decisions: [] };
  const d = await c
    .from("panel_approval_decisions")
    .select("id, created_at, approval_id, round, decision, comment, signer, ip")
    .in(
      "approval_id",
      approvals.map((a) => a.id),
    )
    .order("created_at");
  if (d.error) fail(d.error);
  return { approvals, decisions: d.data as ApprovalDecision[] };
}

export async function insertApproval(
  slug: string,
  input: ApprovalInput,
  by: LeadOwner,
): Promise<Approval> {
  if (input.file_id) await assertFileOf(slug, input.file_id);
  const { data, error } = await sb()
    .from("panel_approvals")
    .insert({ ...input, project_slug: slug, requested_by: by })
    .select(
      "id, created_at, updated_at, project_slug, title, description, link, file_id, round, status, requested_by",
    )
    .single();
  if (error) fail(error);
  return data as Approval;
}

/** Nueva versión tras «pidió cambios»: misma aprobación, ronda + 1, de nuevo pendiente. */
export async function newRound(
  id: string,
  slug: string,
  input: ApprovalInput,
): Promise<Approval> {
  if (input.file_id) await assertFileOf(slug, input.file_id);
  const c = sb();
  const cur = await c
    .from("panel_approvals")
    .select("round, status")
    .eq("id", id)
    .eq("project_slug", slug)
    .maybeSingle();
  if (cur.error) fail(cur.error);
  const a = cur.data as { round: number; status: string } | null;
  if (!a) throw new Error("Esa aprobación ya no existe.");
  if (a.status !== "cambios")
    throw new Error("Sólo se pide otra ronda cuando el cliente pidió cambios.");
  const { data, error } = await c
    .from("panel_approvals")
    .update({
      ...input,
      round: a.round + 1,
      status: "pendiente",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "cambios")
    .select(
      "id, created_at, updated_at, project_slug, title, description, link, file_id, round, status, requested_by",
    )
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("La aprobación cambió mientras tanto. Recargá.");
  return data as Approval;
}

/** Sólo se borra si el cliente todavía no respondió nada: el registro de decisiones no se toca. */
export async function removeApproval(
  id: string,
  slug: string,
): Promise<string> {
  const c = sb();
  const d = await c
    .from("panel_approval_decisions")
    .select("id", { count: "exact", head: true })
    .eq("approval_id", id);
  if (d.error) fail(d.error);
  if (d.count)
    throw new Error("Ya tiene respuestas del cliente: queda en el registro.");
  const { data, error } = await c
    .from("panel_approvals")
    .delete()
    .eq("id", id)
    .eq("project_slug", slug)
    .select("title")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Esa aprobación ya no existe.");
  return (data as { title: string }).title;
}

async function assertFileOf(slug: string, fileId: string) {
  const { data, error } = await sb()
    .from("panel_files")
    .select("id")
    .eq("id", fileId)
    .eq("project_slug", slug)
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Ese archivo no es de este proyecto.");
}

/** Archivos del proyecto (id y nombre) para adjuntar a una aprobación. */
export async function fileOptions(
  slug: string,
): Promise<{ id: string; name: string }[]> {
  const { data, error } = await sb()
    .from("panel_files")
    .select("id, name")
    .eq("project_slug", slug)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) fail(error);
  return data as { id: string; name: string }[];
}

/** ids de los archivos marcados «lo ve el cliente»; null si falta portal.sql (el panel no muestra el botón). */
export async function sharedFileIds(slug: string): Promise<Set<string> | null> {
  const { data, error } = await sb()
    .from("panel_files")
    .select("id")
    .eq("project_slug", slug)
    .eq("client_visible", true)
    .limit(500);
  if (error) {
    if (!missing(error))
      console.error("[portal] archivos visibles:", error.message);
    return null;
  }
  return new Set((data as { id: string }[]).map((r) => r.id));
}

export async function setFileVisible(
  id: string,
  on: boolean,
): Promise<{ name: string; project_slug: string }> {
  const { data, error } = await sb()
    .from("panel_files")
    .update({ client_visible: on })
    .eq("id", id)
    .select("name, project_slug")
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error("Ese archivo ya no existe.");
  return data as { name: string; project_slug: string };
}

