"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
import { OWNERS, db, type Lead } from "@/lib/admin/db";
import { dateLabel, diff, usd } from "@/lib/admin/changes";
import { PEOPLE } from "@/lib/admin/people";
import { insertPayment, removePayment } from "@/lib/admin/payments";
import type { Payment } from "@/lib/admin/payment-shared";
import { stateForLead, upsertState } from "@/lib/admin/projects";
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

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const MAX_AMOUNT = 10_000_000;

/** Registra un cobro (seña, saldo, cuota) y lo cuenta en el feed del proyecto. */
export async function addPayment(
  slug: string,
  input: { amount: number | string; paid_on: string; note?: string },
): Promise<Payment> {
  const me = await guard();
  const amount = Math.round(Number(input.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) throw new Error("Monto inválido.");
  if (!DAY.test(input.paid_on) || Number.isNaN(new Date(`${input.paid_on}T12:00:00`).getTime())) {
    throw new Error("Fecha inválida.");
  }
  if (!(await getProject(slug))) throw new Error("Ese proyecto no existe.");
  const note = String(input.note ?? "").trim().slice(0, 200);
  const row = await insertPayment({ project_slug: slug, paid_on: input.paid_on, amount, note }, me.who);
  after(() =>
    logEvent({
      actor: me.who,
      kind: "proyecto",
      text: `registró un cobro de ${usd(amount)}${note ? ` (${note})` : ""}`,
      project_slug: slug,
    }),
  );
  return row;
}

export async function deletePayment(id: string): Promise<void> {
  const me = await guard();
  if (!UUID.test(id)) throw new Error("Cobro inválido.");
  const gone = await removePayment(id);
  after(() =>
    logEvent({
      actor: me.who,
      kind: "proyecto",
      text: `borró un cobro de ${usd(gone.amount)} del ${dateLabel(gone.paid_on)}`,
      project_slug: gone.project_slug,
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
