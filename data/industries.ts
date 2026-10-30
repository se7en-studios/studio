export interface IndustrySolution {
  slug: string;
  name: string;
  heroBadge: string;
  title: string;
  subtitle: string;
  metaDescription: string;
  painPoints: {
    problem: string;
    consequence: string;
    solution: string;
  }[];
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  comparisons: {
    aspect: string;
    traditional: string;
    se7en: string;
  }[];
  deliverables: string[];
  timeline: string;
  priceRange: string;
  whatsappMessage: string;
  faqs: {
    question: string;
    answer: string;
  }[];
}

export const industries: IndustrySolution[] = [
  {
    slug: "inmobiliarias",
    name: "Inmobiliarias & Real Estate",
    heroBadge: "Desarrollo Web Inmobiliario en Argentina",
    title: "Páginas Web para Inmobiliarias: Captá Propietarios y Compradores Directos",
    subtitle:
      "Dejá de depender al 100% de pagar fortunas en portales como Zonaprop o Argenprop. Desarrollamos sitios web ultrarrápidos para inmobiliarias con catálogo propio, filtros por zona, fichas interactivas y contacto directo a WhatsApp por cada propiedad.",
    metaDescription:
      "Diseño y desarrollo de páginas web para inmobiliarias en Argentina. Catálogo autoadministrable, buscador con filtros por zona y precio, carga en menos de 1 segundo y contacto directo por WhatsApp.",
    painPoints: [
      {
        problem: "Costos altísimos en portales inmobiliarios",
        consequence: "Pagás cuotas mensuales que suben todos los meses compitiendo con 50 inmobiliarias en la misma pantalla.",
        solution: "Un portal propio donde tu marca es la única protagonista y captás contactos exclusivos.",
      },
      {
        problem: "Sitios lentos que tardan 6 segundos en abrir",
        consequence: "El comprador abre la propiedad desde el celular, se cansa de esperar la galería de fotos y se va con otra inmobiliaria.",
        solution: "Arquitectura Next.js que carga galerías en alta definición en menos de 0.5 segundos en 4G.",
      },
      {
        problem: "Pérdida de consultas por formularios viejos",
        consequence: "Formularios de contacto que nadie responde o que caen en spam días después.",
        solution: "Botón dinámico de WhatsApp que envía la propiedad exacta y el código de ficha en el primer mensaje.",
      },
    ],
    features: [
      {
        title: "Buscador y filtros en tiempo real",
        description: "Filtros instantáneos por operación (Venta / Alquiler), tipo de propiedad, dormitorios, precio y zona sin recargar la página.",
        icon: "Search",
      },
      {
        title: "Ficha técnica con WhatsApp directo",
        description: "Cada propiedad tiene su botón de 'Consultar por WhatsApp' con el código de ficha pre-cargado para tu equipo comercial.",
        icon: "MessageCircle",
      },
      {
        title: "Galería de fotos y planos optimizada",
        description: "Fotos de alta calidad optimizadas en WebP/AVIF para que carguen al instante en celulares.",
        icon: "Image",
      },
      {
        title: "Captación de propietarios (Tasar mi propiedad)",
        description: "Página y formulario optimizado para que dueños soliciten tasaciones directas en tu zona.",
        icon: "TrendingUp",
      },
    ],
    comparisons: [
      {
        aspect: "Velocidad de carga",
        traditional: "4 a 8 segundos en WordPress con plugins pesados.",
        se7en: "Menos de 0.8 segundos con Next.js y CDN global.",
      },
      {
        aspect: "Experiencia en móvil",
        traditional: "Menús rotos y fotos desajustadas.",
        se7en: "Diseño 'Mobile-First' fluido pensado para usuarios de Instagram y WhatsApp.",
      },
      {
        aspect: "Mantenimiento y seguridad",
        traditional: "Vulnerable a virus y requiere actualizar plugins todas las semanas.",
        se7en: "100% seguro, sin servidores vulnerables ni plugins obsoletos.",
      },
    ],
    deliverables: [
      "Diseño y desarrollo completo a medida",
      "Catálogo dinámico de propiedades con buscador y filtros",
      "Fichas de propiedades con fotos, mapas, características y planos",
      "Módulo de tasaciones para captar propietarios",
      "Integración de WhatsApp para cada asesor comercial",
      "Optimización SEO local para Google (ej: 'inmobiliaria en [tu ciudad]')",
    ],
    timeline: "2 a 3 semanas",
    priceRange: "Desde USD 1.200 (o equivalente en pesos)",
    whatsappMessage: "Hola Franco! Tengo una inmobiliaria y me interesa cotizar una página web profesional con catálogo propio y WhatsApp directo.",
    faqs: [
      {
        question: "¿Puedo cargar y modificar mis propiedades fácilmente?",
        answer: "Sí. Dejamos un panel autoadministrable muy simple donde podés agregar fotos, cambiar precios, marcar propiedades como 'Reservadas' o 'Vendidas' en 1 minuto desde tu celular o computadora.",
      },
      {
        question: "¿Cómo ayuda este sitio a depender menos de Zonaprop o Argenprop?",
        answer: "Al tener tu propia web optimizada para Google y redes sociales, cuando hacés pauta en Meta (Instagram/Facebook) o cuando los clientes te buscan por recomendación, llegan directamente a tu catálogo sin distracciones ni propiedades de la competencia al lado.",
      },
      {
        question: "¿Cuánto tiempo demora el desarrollo?",
        answer: "El plazo estándar de entrega es de 2 a 3 semanas listo para producción con dominio propio configurado.",
      },
    ],
  },
  {
    slug: "gastronomia",
    name: "Restaurantes & Gastronomía",
    heroBadge: "Menú Digital & Pedidos Web sin Comisiones",
    title: "Páginas Web y Menú Digital para Gastronomía: Ahorrá el 30% de PedidosYa",
    subtitle:
      "Tu propio canal de pedidos directos por WhatsApp o con Mercado Pago, sin regalarle el 20% al 35% de cada plato a las apps de delivery. Menú QR para salón ultrarrápido y sistema para fidelizar a tus clientes habituales.",
    metaDescription:
      "Desarrollo web y menú digital con pedidos para restaurantes, cafeterías, pizzerías y bares en Argentina. Pedidos directos a WhatsApp, carta QR sin demoras y sin comisiones por plato.",
    painPoints: [
      {
        problem: "Comisiones abusivas del 20% al 35% en apps de delivery",
        consequence: "Trabajás para pagarle a PedidosYa o Rappi, erosionando casi todo el margen de ganancia de tu local.",
        solution: "Canal propio de pedidos directos donde te quedás con el 100% de la venta.",
      },
      {
        problem: "Cartas QR en PDFs pesados que la gente no puede abrir",
        consequence: "Clientes que van a tu local, escanean el QR, no carga el PDF de 25MB y te piden carta física de mala gana.",
        solution: "Menú web interactivo que abre en menos de 0.3 segundos, categorizado con fotos y precios actualizados.",
      },
      {
        problem: "No conocés a tus clientes ni sus datos",
        consequence: "Las apps no te dan el teléfono ni el email de quienes compran tu comida; no podés hacerles promociones.",
        solution: "Tu propia base de datos con los teléfonos de los clientes para avisarles de promociones de martes o días de lluvia.",
      },
    ],
    features: [
      {
        title: "Pedidos directos a WhatsApp ordenados",
        description: "El cliente arma su carrito en la web y te llega al WhatsApp con el pedido exacto, dirección, método de pago y total calculado.",
        icon: "ShoppingBag",
      },
      {
        title: "Carta QR instantánea para salón",
        description: "Abre en 0.2 segundos sin descargar nada. Secciones para entradas, principales, postres, tragos y promociones.",
        icon: "QrCode",
      },
      {
        title: "Pagos opcionales con Mercado Pago",
        description: "Si querés cobrar delivery por adelantado, integramos cobro seguro con tarjeta o dinero en cuenta.",
        icon: "CreditCard",
      },
      {
        title: "Gestor de precios en tiempo real",
        description: "Cambiás precios o pausás platos agotados en segundos sin tener que reimprimir nada.",
        icon: "Sliders",
      },
    ],
    comparisons: [
      {
        aspect: "Comisión por venta",
        traditional: "20% a 35% por cada pedido en plataformas de terceros.",
        se7en: "0% de comisión. El dinero va directo a tu cuenta bancaria o caja.",
      },
      {
        aspect: "Dueño de los datos",
        traditional: "La plataforma se queda con el cliente.",
        se7en: "El cliente te escribe a tu WhatsApp y guardás su contacto para siempre.",
      },
      {
        aspect: "Carta QR",
        traditional: "PDFs pesados de Canva que no cargan o links de Drive rotos.",
        se7en: "Página web ultra rápida, con fotos apetitosas y precios al día.",
      },
    ],
    deliverables: [
      "Menú digital interactivo con fotos y categorías",
      "Sistema de carrito con checkout directo a WhatsApp de tu local",
      "Generación de código QR de alta resolución listo para imprimir en mesas",
      "Integración de Mercado Pago (opcional)",
      "Panel de administración fácil para actualizar precios y productos",
      "Página de presentación con mapa de ubicación, horarios y reservas",
    ],
    timeline: "7 a 14 días",
    priceRange: "Desde USD 950 (o equivalente en pesos)",
    whatsappMessage: "Hola Franco! Tengo un negocio gastronómico (restaurante/bar/cafetería) y quiero implementar un menú web y pedidos directos sin comisiones.",
    faqs: [
      {
        question: "¿Cómo nos llega el pedido del cliente a la cocina?",
        answer: "El cliente selecciona los platos, aclara observaciones (ej: 'sin cebolla'), pone su dirección y al apretar 'Pedir', se envía un mensaje automático al WhatsApp de tu local con el detalle perfecto y el monto total.",
      },
      {
        question: "¿Cobran comisión mensual por cada venta?",
        answer: "No. En Se7en Studio no cobramos comisiones por tus ventas. El sistema es 100% de tu local.",
      },
      {
        question: "¿Qué pasa si se me termina un ingrediente o plato en pleno servicio?",
        answer: "Desde un panel muy sencillo en tu celular apretás 'Pausar' y automáticamente deja de figurar como disponible en el menú al instante.",
      },
    ],
  },
  {
    slug: "marcas-de-ropa",
    name: "Marcas de Ropa & Indumentaria",
    heroBadge: "E-Commerce de Moda de Alta Conversión",
    title: "Tiendas Online para Marcas de Ropa: Vendé Más sin Pagar Comisiones por Transacción",
    subtitle:
      "Desarrollamos tiendas online para indumentaria y marcas de diseño con una experiencia visual de nivel internacional, carga instantánea en teléfonos y checkout directo sin fricción ni comisiones ocultas.",
    metaDescription:
      "Creación de tiendas online para marcas de ropa e indumentaria en Argentina. Diseño premium, carga ultra rápida en celulares, variantes de talle/color y sin comisiones abusivas por venta.",
    painPoints: [
      {
        problem: "Tiendas que se ven iguales a todas las demás",
        consequence: "Si usás la misma plantilla genérica de Tiendanube que otras 10.000 marcas, no transmitís exclusividad ni podés cobrar precios premium.",
        solution: "Diseño con identidad de marca única que posiciona tu indumentaria en un segmento superior.",
      },
      {
        problem: "Abandono de carrito por lentitud en celulares",
        consequence: "Tus clientes llegan desde Instagram con 4G; si la página tarda 5 segundos en abrir cada prenda, cierran la pestaña.",
        solution: "Navegación instantánea entre prendas y guía de talles interactiva que no se traba.",
      },
      {
        problem: "Costos fijos más comisiones por cada compra",
        consequence: "Pagás abono mensual de plataforma + comisión por cada venta + costo de pasarela de pago.",
        solution: "Tienda moderna propia con costos fijos mínimos de infraestructura y cero comisión a la plataforma.",
      },
    ],
    features: [
      {
        title: "Selector de talle, color y tabla de medidas",
        description: "Visualización clara de stock por variante y tabla de medidas emergente para reducir cambios y devoluciones.",
        icon: "CheckSquare",
      },
      {
        title: "Checkout rápido con Mercado Pago y transferencias",
        description: "Cobrá con tarjetas en cuotas vía Mercado Pago y ofrecé descuentos automáticos por transferencia bancaria.",
        icon: "CreditCard",
      },
      {
        title: "Integración con envíos a todo el país",
        description: "Conectado con calculador de envíos (Correo Argentino, Andreani, Envíamelo) según el código postal del cliente.",
        icon: "Truck",
      },
      {
        title: "Galería 'Lookbook' conectada a productos",
        description: "Mostrá cómo queda puesta la prenda y permití agregarla al carrito con 1 solo toque desde el lookbook.",
        icon: "Camera",
      },
    ],
    comparisons: [
      {
        aspect: "Identidad visual",
        traditional: "Plantillas prefabricadas limitadas que se ven todas iguales.",
        se7en: "Diseño a medida fiel al estilo y estética de tu colección.",
      },
      {
        aspect: "Velocidad desde Instagram",
        traditional: "Pesada y lenta dentro del navegador integrado de Instagram.",
        se7en: "Carga en menos de 1 segundo, reduciendo el rebote al mínimo.",
      },
      {
        aspect: "Comisión por transacción",
        traditional: "Entre 1% y 3% adicional a la pasarela de pago.",
        se7en: "0% de comisión propia sobre tus ventas.",
      },
    ],
    deliverables: [
      "Tienda online completa con catálogo ilimitado de prendas",
      "Variantes por talle, color y control de inventario",
      "Pasarela de cobro Mercado Pago + descuento por transferencia",
      "Cálculo automático de envíos por código postal",
      "Panel autoadministrable fácil de usar para pedidos y stock",
      "Píxel de Meta (Facebook/Instagram) y Google Analytics configurados",
    ],
    timeline: "2 a 3 semanas",
    priceRange: "Desde USD 1.400 (o equivalente en pesos)",
    whatsappMessage: "Hola Franco! Tengo una marca de ropa e indumentaria y quiero renovar mi tienda online para vender más sin comisiones abusivas.",
    faqs: [
      {
        question: "¿Cómo se gestiona el stock de diferentes talles y colores?",
        answer: "Desde un panel intuitivo en tu computadora o celular podés ingresar la cantidad disponible por cada combinación de talle y color. Cuando se agota, el sistema avisa automáticamente.",
      },
      {
        question: "¿Puedo ofrecer cuotas sin interés y promociones?",
        answer: "Sí, se configuran cuotas bancarias o promociones con Mercado Pago, y también podés aplicar cupones de descuento especiales o precios diferenciales por pago en transferencia.",
      },
      {
        question: "¿Puedo migrar mis productos desde Tiendanube o Shopify?",
        answer: "Sí, podemos importar tu base de clientes y productos existentes para que no pierdas nada en la transición a tu nueva web.",
      },
    ],
  },
  {
    slug: "profesionales",
    name: "Estudios & Profesionales",
    heroBadge: "Webs para Abogados, Contadores y Consultoras",
    title: "Páginas Web para Profesionales: Posicionamiento y Clientes Calificados",
    subtitle:
      "Transformá tu presencia digital en una máquina de confianza. Diseñamos sitios web para estudios jurídicos, contables, consultoras de negocios y arquitectos que buscan transmitir solidez y captar clientes corporativos de alto ticket.",
    metaDescription:
      "Diseño web para estudios de abogados, estudios contables, consultores y arquitectos en Argentina. Posicionamiento en Google, autoridad de marca y captación de consultas calificadas.",
    painPoints: [
      {
        problem: "Presencia digital desactualizada o inexistente",
        consequence: "Los clientes potenciales te buscan en Google antes de contratarte; si tu web parece de 2012, asumen que tu servicio también lo es.",
        solution: "Diseño sobrio, vanguardista y formal que inspira máxima confianza desde el primer segundo.",
      },
      {
        problem: "Pérdida de tiempo con consultas de bajo valor",
        consequence: "Tu teléfono suena con personas que no pueden pagar tus honorarios o buscan servicios que no brindás.",
        solution: "Estructura de contenidos clara con filtros de precalificación que atraen exactamente a tu cliente ideal.",
      },
      {
        problem: "No aparecer en Google en tu ciudad o especialidad",
        consequence: "La gente busca 'abogado laboral en [ciudad]' o 'asesoramiento impositivo pymes' y le dejan la consulta a tu competencia.",
        solution: "Estructura SEO con datos estructurados para dominar búsquedas locales de alta intención.",
      },
    ],
    features: [
      {
        title: "Presentación de áreas de práctica y casos de éxito",
        description: "Páginas claras por especialidad para explicar con precisión técnica qué problemas resolvés para empresas o particulares.",
        icon: "Briefcase",
      },
      {
        title: "Agendamiento de consultas online",
        description: "Integración con Cal.com o Calendly para que los clientes puedan agendar y pagar su primera consulta directamente.",
        icon: "Calendar",
      },
      {
        title: "Blog o sección de artículos de autoridad",
        description: "Publicá análisis de fallos, novedades tributarias o casos de arquitectura para posicionarte como referente de tu sector.",
        icon: "FileText",
      },
      {
        title: "Optimización SEO para búsquedas profesionales",
        description: "Tu web indexada en Google para captar a quienes buscan activamente servicios en tu área geográfica.",
        icon: "Search",
      },
    ],
    comparisons: [
      {
        aspect: "Nivel de diseño y seriedad",
        traditional: "Plantillas genéricas con fotos de stock impersonales de bancos gratuitos.",
        se7en: "Identidad visual personalizada, tipografía editorial y tono institucional moderno.",
      },
      {
        aspect: "Captación de leads",
        traditional: "Un formulario genérico de contacto que nadie completa.",
        se7en: "Múltiples llamados a la acción: agendar llamada, WhatsApp directo o consulta escrita.",
      },
      {
        aspect: "Carga y rendimiento",
        traditional: "Lenta y pesada en móviles.",
        se7en: "Apertura instantánea en cualquier celular o computadora.",
      },
    ],
    deliverables: [
      "Sitio web corporativo de alta gama",
      "Páginas dedicadas por área de práctica o servicio",
      "Perfiles de los socios y equipo profesional",
      "Integración de agenda virtual de reuniones",
      "Canal de WhatsApp institucional",
      "Alta en Google Search Console y optimización SEO institucional",
    ],
    timeline: "10 a 20 días",
    priceRange: "Desde USD 1.100 (o equivalente en pesos)",
    whatsappMessage: "Hola Franco! Tengo un estudio profesional / consultora y quiero desarrollar un sitio web corporativo de alto nivel para captar clientes calificados.",
    faqs: [
      {
        question: "¿Cómo nos ayuda el sitio a captar clientes de empresas?",
        answer: "Las empresas investigan meticulosamente a sus proveedores antes de firmar un abono o contrato. Una web moderna, rápida y con testimonios y casos de éxito valida tu trayectoria y justifica tarifas de honorarios más altas.",
      },
      {
        question: "¿Podemos cobrar las consultas iniciales a través de la web?",
        answer: "Sí, podemos integrar pasarelas de pago como Mercado Pago o Stripe para que el cliente abone sus honorarios de consulta en el momento que reserva el turno en tu agenda.",
      },
      {
        question: "¿Nos ayudan con la redacción de los textos y servicios?",
        answer: "Sí, estructuramos y pulimos los textos para que comuniquen tus servicios en un lenguaje claro para tus clientes sin perder rigor profesional.",
      },
    ],
  },
  {
    slug: "salud-estetica",
    name: "Clínicas, Médicos & Estética",
    heroBadge: "Webs para Centros de Salud, Odontología y Estética",
    title: "Páginas Web para Clínicas y Estética: Turnos y Confianza para tus Pacientes",
    subtitle:
      "Ayudamos a centros médicos, consultorios odontológicos y clínicas de estética a transmitir seguridad médica, mostrar casos de antes/después con profesionalismo y agilizar la reserva de turnos por WhatsApp o sistema web.",
    metaDescription:
      "Desarrollo de páginas web para clínicas médicas, consultorios odontológicos y centros de estética en Argentina. Sistema de turnos por WhatsApp, fotos de casos reales y SEO local.",
    painPoints: [
      {
        problem: "Secretarias colapsadas respondiendo las mismas preguntas por WhatsApp",
        consequence: "Horas perdidas informando precios aproximados, obras sociales que atienden, ubicación y disponibilidad horaria.",
        solution: "Página web con respuestas claras a preguntas frecuentes, coberturas aceptadas y proceso de atención.",
      },
      {
        problem: "Dudas y desconfianza en tratamientos estéticos u odontológicos",
        consequence: "El paciente duda antes de realizarse un tratamiento de costo medio/alto si no puede ver credenciales ni testimonios médicos.",
        solution: "Sección de credenciales del equipo médico, aparatología utilizada y explicaciones paso a paso de cada tratamiento.",
      },
      {
        problem: "Ausentismo o cancelaciones de turnos de último momento",
        consequence: "Horarios vacíos en consultorio que representan una pérdida directa de facturación.",
        solution: "Canal claro para confirmación de turnos y recordatorios automáticos por WhatsApp.",
      },
    ],
    features: [
      {
        title: "Buscador de tratamientos y especialidades",
        description: "Cada tratamiento explicado con claridad: para quién es, duración de la sesión, cuidados y resultados esperados.",
        icon: "Activity",
      },
      {
        title: "Derivación directa al WhatsApp de recepción",
        description: "Botón de 'Pedir Turno' que precarga la especialidad y el profesional elegido por el paciente.",
        icon: "MessageSquare",
      },
      {
        title: "Módulo de Obras Sociales y Prepagas",
        description: "Listado claro de convenios y medios de pago para que el paciente sepa al instante si tiene cobertura.",
        icon: "Shield",
      },
      {
        title: "Mapa de sucursales e indicaciones de llegada",
        description: "Ubicación interactiva con botón de 'Cómo llegar en Google Maps' para que ningún paciente se pierda.",
        icon: "MapPin",
      },
    ],
    comparisons: [
      {
        aspect: "Transmisión de seguridad médica",
        traditional: "Perfiles de Instagram informales sin una página institucional que dé respaldo.",
        se7en: "Sitio web médico formal con matrícula, certificaciones y tecnología empleada.",
      },
      {
        aspect: "Agilidad para el paciente",
        traditional: "Esperar 3 horas a que recepción conteste un mensaje de WhatsApp.",
        se7en: "Toda la información disponible 24/7 con botón de turno inmediato.",
      },
      {
        aspect: "SEO Local en Google",
        traditional: "Invisibles para búsquedas como 'odontólogo cerca de mí' o 'clínica dermatológica en [zona]'.",
        se7en: "Optimizada para aparecer en las primeras posiciones de Google Maps y búsqueda orgánica.",
      },
    ],
    deliverables: [
      "Sitio web médico/estético completo 'Mobile-First'",
      "Fichas detalladas de tratamientos y aparatología",
      "Perfil de médicos y especialistas con sus matrículas",
      "Módulo de coberturas médicas, prepagas y aranceles",
      "Integración de turnos al WhatsApp de recepción",
      "Alta y optimización de ficha de Google Mi Negocio (Google Maps)",
    ],
    timeline: "10 a 20 días",
    priceRange: "Desde USD 1.100 (o equivalente en pesos)",
    whatsappMessage: "Hola Franco! Tengo una clínica / centro de estética / consultorio y quiero cotizar una web moderna con sistema de turnos por WhatsApp.",
    faqs: [
      {
        question: "¿El paciente puede reservar su turno directamente?",
        answer: "Sí, podemos integrar agendas de turnos online (Doctoralia, Google Calendar, Calendly) o un botón directo al WhatsApp de recepción que precarga el motivo de consulta para ahorrar tiempo al personal.",
      },
      {
        question: "¿Podemos mostrar fotos de resultados de tratamientos?",
        answer: "Sí, diseñamos galerías comparativas sobrias y profesionales respetando la privacidad y las normativas de comunicación en salud.",
      },
      {
        question: "¿Nos ayuda a posicionar en Google Maps de nuestra ciudad?",
        answer: "Totalmente. Vinculamos tu web con Google Perfil de Empresa (Google Maps) y optimizamos los datos estructurados para que cuando busquen tu especialidad en tu barrio o ciudad, figures arriba.",
      },
    ],
  },
];

export function getIndustryBySlug(slug: string): IndustrySolution | undefined {
  return industries.find((i) => i.slug === slug);
}

