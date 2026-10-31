export interface CitySEO {
  slug: string;
  name: string;
  province: string;
  region: string;
  title: string;
  subtitle: string;
  metaDescription: string;
  localProof: string;
  sectors: {
    title: string;
    description: string;
  }[];
  localCases: {
    name: string;
    description: string;
    slug: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  geo: {
    latitude: number;
    longitude: number;
  };
}

export const cities: CitySEO[] = [
  {
    slug: "neuquen",
    name: "Neuquén",
    province: "Neuquén",
    region: "Patagonia & Alto Valle",
    title: "Desarrollo Web en Neuquén: Páginas y Plataformas que Consiguen Clientes",
    subtitle:
      "Desarrollamos sitios web, tiendas online y software a medida para empresas, inmobiliarias y comercios en Neuquén Capital, Plottier, Cipolletti y Añelo. Carga en menos de 1 segundo, posicionamiento SEO local y atención directa de fundadores en la Patagonia.",
    metaDescription:
      "Diseño y desarrollo de páginas web en Neuquén Capital y Alto Valle. Sitios corporativos, catálogo para inmobiliarias, e-commerce sin comisiones y plataformas a medida con Next.js.",
    localProof:
      "Desarrollamos proyectos en producción en la región del Alto Valle como Pravilo Argentina en Plottier y Sentinel Climate Tech, además de portales corporativos para inversiones patagónicas.",
    sectors: [
      {
        title: "Inmobiliarias & Desarrollos en Neuquén y Añelo",
        description: "Portales con catálogo propio, búsqueda de lotes, mapas y botón de WhatsApp directo por propiedad sin intermediarios costosos.",
      },
      {
        title: "Empresas de Servicios Petroleros y Corporativos",
        description: "Sitios institucionales sobrios de alta gama que transmiten máxima solvencia para licitaciones y contratos B2B.",
      },
      {
        title: "Comercios & Gastronomía del Alto Valle",
        description: "Menú digital QR para salón y pedidos directos sin comisiones del 30% a apps de delivery.",
      },
    ],
    localCases: [
      {
        name: "Pravilo Argentina",
        description: "Sitio web e identidad digital para el primer centro de movilidad y entrenamiento Pravilo de Argentina (Plottier, Neuquén).",
        slug: "pravilo",
      },
      {
        name: "Sentinel Climate Tech",
        description: "Plataforma de satélites e inteligencia artificial desarrollada en la Patagonia con visualización en tiempo real.",
        slug: "sentinel",
      },
    ],
    faqs: [
      {
        question: "¿Por qué elegir a Se7en Studio en lugar de una agencia de Buenos Aires?",
        answer: "Somos un estudio fundado en la Patagonia. Entendemos la dinámica comercial de Neuquén y el Alto Valle, respondemos en el día por WhatsApp y trabajás directamente con los ingenieros que programan tu sitio, sin ejecutivos de cuentas intermediarios.",
      },
      {
        question: "¿Cómo ayuda este sitio al posicionamiento en Google de Neuquén?",
        answer: "Configuramos el código con datos estructurados de LocalBusiness, optimización de velocidad Core Web Vitals (puntaje 90+ en móviles) y metadatos geolocalizados para que cuando alguien busque tu rubro en Neuquén, tu empresa aparezca arriba.",
      },
      {
        question: "¿Cuánto demora la entrega?",
        answer: "Una landing corporativa o web institucional se entrega lista para producción en 1 a 2 semanas. Tiendas online o portales inmobiliarios en 2 a 3 semanas.",
      },
    ],
    geo: {
      latitude: -38.9516,
      longitude: -68.0591,
    },
  },
  {
    slug: "catriel",
    name: "Catriel",
    province: "Río Negro",
    region: "Norte de Río Negro & Cuenca Petrolera",
    title: "Desarrollo Web en Catriel: Páginas Web y Sistemas para Empresas y Comercios",
    subtitle:
      "Diseño y programación web moderna para negocios, hotelería, gastronomía y proveedores de servicios en Catriel, Río Negro. Tu marca en internet con velocidad extrema y soporte local directo.",
    metaDescription:
      "Creación de sitios web en Catriel, Río Negro. Páginas para hoteles, restaurantes, complejos deportivos y empresas proveedoras. Sistemas de reserva y catálogo online sin comisiones.",
    localProof:
      "Desarrollamos en producción la plataforma web de Muzzaga Pádel en Catriel, automatizando la reserva de canchas en tiempo real con confirmación por WhatsApp.",
    sectors: [
      {
        title: "Hotelería, Hospedajes y Turismo de Paso",
        description: "Webs con fotos de alta definición, ubicación clara y reserva directa a WhatsApp sin pagar el 18% a Booking.",
      },
      {
        title: "Gastronomía, Bares y Cervecerías Locales",
        description: "Menú interactivo QR que abre en 0.2 segundos sin descargar PDFs pesados y pedidos directos a cocina.",
      },
      {
        title: "Complejos Deportivos y Turnos Online",
        description: "Sistemas como Muzzaga Pádel con grilla horaria en vivo para que los clientes reserven en 3 toques.",
      },
    ],
    localCases: [
      {
        name: "Muzzaga Pádel (Catriel)",
        description: "Sistema web de reserva de canchas de pádel en tiempo real en Catriel con panel de administración y WhatsApp automático.",
        slug: "muzzaga",
      },
      {
        name: "Altum Sci",
        description: "Sitio corporativo inmobiliario para inversiones en Río Negro y la Patagonia.",
        slug: "altum-sci",
      },
    ],
    faqs: [
      {
        question: "¿Tienen experiencia trabajando con negocios en Catriel?",
        answer: "Sí. Desarrollamos la plataforma de Muzzaga Pádel en Catriel, logrando que los jugadores reserven sus turnos de forma 100% digital y sin fricciones.",
      },
      {
        question: "¿Podemos cobrar reservas o ventas con Mercado Pago en Catriel?",
        answer: "Totalmente. Integramos pasarelas de pago argentinas como Mercado Pago o cobro con transferencia bancaria con descuento automático.",
      },
      {
        question: "¿Qué mantenimiento requiere la página?",
        answer: "Cero mantenimiento pesado. Al no usar WordPress ni plugins vulnerables, el sitio corre en servidores globales de Vercel de manera segura y estable 24/7.",
      },
    ],
    geo: {
      latitude: -37.8812,
      longitude: -67.7958,
    },
  },
  {
    slug: "san-rafael",
    name: "San Rafael",
    province: "Mendoza",
    region: "Sur de Mendoza & Cañón del Atuel",
    title: "Desarrollo Web en San Rafael: Páginas para Bodegas, Turismo e Inmobiliarias",
    subtitle:
      "Llevamos la presencia digital de tu negocio en San Rafael al siguiente nivel. Desarrollamos tiendas online de vinos directos de bodega, sitios para cabañas y hoteles sin comisiones de Booking, y portales inmobiliarios ultrarrápidos.",
    metaDescription:
      "Desarrollo web en San Rafael, Mendoza. Creación de tiendas online para bodegas, sitios web para cabañas y turismo, y portales para inmobiliarias. Posicionamiento en Google y carga en <1s.",
    localProof:
      "Creamos tiendas de alta gama en la región de Cuyo como Poné La Pava (+120% en conversión), combinando estética editorial con tecnología Next.js de última generación.",
    sectors: [
      {
        title: "Bodegas, Vinotecas y Enoturismo",
        description: "Tienda online de vinos sin pagar comisiones por venta y sistema de reserva de visitas guiadas y catas con seña previa.",
      },
      {
        title: "Cabañas, Complejos Turísticos y Hoteles",
        description: "Sitios web para el Cañón del Atuel y Valle Grande que captan reservas directas por WhatsApp evitando comisiones a plataformas.",
      },
      {
        title: "Inmobiliarias y Loteos en San Rafael",
        description: "Catálogo de fincas, casas y terrenos con buscador ágil y contacto directo con cada asesor.",
      },
    ],
    localCases: [
      {
        name: "Poné La Pava",
        description: "Tienda online de alta conversión con stock en tiempo real y diseño editorial para marca con proyección en Cuyo y todo el país.",
        slug: "pone-la-pava",
      },
    ],
    faqs: [
      {
        question: "¿Cómo ayuda a las bodegas y cabañas de San Rafael a depender menos de intermediarios?",
        answer: "Los turistas y compradores buscan directamente en Google o Instagram antes de viajar. Si tu web carga al instante y permite reservar o comprar con un botón de WhatsApp o Mercado Pago, el cliente prefiere tratar directo con vos.",
      },
      {
        question: "¿Podemos vender cajas de vino a todo el país desde San Rafael?",
        answer: "Sí, integramos calculadores de envío automáticos (Andreani, Correo Argentino) según el código postal del comprador.",
      },
      {
        question: "¿Cómo coordinamos el proyecto si están en la Patagonia?",
        answer: "Trabajamos de forma fluida con videollamadas cortas y canal directo de WhatsApp. Vas viendo el sitio en un enlace privado desde la primera semana.",
      },
    ],
    geo: {
      latitude: -34.6177,
      longitude: -68.3301,
    },
  },
  {
    slug: "mendoza",
    name: "Mendoza",
    province: "Mendoza",
    region: "Gran Mendoza & Cuyo",
    title: "Desarrollo Web en Mendoza: Sitios Corporativos, E-Commerce y Software a Medida",
    subtitle:
      "Desarrollamos soluciones digitales de alta conversión para empresas, bodegas, consultoras y marcas en Ciudad de Mendoza, Godoy Cruz, Guaymallén, Luján de Cuyo y Maipú. Tecnología Next.js 16 para superar a tu competencia en Google.",
    metaDescription:
      "Estudio de diseño y desarrollo web en Mendoza. Tiendas online de alta velocidad, páginas corporativas para empresas y sistemas web a medida sin plantillas lentas.",
    localProof:
      "Desarrollamos marcas en la región de Cuyo como Poné La Pava, multiplicando sus ventas online con tiempos de carga de 0.4 segundos en dispositivos móviles.",
    sectors: [
      {
        title: "Marcas de Moda, Diseño y Comercio Minorista",
        description: "Tiendas online fluidas desde Instagram con 0% de comisión por venta y variantes de talle/color.",
      },
      {
        title: "Estudios Jurídicos, Contables y Consultoras de Negocios",
        description: "Sitios institucionales con autoridad visual para captar clientes corporativos y agendar reuniones online.",
      },
      {
        title: "Industria Vitivinícola y Exportación",
        description: "Sitios bilingües (Español / Inglés) con fichas técnicas de etiquetas y contacto directo para distribuidores.",
      },
    ],
    localCases: [
      {
        name: "Poné La Pava",
        description: "E-commerce a medida con diseño exclusivo y +120% en tasa de conversión.",
        slug: "pone-la-pava",
      },
    ],
    faqs: [
      {
        question: "¿En qué se diferencia Se7en Studio de una agencia tradicional en Mendoza?",
        answer: "En una agencia tradicional te atienden comerciales y suelen tardar meses instalando plantillas lentas de WordPress. En Se7en hablás directo con Franco y Federico (los fundadores e ingenieros), entregamos en 2 a 3 semanas con código 100% propio y velocidad Core Web Vitals impecable.",
      },
      {
        question: "¿El sitio web incluye versión en inglés para clientes del exterior?",
        answer: "Sí, podemos desarrollar la versión bilingüe (/en) para que captes tanto público local como importadores y turistas extranjeros.",
      },
      {
        question: "¿Cómo se abona el desarrollo?",
        answer: "Trabajamos con 50% de anticipo al iniciar y 50% al entregar el sitio publicado en tu dominio. Aceptamos transferencias bancarias en pesos (factura A/B) o transferencias en USD / cripto.",
      },
    ],
    geo: {
      latitude: -32.8895,
      longitude: -68.8458,
    },
  },
  {
    slug: "cipolletti",
    name: "Cipolletti",
    province: "Río Negro",
    region: "Alto Valle de Río Negro",
    title: "Desarrollo Web en Cipolletti: Páginas y Tiendas para Empresas y Comercios",
    subtitle:
      "Diseñamos y programamos páginas web y tiendas online para empresas, comercios, clínicas y servicios en Cipolletti, Fernández Oro y Cinco Saltos. Carga antes de 1 segundo en celular y trato directo con los fundadores.",
    metaDescription:
      "Desarrollo de páginas web y tiendas online en Cipolletti y Alto Valle. Sitios corporativos, pedidos por WhatsApp, e-commerce sin comisiones y máxima velocidad.",
    localProof:
      "Desarrollamos proyectos activos en el Alto Valle de Río Negro y Neuquén como Pravilo Argentina y plataformas de reservas locales con entrega en menos de 3 semanas.",
    sectors: [
      {
        title: "Comercios y Locales de Indumentaria",
        description: "Tiendas online para vender sin pagar comisiones por venta, con cobros directos por Mercado Pago.",
      },
      {
        title: "Empresas de Servicios y Profesionales",
        description: "Sitios institucionales para estudios contables, jurídicos y empresas de logística para captar clientes en Google.",
      },
      {
        title: "Salud, Estética y Consultorios",
        description: "Páginas con reserva de turnos online y recordatorios automáticos por WhatsApp.",
      },
    ],
    localCases: [
      {
        name: "Pravilo Argentina",
        description: "Sitio web e identidad digital para el centro de entrenamiento de movilidad en el Alto Valle.",
        slug: "pravilo",
      },
    ],
    faqs: [
      {
        question: "¿Cuánto tardan en entregar una página en Cipolletti?",
        answer: "Una página web institucional se entrega lista y publicada en 7 a 10 días hábiles. Una tienda online o sistema de turnos toma entre 2 y 3 semanas.",
      },
      {
        question: "¿Por qué no usar una plantilla genérica?",
        answer: "Las plantillas genéricas tardan 5 segundos en abrir en el celular y alejan a los clientes. Nosotros programamos desde cero con Next.js 16 para que abra en menos de 1 segundo.",
      },
      {
        question: "¿Cómo coordinamos las reuniones?",
        answer: "Hablamos por WhatsApp y videollamadas directas con Franco y Fede (los dos fundadores), sin intermediarios ni demoras.",
      },
    ],
    geo: {
      latitude: -38.9339,
      longitude: -67.9903,
    },
  },
  {
    slug: "general-roca",
    name: "General Roca",
    province: "Río Negro",
    region: "Alto Valle de Río Negro",
    title: "Desarrollo Web en General Roca: Páginas para Empresas, Agro y Comercios",
    subtitle:
      "Desarrollamos páginas web de alta conversión para empresas agroindustriales, comercios, bodegas y clínicas en General Roca, Cervantes y Allen. Código propio y posicionamiento en Google.",
    metaDescription:
      "Diseño y desarrollo web en General Roca, Río Negro. Páginas corporativas para empresas, bodegas, comercios y agroindustria del Alto Valle.",
    localProof:
      "Trabajamos con empresas y marcas de Río Negro creando webs ultra rápidas que generan consultas directas por WhatsApp desde el primer día.",
    sectors: [
      {
        title: "Agroindustria, Fruticultura y Empaques",
        description: "Sitios corporativos de alto nivel para exportación y relaciones comerciales con compradores del país y del exterior.",
      },
      {
        title: "Comercios y Gastronomía de Roca",
        description: "Menú digital QR para salón y tienda online propia para vender sin intermediarios costosos.",
      },
      {
        title: "Clínicas y Centros Médicos",
        description: "Portales de pacientes y reserva ágil de turnos sin hacer esperar en el teléfono.",
      },
    ],
    localCases: [
      {
        name: "Muzzaga Pádel",
        description: "Sistema web de reservas online en tiempo real en la provincia de Río Negro.",
        slug: "muzzaga",
      },
    ],
    faqs: [
      {
        question: "¿La web incluye factura para empresas?",
        answer: "Sí, emitimos factura para empresas y sociedades de Río Negro y todo el país.",
      },
      {
        question: "¿Qué garantía tenemos tras la entrega?",
        answer: "Todos nuestros proyectos incluyen 30 días de garantía sin costo para cualquier ajuste o calibración.",
      },
      {
        question: "¿Cómo nos encuentran en Google los clientes de Roca?",
        answer: "Configuramos todo el SEO local, coordenadas y etiquetas técnicas para que cuando alguien busque tus servicios aparezcas en los primeros puestos.",
      },
    ],
    geo: {
      latitude: -39.0333,
      longitude: -67.5833,
    },
  },
  {
    slug: "bariloche",
    name: "Bariloche",
    province: "Río Negro",
    region: "Patagonia Andina",
    title: "Desarrollo Web en Bariloche: Páginas para Hotelería, Turismo y Gastronomía",
    subtitle:
      "Diseño y desarrollo de sitios web de primer nivel para hoteles, complejos de cabañas, cervecerías, chocolaterías y turismo en San Carlos de Bariloche y Villa La Angostura. Bilingüe (ES/EN) y reservas directas.",
    metaDescription:
      "Desarrollo web en Bariloche para hoteles, cabañas, turismo aventura y gastronomía. Páginas bilingües con reservas directas y 0% comisiones a agencias.",
    localProof:
      "Creamos plataformas visuales cinematográficas con fotografía inmersiva y tiempos de carga instantáneos para turismo nacional e internacional.",
    sectors: [
      {
        title: "Hoteles, Hostels y Cabañas",
        description: "Motor de reservas directas por WhatsApp o web para ahorrar hasta un 20% de comisión de Booking y Airbnb.",
      },
      {
        title: "Turismo Aventura y Excursiones",
        description: "Venta de paquetes, salidas de trekking y excursiones con cobros online anticipados en pesos y dólares.",
      },
      {
        title: "Chocolaterías, Cervecerías y Gastronomía",
        description: "Tienda online de productos regionales con envíos a todo el país y menú QR digital.",
      },
    ],
    localCases: [
      {
        name: "Pravilo Argentina",
        description: "Sitio web cinematográfico con estética cuidada y foco en turismo y bienestar.",
        slug: "pravilo",
      },
    ],
    faqs: [
      {
        question: "¿Permite recibir reservas directas sin pagar comisiones?",
        answer: "Totalmente. El botón de reserva lleva directo a tu WhatsApp o pasarela de cobro, evitando las comisiones del 15% al 20% de Booking y plataformas cerradas.",
      },
      {
        question: "¿Se puede armar en dos idiomas (Español e Inglés)?",
        answer: "Sí, desarrollamos la arquitectura multi-idioma para que los turistas extranjeros lean el contenido en inglés nativo.",
      },
      {
        question: "¿Cómo se gestionan las fotos de alta calidad?",
        answer: "Optimizamos cada imagen para que se vea nítida en pantallas Retina pero cargue en menos de 1 segundo incluso con señal de montaña.",
      },
    ],
    geo: {
      latitude: -41.1335,
      longitude: -71.3103,
    },
  },
];

export function getCityBySlug(slug: string): CitySEO | undefined {
  return cities.find((c) => c.slug === slug);
}

