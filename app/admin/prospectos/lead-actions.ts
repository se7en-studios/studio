"use server";

// Cargar, editar y borrar prospectos propios. La pantalla vuelve a leer con router.refresh().
import type { ProspectLead } from "@/data/prospects";
import { requireSession } from "@/lib/admin/auth";
import {
  cleanProspect,
  type ProspectInput,
} from "@/lib/admin/prospect-lead-shared";
import {
  insertCustomLead,
  patchCustomLead,
  removeCustomLead,
} from "@/lib/admin/prospect-leads";

const UUID = /^[0-9a-f-]{36}$/i;
function checkId(id: string) {
  if (!UUID.test(id)) throw new Error("Prospecto inválido.");
}

export async function createProspect(
  input: ProspectInput,
): Promise<ProspectLead> {
  const me = await requireSession();
  return insertCustomLead(cleanProspect(input), me.who);
}

export async function updateProspect(
  id: string,
  input: ProspectInput,
): Promise<ProspectLead> {
  await requireSession();
  checkId(id);
  return patchCustomLead(id, cleanProspect(input));
}

export async function deleteProspect(id: string): Promise<void> {
  await requireSession();
  checkId(id);
  await removeCustomLead(id);
}
