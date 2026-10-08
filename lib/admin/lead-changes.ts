// Cómo se cuentan en el registro los cambios de un pedido. Puro.
import type { Lead, LeadPatch, LeadStatus } from "./db";
import { diff, usd, type Change } from "./changes";
import { PEOPLE } from "./people";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  propuesta: "Propuesta",
  ganado: "Ganado",
  perdido: "Perdido",
};

const person = (v: unknown) => (v ? PEOPLE[v as keyof typeof PEOPLE]?.name ?? String(v) : "Sin asignar");

export function leadDiff(before: Lead, patch: LeadPatch): Change[] {
  return diff<Lead>(before, patch, [
    { field: "status", label: "Etapa", format: (v) => STATUS_LABEL[v as LeadStatus] ?? String(v) },
    { field: "owner", label: "Responsable", format: person },
    { field: "value", label: "Monto acordado", format: usd },
    { field: "name", label: "Nombre" },
    { field: "company", label: "Empresa" },
    { field: "email", label: "Email" },
    { field: "phone", label: "Teléfono" },
    { field: "notes", label: "Notas internas", long: true },
  ]);
}
