// Precios del cotizador de /pricing. Puro (sin íconos ni React): lo usan la
// página pública y las propuestas del panel, así un precio se cambia en un solo lugar.

export interface ProductBase {
  id: string;
  name: string;
  category: string;
  basePriceUSD: number;
  baseDays: number;
  description: string;
  included: string[];
}

export const productBases: ProductBase[] = [
  {
    id: "landing",
    name: "Landing Page de Alta Conversión",
    category: "Web & Marketing",
    basePriceUSD: 1200,
    baseDays: 7,
    description:
      "Diseñada para maximizar captación de clientes con carga en < 0.4s y diseño en Figma a medida.",
    included: [
      "Diseño UI/UX exclusivo en Figma",
      "Next.js 16 + Tailwind CSS v4",
      "Puntaje Google Lighthouse 100/100",
      "Micro-animaciones a 60 FPS con Framer Motion",
      "Formularios con validación Zod y Resend",
      "30 días de soporte post-lanzamiento",
    ],
  },
  {
    id: "saas",
    name: "SaaS MVP / Producto Digital",
    category: "Full-Stack Software",
    basePriceUSD: 2800,
    baseDays: 18,
    description:
      "Plataforma completa lista para validar tu modelo de negocio y cobrar a tus primeros usuarios.",
    included: [
      "Autenticación segura (OAuth, Passkeys, Magic Links)",
      "PostgreSQL en Supabase con Row-Level Security",
      "Server Actions y mutaciones en tiempo real",
      "Panel de control / Dashboard interactivo",
      "Integración de pasarela de cobros",
      "Infraestructura Edge en Vercel",
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce a Medida sin Comisiones",
    category: "Comercio Propio",
    basePriceUSD: 2400,
    baseDays: 14,
    description:
      "Tu propia tienda online ultrarrápida sin pagar el 15-25% de comisión por venta.",
    included: [
      "Catálogo dinámico con filtros instantáneos",
      "Checkout optimizado de 1 solo paso",
      "Pasarela Mercado Pago / Stripe integrada",
      "Panel de administración de stock y pedidos",
      "Notificaciones automáticas a WhatsApp y Email",
      "100% código tuyo en GitHub sin suscripciones",
    ],
  },
  {
    id: "ai-agent",
    name: "Plataforma con Agentes de IA",
    category: "Inteligencia Artificial",
    basePriceUSD: 3600,
    baseDays: 21,
    description:
      "Integración de modelos LLM (Claude 3.7 / OpenAI) con bases de datos vectoriales RAG.",
    included: [
      "Respuestas contextuales en streaming ultrarrápido",
      "Búsqueda semántica con pgvector en PostgreSQL",
      "Embeddings y sincronización de documentación",
      "Guardrails de seguridad y control de consumo de tokens",
      "Panel analítico de conversaciones",
      "Soporte y tuning de prompts especializado",
    ],
  },
];

export interface AddonModule {
  id: string;
  name: string;
  priceUSD: number;
  extraDays: number;
  description: string;
}

export const addonModules: AddonModule[] = [
  {
    id: "payments",
    name: "Pasarela de Pagos (Stripe / Mercado Pago)",
    priceUSD: 350,
    extraDays: 2,
    description:
      "Suscripciones recurrentes o cobros directos con webhooks seguros.",
  },
  {
    id: "chatbot",
    name: "Agente Asistente IA (Streaming RAG)",
    priceUSD: 550,
    extraDays: 3,
    description: "Chatbot entrenado con tu catálogo o base de conocimiento.",
  },
  {
    id: "i18n",
    name: "Multi-idioma Internacional (i18n)",
    priceUSD: 250,
    extraDays: 2,
    description: "Soporte de rutas y traducciones automáticas inglés/español.",
  },
  {
    id: "pwa",
    name: "Aplicación Móvil PWA Instalable",
    priceUSD: 300,
    extraDays: 2,
    description:
      "Ícono en la pantalla de inicio del teléfono con soporte offline.",
  },
];

export type DeliveryPace = "standard" | "express";

/** Cotización de referencia para mostrar en pesos. */
export const USD_TO_ARS = 1350;
export const EXPRESS_MULTIPLIER = 1.2;

/** Días de entrega: el express comprime al 60 %, nunca menos de 5. */
export const paceDays = (rawDays: number, pace: DeliveryPace) =>
  pace === "express" ? Math.max(5, Math.round(rawDays * 0.6)) : rawDays;

/** Precio final (USD) y días del cotizador. */
export function quote(
  base: ProductBase,
  addonIds: string[],
  pace: DeliveryPace,
) {
  const addons = addonModules.filter((a) => addonIds.includes(a.id));
  const addonsCost = addons.reduce((s, a) => s + a.priceUSD, 0);
  const addonsDays = addons.reduce((s, a) => s + a.extraDays, 0);
  const multiplier = pace === "express" ? EXPRESS_MULTIPLIER : 1;
  return {
    finalPriceUSD: Math.round((base.basePriceUSD + addonsCost) * multiplier),
    finalDays: paceDays(base.baseDays + addonsDays, pace),
    addonsCost,
    addonsDays,
  };
}
