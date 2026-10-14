"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import { OWNERS, db, type Lead } from "@/lib/admin/db";
import { dateLabel, diff, usd } from "@/lib/admin/changes";
import { PEOPLE } from "@/lib/admin/people";
import { paymentNotice } from "@/lib/admin/digest";
import { notifyPartner } from "@/lib/admin/notify";
import { currentFx, insertEntry, removeEntry } from "@/lib/admin/finance";
import { cleanEntry, fmt, type Entry, type Owner } from "@/lib/admin/finance-shared";
import { removePayment } from "@/lib/admin/payments";
import { stateForLead, upsertState } from "@/lib/admin/projects";
import { TASK_TEMPLATES, isTemplate, templateTasks } from "@/lib/admin/task-shared";
import { insertTasks } from "@/lib/admin/tasks";
import {
  PROJECT_STATUS,
  cleanStateInput,
  type ProjectState,
  type ProjectStateInput,
  type ProjectStatus,
} from "@/lib/admin/project-shared";
import {
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_BYTES,
  PanelNotReady,
  folderLabel,
  getProject,
  insertFiles,
  insertProject,
  isFolder,
  logEvent,
  removeFile,
  updateProjectRow,
  removeProject,
  uploadTargets,
  type ProjectRow,
} from "@/lib/admin/panel";

type FileInfo = { name: string; size: number; type: string };

async function guard() {
  const me = await getSession();
  if (!me) throw new Error("Sesión vencida: volvé a entrar.");
  return me;
}

function message(e: unknown) {
  return e instanceof PanelNotReady || e instanceof Error ? e.message : "Algo falló. Probá de nuevo.";
}

/** Paso 1 de la subida: una URL firmada por archivo. El archivo no pasa por acá. */
export async function prepareUpload(
  slug: string,
  folder: string,
  files: FileInfo[],
): Promise<{ targets?: { path: string; url: string }[]; error?: string }> {
  try {
    await guard();
    if (!isFolder(folder)) return { error: "Carpeta inválida." };
    if (!files.length || files.length > MAX_FILES_PER_UPLOAD) return { error: `Hasta ${MAX_FILES_PER_UPLOAD} archivos por vez.` };
    if (files.some((f) => f.size > MAX_FILE_BYTES)) return { error: "Hay un archivo de más de 50 MB." };
    if (!(await getProject(slug))) return { error: "Ese proyecto no existe." };
    return { targets: await uploadTargets(slug, folder, files.map((f) => f.name)) };
  } catch (e) {
    return { error: message(e) };
  }
}

