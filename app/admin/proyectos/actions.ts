"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/admin/auth";
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
  uploadTargets,
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
    await logEvent({
      actor: me.who,
      kind: "archivos",
      text: `subió ${ok.length === 1 ? `«${ok[0].name}»` : `${ok.length} archivos`} a ${folderLabel(folder)}`,
      project_slug: slug,
      paths: ok.map((f) => f.path),
    });
    revalidatePath("/admin", "layout");
    return {};
  } catch (e) {
    return { error: message(e) };
  }
}

export async function deleteFile(id: string): Promise<{ error?: string }> {
  try {
    const me = await guard();
    const row = await removeFile(id);
    await logEvent({
      actor: me.who,
      kind: "archivos",
      text: `borró «${row.name}» de ${folderLabel(row.folder)}`,
      project_slug: row.project_slug,
    });
    revalidatePath("/admin", "layout");
    return {};
  } catch (e) {
    return { error: message(e) };
  }
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
  revalidatePath("/admin", "layout");
  redirect(`/admin/proyectos/${slug}`);
}
