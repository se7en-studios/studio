import { Metadata } from "next";
import { PlaygroundClient } from "./playground-client";
import { SITE } from "@/data/site";

export const metadata: Metadata = {
  title: "Playground Técnico & Inspector de Server Actions | Se7en Studio",
  description:
    "Probá en vivo cómo ejecutan nuestras Server Actions en Next.js 16 con Supabase PostgreSQL, streaming de IA y tiempos de respuesta sub-20ms.",
  openGraph: {
    title: "Playground Técnico & Inspector de Server Actions | Se7en Studio",
    description:
      "Probá en vivo cómo ejecutan nuestras Server Actions en Next.js 16 con Supabase PostgreSQL, streaming de IA y tiempos de respuesta sub-20ms.",
    url: `${SITE.url}/playground`,
  },
};

export default function PlaygroundPage() {
  return <PlaygroundClient />;
}