/** Paso 2: lo que llegó bien a Storage queda registrado y suma una línea al feed. */
export async function finishUpload(
  slug: string,
  folder: string,
  files: (FileInfo & { path: string })[],
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    if (!isFolder(folder)) return { error: "Carpeta inválida." };
    // Sólo rutas que preparó prepareUpload para este proyecto y esta carpeta.
    const ok = files.filter((f) => f.path.startsWith(`${slug}/${folder}/`) && !f.path.includes(".."));
    if (!ok.length) return {};
    await insertFiles(
      ok.map((f) => ({
        project_slug: slug,
        folder,
        path: f.path,
        name: f.name.slice(0, 200),
        mime: f.type.slice(0, 100),
        size: Math.max(0, Math.round(f.size)),
        uploaded_by: me.who,
      })),
    );
    after(() =>
      logEvent({
        actor: me.who,
        kind: "archivos",
        text: `subió ${ok.length === 1 ? `«${ok[0].name}»` : `${ok.length} archivos`} a ${folderLabel(folder)}`,
        project_slug: slug,
        paths: ok.map((f) => f.path),
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteFile(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    const row = await removeFile(id);
    after(() =>
      logEvent({
        actor: me.who,
        kind: "archivos",
        text: `borró «${row.name}» de ${folderLabel(row.folder)}`,
        project_slug: row.project_slug,
      }),
    );
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

/**
 * Borra un proyecto creado desde el panel. Los casos de la web los rechaza
 * removeProject: el botón no se muestra para ellos, pero la acción igual se
 * defiende sola.
 */
export async function deleteProject(slug: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    const { name, files } = await removeProject(slug);
    // Sin project_slug a propósito: el proyecto ya no existe y el feed dejaría
    // un link a una página que devuelve 404.
    await logEvent({
      actor: me.who,
      kind: "proyecto",
      text: files
        ? `borró el proyecto «${name}» y sus ${files} archivo${files === 1 ? "" : "s"}`
        : `borró el proyecto «${name}»`,
    });
  } catch (e) {
    return { error: message(e) };
  }
  redirect("/admin/proyectos");
}

export type NewProjectState = { error?: string };

export async function createProject(_: NewProjectState, form: FormData): Promise<NewProjectState> {
  let slug: string;
  try {
    const me = await guard();
    const name = String(form.get("name") ?? "").trim().slice(0, 80);
    const category = String(form.get("category") ?? "").trim().slice(0, 80);
    let url = String(form.get("url") ?? "").trim().slice(0, 300);
    const accent = String(form.get("accent") ?? "#ff4d2e");
    if (!name) return { error: "Poné un nombre." };
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    slug = await insertProject({
      name,
      category,
      url,
      accent: /^#[0-9a-f]{6}$/i.test(accent) ? accent : "#ff4d2e",
      created_by: me.who,
    });
    await logEvent({ actor: me.who, kind: "proyecto", text: "creó el proyecto", project_slug: slug });
    const template = form.get("template");
    if (isTemplate(template)) {
      // El proyecto ya está creado: si las tareas fallan (falta tasks.sql), se sigue igual.
      const n = await insertTasks(templateTasks(template, slug), me.who).catch(() => 0);
      if (n)
        after(() =>
          logEvent({
            actor: me.who,
            kind: "tarea",
            text: `cargó ${n} tareas de la plantilla ${TASK_TEMPLATES[template].label}`,
            project_slug: slug,
          }),
        );
    }
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/admin/proyectos/${slug}`);
}

const person = (v: unknown) => (v ? PEOPLE[v as keyof typeof PEOPLE]?.name ?? String(v) : "Sin asignar");

/**
 * Etapa, responsable, fechas, avance, cliente, monto y notas de un proyecto.
 * Devuelve el estado guardado; el registro cuenta el antes y el después.
 */
export async function updateProjectState(slug: string, patch: ProjectStateInput): Promise<ProjectState> {
  const me = await guard();
  const project = await getProject(slug);
  if (!project) throw new Error("Ese proyecto no existe.");
  const clean = cleanStateInput(patch, OWNERS);
  const { before, after: saved } = await upsertState(slug, project.isCase, clean, me.who);
  const changes = diff<ProjectState>(before, clean, [
    { field: "status", label: "Etapa", format: (v) => PROJECT_STATUS[v as ProjectStatus]?.label ?? String(v) },
    { field: "owner", label: "Responsable", format: person },
    { field: "progress", label: "Avance", format: (v) => `${v}%` },
    { field: "due", label: "Entrega", format: dateLabel },
    { field: "start_date", label: "Inicio", format: dateLabel },
    { field: "client", label: "Cliente" },
    { field: "budget", label: "Monto", format: usd },
    { field: "notes", label: "Notas", long: true },
  ]);
  if ("lead_id" in clean && (before.lead_id ?? null) !== (clean.lead_id ?? null)) {
    changes.push({ field: "lead_id", label: "Pedido vinculado", before: before.lead_id ? "vinculado" : null, after: clean.lead_id ? "vinculado" : null });
  }
  if (changes.length) {
    const only = changes.length === 1 ? changes[0] : null;
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text:
          only?.field === "status"
            ? `pasó el proyecto a ${only.after}`
            : `actualizó ${changes.map((c) => c.label.toLowerCase()).join(", ")}`,
        project_slug: slug,
        lead_id: saved.lead_id,
        changes,
      }),
    );
  }
  return saved;
}

/** Nombre, tipo, sitio y color de un proyecto del panel (los casos se editan en el código). */
export async function updateProjectInfo(
  slug: string,
  patch: Partial<Pick<ProjectRow, "name" | "category" | "url" | "accent">>,
): Promise<{ error?: string }> {
  try {
    const me = await guard();
    const clean: typeof patch = {};
    if (patch.name !== undefined) {
      clean.name = String(patch.name).trim().slice(0, 80);
      if (!clean.name) return { error: "El nombre no puede quedar vacío." };
    }
    if (patch.category !== undefined) clean.category = String(patch.category).trim().slice(0, 80);
    if (patch.url !== undefined) {
      let url = String(patch.url).trim().slice(0, 300);
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      clean.url = url;
    }
    if (patch.accent !== undefined) {
      if (!/^#[0-9a-f]{6}$/i.test(patch.accent)) return { error: "Color inválido." };
      clean.accent = patch.accent;
    }
    const { before } = await updateProjectRow(slug, clean);
    const changes = diff<ProjectRow>(before, clean, [
      { field: "name", label: "Nombre" },
      { field: "category", label: "Tipo" },
      { field: "url", label: "Sitio" },
      { field: "accent", label: "Color" },
    ]);
    if (changes.length) {
      after(() =>
        logEvent({
          actor: me.who,
          kind: "proyecto",
          text: `editó ${changes.map((c) => c.label.toLowerCase()).join(", ")}`,
          project_slug: slug,
          changes,
        }),
      );
    }
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

// --- Cobros ----------------------------------------------------------------

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Registra un cobro (seña, saldo, cuota, abono) como ingreso de Finanzas con el
 * proyecto: es el mismo número que suman Inicio, Finanzas y la ficha. Va en
 * dólares con la cotización de hoy, para tener el equivalente en pesos.
 */
export async function addPayment(
  slug: string,
  input: { amount: number | string; paid_on: string; note?: string; owner?: Owner; category?: string },
): Promise<Entry> {
  const me = await guard();
  if (!(await getProject(slug))) throw new Error("Ese proyecto no existe.");
  const fx = await currentFx();
  if (!fx) throw new Error("No pude traer la cotización del dólar: cargá el cobro desde Finanzas, con la cotización a mano.");
  const cleaned = cleanEntry({
    kind: "ingreso",
    currency: "USD",
    amount: Number(input.amount),
    fx,
    occurred_on: input.paid_on,
    category: input.category === "mantenimiento" ? "mantenimiento" : "proyecto",
    description: input.note ?? "",
    project_slug: slug,
    recurring: false,
    until: null,
    // Quién cobró la plata: de ahí sale quién le debe a quién (todo se divide 50/50).
    owner: input.owner,
    status: "pagado",
  });
  if (!cleaned.ok) throw new Error(cleaned.error);
  const entry = await insertEntry(cleaned.value, me.who);
  after(() =>
    logEvent({
      actor: me.who,
      kind: "finanzas",
      text: `registró un cobro de ${usd(entry.amount)}${entry.description ? ` (${entry.description})` : ""}`,
      project_slug: slug,
    }),
  );
  after(() => notifyPartner(me.who, paymentNotice(PEOPLE[me.who].name)));
  return entry;
}

/** Borra un cobro: un ingreso de Finanzas o, si es de antes de finance-v4.sql, uno de la tabla vieja («cobro-<id>»). */
export async function deletePayment(id: string): Promise<void> {
  const me = await guard();
  const legacy = id.startsWith("cobro-");
  const raw = legacy ? id.slice("cobro-".length) : id;
  if (!UUID.test(raw)) throw new Error("Cobro inválido.");
  const gone = legacy
    ? await removePayment(raw).then((p) => ({ amount: fmt(p.amount, "USD"), day: p.paid_on, slug: p.project_slug }))
    : await removeEntry(raw).then((e) => e && { amount: fmt(e.amount, e.currency), day: e.occurred_on, slug: e.project_slug });
  if (!gone) throw new Error("Ese cobro ya no existe.");
  after(() =>
    logEvent({
      actor: me.who,
      kind: "finanzas",
      text: `borró un cobro de ${gone.amount} del ${dateLabel(gone.day)}`,
      project_slug: gone.slug,
    }),
  );
}

// --- Pedido ganado → proyecto ------------------------------------------------

/**
 * Crea el proyecto de un pedido ganado y lo deja vinculado: cliente, monto,
 * responsable y el pedido pasan solos. Si el pedido ya tiene proyecto,
 * devuelve ese (dos clicks no crean dos proyectos).
 */
export async function projectFromLead(leadId: string): Promise<{ slug?: string; error?: string }> {
  try {
    const me = await guard();
    if (!UUID.test(leadId)) return { error: "Pedido inválido." };
    const existing = await stateForLead(leadId);
    if (existing) return { slug: existing };

    const c = db();
    if (!c) return { error: "Base de datos no configurada." };
    const { data, error } = await c.from("leads").select("*").eq("id", leadId).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "Ese pedido ya no existe." };
    const lead = data as Lead;
    if (lead.status !== "ganado") return { error: "Primero pasá el pedido a Ganado." };

    const name = (lead.company || lead.name).trim().slice(0, 80) || "Proyecto";
    const slug = await insertProject({
      name,
      category: (lead.project_type ?? "").trim().slice(0, 80),
      url: "",
      accent: "#ff4d2e",
      created_by: me.who,
    });
    await upsertState(
      slug,
      false,
      cleanStateInput(
        {
          status: "descubrimiento",
          owner: lead.owner ?? me.who,
          client: lead.company ? `${lead.name} · ${lead.company}` : lead.name,
          lead_id: lead.id,
          budget: lead.value ?? null,
          start_date: new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }),
          notes: lead.idea ?? "",
        },
        OWNERS,
      ),
      me.who,
    );
    after(() =>
      logEvent({
        actor: me.who,
        kind: "proyecto",
        text: `creó el proyecto desde el pedido de ${lead.name}`,
        project_slug: slug,
        lead_id: lead.id,
      }),
    );
    return { slug };
  } catch (e) {
    return { error: message(e) };
  }
}
