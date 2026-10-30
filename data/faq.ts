export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

// El orden es el de la lista y el del JSON-LD: primero lo que decide si se
// avanza (precio, plazos, pago), después el cómo.
export const faqs: FAQItem[] = [
  {
    id: "price",
    question: "¿Cuánto cuesta un proyecto?",
    answer:
      "Depende del alcance. Como referencia, una landing arranca en USD 1.200 y una tienda online en USD 2.400; en la página de precios podés armar un estimado según lo que necesites. Antes de empezar acordamos por escrito el alcance y el precio.",
  },
  {
    id: "timeline",
    question: "¿Cuánto tarda?",
    answer:
      "Una landing o sitio institucional lleva entre 1 y 2 semanas. Plataformas, paneles de administración o tiendas online, entre 2 y 4 semanas. Vas viendo avances en el camino, no sólo al final.",
  },
  {
    id: "payments",
    question: "¿Cómo se paga? ¿Trabajan con clientes de afuera?",
    answer:
      "Sí, trabajamos 100% remoto, así que la ubicación no es un problema. Aceptamos transferencia en ARS o USD, transferencia internacional (SWIFT / ACH), Stripe, Wise y cripto (USDT / USDC).",
  },
  {
    id: "communication",
    question: "¿Cómo es el proceso y la comunicación?",
    answer:
      "Hablás directo con los dos fundadores, que diseñamos y programamos el proyecto. Sin intermediarios: seguimiento por WhatsApp, demos en vivo y respuesta dentro de las 24 h hábiles.",
  },
  {
    id: "services-scope",
    question: "¿Qué tipo de proyectos hacen?",
    answer:
      "Landing pages, sitios institucionales, plataformas web, tiendas online a medida y productos con inteligencia artificial. Todo se diseña desde cero, sin plantillas.",
  },
  {
    id: "tech-stack",
    question: "¿Con qué tecnología trabajan?",
    answer:
      "Next.js, React y TypeScript, con hosting en Vercel. En la práctica: sitios que cargan rápido, se indexan bien en Google y no dependen de plugins de terceros. El código queda 100% a tu nombre.",
  },
  {
    id: "post-launch",
    question: "¿Qué pasa después del lanzamiento?",
    answer:
      "Todos los proyectos incluyen 30 días de garantía y soporte sin costo. Después seguimos disponibles para mantener y mejorar el producto a medida que crece.",
  },
];

// La home no publica precio: se calcula con cada cliente. Parte de la misma lista
// que /pricing para que el texto visible y el JSON-LD no se desfasen.
export const landingFaqs: FAQItem[] = faqs.map((item) =>
  item.id === "price"
    ? {
        ...item,
        answer:
          "Depende de lo que necesites, pero para que tengas una referencia clara: una página para tu negocio arranca en USD 1.200 y una tienda online en USD 2.400. Podés calcular tu presupuesto exacto en 1 minuto en nuestro cotizador online antes de hablar con nosotros.",
      }
    : item,
);
