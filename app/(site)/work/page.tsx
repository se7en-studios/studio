import { Metadata } from "next";
import { WorkArchiveClient } from "./work-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Portafolio y Casos de Estudio | Se7en Studio",
  description:
    "Explorá nuestros proyectos y casos de estudio en producción: SaaS, E-commerce, plataformas con IA y landing pages de alto impacto.",
  openGraph: {
    title: "Portafolio y Casos de Estudio | Se7en Studio",
    description:
      "Explorá nuestros proyectos y casos de estudio en producción: SaaS, E-commerce, plataformas con IA y landing pages de alto impacto.",
    url: `${SITE.url}/work`,
  },
};

export default function WorkPage() {
  return <WorkArchiveClient />;
}
