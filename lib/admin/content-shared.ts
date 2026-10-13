// Tipos y constantes del panel de contenido: seguros para importar desde el cliente.
import type { LeadOwner } from "./db";

export const KINDS = ["reel", "carrusel", "historias", "perfil"] as const;
export type ContentKind = (typeof KINDS)[number];

export const KIND_LABEL: Record<ContentKind, string> = {
  reel: "Reel",
  carrusel: "Carrusel",
  historias: "Historias",
  perfil: "Perfil",
};

export type ContentFile = {
  name: string;
  size: number;
  mime: string;
  /** URL firmada, sólo en el servidor al listar. */
  url: string | null;
};

export type ContentPost = {
  id: string;
  /** YYYY-MM-DD */
  post_date: string;
  kind: ContentKind;
  title: string;
  pinned: boolean;
  steps: string;
  tips: string[];
  caption: string;
  files: ContentFile[];
  done_at: string | null;
  done_by: LeadOwner | null;
};
