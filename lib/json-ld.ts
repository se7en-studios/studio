import { SITE } from "@/data/site";
import { team } from "@/data/team";
import { capabilities } from "@/data/services";
import type { FAQItem } from "@/data/faq";

const sameAs = [
  SITE.social.instagram,
  SITE.social.linkedin,
  SITE.social.github,
].filter((url): url is string => Boolean(url));

// Sólo datos reales de data/: nada de redes o direcciones inventadas.
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  description: SITE.description,
  url: SITE.url,
  logo: `${SITE.url}/logo.png`,
  image: `${SITE.url}/logo.png`,
  email: SITE.email,
  telephone: `+${SITE.whatsapp.replace(/\D/g, "")}`,
  address: { "@type": "PostalAddress", addressCountry: "AR" },
  areaServed: { "@type": "Country", name: "Argentina" },
  founder: team.map((member) => ({
    "@type": "Person",
    name: member.name,
    jobTitle: member.role,
    ...(member.linkedin && { sameAs: [member.linkedin] }),
  })),
  knowsAbout: capabilities,
  ...(sameAs.length > 0 && { sameAs }),
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  inLanguage: "es-AR",
  publisher: { "@id": `${SITE.url}/#organization` },
};

export function faqJsonLd(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

// El "<" escapado evita que un texto con "</script>" cierre la etiqueta.
export function jsonLdHtml(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}
