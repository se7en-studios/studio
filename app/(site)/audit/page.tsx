import { Metadata } from "next";
import { AuditClient } from "./audit-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Auditoría Técnica Gratuita de tu Sitio Web | Se7en Studio",
  description:
    "Solicitá una auditoría técnica gratuita de 3 puntos (velocidad, seguridad y conversión) analizada en video por los fundadores de Se7en Studio.",
  openGraph: {
    title: "Auditoría Técnica Gratuita de tu Sitio Web | Se7en Studio",
    description:
      "Solicitá una auditoría técnica gratuita de 3 puntos (velocidad, seguridad y conversión) analizada en video por los fundadores de Se7en Studio.",
    url: `${SITE.url}/audit`,
  },
};

export default function AuditPage() {
  return <AuditClient />;
}
