import { Project } from "@/types";

// ponytail: fuente de datos local para v1 — reemplazar por lectura de la tabla `projects` de Supabase cuando se aplique supabase/schema.sql.
// Orden = lo que hoy más funciona: Takefyy, Apex, Poné La Pava y Pravilo.
export const projects: Project[] = [
  {
    slug: "takefyy",
    number: "01",
    name: "Takefyy",
    category: "Plataforma Digital",
    categoryGroup: "saas",
    year: "2025",
    shortDescription:
      "Una plataforma de pedidos digital para restaurantes: catálogos, pedidos y herramientas de administración en un solo producto.",
    description:
      "Takefyy es un producto SaaS para que restaurantes gestionen catálogos digitales y pedidos. Diseñamos y construimos la experiencia pública de pedidos y la plataforma de administración detrás de ella.",
    impactMetric: "Pedidos en tiempo real",
    challenge:
      "Los restaurantes necesitaban una forma rápida y autogestionable de publicar un menú digital y recibir pedidos sin depender de comisiones de marketplaces externos.",
    approach:
      "Diseñamos un sistema que separa el local público de un panel de administración, pensado para dueños sin conocimientos técnicos.",
    design:
      "Una interfaz limpia y de alto contraste que mantiene el foco en la fotografía del producto y los precios, con un flujo simple de carrito a WhatsApp.",
    technology: ["Next.js", "TypeScript", "Supabase", "Vercel"],
    outcome:
      "En uso por restaurantes reales, gestionando catálogos y pedidos digitales día a día.",
    url: "https://takefyy.com/",
    image: "/projects/takefyy-2026-09.jpg",
    screens: {
      tablet: "/projects/devices/takefyy-tablet-2026-09.jpg",
      mobile: "/projects/devices/takefyy-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/takefyy-2026-09c.mp4",
      webm: "/projects/videos/takefyy-2026-09c.webm",
    },
    featured: true,
    order: 1,
    size: "large",
    brand: {
      accent: "#FF6B2C",
      font: "anton",
      uppercase: true,
      tracking: 0.01,
      tagline: "Tu carta digital. Tus pedidos sin apps.",
      highlight: "Tus pedidos sin apps.",
      entrance: "slam",
    },
  },
  {
    slug: "pone-la-pava",
    number: "03",
    name: "Poné La Pava",
    category: "E-commerce / Experiencia de Marca",
    categoryGroup: "ecommerce",
    year: "2026",
    shortDescription:
      "Una experiencia de marca de e-commerce construida alrededor de una identidad visual distintiva y un catálogo de productos.",
    description:
      "Poné La Pava es una experiencia de marca de e-commerce. Diseñamos y construimos el local, el catálogo de productos y el flujo de checkout.",
    impactMetric: "Stock en tiempo real",
    challenge:
      "Traducir una identidad de marca fuerte en una tienda online rápida y enfocada en la conversión.",
    approach:
      "Construimos un local basado en componentes con gestión de stock en tiempo real, ligada directamente a la disponibilidad de cada producto.",
    design:
      "Revelados de producto guiados por motion y un layout editorial que trata al catálogo como el protagonista de la experiencia.",
    technology: ["Next.js", "TypeScript", "Supabase", "Vercel"],
    outcome:
      "Tienda en producción, con stock y catálogo actualizados en tiempo real.",
    url: "https://ponelapavayerbas.com/",
    image: "/projects/pone-la-pava-2026-09b.jpg",
    screens: {
      tablet: "/projects/devices/pone-la-pava-tablet-2026-09.jpg",
      mobile: "/projects/devices/pone-la-pava-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/pone-la-pava-2026-09c.mp4",
      webm: "/projects/videos/pone-la-pava-2026-09c.webm",
    },
    featured: true,
    order: 3,
    size: "medium",
    brand: {
      accent: "#C8A46E",
      font: "playfair",
      weight: 600,
      tracking: -0.01,
      tagline: "El ritual del mate es tuyo.",
      highlight: "es tuyo.",
      entrance: "soft",
    },
  },
  {
    slug: "sentinel",
    number: "06",
    name: "Sentinel",
    category: "Tecnología Climática y Datos Satelitales",
    categoryGroup: "systems",
    year: "2025",
    shortDescription:
      "Una plataforma de tecnología climática que combina datos satelitales de incendios con análisis de riesgo impulsado por IA.",
    description:
      "Sentinel es un producto de climate tech e IA para monitoreo ambiental. Diseñamos y construimos el sitio institucional y el mapa interactivo basado en datos.",
    impactMetric: "NASA FIRMS Satelital",
    challenge:
      "Presentar datos ambientales y satelitales complejos de forma rápida, creíble y fácil de entender.",
    approach:
      "Construimos una capa de mapa interactivo sobre fuentes de datos en vivo, combinada con un lenguaje de marca preciso y técnico.",
    design:
      "Una interfaz oscura y centrada en datos, donde la tipografía y las visualizaciones en vivo sostienen la credibilidad del producto.",
    technology: ["Next.js", "TypeScript", "IA/APIs", "Vercel"],
    outcome:
      "Plataforma en producción con datos satelitales en vivo (NASA FIRMS) e índice de riesgo de incendio.",
    url: "https://www.sentineltech.com.ar/",
    image: "/projects/sentinel-2026-09.jpg",
    screens: {
      tablet: "/projects/devices/sentinel-tablet-2026-09.jpg",
      mobile: "/projects/devices/sentinel-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/sentinel-2026-09c.mp4",
      webm: "/projects/videos/sentinel-2026-09c.webm",
    },
    featured: false,
    order: 6,
    size: "large",
    brand: {
      accent: "#94F1BE",
      font: "jakarta",
      weight: 800,
      tracking: -0.03,
      tagline: "Detectamos incendios en minutos, no en horas.",
      highlight: "en minutos,",
      entrance: "scan",
    },
  },
  {
    slug: "apex-ai",
    number: "02",
    name: "Apex Performance",
    category: "Plataforma para Entrenadores",
    categoryGroup: "saas",
    year: "2025",
    shortDescription:
      "Una plataforma para entrenadores: rutinas, seguimiento y comunicación con sus atletas en un solo lugar.",
    description:
      "Apex Performance es una plataforma para entrenadores que centraliza rutinas, seguimiento y comunicación con sus atletas, con IA para la periodización. Diseñamos y construimos el sitio.",
    impactMetric: "Carga instantánea",
    challenge:
      "Comunicar con claridad el valor de un producto de tecnología a una audiencia exigente.",
    approach:
      "Construimos un sitio enfocado en comunicar la propuesta de valor con claridad técnica, sin la fricción de una demo o un llamado de ventas previo.",
    design:
      "Una interfaz oscura y minimalista, con la jerarquía tipográfica por delante de cualquier elemento decorativo.",
    technology: ["Next.js", "TypeScript", "Vercel"],
    outcome:
      "Sitio en producción, presentando el producto con tiempos de carga instantáneos.",
    url: "https://apexperformance.com.ar/",
    image: "/projects/apex-ai-2026-09-es.jpg",
    screens: {
      tablet: "/projects/devices/apex-ai-tablet-2026-09.jpg",
      mobile: "/projects/devices/apex-ai-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/apex-ai-2026-09c.mp4",
      webm: "/projects/videos/apex-ai-2026-09c.webm",
    },
    featured: true,
    order: 2,
    size: "small",
    brand: {
      accent: "#F5C400",
      font: "bricolage",
      weight: 800,
      tracking: -0.03,
      tagline: "Programación seria, no plantillas.",
      highlight: "no plantillas.",
      entrance: "wipe",
    },
  },
  {
    slug: "altum-sci",
    number: "07",
    name: "Altum Sci",
    category: "Inmobiliaria / Sitio Corporativo",
    categoryGroup: "web",
    year: "2025",
    shortDescription:
      "Un sitio web corporativo para una inmobiliaria enfocada en Río Negro y la Patagonia.",
    description:
      "Altum Sci es una inmobiliaria en Río Negro y la Patagonia. Diseñamos y construimos su sitio web corporativo.",
    impactMetric: "Inversión Patagonia",
    challenge:
      "Construir credibilidad y claridad para compradores e inversores evaluando propiedades a distancia.",
    approach:
      "Construimos un sitio corporativo con foco en propiedades, ubicación y contacto directo, pensado para consultas a distancia.",
    design:
      "Un lenguaje visual corporativo y contenido, enfocado en la legibilidad y la confianza.",
    technology: ["Next.js", "TypeScript", "Vercel"],
    outcome:
      "Sitio en producción, usado como canal principal de consulta para compradores e inversores en la Patagonia.",
    url: "https://altumsci.com.ar/",
    image: "/projects/altum-sci-2026-09.jpg",
    screens: {
      tablet: "/projects/devices/altum-sci-tablet-2026-09.jpg",
      mobile: "/projects/devices/altum-sci-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/altum-sci-2026-09c.mp4",
      webm: "/projects/videos/altum-sci-2026-09c.webm",
    },
    featured: false,
    order: 7,
    size: "medium",
    brand: {
      accent: "#C9A84C",
      font: "outfit",
      weight: 300,
      tracking: 0.02,
      tagline: "Tu inversión, en el corazón de la Patagonia.",
      highlight: "de la Patagonia.",
      entrance: "spread",
    },
  },
  {
    slug: "pravilo",
    number: "04",
    name: "Pravilo",
    category: "Entrenamiento y Movilidad",
    categoryGroup: "web",
    year: "2026",
    shortDescription:
      "Un sitio web para el primer centro Pravilo de Argentina, un método de entrenamiento y terapia de movilidad.",
    description:
      "Pravilo es un centro de entrenamiento y terapia de movilidad con el método Pravilo (tradición eslava) en Plottier, Neuquén. Diseñamos y construimos su sitio web, desde la estructura de contenidos hasta la identidad visual.",
    impactMetric: "1º Centro en Argentina",
    challenge:
      "Presentar un método de entrenamiento poco conocido en Argentina con una presencia digital premium y confiable.",
    approach:
      "Trabajamos junto al instructor para traducir un método de entrenamiento físico en contenido y estructura digital, sin un sitio de referencia previo en el país.",
    design:
      "Una identidad cinematográfica, en tonos oscuros, con fotografía y video reales.",
    technology: ["Next.js", "TypeScript", "Vercel"],
    outcome:
      "Sitio en producción para el primer centro Pravilo de Argentina, en Plottier, Neuquén.",
    url: "https://www.pravilo.com.ar/",
    image: "/projects/pravilo-2026-09.jpg",
    screens: {
      tablet: "/projects/devices/pravilo-tablet-2026-09.jpg",
      mobile: "/projects/devices/pravilo-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/pravilo-2026-09c.mp4",
      webm: "/projects/videos/pravilo-2026-09c.webm",
    },
    featured: true,
    order: 4,
    size: "small",
    brand: {
      accent: "#E0303F",
      font: "barlow",
      weight: 900,
      uppercase: true,
      tagline: "Explorá tu cuerpo a otro nivel.",
      highlight: "a otro nivel.",
      entrance: "rise",
    },
  },
  {
    slug: "muzzaga",
    number: "05",
    name: "Muzzaga Pádel",
    category: "Club de Pádel / Reservas Online",
    categoryGroup: "saas",
    year: "2026",
    shortDescription:
      "El sitio de un club de pádel en Catriel con reserva de canchas online y disponibilidad en tiempo real.",
    description:
      "Muzzaga es un club de pádel en Catriel, Río Negro, con dos canchas de cristal. Diseñamos y construimos su sitio y el sistema de reservas: el jugador elige día, cancha y horario, y confirma el turno por WhatsApp.",
    impactMetric: "Turnos en tiempo real",
    challenge:
      "Que reservar una cancha no dependa de mandar mensajes y esperar respuesta: ver qué hay libre y sacar el turno en el momento.",
    approach:
      "Un calendario de disponibilidad por día y por cancha, con el turno de 90 minutos como unidad y la confirmación por WhatsApp con seña.",
    design:
      "Una identidad deportiva, de alto contraste, con la mascota del club y fotos reales de las canchas; el reservador es lo primero a lo que lleva cada botón.",
    technology: ["Next.js", "TypeScript", "Vercel"],
    outcome:
      "Sitio en producción con reservas online, Canchas Abiertas comunitarias y herramientas para jugadores.",
    url: "https://muzzaga-padel-seven.vercel.app/",
    image: "/projects/muzzaga-2026-09.jpg",
    screens: {
      tablet: "/projects/devices/muzzaga-tablet-2026-09.jpg",
      mobile: "/projects/devices/muzzaga-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/muzzaga-2026-09c.mp4",
      webm: "/projects/videos/muzzaga-2026-09c.webm",
    },
    featured: false,
    order: 5,
    size: "medium",
    brand: {
      accent: "#E8722A",
      font: "barlow",
      weight: 800,
      uppercase: true,
      italic: true,
      tagline: "Canchas de pádel en Catriel. Pádel de verdad.",
      highlight: "Pádel de verdad.",
      entrance: "slide",
    },
  },
  {
    slug: "iphone-vita",
    number: "08",
    name: "iPhone Vita",
    category: "E-commerce / Tecnología",
    categoryGroup: "ecommerce",
    year: "2026",
    shortDescription:
      "Una tienda online de tecnología premium: iPhone nuevos y semi nuevos, Mac, iPad, Apple Watch y accesorios.",
    description:
      "iPhone Vita es una tienda de tecnología premium. Diseñamos y construimos la tienda online, el catálogo por categorías, el buscador de iPhone y el panel de administración para cargar productos y precios.",
    impactMetric: "Catálogo autogestionable",
    challenge:
      "Vender equipos de alto valor online con la misma confianza que en el local: estado del equipo, garantía y precio claros antes de escribir.",
    approach:
      "Un catálogo conectado a un panel propio, un buscador que guía hasta el iPhone indicado, Plan Canje y el pedido que termina en WhatsApp.",
    design:
      "Una estética de producto al estilo Apple, oscura y con acentos champagne, con video del equipo en el hero y modo claro u oscuro según el dispositivo.",
    technology: ["Next.js", "TypeScript", "Supabase", "Vercel"],
    outcome:
      "Tienda en producción con catálogo y precios administrados por el propio equipo de iPhone Vita.",
    url: "https://iphonevita.vercel.app/",
    image: "/projects/iphone-vita-2026-09.jpg",
    screens: {
      tablet: "/projects/devices/iphone-vita-tablet-2026-09.jpg",
      mobile: "/projects/devices/iphone-vita-mobile-2026-09.jpg",
    },
    video: {
      mp4: "/projects/videos/iphone-vita-2026-09c.mp4",
      webm: "/projects/videos/iphone-vita-2026-09c.webm",
    },
    featured: false,
    order: 8,
    size: "large",
    brand: {
      accent: "#EBD7BE",
      font: "jakarta",
      weight: 800,
      tracking: -0.03,
      tagline: "Tu próxima tecnología.",
      highlight: "tecnología.",
      entrance: "soft",
    },
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
