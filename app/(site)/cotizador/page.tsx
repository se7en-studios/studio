import { Metadata } from "next";
import { SITE } from "@/data/site";
import { CotizadorClient } from "./cotizador-client";

export const metadata: Metadata = {
  title: "Cotizador de Páginas Web en 1 Minuto | Se7en Studio",
  description:
    "Calculá al instante el costo, tiempo de entrega y funciones recomendadas para la página web o tienda online de tu negocio. Precios transparentes y sin sorpresas.",
  openGraph: {
    title: "Cotizador de Páginas Web en 1 Minuto | Se7en Studio",
    description:
      "Calculá al instante el costo, tiempo de entrega y funciones recomendadas para la página web o tienda online de tu negocio en Argentina.",
    url: `${SITE.url}/cotizador`,
  },
  alternates: {
    canonical: `${SITE.url}/cotizador`,
  },
};

export default function CotizadorPage() {
  return <CotizadorClient />;
}

