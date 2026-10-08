import { Metadata } from "next";
import { PricingClient } from "./pricing-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Precios Transparentes & Configurador de Proyectos | Se7en Studio",
  description:
    "Configurá el alcance técnico de tu producto digital (SaaS, E-Commerce o Landing Page) y generá un presupuesto inmediato con tiempos y entregables claros.",
  openGraph: {
    title: "Precios Transparentes & Configurador de Proyectos | Se7en Studio",
    description:
      "Configurá el alcance técnico de tu producto digital (SaaS, E-Commerce o Landing Page) y generá un presupuesto inmediato con tiempos y entregables claros.",
    url: `${SITE.url}/pricing`,
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
