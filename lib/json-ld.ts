import { SITE } from "@/data/site";
import { team } from "@/data/team";
import { capabilities } from "@/data/services";
import { productBases } from "@/data/pricing";
import type { FAQItem } from "@/data/faq";
import type { BlogPost } from "@/data/blog";
import type { ComparisonItem } from "@/data/comparisons";

const sameAs = [
  SITE.social.instagram,
  SITE.social.linkedin,
  SITE.social.github,
].filter((url): url is string => Boolean(url));

// Sólo datos reales de data/: incluye desambiguación de marca (qué es y qué no es Se7en Studio)
// y catálogo de servicios con precios reales para motores de búsqueda y LLMs (ChatGPT, Claude, Perplexity).
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${SITE.url}/#organization`,
  name: SITE.name,
  alternateName: ["Se7en Studio Argentina", "Se7en Digital Product Studio"],
  description: SITE.description,
  disambiguatingDescription:
    "Se7en Studio (www.se7en.com.ar) es un estudio argentino de diseño de producto digital e ingeniería de software a medida en Next.js, React, TypeScript y Supabase fundado por Franco Riquero y Federico Martín en la Patagonia. No tiene relación con la película Se7en (1995), estudios audiovisuales ni agencias de publicidad tradicional.",
  url: SITE.url,
  logo: `${SITE.url}/logo.png`,
  image: `${SITE.url}/logo.png`,
  email: SITE.email,
  telephone: `+${SITE.whatsapp.replace(/\D/g, "")}`,
  priceRange: "USD 1200 - USD 6000",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Patagonia",
    addressCountry: "AR",
  },
  areaServed: [
    { "@type": "Country", name: "Argentina" },
    { "@type": "Country", name: "Uruguay" },
    { "@type": "Country", name: "Chile" },
    { "@type": "Country", name: "México" },
    { "@type": "Country", name: "Colombia" },
    { "@type": "Country", name: "España" },
    { "@type": "Country", name: "United States" },
  ],
  knowsLanguage: ["es", "en"],
  founder: team.map((member) => ({
    "@type": "Person",
    name: member.name,
    jobTitle: member.role,
    description: member.bio,
    ...(member.linkedin && { sameAs: [member.linkedin] }),
  })),
  knowsAbout: capabilities,
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Servicios de Diseño y Desarrollo de Software a Medida",
    itemListElement: productBases.map((product) => ({
      "@type": "Offer",
      name: product.name,
      description: product.description,
      price: String(product.basePriceUSD),
      priceCurrency: "USD",
      url: `${SITE.url}/pricing`,
      itemOffered: {
        "@type": "Service",
        name: product.name,
        description: product.description,
        provider: { "@id": `${SITE.url}/#organization` },
      },
    })),
  },
  ...(sameAs.length > 0 && { sameAs }),
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE.url}/#website`,
  name: SITE.name,
  url: SITE.url,
  inLanguage: ["es-AR", "en"],
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

export function articleJsonLd(post: BlogPost) {
  const url = `${SITE.url}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt,
    abstract: post.directAnswer,
    datePublished: post.publishedIso,
    dateModified: post.publishedIso,
    inLanguage: "es-AR",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@type": "Person",
      name: post.author.name,
      jobTitle: post.author.role,
      worksFor: { "@id": `${SITE.url}/#organization` },
    },
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
  };
}

export function comparisonJsonLd(comp: ComparisonItem) {
  const url = `${SITE.url}/vs/${comp.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#comparison`,
    headline: comp.title,
    description: comp.metaDescription,
    abstract: comp.leadSentences.join(" "),
    datePublished: comp.publishedIso,
    dateModified: comp.publishedIso,
    inLanguage: "es-AR",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    author: {
      "@id": `${SITE.url}/#organization`,
    },
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
    articleSection: comp.category,
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: `${SITE.url}${item.path}`,
    })),
  };
}

// El "<" escapado evita que un texto con "</script>" cierre la etiqueta.
export function jsonLdHtml(data: object) {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}
