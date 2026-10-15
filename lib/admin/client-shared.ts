// Clientes: tipos y validación. Puro y sin dependencias de servidor: lo usan
// las páginas, las acciones y los componentes de cliente.
import type { LeadOwner } from "./db";

export const IVA = [
  { id: "", label: "Sin cargar" },
  { id: "monotributo", label: "Monotributo" },
  { id: "responsable_inscripto", label: "Responsable inscripto" },
  { id: "exento", label: "Exento" },
  { id: "consumidor_final", label: "Consumidor final" },
  { id: "exterior", label: "Del exterior" },
] as const;
export type Iva = (typeof IVA)[number]["id"];
export const ivaLabel = (id: string) =>
  IVA.find((i) => i.id === id)?.label ?? id;

export type Client = {
  id: string;
  created_at: string;
  updated_at: string;
  name: string;
  /** Persona de contacto. */
  contact: string;
  email: string;
  whatsapp: string;
  cuit: string;
  iva: Iva;
  notes: string;
  created_by: LeadOwner | null;
};

export type ClientInput = Partial<
  Pick<
    Client,
    "name" | "contact" | "email" | "whatsapp" | "cuit" | "iva" | "notes"
  >
>;

export const CLIENT_FIELDS: { field: keyof ClientInput; label: string }[] = [
  { field: "name", label: "Nombre" },
  { field: "contact", label: "Contacto" },
  { field: "email", label: "Email" },
  { field: "whatsapp", label: "WhatsApp" },
  { field: "cuit", label: "CUIT" },
  { field: "iva", label: "Condición IVA" },
  { field: "notes", label: "Notas" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Valida y recorta. `creating` exige el nombre. */
export function cleanClient(
  input: ClientInput,
  creating: boolean,
): { ok: true; value: ClientInput } | { ok: false; error: string } {
  const out: ClientInput = {};
  if (creating || input.name !== undefined) {
    const name = String(input.name ?? "")
      .trim()
      .slice(0, 120);
    if (!name) return { ok: false, error: "Poné el nombre del cliente." };
    out.name = name;
  }
  if (input.contact !== undefined)
    out.contact = String(input.contact).trim().slice(0, 120);
  if (input.email !== undefined) {
    const email = String(input.email).trim().toLowerCase().slice(0, 200);
    if (email && !EMAIL.test(email))
      return { ok: false, error: "El email no parece válido." };
    out.email = email;
  }
  if (input.whatsapp !== undefined) {
    const wa = String(input.whatsapp).trim().slice(0, 40);
    if (wa && !/^[+\d\s()-]{6,40}$/.test(wa))
      return { ok: false, error: "El WhatsApp tiene que ser un número." };
    out.whatsapp = wa;
  }
  if (input.cuit !== undefined) {
    const cuit = String(input.cuit).replace(/\D/g, "");
    if (cuit && cuit.length !== 11)
      return { ok: false, error: "El CUIT tiene 11 números." };
    out.cuit = cuit
      ? `${cuit.slice(0, 2)}-${cuit.slice(2, 10)}-${cuit.slice(10)}`
      : "";
  }
  if (input.iva !== undefined) {
    if (!IVA.some((i) => i.id === input.iva))
      return { ok: false, error: "Condición de IVA inválida." };
    out.iva = input.iva;
  }
  if (input.notes !== undefined)
    out.notes = String(input.notes).slice(0, 10_000);
  return { ok: true, value: out };
}
