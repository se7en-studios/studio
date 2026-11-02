"use server";

// Sin revalidatePath: la pantalla de plantillas vuelve a leer con router.refresh().
import { requireSession } from "@/lib/admin/auth";
import {
  BODY_MAX,
  NAME_MAX,
  type ProspectTemplate,
  type TemplateKind,
} from "@/lib/admin/prospect-template-shared";
import {
  insertTemplate,
  patchTemplate,
  removeTemplate,
} from "@/lib/admin/prospect-templates";

const UUID = /^[0-9a-f-]{36}$/i;
function checkId(id: string) {
  if (!UUID.test(id)) throw new Error("Plantilla inválida.");
}

/** Nombre y texto con sus límites; si falta algo, el error se lo muestra tal cual. */
function clean(input: { name?: string; body?: string }) {
  const out: { name?: string; body?: string } = {};
  if (input.name !== undefined) {
    out.name = input.name.trim().slice(0, NAME_MAX);
    if (!out.name) throw new Error("Poné un nombre para la plantilla.");
  }
  if (input.body !== undefined) {
    out.body = input.body.trim().slice(0, BODY_MAX);
    if (!out.body) throw new Error("El mensaje no puede estar vacío.");
  }
  return out;
}

export async function createTemplate(input: {
  name: string;
  body: string;
  kind: TemplateKind;
}): Promise<ProspectTemplate> {
  const me = await requireSession();
  if (input.kind !== "primero" && input.kind !== "seguimiento") throw new Error("Tipo de plantilla inválido.");
  const c = clean(input);
  return insertTemplate({ name: c.name!, body: c.body!, kind: input.kind }, me.who);
}

export async function updateTemplate(
  id: string,
  patch: { name?: string; body?: string; active?: boolean },
): Promise<ProspectTemplate> {
  const me = await requireSession();
  checkId(id);
  return patchTemplate(
    id,
    {
      ...clean(patch),
      ...(patch.active === undefined ? {} : { active: patch.active === true }),
    },
    me.who,
  );
}

export async function deleteTemplate(id: string): Promise<void> {
  await requireSession();
  checkId(id);
  await removeTemplate(id);
}
