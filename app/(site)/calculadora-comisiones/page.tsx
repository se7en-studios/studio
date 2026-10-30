import type { Metadata } from "next";
import { CommissionCalculatorClient } from "./calculadora-client";
import { SITE } from "@/data/site";
import { breadcrumbJsonLd, faqJsonLd, jsonLdHtml } from "@/lib/json-ld";
import type { FAQItem } from "@/data/faq";

export const metadata: Metadata = {
  title: "Calculadora de Comisiones de E-Commerce & Delivery | Se7en Studio",
  description:
    "Calculá cuánto dinero pierde tu negocio por mes en comisiones de PedidosYa, Rappi, Mercado Libre o Tiendanube frente a tener tu propia tienda online o catálogo en Next.js.",
  alternates: {
    canonical: "/calculadora-comisiones",
  },
  openGraph: {
    title: "Calculadora de Comisiones de E-Commerce & Delivery | Se7en Studio",
    description:
      "Calculá cuánto dinero pierde tu negocio por mes en comisiones de PedidosYa, Rappi, Mercado Libre o Tiendanube frente a tener tu propia tienda online o catálogo en Next.js.",
    url: `${SITE.url}/calculadora-comisiones`,
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculadora de Comisiones de E-Commerce & Delivery | Se7en Studio",
    description:
      "Calculá cuánto dinero pierde tu negocio por mes en comisiones de PedidosYa, Rappi, Mercado Libre o Tiendanube frente a tener tu propia tienda online o catálogo en Next.js.",
  },
};

const faqs: FAQItem[] = [
  {
    id: "calc-comision-se7en",
    question: "¿Qué comisión cobra Se7en Studio por las ventas en mi propia tienda?",
    answer:
      "0%. Se7en Studio cobra únicamente por el diseño y desarrollo inicial (desde USD 2.400). Todo el dinero de las ventas va directo a tu cuenta bancaria o de Mercado Pago.",
  },
  {
    id: "calc-recupero",
    question: "¿En cuánto tiempo se amortiza el costo de una tienda propia a medida?",
    answer:
      "Para un negocio que factura $6.000.000 ARS por mes en canales con 22% de comisión (donde pierde $1.320.000 ARS mensuales), el costo de la tienda se recupera en menos de 75 días.",
  },
];

export default function CommissionCalculatorPage() {
  const schemas = [
    breadcrumbJsonLd([
      { name: "Se7en Studio", path: "/" },
      { name: "Calculadora de Comisiones", path: "/calculadora-comisiones" },
    ]),
    faqJsonLd(faqs),
  ];

  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdHtml(schema)}
        />
      ))}
      <CommissionCalculatorClient />
    </>
  );
}

