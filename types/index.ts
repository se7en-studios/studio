export interface Project {
  slug: string;
  number: string;
  name: string;
  category: string;
  categoryGroup?: string;
  year: string;
  shortDescription: string;
  description: string;
  impactMetric?: string;
  challenge?: string;
  approach?: string;
  design?: string;
  technology?: string[];
  outcome?: string;
  url: string;
  image: string;
  /**
   * Capturas reales del sitio en tablet (768×1024) y celular (390×844) para el
   * simulador de dispositivos del caso. Sin esto el simulador recorta `image`.
   */
  screens?: {
    tablet: string;
    mobile: string;
  };
  /**
   * Clip mudo de hover para la tarjeta de la grilla. Opcional: si falta, la
   * tarjeta se queda con `image` fija, que es el estado por defecto.
   * Las rutas se resuelven desde /public — ver public/projects/videos/README.md
   * para formato, duración y peso.
   */
  video?: {
    mp4: string;
    webm: string;
  };
  featured: boolean;
  order: number;
  size: "large" | "medium" | "small";
  /**
   * Personalidad del proyecto en la rueda de Trabajo: su color, su tipografía
   * y su frase, sacados del propio sitio. Opcional: sin esto usa los del estudio.
   */
  brand?: ProjectBrand;
}

export interface ProjectBrand {
  /** Color de acento de la marca (hex). */
  accent: string;
  /** Clave de lib/brand-fonts.ts. */
  font: "anton" | "bricolage" | "playfair" | "barlow" | "jakarta" | "outfit";
  weight?: number;
  uppercase?: boolean;
  italic?: boolean;
  /** Tracking en em. */
  tracking?: number;
  /** Frase principal del sitio del proyecto. */
  tagline: string;
  /** Tramo de la frase que va en el color de acento. */
  highlight?: string;
  /** Cómo entra el nombre cuando el proyecto llega al centro. */
  entrance: "slam" | "wipe" | "soft" | "rise" | "slide" | "scan" | "spread";
}

export interface Service {
  number: string;
  title: string;
  description: string;
  /** Entregables concretos — se muestran como chips en la fila de servicio. */
  deliverables?: string[];
  tagline?: string;
}

export interface ProcessStep {
  number: string;
  title: string;
  description: string;
  duration?: string;
  deliverables?: string[];
}

export interface TeamMember {
  id: string;
  name: string | null;
  role: string;
  bio?: string;
  imageUrl?: string;
  linkedin?: string;
  /** De qué se encarga en un proyecto. Se muestra como chips en /#about. */
  focus?: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  projectSlug?: string;
  highlight?: string;
  published?: boolean;
  order?: number;
}

export interface TechStackItem {
  name: string;
  category: "frontend" | "backend" | "ai" | "design";
  description: string;
  badge?: string;
}
