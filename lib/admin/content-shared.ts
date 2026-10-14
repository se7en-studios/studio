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

/** Lo que se carga o edita desde el panel (los archivos siguen yendo por el seed). */
export type PostInput = Pick<ContentPost, "post_date" | "kind" | "title" | "pinned" | "steps" | "caption" | "tips">;

export const POST_TITLE_MAX = 200;
export const POST_TEXT_MAX = 5000;

/** Valida y recorta un post. Tira error con un mensaje para mostrar. */
export function cleanPost(input: Partial<PostInput>): PostInput {
  const title = String(input.title ?? "").trim().slice(0, POST_TITLE_MAX);
  if (!title) throw new Error("El post necesita un título.");
  const post_date = String(input.post_date ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post_date) || Number.isNaN(Date.parse(post_date))) throw new Error("Fecha inválida.");
  if (!KINDS.includes(input.kind as ContentKind)) throw new Error("Tipo inválido.");
  return {
    post_date,
    kind: input.kind as ContentKind,
    title,
    pinned: Boolean(input.pinned),
    steps: String(input.steps ?? "").slice(0, POST_TEXT_MAX),
    caption: String(input.caption ?? "").slice(0, POST_TEXT_MAX),
    tips: (Array.isArray(input.tips) ? input.tips : [])
      .map((t) => String(t).trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 20),
  };
}
