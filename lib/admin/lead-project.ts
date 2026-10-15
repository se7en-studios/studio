// Pedido ganado → proyecto. Lo usan el botón de la ficha del pedido
// (projectFromLead en app/admin/proyectos/actions.ts, con sesión) y la
// aceptación de una propuesta desde el link público (sin sesión: `actor` es
// quien lleva el pedido). Usa la service role key: sólo servidor.
import { after } from "next/server";
import { OWNERS, db, type Lead, type LeadOwner } from "./db";
import { clientForLead, setProjectClient } from "./clients";
import { stateForLead, upsertState } from "./projects";
import { cleanStateInput } from "./project-shared";
import { PanelNotReady, insertProject, logEvent } from "./panel";

/**
 * Crea el proyecto de un pedido ganado y lo deja vinculado: el cliente (uno
 * que ya exista con el mismo email o nombre, o uno nuevo con el contacto del
 * pedido), monto, responsable y el pedido pasan solos. Las tareas del pedido
 * quedan también en el proyecto; el chat y el historial siguen en el pedido,
 * que queda vinculado (nada se copia). Si el pedido ya tiene proyecto, devuelve
 * ese (dos clicks no crean dos proyectos).
 */
export async function projectForLead(
  leadId: string,
  actor: LeadOwner,
): Promise<string> {
  const existing = await stateForLead(leadId);
  if (existing) return existing;

  const c = db();
  if (!c) throw new Error("Base de datos no configurada.");
  const { data, error } = await c
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ese pedido ya no existe.");
  const lead = data as Lead;
  if (lead.status !== "ganado")
    throw new Error("Primero pasá el pedido a Ganado.");

  // Sin clients.sql el proyecto se crea igual, con el cliente como texto.
  const linked = await clientForLead(lead, actor).catch((e) => {
    if (e instanceof PanelNotReady) return null;
    throw e;
  });

  const name = (lead.company || lead.name).trim().slice(0, 80) || "Proyecto";
  const slug = await insertProject({
    name,
    category: (lead.project_type ?? "").trim().slice(0, 80),
    url: "",
    accent: "#ff4d2e",
    created_by: actor,
  });
  await upsertState(
    slug,
    false,
    cleanStateInput(
      {
        status: "descubrimiento",
        owner: lead.owner ?? actor,
        client:
          linked?.client.name ??
          (lead.company ? `${lead.name} · ${lead.company}` : lead.name),
        lead_id: lead.id,
        budget: lead.value ?? null,
        start_date: new Date().toLocaleDateString("en-CA", {
          timeZone: "America/Argentina/Buenos_Aires",
        }),
        notes: lead.idea ?? "",
      },
      OWNERS,
    ),
    actor,
  );
  if (linked) await setProjectClient(slug, false, linked.client.id, actor);
  // Las tareas del pedido que no son de otro proyecto pasan a verse también en éste.
  const tasks = await c
    .from("panel_tasks")
    .update({ project_slug: slug })
    .eq("lead_id", lead.id)
    .is("project_slug", null);
  if (tasks.error)
    console.error("[proyectos] tareas del pedido:", tasks.error.message);
  after(() =>
    logEvent({
      actor,
      kind: "proyecto",
      text: `creó el proyecto desde el pedido de ${lead.name}${linked?.created ? ` y el cliente «${linked.client.name}»` : linked ? ` para el cliente «${linked.client.name}»` : ""}`,
      project_slug: slug,
      lead_id: lead.id,
      changes: linked
        ? [
            {
              field: "client_id",
              label: "Cliente",
              before: null,
              after: linked.client.name,
            },
          ]
        : [],
    }),
  );
  return slug;
}
