import type { Metadata } from "next";
import { LazyMotion, domAnimation } from "framer-motion";
import "./rd.css";
import { wide, serif } from "@/lib/rd-fonts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { IntroProvider } from "@/components/rd/intro";
import { Cursor } from "@/components/rd/cursor";
import { RdNavbar } from "@/components/rd/navbar";
import { landingFaqs } from "@/data/faq";
import {
  faqJsonLd,
  jsonLdHtml,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/json-ld";

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

// La home usa su propio marco (preloader, cursor, navbar y footer del
// rediseño); el resto del sitio sigue con app/(site)/layout.tsx.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className={`rd ${wide.variable} ${serif.variable}`}>
      {[organizationJsonLd, websiteJsonLd, faqJsonLd(landingFaqs)].map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={jsonLdHtml(data)}
        />
      ))}
      <a
        href="#main"
        className="sr-only rounded bg-(--signal) px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100]"
      >
        Saltar al contenido
      </a>
      <MotionProvider>
        {/* Los componentes de la landing usan `m` (no `motion`): sólo cargan las animaciones y
            gestos que usan (domAnimation), sin layout ni drag, que no se usan acá. */}
        <LazyMotion features={domAnimation}>
          <SmoothScroll />
          <IntroProvider>
            <RdNavbar />
            <Cursor />
            <main id="main">{children}</main>
          </IntroProvider>
        </LazyMotion>
      </MotionProvider>
    </div>
  );
}
