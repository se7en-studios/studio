import { Metadata } from "next";
import { SecurityClient } from "./security-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Seguridad, Propiedad Intelectual & NDA | Se7en Studio",
  description:
    "Conocé nuestros estándares de seguridad: 100% código tuyo en GitHub, NDA firmado antes de iniciar, bases de datos PostgreSQL con RLS y cero intermediarios.",
  openGraph: {
    title: "Seguridad, Propiedad Intelectual & NDA | Se7en Studio",
    description:
      "Conocé nuestros estándares de seguridad: 100% código tuyo en GitHub, NDA firmado antes de iniciar, bases de datos PostgreSQL con RLS y cero intermediarios.",
    url: `${SITE.url}/security`,
  },
};

export default function SecurityPage() {
  return <SecurityClient />;
}
