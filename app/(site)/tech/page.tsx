import { Metadata } from "next";
import { TechRadarClient } from "./tech-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Radar Tecnológico & Stack de Ingeniería | Se7en Studio",
  description:
    "Explorá nuestro Tech Radar interactivo: las tecnologías que adoptamos, evaluamos y evitamos para construir productos digitales de máximo rendimiento.",
  openGraph: {
    title: "Radar Tecnológico & Stack de Ingeniería | Se7en Studio",
    description:
      "Explorá nuestro Tech Radar interactivo: las tecnologías que adoptamos, evaluamos y evitamos para construir productos digitales de máximo rendimiento.",
    url: `${SITE.url}/tech`,
  },
};

export default function TechRadarPage() {
  return <TechRadarClient />;
}
