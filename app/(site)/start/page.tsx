import { Metadata } from "next";
import { StartClient } from "./start-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Iniciar Proyecto — Asistente de Briefing | Se7en Studio",
  description:
    "Configurá el brief de tu proyecto en 3 minutos. Definí objetivos, requerimientos técnicos, presupuesto y recibí una propuesta personalizada dentro de las 24 horas.",
  openGraph: {
    title: "Iniciar Proyecto — Asistente de Briefing | Se7en Studio",
    description:
      "Configurá el brief de tu proyecto en 3 minutos. Definí objetivos, requerimientos técnicos, presupuesto y recibí una propuesta personalizada dentro de las 24 horas.",
    url: `${SITE.url}/start`,
  },
};

export default function StartPage() {
  return <StartClient />;
}
