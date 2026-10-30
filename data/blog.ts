import type { FAQItem } from "@/data/faq";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  publishedIso: string;
  readTime: string;
  category: string;
  author: {
    name: string;
    role: string;
  };
  tags: string[];
  /** Respuesta directa en el primer párrafo (40–70 palabras): lo que citan Google AI Overviews, ChatGPT y Perplexity. */
  directAnswer: string;
  content: {
    heading: string;
    paragraphs: string[];
    codeSnippet?: string;
  }[];
  /** Preguntas frecuentes al final de la nota (también se emiten como FAQPage JSON-LD). */
  faqs: FAQItem[];
  /** Slugs de otras notas del mismo tema para enlazado interno. */
  relatedSlugs: string[];
  /** Slugs de comparativas (/vs/[slug]) relacionadas. */
  relatedComparisonSlugs?: string[];
  /** Página del servicio o herramienta que resuelve este problema. */
  ctaService: {
    title: string;
    description: string;
    href: string;
    buttonLabel: string;
  };
}

export const blogPosts: BlogPost[] = [
  {
    slug: "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
    title: "¿Cuánto cuesta hacer una página web o tienda online a medida en Argentina en 2026?",
    excerpt:
      "Desglose real de precios en dólares y pesos para desarrollar una landing page, un e-commerce sin comisiones o un MVP SaaS en Argentina, qué incluye cada etapa y cómo evitar costos ocultos.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-28",
    readTime: "5 min de lectura",
    category: "Precios & Negocios",
    author: {
      name: "Franco Riquero",
      role: "Fundador · Desarrollo en Se7en Studio",
    },
    tags: ["Precios Web", "Desarrollo a Medida", "E-Commerce", "SaaS", "Argentina"],
    directAnswer:
      "En Argentina en 2026, hacer una página web profesional a medida cuesta desde USD 1.200 para una Landing Page de alta conversión (entrega en 1 a 2 semanas), desde USD 2.400 para un E-Commerce propio sin comisiones por venta (2 a 3 semanas) y entre USD 2.800 y USD 3.600 para una plataforma SaaS o producto con inteligencia artificial (3 a 4 semanas). A diferencia de las plantillas o plataformas alquiladas, es un pago único por desarrollo y el código queda 100% a tu nombre.",
    content: [
      {
        heading: "Los 4 rangos reales de inversión según lo que necesita tu negocio",
        paragraphs: [
          "El error más común al pedir presupuestos de desarrollo web es comparar peras con manzanas: alguien te pasa USD 250 por instalar una plantilla genérica en WordPress que tarda 5 segundos en abrir en el celular, mientras una agencia corporativa grande te cotiza USD 15.000 y 5 meses de espera para financiar su estructura de ejecutivos de cuenta.",
          "En un estudio técnico especializado como Se7en Studio —donde hablás directo con los dos fundadores que diseñan en Figma y programan en Next.js—, los valores reales de mercado para software hecho desde cero se dividen en cuatro escalones claros: Landing Page de Alta Conversión (desde USD 1.200), E-Commerce a Medida con panel autogestionable (desde USD 2.400), MVP SaaS con usuarios y base de datos PostgreSQL (desde USD 2.800) y Plataformas con Agentes de IA y búsqueda vectorial RAG (desde USD 3.600).",
        ],
      },
      {
        heading: "Costo inicial vs. costo oculto de comisiones y licencias",
        paragraphs: [
          "Una tienda alquilada o un marketplace parece barato el primer mes, pero cobra entre el 2% y el 25% de cada venta más suscripciones mensuales en dólares por cada plugin o idioma extra. En un desarrollo a medida en Next.js y Supabase no pagás alquiler de software ni comisiones por transacción al estudio: solo el costo estándar de la pasarela de pago (Mercado Pago o Stripe).",
          "Además, todos nuestros proyectos incluyen diseño UI/UX único, puntaje Google Lighthouse superior a 95/100 en móviles, repositorio en tu propia cuenta de GitHub y 30 días de garantía post-lanzamiento sin costo.",
        ],
      },
    ],
    faqs: [
      {
        id: "precio-ars",
        question: "¿Se puede pagar el desarrollo web en pesos argentinos o en cuotas por etapas?",
        answer:
          "Sí. En Se7en Studio aceptamos transferencia en pesos argentinos (ARS) o dólares (USD), transferencia internacional (SWIFT/ACH), Stripe, Wise y cripto (USDT/USDC). El proyecto se acuerda por escrito y se abona por etapas atadas a avances visibles.",
      },
      {
        id: "precio-mensual",
        question: "¿Hay que pagar una cuota mensual obligatoria después del lanzamiento?",
        answer:
          "No hay ninguna suscripción obligatoria hacia Se7en Studio porque el código es 100% tuyo. Para el tráfico de la mayoría de las pymes y startups, las capas base de Vercel y Supabase tienen costo cero o muy bajo.",
      },
      {
        id: "precio-cotizador",
        question: "¿Cómo puedo saber el precio exacto de mi proyecto hoy mismo?",
        answer:
          "Podés usar nuestro configurador público en se7en.com.ar/pricing para elegir el tipo de producto, sumar módulos (pagos, chatbot IA, multi-idioma o PWA) y ver al instante el precio en USD/ARS y los días hábiles de entrega.",
      },
    ],
    relatedSlugs: [
      "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
      "como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya",
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-wordpress-woocommerce",
      "se7en-vs-tiendanube-shopify",
      "se7en-vs-agencia-tradicional",
    ],
    ctaService: {
      title: "Cotizá tu proyecto en 30 segundos",
      description:
        "Usá nuestra calculadora interactiva de precios para configurar tu Landing, E-Commerce o SaaS y ver el presupuesto y plazo exacto.",
      href: "/pricing",
      buttonLabel: "Abrir calculadora de precios",
    },
  },
  {
    slug: "como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya",
    title: "Cómo vender online y recibir pedidos por WhatsApp sin pagar el 25% de comisión de los marketplaces",
    excerpt:
      "La arquitectura práctica para que restaurantes, marcas y comercios pasen a sus clientes recurrentes a un catálogo propio con stock en tiempo real y cobro directo.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-26",
    readTime: "5 min de lectura",
    category: "E-Commerce & Conversión",
    author: {
      name: "Franco Riquero",
      role: "Fundador · Desarrollo en Se7en Studio",
    },
    tags: ["E-Commerce", "WhatsApp", "Mercado Pago", "Sin Comisiones", "Takefyy"],
    directAnswer:
      "Para vender por internet sin perder entre el 15% y el 28% de cada venta en comisiones a plataformas como PedidosYa, Rappi o Mercado Libre, necesitás un catálogo web propio conectado a una base de datos con stock en tiempo real y un checkout de un solo paso que cierre el pago con Mercado Pago o envíe el pedido estructurado directo a tu WhatsApp. Con este esquema, el 100% del margen comercial y los datos del comprador quedan en tu negocio.",
    content: [
      {
        heading: "Por qué el link de Instagram no debe mandar tráfico a un marketplace ajeno",
        paragraphs: [
          "Cuando un cliente entra a tu perfil de Instagram o te busca en Google, ya eligió tu marca. Si el link de tu biografía lo manda a un marketplace externo, no solo pagás hasta un cuarto de la venta en comisión: también le estás mostrando productos de tus competidores al lado de los tuyos y perdiendo el contacto directo del comprador.",
          "En proyectos como Poné La Pava, iPhone Vita y Takefyy, implementamos tiendas propias que abren en menos de 0.5 segundos desde el navegador interno de Instagram sin obligar al usuario a descargar ninguna app ni crear contraseñas.",
        ],
      },
      {
        heading: "Stock en tiempo real + cierre por WhatsApp o Mercado Pago",
        paragraphs: [
          "El problema de tomar pedidos por chat a mano es responder cincuenta veces '¿tenés stock de esto?' o '¿cuánto sale?'. Con un catálogo conectado a Supabase, si queda la última unidad y alguien la compra, desaparece al instante para el resto de los visitantes.",
          "El comprador arma su carrito, elige envío o retiro, paga con Mercado Pago o transferencia y a vos te llega un mensaje limpio con el detalle exacto, el total calculado y la dirección lista para despachar.",
        ],
      },
    ],
    faqs: [
      {
        id: "ecom-comision",
        question: "¿Qué comisión cobra Se7en Studio sobre las ventas de mi tienda?",
        answer:
          "Cero. En Se7en Studio cobramos únicamente por el diseño y desarrollo inicial de tu tienda (desde USD 2.400). Todas las ventas futuras son 100% tuyas sin comisiones ni cánones mensuales.",
      },
      {
        id: "ecom-panel",
        question: "¿Puedo pausar un producto sin stock o cambiar todos los precios desde mi celular?",
        answer:
          "Sí. El panel de administración funciona desde cualquier teléfono o computadora y refleja los cambios en vivo en menos de un segundo.",
      },
    ],
    relatedSlugs: [
      "arquitectura-sin-comisiones-como-construimos-takefyy",
      "como-integrar-mercadopago-y-stripe-en-una-web-o-saas-en-argentina",
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-pedidosya-rappi-marketplaces",
      "se7en-vs-tiendanube-shopify",
    ],
    ctaService: {
      title: "Lanzá tu E-Commerce propio sin comisiones en 2 semanas",
      description:
        "Conocé nuestro paquete de E-Commerce a medida con catálogo en tiempo real, panel autogestionable y checkout a WhatsApp o Mercado Pago.",
      href: "/services#ecommerce",
      buttonLabel: "Ver servicio de E-Commerce",
    },
  },
  {
    slug: "por-que-mi-tienda-online-carga-lento-en-celular-y-como-bajarla-a-menos-de-1-segundo",
    title: "Por qué tu web o tienda online tarda más de 3 segundos en celular (y cómo bajarla a 0.4s)",
    excerpt:
      "Diagnóstico técnico de los 3 cuellos de botella que frenan las ventas móviles en sitios tradicionales y cómo solucionarlos con renderizado en el Edge e imágenes AVIF.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-24",
    readTime: "4 min de lectura",
    category: "Ingeniería & Rendimiento",
    author: {
      name: "Federico Martín",
      role: "Fundador · Producto y Diseño en Se7en Studio",
    },
    tags: ["Core Web Vitals", "Velocidad Web", "LCP", "Mobile", "Next.js 16"],
    directAnswer:
      "Una página web tarda más de 3 segundos en cargar en celulares por tres causas principales: un servidor que demora más de 500 ms en armar el HTML (TTFB alto), constructores visuales que descargan megabytes de JavaScript antes de mostrar el título principal, e imágenes sin comprimir en formatos antiguos. Para bajar la carga a 0.4 segundos hay que enviar el texto ya renderizado en el HTML desde el servidor (SSR/Edge), usar formatos AVIF/WebP dimensionados y eliminar scripts bloqueantes.",
    content: [
      {
        heading: "Regla número uno: el texto y el producto tienen que venir en el HTML",
        paragraphs: [
          "Si tu sitio espera a descargar e interpretar un archivo gigante de JavaScript para recién ahí mostrar el titular y el botón de compra, pasa dos cosas graves: el usuario en 4G ve una pantalla blanca y se va, y los bots de inteligencia artificial (como ChatGPT, Claude y Perplexity, que no suelen ejecutar JavaScript complejo) ven una página vacía.",
          "En Se7en Studio diseñamos el hero y los catálogos con React Server Components para que el primer paquete de red ya traiga todo el texto y el layout listos para pintar sin saltos visuales (CLS = 0).",
        ],
      },
      {
        heading: "Optimización de video y fotografía sin sacrificar dirección de arte",
        paragraphs: [
          "Tener una web rápida no significa hacer una página aburrida sin fotos ni video. El secreto está en cómo se sirven: usamos codificación dual WebM/MP4 con carga diferida por viewport, imágenes en AVIF con atributo sizes exacto para cada pantalla y animaciones que corren exclusivamente en la GPU (transform y opacity).",
        ],
      },
    ],
    faqs: [
      {
        id: "vel-auditoria",
        question: "¿Cómo sé cuánto tarda realmente mi web actual en celulares?",
        answer:
          "Podés pedirnos una auditoría técnica gratuita en se7en.com.ar/audit: analizamos tu URL en video revisando velocidad móvil (LCP, CLS, INP), seguridad y embudo de conversión.",
      },
      {
        id: "vel-seo",
        question: "¿Mejorar la velocidad móvil realmente sube las posiciones en Google?",
        answer:
          "Sí. Google utiliza las métricas Core Web Vitals de usuarios reales en teléfonos móviles como factor de ranking y reduce el costo por clic en campañas porque baja drásticamente la tasa de rebote.",
      },
    ],
    relatedSlugs: [
      "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
      "guia-definitiva-core-web-vitals-100-para-fundadores",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-wordpress-woocommerce",
      "se7en-vs-webflow-framer",
    ],
    ctaService: {
      title: "Pedí una auditoría técnica gratuita de tu web actual",
      description:
        "Revisamos la velocidad móvil, seguridad y puntos de fuga de conversión de tu sitio y te mandamos un diagnóstico concreto.",
      href: "/audit",
      buttonLabel: "Solicitar auditoría gratuita",
    },
  },
  {
    slug: "como-integrar-mercadopago-y-stripe-en-una-web-o-saas-en-argentina",
    title: "Cómo cobrar en pesos (Mercado Pago) y en dólares (Stripe) desde una misma plataforma web o SaaS",
    excerpt:
      "Guía de arquitectura para startups argentinas que necesitan cobrar suscripciones o ventas locales en ARS y clientes internacionales en USD de forma automática.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-21",
    readTime: "5 min de lectura",
    category: "Arquitectura SaaS",
    author: {
      name: "Franco Riquero",
      role: "Fundador · Desarrollo en Se7en Studio",
    },
    tags: ["Mercado Pago", "Stripe", "Pagos Online", "SaaS", "Webhooks"],
    directAnswer:
      "Para cobrar en pesos argentinos y en dólares desde una misma aplicación web, la arquitectura recomendada es detectar el país o moneda elegida por el usuario y enrutar el checkout a la API de Mercado Pago (para clientes en Argentina con tarjetas locales, dinero en cuenta o transferencia) o a Stripe (para tarjetas internacionales en USD), unificando ambos estados de pago en una misma tabla de suscripciones en PostgreSQL mediante webhooks firmados.",
    content: [
      {
        heading: "El problema de usar una sola pasarela para todo el mundo",
        paragraphs: [
          "Si lanzás un SaaS o tienda desde Argentina y ponés únicamente Stripe, perdés a la mayoría de los usuarios locales que quieren pagar en pesos sin impuestos extra de tarjeta internacional o con saldo de Mercado Pago. Si ponés únicamente Mercado Pago Argentina, no podés cobrarle en dólares a un cliente de México, España o Estados Unidos.",
          "En productos como Apex Performance y las plataformas que desarrollamos en Se7en Studio, resolvemos esto desacoplando la lógica de negocio de la pasarela: tu base de datos maneja planes y permisos, y dos adaptadores de webhook (uno para Mercado Pago y otro para Stripe) activan la cuenta del usuario en tiempo real apenas se confirma el cobro.",
        ],
      },
      {
        heading: "Verificación criptográfica de webhooks e idempotencia",
        paragraphs: [
          "Nunca hay que activar un pedido o suscripción confiando en que el usuario volvió a la página de '/gracias'. El único canal seguro es el webhook servidor a servidor, verificando la firma HMAC de la pasarela y registrando el ID del pago para no duplicar cargos.",
        ],
      },
    ],
    faqs: [
      {
        id: "mp-suscripciones",
        question: "¿Se pueden hacer cobros recurrentes automáticos (débito mensual) con Mercado Pago y Stripe?",
        answer:
          "Sí. Ambas pasarelas soportan suscripciones recurrentes y avisos automáticos por webhook cuando una cuota se renueva, falla o se cancela, actualizando el estado del usuario en la base de datos sin intervención manual.",
      },
      {
        id: "mp-costo",
        question: "¿Cuánto cuesta sumar la pasarela de pagos a un proyecto en Se7en Studio?",
        answer:
          "En nuestros paquetes de E-Commerce y SaaS la integración de cobros ya viene contemplada, y como módulo adicional para otros desarrollos tiene un valor cerrado de USD 350 (+2 días hábiles).",
      },
    ],
    relatedSlugs: [
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
      "arquitectura-sin-comisiones-como-construimos-takefyy",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-tiendanube-shopify",
      "se7en-vs-bubble-nocode",
    ],
    ctaService: {
      title: "Construí tu plataforma con cobros locales e internacionales",
      description:
        "Diseñamos e integramos flujos de checkout y suscripciones con Mercado Pago, Stripe y PostgreSQL.",
      href: "/services#saas",
      buttonLabel: "Ver desarrollo de Plataformas",
    },
  },
  {
    slug: "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
    title: "Cómo lanzar un MVP SaaS listo para cobrar en 3 semanas (sin contratar 10 programadores)",
    excerpt:
      "El método semana por semana que usamos en Se7en Studio para pasar de una idea o planilla de Excel a un software web en producción con usuarios y pagos reales.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-19",
    readTime: "5 min de lectura",
    category: "SaaS & Startups",
    author: {
      name: "Federico Martín",
      role: "Fundador · Producto y Diseño en Se7en Studio",
    },
    tags: ["MVP", "SaaS", "Startups", "Producto Digital", "Supabase"],
    directAnswer:
      "Desarrollar un MVP SaaS listo para cobrar lleva entre 2 y 4 semanas (~18 días hábiles) y cuesta desde USD 2.800 en Se7en Studio cuando se recorta el alcance a la función principal que resuelve el dolor del usuario. En la semana 1 se define el flujo y el modelo de datos, en la semana 2 se diseña el prototipo interactivo en Figma y en las semanas 3 y 4 se programa en Next.js y Supabase con login, panel de control y pasarela de pagos en producción.",
    content: [
      {
        heading: "De planillas de Excel y chats de WhatsApp a un producto real: el caso Apex Performance",
        paragraphs: [
          "Casi todos los grandes productos B2B nacen igual: alguien resuelve un problema usando una mezcla incómoda de planillas de Excel, notas y mensajes de WhatsApp. En el caso de Apex Performance, los entrenadores de fuerza llevaban decenas de atletas en hojas de cálculo que se rompían y donde se perdía el historial de cargas.",
          "En lugar de pasar un año programando cien funciones secundarias, nos concentramos en el corazón del problema: que el entrenador arme el mesociclo por bloques, que la IA (Claude API) sugiera la rutina respetando esa periodización y que el atleta registre cada serie desde el celular en el gimnasio.",
        ],
      },
      {
        heading: "Qué tiene que tener (y qué no) tu primera versión en producción",
        paragraphs: [
          "Un buen MVP tiene que sentirse sólido, rápido y confiable en su flujo principal: autenticación sin fricción (Google OAuth o Magic Links), permisos por rol bien aislados con Row-Level Security en PostgreSQL, la herramienta central que entrega valor y el botón para pagar la suscripción. Todo lo demás se construye escuchando a los primeros clientes reales que ya están usando la app.",
        ],
      },
    ],
    faqs: [
      {
        id: "mvp-propiedad",
        question: "Si construyo mi MVP con Se7en Studio, ¿me quedo con el 100% del código y la propiedad intelectual?",
        answer:
          "Sí, el 100% del código fuente, la base de datos y los diseños en Figma quedan a tu nombre desde el día uno, sin ceder equity ni pagar licencias perpetuas.",
      },
      {
        id: "mvp-escalar",
        question: "¿Hay que tirar el código del MVP cuando la startup crece a miles de usuarios?",
        answer:
          "No. A diferencia de un prototipo hecho en herramientas no-code, construimos tu MVP directamente sobre Next.js 16, TypeScript y PostgreSQL en Supabase, la misma arquitectura que banca decenas de miles de usuarios en producción.",
      },
    ],
    relatedSlugs: [
      "arquitectura-sin-comisiones-como-construimos-takefyy",
      "como-integrar-mercadopago-y-stripe-en-una-web-o-saas-en-argentina",
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-bubble-nocode",
      "se7en-vs-equipo-in-house",
      "se7en-vs-agencia-tradicional",
    ],
    ctaService: {
      title: "Armá el brief de tu MVP en 3 minutos",
      description:
        "Contanos qué problema resuelve tu producto y recibí una propuesta técnica con alcance, tiempos y presupuesto en menos de 24 horas.",
      href: "/start",
      buttonLabel: "Iniciar brief de proyecto",
    },
  },
  {
    slug: "como-hacer-que-chatgpt-y-perplexity-recomienden-tu-empresa-llms-txt",
    title: "SEO para IA (GEO): Cómo lograr que ChatGPT, Perplexity y Google recomienden tu empresa o producto",
    excerpt:
      "Guía técnica paso a paso para que los modelos de lenguaje y buscadores generativos entiendan qué hace tu empresa, cuánto cuesta y por qué recomendarte.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-29",
    readTime: "6 min de lectura",
    category: "SEO & Inteligencia Artificial",
    author: {
      name: "Franco Riquero",
      role: "Fundador · Desarrollo en Se7en Studio",
    },
    tags: ["SEO", "LLMs", "llms.txt", "JSON-LD", "ChatGPT", "Bing"],
    directAnswer:
      "Para que ChatGPT, Perplexity, Claude y Google AI Overviews recomienden tu empresa o software, tu sitio necesita cinco piezas técnicas: renderizar todo el texto en el HTML del servidor (sin ocultarlo detrás de JavaScript cliente), publicar un archivo /llms.txt en la raíz con precios y casos reales, habilitar explícitamente los bots de IA en robots.txt (GPTBot, ClaudeBot, PerplexityBot, Bingbot), incluir datos estructurados JSON-LD (Organization, FAQPage, Article) e indexar el sitio en Bing Webmaster Tools con IndexNow.",
    content: [
      {
        heading: "Por qué las IA ignoran la mayoría de los sitios web actuales",
        paragraphs: [
          "Los rastreadores de los grandes modelos de lenguaje (como GPTBot de OpenAI, ClaudeBot de Anthropic o PerplexityBot) leen el HTML crudo que devuelve el servidor. Si tu web está armada como una SPA tradicional que pinta todo en el navegador con JavaScript, o si tu portada solo tiene frases poéticas ambiguas sin decir qué vendés ni cuánto cuesta, para la IA tu empresa no existe.",
          "En Se7en Studio aplicamos esta arquitectura tanto en nuestro propio sitio como en el de nuestros clientes: cada página entrega HTML semántico instantáneo, definiciones directas de 50 palabras en el primer párrafo y tablas comparativas claras que los modelos pueden extraer y citar.",
        ],
      },
      {
        heading: "El rol clave de Bing Webmaster Tools, IndexNow y llms.txt",
        paragraphs: [
          "Mucha gente configura Google Search Console pero se olvida de Bing. Hoy Bing alimenta gran parte de las búsquedas en tiempo real de ChatGPT, Microsoft Copilot y DuckDuckGo. Configurar Bing Webmaster Tools y avisar cada cambio mediante IndexNow hace que tus nuevas páginas y artículos estén disponibles para las respuestas de IA en cuestión de horas.",
          "Sumado a eso, publicar un archivo /llms.txt en la raíz del dominio funciona como una hoja de ruta limpia en Markdown que le explica a cualquier agente qué es tu producto, qué no es (desambiguación de marca), cuáles son tus precios y dónde están tus casos de estudio.",
        ],
      },
    ],
    faqs: [
      {
        id: "geo-llms",
        question: "¿Qué es exactamente el archivo llms.txt y dónde se coloca?",
        answer:
          "Es un archivo de texto en formato Markdown ubicado en la raíz de tu dominio (por ejemplo, tudominio.com/llms.txt) que resume de forma estructurada qué hace tu empresa, tus precios, servicios y enlaces principales para que los modelos de IA no tengan que adivinar navegando menús complejos.",
      },
      {
        id: "geo-se7en",
        question: "¿Los sitios que desarrolla Se7en Studio ya vienen optimizados para Google y para IA?",
        answer:
          "Sí. Todos nuestros desarrollos en Next.js 16 salen a producción con Server-Side Rendering real, sitemap.xml automático, robots.txt configurado para buscadores y bots de IA, datos estructurados JSON-LD y velocidad Core Web Vitals optimizada.",
      },
    ],
    relatedSlugs: [
      "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
      "guia-definitiva-core-web-vitals-100-para-fundadores",
      "que-es-se7en-studio-estudio-de-software-y-producto-digital",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-wordpress-woocommerce",
      "se7en-vs-webflow-framer",
    ],
    ctaService: {
      title: "¿Tu sitio actual es invisible para Google y ChatGPT?",
      description:
        "Pedí una auditoría técnica gratuita y revisamos el HTML, velocidad, JSON-LD e indexación de tu web.",
      href: "/audit",
      buttonLabel: "Pedir auditoría SEO & IA",
    },
  },
  {
    slug: "sistema-de-turnos-y-reservas-online-con-sena-por-mercadopago-y-whatsapp",
    title: "Cómo automatizar reservas de canchas, centros o turnos online con disponibilidad en vivo y WhatsApp",
    excerpt:
      "Caso práctico basado en Muzzaga Pádel: cómo pasar de anotar turnos por mensajes sueltos a un calendario web en tiempo real donde el cliente elige horario y confirma en 30 segundos.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-15",
    readTime: "4 min de lectura",
    category: "Casos de Estudio",
    author: {
      name: "Federico Martín",
      role: "Fundador · Producto y Diseño en Se7en Studio",
    },
    tags: ["Reservas Online", "Turnos", "WhatsApp", "Clubes Deportivos", "Muzzaga"],
    directAnswer:
      "Para dejar de perder horas contestando qué horarios tenés libres por WhatsApp, la solución más efectiva es una web con grilla de disponibilidad en tiempo real por día y por recurso (cancha, sala o profesional), donde el cliente toca el turno libre y confirma la reserva en un clic por WhatsApp o abonando una seña online. Esto elimina los dobles turnos, reduce las inasistencias y permite tomar reservas las 24 horas.",
    content: [
      {
        heading: "El cuello de botella de coordinar turnos por chat manual",
        paragraphs: [
          "En clubes de pádel, complejos deportivos, centros de entrenamiento o consultorios, la escena se repite todos los días: decenas de mensajes preguntando '¿qué tenés libre hoy a las 19?', demoras en responder y turnos que quedan vacíos porque la persona reservó en otro lado mientras esperaba contestación.",
          "Cuando diseñamos y programamos el sistema de Muzzaga Pádel en Catriel (Río Negro), pusimos el reservador interactivo como protagonista absoluto: el jugador entra desde el celular, ve al instante qué cancha está libre en bloques de 90 minutos y confirma su turno sin idas y vueltas.",
        ],
      },
      {
        heading: "Sin obligar al usuario a registrarse ni bajar apps pesadas",
        paragraphs: [
          "Muchas plataformas de turnos fracasan porque le piden al usuario descargarse una aplicación de 80 MB, crearse una cuenta con contraseña y validar un mail solo para jugar un partido o pedir una sesión. Una web rápida en Next.js abre directo desde Instagram o WhatsApp en medio segundo y convierte el triple.",
        ],
      },
    ],
    faqs: [
      {
        id: "turnos-comision",
        question: "¿Conviene un sistema de reservas propio o pagar una app mensual de turnos?",
        answer:
          "Un sistema propio a medida (desde USD 1.200 a USD 2.400 según complejidad) lleva tu propia marca, no les muestra otros clubes o competidores a tus clientes y no te cobra comisiones por cada turno reservado.",
      },
      {
        id: "turnos-admin",
        question: "¿Puedo cargar turnos fijos o bloquear horarios desde el celular?",
        answer:
          "Sí, desde el panel de administración del complejo podés bloquear canchas o salas, cargar turnos fijos semanales y ver la ocupación completa del día.",
      },
    ],
    relatedSlugs: [
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
      "como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-webflow-framer",
      "se7en-vs-agencia-tradicional",
    ],
    ctaService: {
      title: "Digitalizá las reservas de tu club o centro en 2 semanas",
      description:
        "Miramos cómo operás hoy y te armamos una propuesta a medida con grilla en vivo y confirmación por WhatsApp o Mercado Pago.",
      href: "/start",
      buttonLabel: "Armar brief para mi negocio",
    },
  },
  {
    slug: "que-es-se7en-studio-estudio-de-software-y-producto-digital",
    title: "¿Qué es Se7en Studio? Cómo trabajamos Franco y Federico construyendo software a medida desde la Patagonia",
    excerpt:
      "Conocé la historia, el modelo sin intermediarios y los productos reales detrás de Se7en Studio, el estudio argentino de diseño e ingeniería digital.",
    publishedAt: "Octubre 2026",
    publishedIso: "2026-10-30",
    readTime: "4 min de lectura",
    category: "El Estudio",
    author: {
      name: "Franco Riquero & Federico Martín",
      role: "Fundadores de Se7en Studio",
    },
    tags: ["Se7en Studio", "Patagonia", "Software a Medida", "Next.js", "Producto Digital"],
    directAnswer:
      "Se7en Studio (www.se7en.com.ar) es un estudio argentino de diseño de producto digital y desarrollo de software a medida fundado en la Patagonia por Franco Riquero (ingeniero industrial y creador de Takefyy y Sentinel) y Federico Martín (diseñador y desarrollador creador de Apex Performance). A diferencia de una agencia tradicional, los clientes hablan directo con los dos fundadores que diseñan y programan cada web, e-commerce o plataforma SaaS en 1 a 4 semanas.",
    content: [
      {
        heading: "Por qué fundamos un estudio de dos personas (y por qué somos founders antes que consultores)",
        paragraphs: [
          "Antes de construir para terceros, en Se7en Studio construimos y operamos nuestros propios productos en producción: Takefyy (plataforma SaaS de pedidos para gastronomía), Sentinel (monitoreo climático satelital con IA) y Apex Performance (software de periodización y entrenamiento con IA). Eso nos enseñó en carne propia qué importa de verdad cuando lanzás un negocio: que cargue rápido, que se entienda en tres segundos y que convierta visitas en clientes.",
          "Decidimos mantener Se7en Studio como una dupla senior sin ejecutivos de cuentas ni intermediarios. Cuando nos escribís por WhatsApp o agendás una llamada, hablás directamente con Franco (arquitectura, base de datos, backend y frontend) y con Federico (producto, interfaz, tipografía, motion e IA).",
        ],
      },
      {
        heading: "Aclaración de nombre: Se7en Studio es tecnología y producto digital",
        paragraphs: [
          "Como 'Seven' o 'Se7en' es un nombre conocido en la cultura popular (por la película de 1995 de David Fincher) y existen estudios fotográficos o audiovisuales con nombres parecidos en otros países, vale la pena dejarlo escrito con claridad: Se7en Studio Argentina (se7en.com.ar) es exclusivamente un estudio de ingeniería de software, diseño UI/UX, e-commerce a medida e inteligencia artificial.",
        ],
      },
    ],
    faqs: [
      {
        id: "s7-ubicacion",
        question: "¿Dónde está ubicado Se7en Studio y con qué países trabajan?",
        answer:
          "Estamos basados en la Patagonia Argentina (Neuquén y Río Negro) y trabajamos 100% remoto para empresas y startups de toda Argentina, Latinoamérica, Estados Unidos y Europa.",
      },
      {
        id: "s7-proyectos",
        question: "¿Qué proyectos reales construyó Se7en Studio que se puedan ver funcionando?",
        answer:
          "Podés ver y probar en vivo nuestros casos en producción en se7en.com.ar/work, incluyendo Takefyy, Apex Performance, Poné La Pava, Pravilo Argentina, Muzzaga Pádel, Sentinel Climate Tech, Altum Sci e iPhone Vita.",
      },
    ],
    relatedSlugs: [
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
      "arquitectura-sin-comisiones-como-construimos-takefyy",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-agencia-tradicional",
      "se7en-vs-freelancer",
    ],
    ctaService: {
      title: "Hablá directo con Franco y Federico",
      description:
        "Tomamos solo 2 proyectos nuevos por mes para dedicarles atención total. Contanos tu idea y te respondemos en menos de 24 horas.",
      href: "/start",
      buttonLabel: "Empezar mi proyecto",
    },
  },
  {
    slug: "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
    title: "De 4.8s a 0.4s: Por qué Next.js 16 y Server Components superan a cualquier plantilla tradicional",
    excerpt:
      "Analizamos la anatomía técnica del rendimiento web: por qué los constructores monolíticos pierden el 40% de sus conversiones y cómo el Edge Rendering cambia las reglas del juego.",
    publishedAt: "Agosto 2026",
    publishedIso: "2026-08-18",
    readTime: "4 min de lectura",
    category: "Ingeniería & Rendimiento",
    author: {
      name: "Franco Riquero",
      role: "Tech Lead en Se7en Studio",
    },
    tags: ["Next.js 16", "Core Web Vitals", "Turbopack", "SEO"],
    directAnswer:
      "Un sitio desarrollado en Next.js 16 con React Server Components carga en ~0.4 segundos frente a los 4.8 segundos promedio de una plantilla en WordPress/Elementor porque compila el HTML en el servidor Edge y envía cero JavaScript innecesario al navegador móvil. Esa reducción de 4 segundos evita hasta un 40% de rebote en celulares y mejora de forma directa el posicionamiento orgánico en Google.",
    content: [
      {
        heading: "El problema oculto de las plantillas tradicionales",
        paragraphs: [
          "Cuando una empresa instala una plantilla de WordPress, WooCommerce o un constructor como Elementor, no solo instala diseño: instala entre 30 y 50 plugins de terceros, hojas de estilo CSS infladas de más de 800 KB y scripts de seguimiento que bloquean el hilo principal del navegador.",
          "El resultado medido en Google PageSpeed es casi siempre el mismo: tiempos de carga móvil superiores a 4.5 segundos, First Contentful Paint (FCP) tardío y un Cumulative Layout Shift (CLS) que desordena la pantalla mientras carga.",
        ],
      },
      {
        heading: "La solución: Server Components y streaming en el Edge",
        paragraphs: [
          "Con Next.js 16 y React 19, el navegador del usuario no recibe JavaScript pesado para interpretar. En su lugar, el servidor en el Edge de Vercel compila el HTML instantáneamente y lo transmite en streaming en menos de 400 milisegundos.",
        ],
        codeSnippet: `// app/page.tsx (Next.js 16 Server Component)
export default async function ProductPage() {
  // ⚡ Consulta directa en el Edge sin exponer API pública
  const data = await getCachedProducts()

  return (
    <main>
      <Hero product={data.featured} />
      <ProductCatalog items={data.catalog} />
    </main>
  )
}`,
      },
      {
        heading: "El impacto directo en el negocio y la facturación",
        paragraphs: [
          "Cada segundo de demora en la carga de una web móvil reduce las conversiones en un 7%. Al pasar de 4.8 segundos a 0.4 segundos, la tasa de rebote cae a menos de la mitad y Google premia el sitio con mejores posiciones orgánicas en los resultados de búsqueda.",
        ],
      },
    ],
    faqs: [
      {
        id: "nx-cms",
        question: "¿Con Next.js puedo seguir editando el contenido fácilmente como en WordPress?",
        answer:
          "Sí. Construimos paneles de administración a medida conectados a Supabase para que edites textos, precios, fotos y productos desde una interfaz mucho más limpia y rápida que wp-admin.",
      },
      {
        id: "nx-seo",
        question: "¿Next.js 16 sirve mejor para el SEO en Google y en ChatGPT que WordPress?",
        answer:
          "Sí, porque genera HTML ultraligero desde el servidor sin código basura de constructores visuales, incluye generación nativa de sitemaps, metadatos OpenGraph y esquemas JSON-LD limpios.",
      },
    ],
    relatedSlugs: [
      "por-que-mi-tienda-online-carga-lento-en-celular-y-como-bajarla-a-menos-de-1-segundo",
      "guia-definitiva-core-web-vitals-100-para-fundadores",
      "cuanto-cuesta-hacer-una-pagina-web-a-medida-en-argentina",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-wordpress-woocommerce",
      "se7en-vs-webflow-framer",
    ],
    ctaService: {
      title: "Migrá tu sitio lento a Next.js 16 en 2 semanas",
      description:
        "Pasamos tu web o tienda actual a una arquitectura moderna con carga instantánea y 100% código propio.",
      href: "/services#landing",
      buttonLabel: "Ver servicio de Webs & Landings",
    },
  },
  {
    slug: "arquitectura-sin-comisiones-como-construimos-takefyy",
    title: "Arquitectura sin comisiones: Cómo construimos Takefyy con Supabase Realtime",
    excerpt:
      "El caso de estudio técnico detrás de una plataforma SaaS de pedidos que ahorra miles de dólares mensuales a locales gastronómicos.",
    publishedAt: "Agosto 2026",
    publishedIso: "2026-08-24",
    readTime: "5 min de lectura",
    category: "Arquitectura SaaS",
    author: {
      name: "Franco Riquero",
      role: "Tech Lead en Se7en Studio",
    },
    tags: ["SaaS", "Supabase", "PostgreSQL", "Realtime"],
    directAnswer:
      "Construimos Takefyy sobre Next.js, TypeScript y Supabase Realtime (PostgreSQL con Row-Level Security y WebSockets) para que los restaurantes reciban pedidos digitales en menos de 20 milisegundos directo en su panel y WhatsApp, eliminando el 15% a 25% de comisión que cobran las apps de delivery tradicionales.",
    content: [
      {
        heading: "El desafío: Reemplazar el 25% de comisión de los marketplaces",
        paragraphs: [
          "Los restaurantes y locales comerciales pierden entre el 15% y el 25% de cada venta en comisiones a aplicaciones de delivery tradicionales. El objetivo de Takefyy fue darles una plataforma propia ultrarrápida donde el pedido viaja directo a su WhatsApp o sistema interno sin intermediarios.",
        ],
      },
      {
        heading: "Base de datos reactiva con Supabase Postgres y RLS",
        paragraphs: [
          "Para manejar pedidos concurrentes y cambios de stock en vivo, implementamos PostgreSQL con Row-Level Security (RLS) en Supabase. Cada local tiene su propio espacio de datos aislado, y las actualizaciones se transmiten por WebSockets en menos de 20 milisegundos.",
        ],
        codeSnippet: `// Sincronización en tiempo real de pedidos
const channel = supabase
  .channel('live-orders')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'orders',
    filter: \`store_id=eq.\${storeId}\`
  }, (payload) => {
    playNotificationSound()
    updateOrderFeed(payload.new)
  })
  .subscribe()`,
      },
      {
        heading: "Resultados en producción",
        paragraphs: [
          "La plataforma opera en producción con decenas de miles de pedidos mensuales procesados, 99.99% de disponibilidad y una latencia media de carga de catálogo inferior a 0.5 segundos.",
        ],
      },
    ],
    faqs: [
      {
        id: "tk-multi",
        question: "¿Cómo aseguran en Supabase que un local nunca pueda ver los pedidos de otro?",
        answer:
          "Mediante políticas de Row-Level Security (RLS) directamente en el motor PostgreSQL: cada consulta verifica criptográficamente el JWT del usuario autenticado antes de devolver o modificar cualquier fila.",
      },
      {
        id: "tk-propio",
        question: "¿Puedo contratar a Se7en Studio para construir una plataforma SaaS multi-tenant similar para mi industria?",
        answer:
          "Sí. Aplicamos esta misma arquitectura probada en producción para construir plataformas SaaS en rubros como fitness (Apex Performance), gastronomía (Takefyy), reservas y comercio B2B.",
      },
    ],
    relatedSlugs: [
      "como-vender-por-internet-sin-pagar-comisiones-de-mercadolibre-ni-pedidosya",
      "cuanto-tarda-desarrollar-un-mvp-saas-listo-para-cobrar",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-pedidosya-rappi-marketplaces",
      "se7en-vs-bubble-nocode",
    ],
    ctaService: {
      title: "Mirá el caso completo de Takefyy en nuestro portafolio",
      description:
        "Recorré las pantallas, métricas y decisiones técnicas de Takefyy o cotizá tu propia plataforma SaaS.",
      href: "/work/takefyy",
      buttonLabel: "Ver caso de estudio Takefyy",
    },
  },
  {
    slug: "guia-definitiva-core-web-vitals-100-para-fundadores",
    title: "Core Web Vitals 100/100: La guía definitiva de optimización para fundadores",
    excerpt:
      "Qué significan métricas como LCP, CLS e INP y por qué son el indicador más importante de salud digital para tu startup.",
    publishedAt: "Agosto 2026",
    publishedIso: "2026-08-30",
    readTime: "3 min de lectura",
    category: "Estrategia & Craft",
    author: {
      name: "Federico Martín",
      role: "Design Lead en Se7en Studio",
    },
    tags: ["Design Systems", "UX", "Web Vitals", "Lighthouse"],
    directAnswer:
      "Los Core Web Vitals son las tres métricas oficiales con las que Google evalúa la velocidad y estabilidad real de tu sitio: LCP (que el contenido principal cargue en menos de 2.5 segundos), INP (que la página responda a cada clic en menos de 200 milisegundos) y CLS (que ningún elemento salte mientras carga). Alcanzar 95–100/100 reduce el rebote móvil y mejora el ranking orgánico.",
    content: [
      {
        heading: "Las 3 métricas que Google mide en tu sitio",
        paragraphs: [
          "Google evalúa la experiencia de usuario a través de tres pilares fundamentales: Largest Contentful Paint (cuánto tarda en verse el contenido principal), Cumulative Layout Shift (si los elementos saltan o se mueven mientras carga) e Interaction to Next Paint (cuán rápido reacciona la web a los clics del usuario).",
        ],
      },
      {
        heading: "Diseño con intención: Por qué el diseño y la velocidad son inseparables",
        paragraphs: [
          "Un buen diseño no es solo cómo se ve; es cómo se siente. Si una animación hermosa traba el scroll en un teléfono móvil, el diseño ha fallado. En Se7en Studio diseñamos interfaces atómicas en Figma optimizadas para renderizarse con aceleración por GPU.",
        ],
      },
    ],
    faqs: [
      {
        id: "cwv-lighthouse",
        question: "¿Por qué mi sitio da buen puntaje en computadora pero reprueba en móvil?",
        answer:
          "Porque Lighthouse móvil simula un procesador de teléfono de gama media y una red 4G con latencia. Si tu sitio descarga mucho JavaScript o imágenes pesadas, la computadora lo disimula por fuerza bruta, pero el teléfono se traba.",
      },
      {
        id: "cwv-animaciones",
        question: "¿Hay que sacar todas las animaciones para tener buen puntaje en Lighthouse?",
        answer:
          "No. El secreto es animar únicamente propiedades compuestas por la GPU (transform y opacity), cargar fuentes con next/font sin salto de línea y usar LazyMotion para no bloquear la hidratación inicial.",
      },
    ],
    relatedSlugs: [
      "por-que-mi-tienda-online-carga-lento-en-celular-y-como-bajarla-a-menos-de-1-segundo",
      "de-4-8s-a-0-4s-por-que-nextjs-16-supera-a-wordpress",
    ],
    relatedComparisonSlugs: [
      "se7en-vs-wordpress-woocommerce",
      "se7en-vs-webflow-framer",
    ],
    ctaService: {
      title: "Auditamos los Core Web Vitals de tu sitio gratis",
      description:
        "Te mostramos en un diagnóstico claro qué está frenando tu puntuación móvil en Google y cómo llevarla a verde.",
      href: "/audit",
      buttonLabel: "Pedir diagnóstico gratuito",
    },
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}
