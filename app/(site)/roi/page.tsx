import { Metadata } from "next";
import { RoiCalculatorClient } from "./roi-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Calculadora de Ahorro y Retorno de Inversión (ROI) | Se7en Studio",
  description:
    "Calculá cuánto dinero y comisiones ahorrás al migrar de Shopify, WordPress o apps de terceros a un producto digital propio en Next.js con Se7en Studio.",
  openGraph: {
    title: "Calculadora de Ahorro y Retorno de Inversión (ROI) | Se7en Studio",
    description:
      "Calculá cuánto dinero y comisiones ahorrás al migrar de Shopify, WordPress o apps de terceros a un producto digital propio en Next.js con Se7en Studio.",
    url: `${SITE.url}/roi`,
  },
};

export default function RoiPage() {
  return <RoiCalculatorClient />;
}
