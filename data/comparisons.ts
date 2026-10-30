import type { FAQItem } from "@/data/faq";

export interface ComparisonRow {
  feature: string;
  se7en: string;
  competitor: string;
}

export interface ComparisonItem {
  slug: string;
  competitor: string;
  shortTitle: string;
  title: string;
  metaDescription: string;
  publishedIso: string;
  category: string;
  /** Dos frases iniciales que se entienden solas: diseñadas para ser citadas por Google AI Overviews, ChatGPT y Perplexity. */
  leadSentences: [string, string];
  whenCompetitorWins: string[];
  whenSe7enWins: string[];
  tableRows: ComparisonRow[];
  deepDive: {
    heading: string;
    paragraphs: string[];
  }[];
  relatedProjectSlug?: string;
  relatedBlogSlugs: string[];
  faqs: FAQItem[];
}

export const comparisons: ComparisonItem[] = [
  {
    slug: "se7en-vs-wordpress-woocommerce",
    competitor: "WordPress / Elementor / WooCommerce",
    shortTitle: "Se7en Studio (Next.js) vs WordPress",
    title: "Next.js a Medida (Se7en Studio) vs WordPress y Elementor: ¿Cuál elegir en 2026?",
    metaDescription:
      "Comparativa honesta entre un sitio o tienda en Next.js desarrollado por Se7en Studio y una web en WordPress/WooCommerce: velocidad, seguridad, mantenimiento y costos reales.",
    publishedIso: "2026-10-10",
    category: "Tecnología & Rendimiento",
    leadSentences: [
      "WordPress con Elementor o WooCommerce conviene si tenés menos de USD 500 de presupuesto y querés armar vos mismo un sitio informativo simple usando una plantilla prefabricada.",
      "Se7en Studio (con Next.js 16 y código a medida desde USD 1.200) gana cuando necesitás que la web cargue en menos de 0.5 segundos en celular, posicione en Google sin depender de 30 plugins vulnerables y convierta visitas en ventas reales.",
    ],
    whenCompetitorWins: [
      "Tu presupuesto total es menor a USD 500 y preferís instalar una plantilla vos mismo.",
      "Tenés un medio de noticias tradicional donde 10 redactores suben notas simples sin requisitos de diseño ni velocidad extrema.",
      "Ya contás con una persona interna dedicada a actualizar plugins, parches PHP y backups todas las semanas.",
    ],
    whenSe7enWins: [
      "Querés que tu sitio cargue en 0.4 segundos en celulares (Core Web Vitals 95–100) en lugar de los 4 a 6 segundos típicos de Elementor.",
      "No querés pagar licencias anuales de plugins premium ni correr el riesgo de que una actualización rompa el checkout o sufra inyecciones SQL.",
      "Buscás una identidad visual única diseñada desde cero en Figma y código 100% tuyo en GitHub.",
    ],
    tableRows: [
      {
        feature: "Tiempo de carga móvil promedio (LCP)",
        se7en: "0.4s a 0.8s (Edge SSR en Vercel)",
        competitor: "3.8s a 6.5s (bloqueo por plugins y CSS)",
      },
      {
        feature: "Dependencia de plugins de terceros",
        se7en: "0 plugins (código TypeScript nativo)",
        competitor: "15 a 40 plugins que requieren actualización",
      },
      {
        feature: "Seguridad y superficie de ataque",
        se7en: "Altísima (sin wp-admin ni PHP expuesto)",
        competitor: "Vulnerable si un plugin queda desactualizado",
      },
      {
        feature: "Costo de licencias mensuales obligatorias",
        se7en: "USD 0 en licencias de plugins",
        competitor: "USD 30 a USD 150/mes en plugins premium y hosting pesado",
      },
      {
        feature: "Inversión inicial de desarrollo",
        se7en: "Desde USD 1.200 (entrega en 1 a 2 semanas)",
        competitor: "USD 300 a USD 1.500 según agencia o plantilla",
      },
      {
        feature: "Propiedad del código",
        se7en: "100% tuyo en tu repositorio de GitHub",
        competitor: "Atado al ecosistema de temas y constructores visuales",
      },
    ],
    deepDive: [
      {
        heading: "Por qué las plantillas de WordPress pierden conversiones en móvil",
        paragraphs: [
          "Más del 78% del tráfico web en Argentina y Latinoamérica entra desde teléfonos móviles con conexiones 4G variables. Una plantilla de WordPress con Elementor y WooCommerce descarga entre 2 MB y 5 MB de scripts y estilos antes de que el usuario pueda tocar el primer botón.",
          "En Se7en Studio construimos con Next.js 16 y React Server Components: el servidor entrega HTML puro ya renderizado desde el nodo más cercano al usuario (Edge Network), logrando que la página sea interactiva casi al instante y que los bots de Google y de IA (ChatGPT, Perplexity) lean todo el contenido sin trabas.",
        ],
      },
      {
        heading: "Autogestión sin el caos de wp-admin",
        paragraphs: [
          "El mito más común es que sin WordPress no vas a poder cambiar un precio o subir un producto. En todos nuestros proyectos de e-commerce y catálogos (como Poné La Pava o iPhone Vita) entregamos un panel de administración propio, limpio y pensado exactamente para tu negocio: entrás desde el celular, cambiás el precio o el stock en 5 segundos y se actualiza en tiempo real sin tocar código.",
        ],
      },
    ],
    relatedProjectSlug: "pone-la-pava",
    relatedBlogSlugs: [
      "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
      "por-que-mi-tienda-online-carga-lento-en-celular-y-como-bajarla-a-menos-de-1-segundo",
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
    ],
    faqs: [
      {
        id: "wp-migrar",
        question: "¿Puedo migrar mi web actual de WordPress a Next.js sin perder mi posicionamiento en Google?",
        answer:
          "Sí. En Se7en Studio mapeamos todas tus URLs actuales, configuramos redirecciones permanentes (308/301), conservamos los títulos y metadatos que ya rankean y mejoramos los Core Web Vitals, lo que suele impulsar las posiciones orgánicas en pocas semanas.",
      },
      {
        id: "wp-editar",
        question: "¿Voy a necesitar un programador cada vez que quiera cambiar un precio o subir una foto?",
        answer:
          "No. Incluimos un panel de administración a medida para que edites productos, precios, stock, textos o publicaciones desde tu celular o computadora sin saber programar.",
      },
      {
        id: "wp-hosting",
        question: "¿Cuánto cuesta mantener una web en Next.js comparada con un hosting de WordPress?",
        answer:
          "Para la gran mayoría de sitios corporativos y tiendas medianas, el nivel gratuito o base de Vercel y Supabase cubre todo el tráfico sin pagar servidores dedicados ni licencias anuales de Elementor Pro, WP Rocket o plugins de seguridad.",
      },
    ],
  },
  {
    slug: "se7en-vs-tiendanube-shopify",
    competitor: "Tiendanube y Shopify",
    shortTitle: "Se7en Studio vs Tiendanube / Shopify",
    title: "E-Commerce a Medida (Se7en Studio) vs Tiendanube y Shopify: Costos y Comisiones",
    metaDescription:
      "¿Conviene alquilar una tienda en Tiendanube/Shopify o tener un E-Commerce propio a medida? Comparamos comisiones por venta, velocidad, diseño y propiedad del código.",
    publishedIso: "2026-10-12",
    category: "E-Commerce & Conversión",
    leadSentences: [
      "Tiendanube y Shopify son la mejor opción si recién estás validando si tu producto se vende y querés salir hoy mismo pagando una suscripción mensual baja y una comisión por cada venta.",
      "Un E-Commerce a medida de Se7en Studio (desde USD 2.400, pago único) te conviene cuando ya tenés volumen de ventas y querés eliminar para siempre las comisiones por transacción, diferenciar tu marca del resto de las tiendas clonadas y tener un flujo de compra rápido (a Mercado Pago, Stripe o WhatsApp).",
    ],
    whenCompetitorWins: [
      "Estás probando tus primeros 10 productos sin capital inicial y preferís pagar una cuota mensual chica.",
      "Necesitás integraciones prearmadas con decenas de ERPs contables locales desde el día uno sin desarrollo personalizado.",
      "No te molesta que tu tienda tenga la misma estructura visual y el mismo checkout que miles de comercios más.",
    ],
    whenSe7enWins: [
      "Querés dejar de pagar entre 1% y 3% de comisión extra por cada venta además de lo que ya cobra la pasarela de pago.",
      "Necesitás un flujo de compra híbrido o específico (por ejemplo, armar carrito con variantes complejas, calcular un Plan Canje como en iPhone Vita o cerrar el pedido directo por WhatsApp con stock descontado en vivo).",
      "Tu marca necesita una dirección de arte editorial (como Poné La Pava) que una plantilla estándar de Tiendanube o Shopify no permite.",
    ],
    tableRows: [
      {
        feature: "Comisión de la plataforma por cada venta",
        se7en: "0% (solo pagás lo que cobre Mercado Pago / Stripe)",
        competitor: "0.5% a 2% extra por transacción según el plan",
      },
      {
        feature: "Alquiler mensual de plataforma + apps",
        se7en: "USD 0 de alquiler a Se7en Studio",
        competitor: "USD 20 a USD 399/mes + apps pagas en dólares",
      },
      {
        feature: "Libertad en el flujo de Checkout y WhatsApp",
        se7en: "Total (1 paso, WhatsApp estructurado o pasarela)",
        competitor: "Rígido y limitado por las reglas de la plataforma",
      },
      {
        feature: "Diseño e identidad visual",
        se7en: "100% exclusivo en Figma y micro-animaciones a 60 FPS",
        competitor: "Basado en plantillas compartidas por miles de tiendas",
      },
      {
        feature: "Propiedad del activo digital",
        se7en: "Código y base de datos 100% a tu nombre",
        competitor: "Alquilado: si dejás de pagar el mes, la tienda se apaga",
      },
    ],
    deepDive: [
      {
        heading: "La cuenta matemática: alquiler eterno vs activo propio",
        paragraphs: [
          "En Shopify o Tiendanube, cuando sumás el plan mensual más 4 o 5 aplicaciones pagas (para filtros, reseñas, recuperación de carrito o reglas de envío) más el porcentaje por transacción, una marca en crecimiento termina pagando miles de dólares al año por una tienda que nunca es suya.",
          "En Se7en Studio desarrollamos tu tienda en 2 a 3 semanas (desde USD 2.400) sobre Next.js y Supabase. El código queda en tu GitHub, no pagás comisiones por venta a ninguna plataforma intermedia y el flujo de compra se adapta exactamente a cómo compran tus clientes.",
        ],
      },
      {
        heading: "Casos reales: Poné La Pava e iPhone Vita",
        paragraphs: [
          "Para Poné La Pava construimos un e-commerce con identidad de marca, stock en tiempo real y revelados de producto fluidos que duplicó su tasa de conversión (+120%). Para iPhone Vita desarrollamos no solo el catálogo autogestionable, sino un buscador guiado de modelos y un calculador de Plan Canje imposible de resolver con una plantilla estándar.",
        ],
      },
    ],
    relatedProjectSlug: "iphone-vita",
    relatedBlogSlugs: [
      "como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya",
      "arquitectura-sin-comisiones-como-construimos-takefyy",
      "como-integrar-mercadopago-y-stripe-en-una-web-o-saas-en-argentina",
    ],
    faqs: [
      {
        id: "tn-pagos",
        question: "¿Se puede cobrar con Mercado Pago, tarjetas en cuotas y transferencia en una tienda a medida?",
        answer:
          "Sí. Integramos la API oficial de Mercado Pago (Checkout Pro o transparente), Stripe para cobros en dólares, descuento automático por transferencia bancaria y pedidos directos a WhatsApp.",
      },
      {
        id: "tn-stock",
        question: "¿Cómo manejo el stock y los precios día a día?",
        answer:
          "Te entregamos un panel de administración privado donde cargás productos, fotos, variantes, precios y stock en segundos, incluso con actualización masiva.",
      },
      {
        id: "tn-tiempo",
        question: "¿Cuánto tardan en entregar una tienda online a medida?",
        answer:
          "Entre 2 y 3 semanas (~14 días hábiles) desde el kickoff hasta la puesta en producción en tu propio dominio.",
      },
    ],
  },
  {
    slug: "se7en-vs-agencia-tradicional",
    competitor: "Agencia Tradicional de Software / Marketing",
    shortTitle: "Se7en Studio vs Agencia Tradicional",
    title: "Se7en Studio (Estudio de 2 Fundadores) vs Agencia Tradicional: Velocidad, Trato y Costo",
    metaDescription:
      "Qué cambia entre contratar una agencia tradicional con ejecutivos de cuenta y trabajar directo con los dos fundadores que diseñan y programan tu producto en Se7en Studio.",
    publishedIso: "2026-10-14",
    category: "Modelo de Trabajo",
    leadSentences: [
      "Una agencia tradicional de 30 personas tiene sentido para corporaciones multinacionales que necesitan licitaciones formales, 6 meses de comités y mantenimiento simultáneo de sistemas legacy.",
      "Se7en Studio gana para fundadores, startups y pymes que quieren hablar directo por WhatsApp con los dos ingenieros y diseñadores que construyen su producto, recibir avances reales cada semana y salir a producción en 2 a 4 semanas a una fracción del presupuesto corporativo.",
    ],
    whenCompetitorWins: [
      "Sos una corporación con compras reguladas que exige pliegos de licitación de 90 días y equipos de 15 consultores dedicados.",
      "Buscás un proveedor integral que además de software maneje prensa, relaciones públicas, eventos físicos y pauta en televisión.",
      "Necesitás soporte telefónico de guardia 24/7 con mesa de ayuda nivel 1, 2 y 3.",
    ],
    whenSe7enWins: [
      "No querés explicarle tu negocio a un vendedor senior para que después el proyecto lo programe un becario junior al que nunca conocés.",
      "Necesitás lanzar en 2 a 4 semanas en vez de esperar 4 meses de reuniones y burocracia.",
      "Querés que cada dólar de tu presupuesto vaya al diseño y al código de tu producto, no a financiar oficinas lujosas ni capas de intermediarios.",
    ],
    tableRows: [
      {
        feature: "Con quién hablás día a día",
        se7en: "Directo con Franco y Federico (los 2 fundadores que diseñan y programan)",
        competitor: "Ejecutivo de cuentas / Project Manager intermediario",
      },
      {
        feature: "Quién escribe el código y diseña la interfaz",
        se7en: "Los mismos dos fundadores senior de punta a punta",
        competitor: "Rotación de perfiles juniors o tercerizados",
      },
      {
        feature: "Tiempo típico de entrega",
        se7en: "1 a 4 semanas con demos en vivo en el camino",
        competitor: "2 a 6 meses entre etapas de aprobación",
      },
      {
        feature: "Canal y velocidad de respuesta",
        se7en: "WhatsApp directo + demos · respuesta < 24 h hábiles",
        competitor: "Tickets, cadenas de mails y reuniones quincenales",
      },
      {
        feature: "Transparencia de precios",
        se7en: "Cotizador público online desde USD 1.200 a USD 3.600+",
        competitor: "Presupuestos cerrados tras múltiples llamadas comerciales",
      },
    ],
    deepDive: [
      {
        heading: "El problema del teléfono descompuesto en las agencias",
        paragraphs: [
          "En el modelo de agencia tradicional, el cliente habla con un comercial; el comercial le pasa un resumen a un Project Manager; el PM redacta tickets para un diseñador y un programador que trabajan en 5 proyectos a la vez. En ese camino se pierde el contexto del negocio, los plazos se triplican y el presupuesto se infla para pagar toda esa estructura.",
          "En Se7en Studio eliminamos todas las capas intermedias. Somos dos fundadores que ya creamos y operamos nuestras propias startups en producción (Takefyy, Sentinel y Apex Performance). Cuando nos contás un problema de negocio, quienes te escuchan son exactamente las mismas manos que diseñan en Figma y escriben el código en Next.js y Supabase esa misma tarde.",
        ],
      },
      {
        heading: "Capacidad limitada a propósito: 2 lugares por mes",
        paragraphs: [
          "Para sostener ese nivel de detalle y velocidad, tomamos como máximo 2 proyectos nuevos por mes. Eso garantiza foco real en tu lanzamiento y entregas en semanas, no en trimestres.",
        ],
      },
    ],
    relatedProjectSlug: "apex-ai",
    relatedBlogSlugs: [
      "que-es-se7en-studio-estudio-de-software-y-producto-digital",
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
    ],
    faqs: [
      {
        id: "ag-garantia",
        question: "¿Qué respaldo tengo al trabajar con un estudio boutique de dos fundadores?",
        answer:
          "Firmamos alcance, plazos y precio por escrito antes de empezar, el código vive en tu propio GitHub desde el primer despliegue y todos los proyectos incluyen 30 días de garantía y soporte post-lanzamiento sin costo.",
      },
      {
        id: "ag-factura",
        question: "¿Trabajan con empresas de Argentina y del exterior?",
        answer:
          "Sí, trabajamos 100% remoto con clientes de Argentina, Latinoamérica, Estados Unidos y Europa, aceptando pagos en ARS, USD (SWIFT/ACH), Stripe, Wise y USDT/USDC.",
      },
    ],
  },
  {
    slug: "se7en-vs-freelancer",
    competitor: "Freelancer Individual (Upwork / Workana / Independiente)",
    shortTitle: "Se7en Studio vs Freelancer Individual",
    title: "Se7en Studio vs Contratar un Freelancer: Diseño + Ingeniería en un Solo Equipo",
    metaDescription:
      "Comparativa entre contratar un programador o diseñador freelance por separado y trabajar con Se7en Studio: cobertura full-stack + UI/UX, plazos y continuidad.",
    publishedIso: "2026-10-16",
    category: "Modelo de Trabajo",
    leadSentences: [
      "Contratar a un freelancer individual sirve cuando ya tenés el diseño cerrado en Figma, la arquitectura definida y solo necesitás resolver una tarea puntual o un ajuste acotado a bajo costo.",
      "Se7en Studio gana cuando necesitás construir un producto completo de punta a punta: combinamos un fundador especialista en arquitectura y backend (Franco Riquero) con un fundador especialista en diseño de producto, UI/UX y motion (Federico Martín), evitando el clásico choque entre un programador que no diseña y un diseñador que no programa.",
    ],
    whenCompetitorWins: [
      "Solo necesitás corregir un bug puntual en un sistema existente o maquetar una pantalla suelta.",
      "Vos mismo sos director técnico (CTO) o diseñador senior y podés dirigir, revisar código y coordinar a varios freelancers por tu cuenta.",
    ],
    whenSe7enWins: [
      "Querés un producto que se vea como una marca de primer nivel (dirección de arte, tipografía, micro-animaciones) y a la vez tenga una ingeniería sólida por detrás (PostgreSQL, seguridad RLS, pagos, IA).",
      "No podés arriesgarte a que el único freelancer se quede sin tiempo a mitad del proyecto y deje el lanzamiento colgado.",
      "Necesitás visión de producto real de dos fundadores que ya lanzaron y escalaron software propio.",
    ],
    tableRows: [
      {
        feature: "Cobertura de disciplinas",
        se7en: "Diseño UI/UX + Motion + Frontend + Backend + Base de Datos + IA",
        competitor: "Suele dominar solo una parte (o diseña bien o programa backend)",
      },
      {
        feature: "Riesgo de abandono o bloqueo",
        se7en: "Equipo de 2 socios con procesos, CI/CD y tests automatizados",
        competitor: "Alto si la persona se satura con otros clientes",
      },
      {
        feature: "Gestión requerida de tu parte",
        se7en: "Mínima: nos ocupamos desde la estrategia hasta el deploy en tu dominio",
        competitor: "Tenés que coordinar entre diseñador, programador y hosting",
      },
      {
        feature: "Garantía post-lanzamiento",
        se7en: "30 días de soporte y ajustes incluidos por contrato",
        competitor: "Variable según disponibilidad del profesional",
      },
    ],
    deepDive: [
      {
        heading: "Por qué un solo perfil rara vez alcanza para un producto completo",
        paragraphs: [
          "Cuando contratás a un excelente programador backend freelance, la base de datos funciona pero la interfaz suele verse genérica o difícil de usar. Cuando contratás a un gran diseñador visual, te entrega un Figma hermoso o una plantilla pesada que después nadie sabe conectar con pagos, stock en tiempo real o inteligencia artificial.",
          "En Se7en Studio unimos los dos mundos en un equipo que trabaja junto todos los días: Federico diseña la interfaz, el sistema tipográfico y las interacciones, mientras Franco construye la arquitectura en Next.js, Supabase y las integraciones de negocio.",
        ],
      },
    ],
    relatedProjectSlug: "takefyy",
    relatedBlogSlugs: [
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
    ],
    faqs: [
      {
        id: "fl-precio",
        question: "¿Es mucho más caro Se7en Studio que un freelancer?",
        answer:
          "Cuando sumás lo que cuesta contratar por separado a un diseñador UI/UX senior y a un desarrollador full-stack senior —más las semanas perdidas coordinándolos—, nuestros paquetes cerrados desde USD 1.200 resultan más rápidos y predecibles.",
      },
      {
        id: "fl-codigo",
        question: "¿El código que entregan lo puede seguir otro desarrollador en el futuro?",
        answer:
          "Sí. Escribimos TypeScript estricto sobre Next.js y Supabase siguiendo estándares limpios y documentados, sin código propietario oculto.",
      },
    ],
  },
  {
    slug: "se7en-vs-webflow-framer",
    competitor: "Webflow y Framer",
    shortTitle: "Se7en Studio (Next.js) vs Webflow / Framer",
    title: "Next.js a Medida (Se7en Studio) vs Webflow y Framer: Cuándo usar cada uno",
    metaDescription:
      "Comparamos el desarrollo en Next.js + Tailwind + Framer Motion de Se7en Studio frente a constructores visuales como Webflow y Framer: límites técnicos, costos por sitio y SEO.",
    publishedIso: "2026-10-18",
    category: "Frontend & Diseño",
    leadSentences: [
      "Framer y Webflow son excelentes herramientas si sos diseñador y querés publicar una landing estática rápida sin escribir código, asumiendo el pago mensual en dólares por cada dominio y límite de CMS.",
      "Se7en Studio con Next.js 16 es superior cuando tu sitio necesita lógica de negocio real (cotizadores, reservas en vivo, carritos a medida, paneles de clientes o IA), rendimiento móvil 100/100 sin scripts propietarios y cero alquiler mensual por mantener la página online.",
    ],
    whenCompetitorWins: [
      "Tenés un diseñador en tu equipo que ya domina Framer o Webflow y quiere editar el layout arrastrando bloques todas las semanas.",
      "El sitio es 100% estático (sin usuarios, ni reservas, ni catálogo dinámico complejo) y no te importa pagar entre USD 20 y USD 60 por mes de suscripción.",
    ],
    whenSe7enWins: [
      "Querés las mismas (o mejores) animaciones a 60 FPS e impacto visual, pero siendo dueño del código fuente en GitHub sin pagar suscripción mensual a Framer o Webflow.",
      "Necesitás combinar una landing de alto impacto con funcionalidades reales: reservador de turnos en vivo (como Muzzaga Pádel), mapa satelital interactivo (como Sentinel) o portal de clientes.",
      "Buscás SEO técnico y optimización para LLMs (JSON-LD a medida, llms.txt, control total del HTML renderizado en servidor).",
    ],
    tableRows: [
      {
        feature: "Suscripción mensual por sitio publicado",
        se7en: "USD 0 (código propio alojado en Vercel)",
        competitor: "USD 15 a USD 79/mes por sitio + costos por idioma (locales)",
      },
      {
        feature: "Multi-idioma (Inglés / Español)",
        se7en: "Incluido en el código sin cobro mensual por idioma",
        competitor: "Cobran un adicional mensual por cada idioma extra ('Localization')",
      },
      {
        feature: "Lógica backend, base de datos y APIs",
        se7en: "Ilimitada (Next.js Server Actions + PostgreSQL + IA)",
        competitor: "No tienen backend real; requieren parches externos (Zapier/Make)",
      },
      {
        feature: "Portabilidad del código",
        se7en: "100% exportable y estándar (React + TypeScript)",
        competitor: "Framer no permite exportar código; Webflow exporta solo HTML estático sin CMS",
      },
    ],
    deepDive: [
      {
        heading: "El techo invisible de los constructores no-code visuales",
        paragraphs: [
          "Muchas startups arrancan en Framer o Webflow porque se ven modernos. El problema aparece al mes siguiente cuando quieren agregar un calculador de precios interactivo, conectar disponibilidad real de turnos, crear un área privada para clientes o sumar versión en inglés sin que la factura mensual en dólares se duplique.",
          "En Se7en Studio usamos directamente las tecnologías sobre las que se inspira Framer (React y Framer Motion) combinadas con Next.js 16. Obtenés el mismo nivel de dirección de arte y fluidez visual, pero sobre una arquitectura de software real que nunca te queda chica.",
        ],
      },
    ],
    relatedProjectSlug: "pravilo",
    relatedBlogSlugs: [
      "guia-definitiva-core-web-vitals-100-para-fundadores",
      "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
    ],
    faqs: [
      {
        id: "wf-animaciones",
        question: "¿Pueden lograr en código el mismo nivel de animaciones que un sitio hecho en Framer?",
        answer:
          "Sí, de hecho Framer usa por debajo la librería Framer Motion para React, que es exactamente la que usamos en Se7en Studio junto con Lenis y shaders WebGL optimizados.",
      },
      {
        id: "wf-export",
        question: "Si ya tengo un diseño en Figma o Framer, ¿lo pueden pasar a Next.js?",
        answer:
          "Sí. Convertimos tu diseño en una aplicación Next.js 16 ultrarrápida con código limpio en tu GitHub para que dejes de pagar licencias mensuales y sumes funciones a medida.",
      },
    ],
  },
  {
    slug: "se7en-vs-pedidosya-rappi-marketplaces",
    competitor: "Marketplaces con Comisión (PedidosYa / Rappi / Mercado Libre)",
    shortTitle: "Canal Propio (Se7en / Takefyy) vs Marketplaces",
    title: "Canal de Ventas Propio vs PedidosYa, Rappi y Mercado Libre: Cómo Ahorrar el 25% de Comisión",
    metaDescription:
      "Por qué los locales gastronómicos y comercios están sumando su propia plataforma de pedidos y e-commerce para no perder entre el 15% y el 28% de cada venta en comisiones.",
    publishedIso: "2026-10-20",
    category: "Comercio & Rentabilidad",
    leadSentences: [
      "Los marketplaces como PedidosYa, Rappi o Mercado Libre sirven como vidriera inicial para que te descubra gente que todavía no conoce tu marca, a cambio de cederles entre el 15% y el 28% de cada venta.",
      "Un canal de pedidos o e-commerce propio (como Takefyy o las tiendas a medida de Se7en Studio) es indispensable para tus clientes recurrentes y tu tráfico de Instagram/WhatsApp: vendés con 0% de comisión, cobrás al instante y sos dueño de la base de datos de tus compradores.",
    ],
    whenCompetitorWins: [
      "Acabás de abrir un local sin seguidores ni clientes propios y necesitás aparecer en el buscador interno de una app masiva.",
      "Dependés 100% de la flota de repartidores tercerizados del marketplace y no tenés forma de gestionar envíos propios ni retiro en local.",
    ],
    whenSe7enWins: [
      "Tus clientes ya te conocen por Instagram, Google o el local físico, pero terminan pidiendo por una app que se queda con un cuarto de tu facturación.",
      "Querés recibir el pedido armado y pagado directo en tu WhatsApp o panel en vivo sin errores ni mensajes interminables.",
      "Querés fidelizar a tus clientes con precios mejores en tu canal directo que en las apps de delivery.",
    ],
    tableRows: [
      {
        feature: "Comisión sobre cada venta",
        se7en: "0% (el 100% del margen queda en tu negocio)",
        competitor: "15% a 28% + costos financieros y recargos",
      },
      {
        feature: "A quién le pertenece el cliente",
        se7en: "A vos (tenés su nombre, teléfono e historial de compras)",
        competitor: "Al marketplace (y al lado de tu producto muestran a tu competidor)",
      },
      {
        feature: "Plazo de acreditación del dinero",
        se7en: "Inmediato en tu cuenta o Mercado Pago / efectivo",
        competitor: "Liquidaciones diferidas semanales o quincenales",
      },
      {
        feature: "Personalización de promociones y combos",
        se7en: "Total desde tu propio panel en tiempo real",
        competitor: "Restringida a las campañas que impone la aplicación",
      },
    ],
    deepDive: [
      {
        heading: "La estrategia inteligente: captar afuera, fidelizar adentro",
        paragraphs: [
          "No hace falta apagar los marketplaces de un día para el otro. Los comercios más rentables usan las apps masivas solo para que un cliente nuevo los pruebe la primera vez, y en el mismo packaging (con un QR o un 10% de descuento directo) lo llevan a su propia web de pedidos para todas las compras siguientes.",
          "Así nació Takefyy —la plataforma SaaS creada por Franco Riquero en Se7en Studio— y la arquitectura que implementamos en tiendas a medida: catálogos que abren en 0.4 segundos desde el link de Instagram, actualizan stock en vivo y envían el pedido listo al WhatsApp o cocina del local.",
        ],
      },
    ],
    relatedProjectSlug: "takefyy",
    relatedBlogSlugs: [
      "arquitectura-sin-comisiones-como-construimos-takefyy",
      "como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya",
    ],
    faqs: [
      {
        id: "mp-recupero",
        question: "¿En cuánto tiempo se recupera la inversión de una tienda o plataforma propia?",
        answer:
          "Un comercio o restaurante que factura el equivalente a USD 8.000 mensuales en canales con 20% de comisión pierde USD 1.600 todos los meses. Con una tienda propia a medida, la inversión se amortiza en menos de 60 días.",
      },
      {
        id: "mp-whatsapp",
        question: "¿El cliente tiene que descargarse una aplicación para pedir?",
        answer:
          "No. Funciona directo desde el navegador del celular con un link (y opcionalmente se puede instalar como PWA), sin pedirle que baje nada de la App Store.",
      },
    ],
  },
  {
    slug: "se7en-vs-bubble-nocode",
    competitor: "Plataformas No-Code (Bubble / Glide / Softr)",
    shortTitle: "Se7en Studio (Código Real) vs Bubble / No-Code",
    title: "Desarrollo SaaS en Next.js + Supabase vs Bubble y No-Code: Escalabilidad y Costos",
    metaDescription:
      "¿Conviene armar tu MVP en Bubble/Glide o desarrollarlo en código real con Next.js y Supabase? Analizamos el lock-in, los costos por Workload Units y la velocidad.",
    publishedIso: "2026-10-22",
    category: "SaaS & Startups",
    leadSentences: [
      "Herramientas No-Code como Bubble o Glide sirven si querés armar vos mismo un prototipo interno de validación dedicándole semanas a aprender la herramienta sin presupuesto para contratar desarrollo.",
      "Cuando vas a lanzar un SaaS real al mercado, construirlo en código limpio con Se7en Studio (Next.js + Supabase desde USD 2.800 en ~3 semanas) evita quedar atrapado en una plataforma cerrada ('vendor lock-in') que no te deja exportar el código y te encarece la factura por cada consulta de tus usuarios.",
    ],
    whenCompetitorWins: [
      "Tenés 0 presupuesto pero mucho tiempo libre para aprender a arrastrar flujos lógicos en Bubble y armar un prototipo casero.",
      "Es una herramienta interna temporal para 5 empleados de tu oficina y nunca va a salir a clientes públicos.",
    ],
    whenSe7enWins: [
      "Querés ser dueño del código fuente de tu startup (imprescindible si buscás inversores, socios técnicos o vender la empresa en el futuro).",
      "Necesitás que la aplicación vuele en celulares y tenga una interfaz a medida, sin los tiempos de carga pesados ni las limitaciones móviles de Bubble.",
      "No querés que tu factura mensual explote por 'Workload Units' apenas tus primeros 500 usuarios empiecen a usar la app todos los días.",
    ],
    tableRows: [
      {
        feature: "Propiedad del código fuente",
        se7en: "100% tuyo en GitHub (Next.js + TypeScript + PostgreSQL)",
        competitor: "0% exportable: si salís de Bubble tenés que rehacer todo de cero",
      },
      {
        feature: "Tiempo hasta tener el MVP en producción",
        se7en: "2 a 4 semanas (~18 días hábiles) llave en mano",
        competitor: "1 a 3 meses entre curva de aprendizaje o agencias no-code",
      },
      {
        feature: "Rendimiento y SEO de páginas públicas",
        se7en: "Excelente (Server Rendering instantáneo)",
        competitor: "Limitado (renderizado pesado en cliente)",
      },
      {
        feature: "Costos operativos al escalar usuarios",
        se7en: "Bajos y predecibles (PostgreSQL estándar en Supabase)",
        competitor: "Crece rápido por consumo de Workload Units (WU)",
      },
    ],
    deepDive: [
      {
        heading: "Con IA e ingeniería moderna, el código real ya es tan rápido de construir como el No-Code",
        paragraphs: [
          "Hace cinco años se justificaba usar Bubble porque programar un MVP a medida tardaba 5 meses y costaba USD 25.000. Hoy, en Se7en Studio combinamos nuestra arquitectura probada en Next.js 16 y Supabase con flujos asistidos por IA para entregarte un SaaS completo en 3 semanas por USD 2.800.",
          "La diferencia es gigantesca: en lugar de terminar con un prototipo lento que tenés que tirar a la basura cuando conseguís tus primeros clientes, arrancás desde el día uno con la misma base tecnológica que usan las startups globales más rápidas.",
        ],
      },
    ],
    relatedProjectSlug: "apex-ai",
    relatedBlogSlugs: [
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
      "arquitectura-sin-comisiones-como-construimos-takefyy",
    ],
    faqs: [
      {
        id: "nc-migrar",
        question: "Ya tengo un MVP en Bubble o Glide que se volvió lento o caro, ¿pueden migrarlo a código real?",
        answer:
          "Sí. Exportamos tus tablas de datos (usuarios, registros, historial), los migramos a PostgreSQL en Supabase y reconstruimos la aplicación en Next.js en 2 a 4 semanas sin que tus usuarios pierdan su información.",
      },
      {
        id: "nc-base",
        question: "¿Qué base de datos usan para los proyectos SaaS?",
        answer:
          "Usamos PostgreSQL sobre Supabase con políticas de seguridad a nivel de fila (Row-Level Security), autenticación integrada y sincronización en tiempo real.",
      },
    ],
  },
  {
    slug: "se7en-vs-equipo-in-house",
    competitor: "Contratar un Equipo In-House de Desarrollo",
    shortTitle: "Se7en Studio vs Equipo In-House",
    title: "Contratar a Se7en Studio por Proyecto vs Armar un Equipo de Desarrollo In-House",
    metaDescription:
      "Cuándo conviene contratar desarrolladores y diseñadores en plantilla fija y cuándo conviene lanzar o iterar tu producto digital con Se7en Studio.",
    publishedIso: "2026-10-25",
    category: "Estrategia B2B",
    leadSentences: [
      "Armar un equipo de tecnología in-house es el paso correcto cuando tu startup ya levantó una ronda Serie A o factura de forma recurrente lo suficiente para sostener USD 8.000 a USD 15.000 mensuales en sueldos fijos de ingeniería y diseño.",
      "Para lanzar tu primera versión comercial, rediseñar tu plataforma o abrir una nueva unidad digital, trabajar con Se7en Studio te da un equipo senior completo (diseño + full-stack) desde la primera semana, por un monto cerrado y sin costos laborales fijos.",
    ],
    whenCompetitorWins: [
      "El software es el único activo de tu compañía, ya tenés product-market fit validado y contás con presupuesto anual para pagar salarios senior, cargas sociales y liderazgo técnico (CTO) a tiempo completo.",
    ],
    whenSe7enWins: [
      "Querés validar y lanzar un producto en 3 semanas sin pasar 3 meses entrevistando candidatos.",
      "Sos una empresa consolidada (industrial, inmobiliaria, comercial o de servicios) que necesita una plataforma digital impecable pero no tiene sentido que monte un departamento de software propio.",
      "Necesitás velocidad de ejecución inicial y que luego el código quede prolijo para que, el día de mañana, lo tome tu propio equipo o sigamos iterándolo juntos.",
    ],
    tableRows: [
      {
        feature: "Tiempo hasta escribir la primera línea de código",
        se7en: "48 horas desde el kickoff",
        competitor: "1 a 3 meses de reclutamiento, entrevistas y onboarding",
      },
      {
        feature: "Costo de lanzar un MVP completo",
        se7en: "USD 2.800 a USD 4.500 (pago único por proyecto)",
        competitor: "USD 15.000+ en los primeros 3 meses de sueldos (diseñador + dev)",
      },
      {
        feature: "Compromiso financiero mensual",
        se7en: "Cero costo fijo obligatorio tras el lanzamiento",
        competitor: "Sueldos fijos todos los meses haya o no nuevos desarrollos",
      },
      {
        feature: "Transición futura a tu propio equipo",
        se7en: "Código estándar en tu GitHub listo para transferir",
        competitor: "N/A",
      },
    ],
    deepDive: [
      {
        heading: "Lanzar primero, contratar estructura fija después",
        paragraphs: [
          "El error más caro que vemos en fundadores no técnicos es contratar dos programadores fijos antes de tener un solo cliente pagando. Entre reclutamiento, definiciones de diseño que faltan y falta de dirección técnica, se van 6 meses de caja sin haber salido al mercado.",
          "Con Se7en Studio invertís una fracción de ese presupuesto para tener el producto diseñado, programado y cobrando en producción en menos de un mes. Cuando el negocio ya tracciona, podés seguir evolucionándolo con nosotros a demanda o sumar desarrolladores propios sobre una arquitectura ya probada.",
        ],
      },
    ],
    relatedProjectSlug: "sentinel",
    relatedBlogSlugs: [
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
    ],
    faqs: [
      {
        id: "ih-mantenimiento",
        question: "Si no tengo equipo técnico interno, ¿quién mantiene la plataforma después de los 30 días de garantía?",
        answer:
          "La infraestructura en Vercel y Supabase requiere mínimo mantenimiento operativo. Además, ofrecemos planes opcionales de evolución y mantenimiento mensual o bolsas de horas para sumar funciones a medida que tu negocio crece.",
      },
    ],
  },
];

export function getComparisonBySlug(slug: string): ComparisonItem | undefined {
  return comparisons.find((c) => c.slug === slug);
}

