"use server";

// Acciones del portal del cliente. Todas sacan el cliente de la COOKIE firmada
// del portal (nunca de un campo del formulario), piden el token anti-CSRF
// atado a esa cookie y re-chequean que lo que tocan sea de sus proyectos.
import { after } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getClient } from "@/lib/admin/clients";
import { notify, notificationsConfigured } from "@/lib/admin/notify";
import { PanelNotReady } from "@/lib/admin/panel";
import {
  clientProjects,
  decideApproval,
  endPortalSession,
  getPortalSession,
  insertClientRequest,
  linkByToken,
  logClientEvent,
  portalSecret,
  startPortalSession,
} from "@/lib/admin/portal";
import { cleanClientRequest, cleanDecision } from "@/lib/admin/portal-shared";
import { checkCsrf, isTokenShape } from "@/lib/admin/portal-token";
import {
  allowRequest,
  clientIp,
  isLimitedStrict,
  recordHit,
} from "@/lib/rate-limit";

export type FormState = { error?: string; ok?: string };

const message = (e: unknown) =>
  e instanceof PanelNotReady || e instanceof Error
    ? e.message
    : "Algo falló. Probá de nuevo.";

// Canje del link: 10 intentos fallidos por IP cada 15 minutos. El token tiene
// 256 bits, así que adivinarlo no es el riesgo; esto frena a quien lo intente.
const REDEEM_FAILS = 10;
const REDEEM_WINDOW_MS = 15 * 60_000;
const UUID = /^[0-9a-f-]{36}$/i;

export async function redeemLink(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  if (!portalSecret())
    return {
      error: "El portal todavía no está activo. Escribinos por WhatsApp.",
    };
  const ip = clientIp(await headers());
  if (await isLimitedStrict("portal_token", ip, REDEEM_FAILS, REDEEM_WINDOW_MS))
    return {
      error: "Demasiados intentos. Esperá unos minutos y probá de nuevo.",
    };
  const token = String(form.get("token") ?? "");
  let link: { id: string; client_id: string } | null = null;
  try {
    link = isTokenShape(token) ? await linkByToken(token) : null;
  } catch (e) {
    console.error("[portal] canje:", message(e));
    return { error: "No pudimos verificar el link. Probá en un rato." };
  }
  if (!link) {
    await recordHit("portal_token", ip);
    return {
      error: "Este link no es válido o ya no está activo. Pedinos uno nuevo.",
    };
  }
  await startPortalSession(link);
  redirect("/portal");
}

export async function logout() {
  await endPortalSession();
  redirect("/portal");
}

/** La sesión + el CSRF + los proyectos del cliente. Tira error si algo no cierra. */
async function guard(form: FormData) {
  const s = await getPortalSession();
  const key = portalSecret();
  if (!s || !key)
    throw new Error("Tu sesión venció: volvé a entrar con el link.");
  if (!checkCsrf(s, key, form.get("csrf")))
    throw new Error("El formulario venció. Recargá la página.");
  // Un tope por cliente para que nadie llene la cola o el registro.
  if (!(await allowRequest("portal_action", s.clientId, 30, 60 * 60_000)))
    throw new Error("Demasiados envíos seguidos. Probá en un rato.");
  const projects = await clientProjects(s.clientId);
  return { s, projects, slugs: projects.map((p) => p.slug) };
}

export async function decide(_: FormState, form: FormData): Promise<FormState> {
  try {
    const { s, projects, slugs } = await guard(form);
    const id = String(form.get("approval") ?? "");
    if (!UUID.test(id)) return { error: "Aprobación inválida." };
    const d = cleanDecision({
      decision: form.get("decision"),
      comment: form.get("comment"),
      signer: form.get("signer"),
    });
    if (!d.ok) return { error: d.error };
    const h = await headers();
    const ip = clientIp(h);
    const a = await decideApproval(slugs, s.clientId, id, d.value, {
      ip,
      ua: h.get("user-agent") ?? "",
    });
    const client = await getClient(s.clientId);
    const project =
      projects.find((p) => p.slug === a.project_slug)?.name ?? a.project_slug;
    const verb =
      d.value.decision === "aprobado" ? "aprobó" : "pidió cambios en";
    after(async () => {
      await logClientEvent(
        `«${client?.name ?? "?"}» (${d.value.signer}, desde el portal) ${verb} «${a.title}» · ronda ${a.round}`,
        a.project_slug,
        [
          {
            field: "decision",
            label: "Decisión",
            before: null,
            after:
              d.value.decision === "aprobado" ? "Aprobado" : "Pidió cambios",
          },
          ...(d.value.comment
            ? [
                {
                  field: "comment",
                  label: "Comentario",
                  before: null,
                  after: d.value.comment.slice(0, 140),
                },
              ]
            : []),
          { field: "ip", label: "IP", before: null, after: ip },
        ],
      );
      if (notificationsConfigured())
        await notify(
          {
            title: `${project}: ${d.value.decision === "aprobado" ? "aprobado" : "pidió cambios"}`,
            message: `${d.value.signer} ${verb} «${a.title}»`,
            path: `/admin/proyectos/${a.project_slug}`,
          },
          4,
        );
    });
    revalidatePath("/portal");
    return {
      ok:
        d.value.decision === "aprobado"
          ? "¡Gracias! Quedó aprobado."
          : "Listo, recibimos tus comentarios.",
    };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function createRequest(
  _: FormState,
  form: FormData,
): Promise<FormState> {
  try {
    const { s, projects, slugs } = await guard(form);
    const r = cleanClientRequest(
      {
        project_slug: form.get("project"),
        title: form.get("title"),
        notes: form.get("notes"),
      },
      new Set(slugs),
    );
    if (!r.ok) return { error: r.error };
    await insertClientRequest(r.value);
    const client = await getClient(s.clientId);
    const project =
      projects.find((p) => p.slug === r.value.project_slug)?.name ??
      r.value.project_slug;
    after(async () => {
      await logClientEvent(
        `«${client?.name ?? "?"}» (desde el portal) pidió «${r.value.title}» en Mantenimiento`,
        r.value.project_slug,
      );
      if (notificationsConfigured())
        await notify(
          {
            title: `Pedido de ${client?.name ?? "un cliente"}`,
            message: `${project}: ${r.value.title}`,
            path: "/admin/mantenimiento",
          },
          3,
        );
    });
    revalidatePath("/portal");
    return { ok: "Recibimos tu pedido. Lo vas a ver acá abajo con su estado." };
  } catch (e) {
    return { error: message(e) };
  }
}
