import { Metadata } from "next";
import { KickoffClient } from "./kickoff-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Portal de Kickoff & Onboarding de Clientes | Se7en Studio",
  description:
    "Portal interactivo para clientes que inician un proyecto: configuración de accesos de GitHub, subida de brand assets, canal de comunicación y staging DNS.",
  openGraph: {
    title: "Portal de Kickoff & Onboarding de Clientes | Se7en Studio",
    description:
      "Portal interactivo para clientes que inician un proyecto: configuración de accesos de GitHub, subida de brand assets, canal de comunicación y staging DNS.",
    url: `${SITE.url}/kickoff`,
  },
};

export default function KickoffPage() {
  return <KickoffClient />;
}
