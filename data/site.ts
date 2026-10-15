// Nombre de marca: Se7en Studio. Todo lo demás (title, OG, footer, etc.) deriva de este archivo.
export const SITE = {
  name: "Se7en Studio",
  tagline: "Experiencias y productos digitales",
  description:
    "Un estudio de dos personas de producto digital y tecnología creativa. Diseñamos y construimos experiencias digitales para marcas que avanzan.",
  // Producción es www.se7en.com.ar (NEXT_PUBLIC_SITE_URL en Vercel); el fallback sólo
  // corre en local y debe ser el mismo dominio para no emitir canonicals ajenos.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.se7en.com.ar",
  email: "se7endevv@gmail.com",
  whatsapp: "https://wa.me/5492994247985",
  social: {
    instagram: "https://www.instagram.com/se7enstudio.ar/" as string | undefined,
    linkedin: "https://www.linkedin.com/company/se7en-ar/" as string | undefined,
    github: undefined as string | undefined,
  },
  // Única fuente de disponibilidad: la leen contacto, status bar y banners.
  availability: {
    slots: 2,
  },
  stats: {
    projects: "6+",
    people: "2",
    years: "2025-2026",
  },
};
