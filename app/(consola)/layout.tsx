import type { Metadata } from "next";
import { LazyMotion, domAnimation } from "framer-motion";
import "../(landing)/rd.css";
import "./consola.css";
import { wide, serif } from "@/lib/rd-fonts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { landingFaqs } from "@/data/faq";
import { faqJsonLd, jsonLdHtml, organizationJsonLd, websiteJsonLd } from "@/lib/json-ld";

// La home: la «Consola» (inspirada en la estructura de paisanos.io). Lleva el
// título, la descripción y los datos estructurados que tenía la home anterior
// (que quedó en /clasica). Las preguntas del JSON-LD son las de la sección FAQ.
const TITLE = "Se7en Studio — Diseño y desarrollo web a medida en Argentina";
const DESCRIPTION =
  "Estudio de dos fundadores que diseñan y programan webs, tiendas online y productos con IA a medida. Next.js, entrega en 1 a 4 semanas y 30 días de garantía.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
    languages: { "es-AR": "/", en: "/en", "x-default": "/" },
  },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/", siteName: "Se7en Studio", type: "website", locale: "es_AR" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function ConsolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className={`rd cs ${wide.variable} ${serif.variable}`}>
      {[organizationJsonLd, websiteJsonLd, faqJsonLd(landingFaqs)].map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(data)} />
      ))}
      <a
        href="#main"
        className="sr-only rounded bg-(--signal) px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
      >
        Saltar al contenido
      </a>
      <MotionProvider>
        <LazyMotion features={domAnimation}>{children}</LazyMotion>
      </MotionProvider>
    </div>
  );
}
