import { Metadata } from "next";
import { PortalClient } from "./portal-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Demo del Portal de Cliente & Staging en Vivo | Se7en Studio",
  description:
    "Mirá cómo nuestros clientes siguen el desarrollo de su software en tiempo real: sprints, métricas de rendimiento Lighthouse y deploys en vivo en Staging.",
  openGraph: {
    title: "Demo del Portal de Cliente & Staging en Vivo | Se7en Studio",
    description:
      "Mirá cómo nuestros clientes siguen el desarrollo de su software en tiempo real: sprints, métricas de rendimiento Lighthouse y deploys en vivo en Staging.",
    url: `${SITE.url}/portal`,
  },
};

export default function PortalPage() {
  return <PortalClient />;
}
