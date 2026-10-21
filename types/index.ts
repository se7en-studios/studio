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
   * Recorrido del sitio en video para tablet y celular, en el simulador del caso:
   * lo mismo que `video` hace en escritorio. Opcional, por tamaño: el que falte
   * se queda con la captura de `screens`.
   */
  screenVideos?: {
    tablet?: { mp4: string; webm: string };
    mobile?: { mp4: string; webm: string };
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
  /**
   * Capturas del producto por dentro (paneles, apps), para cuando el caso es más
   * que el sitio de `url`. Opcional: sin esto el caso no muestra la sección.
   */
  gallery?: ProjectGallery;
  featured: boolean;
  order: number;
  size: "large" | "medium" | "small";
  /**
   * Personalidad del proyecto en la rueda de Trabajo: su color, su tipografía
   * y su frase, sacados del propio sitio. Opcional: sin esto usa los del estudio.
   */
  brand?: ProjectBrand;
}

export interface ProjectGallery {
  /** Aclaración que va con las capturas, p. ej. que los datos son de muestra. */
  note?: string;
  /** Título de cada grupo de capturas en el caso. */
  labels: { desktop: string; mobile: string };
  shots: ProjectShot[];
}

export interface ProjectShot {
  src: string;
  alt: string;
  caption: string;
  /**
   * `desktop`: la captura ya trae el marco del monitor dibujado.
   * `mobile`: pantalla cruda de 390×844; el marco del teléfono lo pone el caso.
   */
  kind: "desktop" | "mobile";
  width: number;
  height: number;
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
