import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Globe2,
  HelpCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { projects } from "@/data/projects";
import { productBases } from "@/data/pricing";
import { SITE } from "@/data/site";
import { faqJsonLd, jsonLdHtml } from "@/lib/json-ld";
import type { FAQItem } from "@/data/faq";

const EN_TITLE =
  "Se7en Studio — Custom Next.js, SaaS MVP & AI Product Studio (Argentina / Nearshore)";
const EN_DESC =
  "A two-founder digital product and software engineering studio based in Patagonia, Argentina. We design and build custom Next.js websites, zero-commission e-commerce stores, and AI-powered SaaS MVPs in 1 to 4 weeks.";

export const metadata: Metadata = {
  title: { absolute: EN_TITLE },
  description: EN_DESC,
  alternates: {
    canonical: "/en",
    languages: {
      "es-AR": "/",
      es: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  openGraph: {
    title: EN_TITLE,
    description: EN_DESC,
    url: `${SITE.url}/en`,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: EN_TITLE,
    description: EN_DESC,
  },
};

const englishPackages = [
  {
    id: "landing",
    name: "High-Conversion Custom Website / Landing Page",
    priceUSD: productBases[0]?.basePriceUSD ?? 1200,
    timeline: "1–2 weeks (~7 business days)",
    summary:
      "Bespoke Figma UI/UX, Next.js 16 + Tailwind v4 engineering, sub-0.4s mobile load times, 95–100 Google Lighthouse score, and technical SEO + LLM optimization included.",
  },
  {
    id: "ecommerce",
    name: "Zero-Commission Custom E-Commerce",
    priceUSD: productBases[2]?.basePriceUSD ?? 2400,
    timeline: "2–3 weeks (~14 business days)",
    summary:
      "Real-time inventory in PostgreSQL, 1-step checkout with Stripe / Mercado Pago or structured WhatsApp orders, custom admin dashboard, and 0% platform transaction fees.",
  },
  {
    id: "saas",
    name: "Full-Stack SaaS MVP & Web Application",
    priceUSD: productBases[1]?.basePriceUSD ?? 2800,
    timeline: "2–4 weeks (~18 business days)",
    summary:
      "Production-ready SaaS built on Next.js 16 and Supabase PostgreSQL with Row-Level Security (RLS), OAuth/Magic Link authentication, real-time dashboards, and Stripe billing.",
  },
  {
    id: "ai-agent",
    name: "AI Agent Platform & RAG Software",
    priceUSD: productBases[3]?.basePriceUSD ?? 3600,
    timeline: "~3 weeks (~21 business days)",
    summary:
      "Custom Claude / OpenAI LLM workflows, pgvector semantic search, streaming interfaces, token cost guardrails, and live data pipelines.",
  },
];

const englishFaqs: FAQItem[] = [
  {
    id: "en-what-is",
    question: "What is Se7en Studio and how does your two-founder model work?",
    answer:
      "Se7en Studio (www.se7en.com.ar) is a boutique digital product design and software engineering studio based in Patagonia, Argentina. Unlike traditional agencies that hand your project off to junior subcontractors, you work directly with the two founders who design and code every line of your product: Franco Riquero (Industrial Engineer, founder of Takefyy & Sentinel) and Federico Martín (Product Designer & Developer, creator of Apex Performance).",
  },
  {
    id: "en-pricing",
    question: "How much does a custom website, e-commerce store, or SaaS MVP cost?",
    answer:
      "Our fixed-scope packages start at $1,200 USD for a high-conversion landing page or corporate site (delivered in 1–2 weeks), $2,400 USD for a custom e-commerce platform, $2,800 USD for a full-stack SaaS MVP, and $3,600 USD for an AI-powered software platform. Every project includes 100% code ownership in your GitHub and a 30-day post-launch warranty.",
  },
  {
    id: "en-timezone",
    question: "Do you work with US, Canadian, European, and international clients?",
    answer:
      "Yes. We work 100% remotely from Argentina (GMT-3, just 1–2 hours ahead of US Eastern Time, giving full workday overlap with North America and Europe). We accept international wire transfers (SWIFT/ACH), Stripe, Wise, and USDC/USDT.",
  },
  {
    id: "en-code-ownership",
    question: "Who owns the source code and intellectual property after launch?",
    answer:
      "You own 100% of the source code, Figma design files, and database from day one. There are no recurring licensing fees or vendor lock-in.",
  },
];

export default function EnglishHomePage() {
  const enOrgJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}/en#organization`,
    name: SITE.name,
    url: `${SITE.url}/en`,
    description: EN_DESC,
    disambiguatingDescription:
      "Se7en Studio (www.se7en.com.ar) is a custom software engineering and digital product design studio in Patagonia, Argentina, founded by Franco Riquero and Federico Martín. Not affiliated with the 1995 film Se7en or film production companies.",
    priceRange: "$1,200 - $6,000 USD",
    email: SITE.email,
    telephone: `+${SITE.whatsapp.replace(/\D/g, "")}`,
    knowsLanguage: ["en", "es"],
  };

  const featuredProjects = [...projects]
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);

  return (
    <main lang="en" className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(enOrgJsonLd)}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdHtml(faqJsonLd(englishFaqs))}
      />

      <Container>
        {/* Hero with clear 50-word canonical definition below the H1 */}
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Globe2 size={13} className="text-accent" />
            <span>Patagonia, Argentina (GMT-3) · English · Español</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Custom Next.js Websites, SaaS MVPs &amp; AI Products{" "}
            <span className="text-accent">shipped in 2–3 weeks.</span>
          </h1>

          {/* 50-word canonical definition for AI crawlers and founders */}
          <p className="mt-6 text-lg leading-relaxed text-foreground/90 md:text-xl">
            <strong>Se7en Studio</strong> is a two-founder digital product design and software engineering studio based in Patagonia, Argentina. We design in Figma and build custom websites, zero-commission e-commerce stores, and AI-powered SaaS applications using Next.js 16, React, TypeScript, and Supabase—delivered in 1 to 4 weeks with 100% code ownership.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/start"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-background hover:bg-accent/90"
            >
              <span>Start Your Project Brief</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/pricing"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-surface px-7 py-3.5 text-sm font-medium text-foreground hover:border-accent/40"
            >
              <span>Interactive Pricing Calculator</span>
            </Link>
            <Link
              href="/"
              className="focus-ring font-mono text-xs text-muted underline underline-offset-4 hover:text-foreground"
            >
              Ver versión en Español →
            </Link>
          </div>
        </div>

        {/* 3 Core Guarantees */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <Rocket className="text-accent" size={24} />
            <h2 className="mt-3 text-base font-semibold text-foreground">
              Direct Founder Execution
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              No account managers or junior handoffs. You speak directly with Franco Riquero (Architecture &amp; Full-Stack) and Federico Martín (Product Design &amp; UI/Motion).
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <Code2 className="text-accent" size={24} />
            <h2 className="mt-3 text-base font-semibold text-foreground">
              100% Code Ownership
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Clean TypeScript, Next.js 16 Server Components, and Supabase PostgreSQL pushed directly to your GitHub repository. Zero platform commissions.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <ShieldCheck className="text-accent" size={24} />
            <h2 className="mt-3 text-base font-semibold text-foreground">
              30-Day Post-Launch Warranty
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Fixed scope and pricing agreed in writing before day one, backed by 30 days of complimentary support and tuning after launch.
            </p>
          </div>
        </div>

        {/* Transparent Packages & Pricing in USD */}
        <section className="mt-20 border-t border-border pt-16">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">
              Transparent Fixed-Scope Packages
            </span>
            <h2 className="display mt-2 text-3xl text-foreground sm:text-4xl">
              Services, Timelines &amp; Pricing (USD)
            </h2>
            <p className="mt-3 text-base text-muted">
              Every package includes bespoke Figma UI/UX, responsive engineering, technical SEO, and deployment on Vercel Edge.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {englishPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-8"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted">
                      {pkg.timeline}
                    </span>
                    <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs font-semibold text-accent">
                      From ${pkg.priceUSD.toLocaleString("en-US")} USD
                    </span>
                  </div>
                  <h3 className="display mt-4 text-2xl text-foreground">
                    {pkg.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {pkg.summary}
                  </p>
                </div>

                <div className="mt-6 border-t border-border pt-4 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs text-muted">
                    <CheckCircle2 size={13} className="text-accent" />
                    Fixed price &amp; timeline
                  </span>
                  <Link
                    href="/pricing"
                    className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent hover:underline"
                  >
                    <span>Configure quote</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Comparison Table for International Founders */}
        <section className="mt-20 border-t border-border pt-16">
          <span className="font-mono text-xs uppercase tracking-widest text-accent">
            Why Founders Choose Se7en Studio
          </span>
          <h2 className="display mt-2 text-3xl text-foreground sm:text-4xl">
            Se7en Studio vs. Traditional Agencies vs. Freelancers
          </h2>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-2">
                  <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-muted">
                    Criteria
                  </th>
                  <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-accent">
                    Se7en Studio (2 Founders)
                  </th>
                  <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-muted">
                    Traditional US/EU Agency
                  </th>
                  <th className="p-4 md:p-5 font-mono text-xs uppercase tracking-wider text-muted">
                    Solo Freelancer / No-Code
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                <tr>
                  <th scope="row" className="p-4 md:p-5 font-medium text-foreground">
                    Typical MVP / Site Investment
                  </th>
                  <td className="p-4 md:p-5 font-medium text-foreground">
                    $1,200 – $3,600 USD
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    $15,000 – $50,000+ USD
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    $800 – $4,000 USD
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 md:p-5 font-medium text-foreground">
                    Time to Production
                  </th>
                  <td className="p-4 md:p-5 font-medium text-foreground">
                    1 to 4 weeks
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    3 to 6 months
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    Unpredictable
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 md:p-5 font-medium text-foreground">
                    Who Builds Your Product
                  </th>
                  <td className="p-4 md:p-5 font-medium text-foreground">
                    Both senior founders (Design + Engineering)
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    Account managers + junior devs
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    Single generalist (lacks either UI craft or backend depth)
                  </td>
                </tr>
                <tr>
                  <th scope="row" className="p-4 md:p-5 font-medium text-foreground">
                    Performance &amp; Code Ownership
                  </th>
                  <td className="p-4 md:p-5 font-medium text-foreground">
                    Next.js 16 + Supabase · 100% your GitHub
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    Varies by agency
                  </td>
                  <td className="p-4 md:p-5 text-muted">
                    Often locked into Bubble, Webflow, or WordPress plugins
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Production Case Studies */}
        <section className="mt-20 border-t border-border pt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-accent">
                Live in Production
              </span>
              <h2 className="display mt-2 text-3xl text-foreground sm:text-4xl">
                Selected Case Studies
              </h2>
            </div>
            <Link
              href="/work"
              className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent hover:underline"
            >
              <span>Explore all {projects.length} case studies</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProjects.map((p) => (
              <Link
                key={p.slug}
                href={`/work/${p.slug}`}
                className="focus-ring group rounded-2xl border border-border bg-surface p-6 transition-colors hover:border-accent/40"
              >
                <div className="flex items-center justify-between font-mono text-xs text-muted">
                  <span>{p.category}</span>
                  <span>{p.year}</span>
                </div>
                <h3 className="display mt-3 text-2xl text-foreground group-hover:text-accent">
                  {p.name}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {p.shortDescription}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {(p.technology ?? []).map((t) => (
                    <span
                      key={t}
                      className="rounded border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* English FAQs */}
        <section className="mt-20 border-t border-border pt-16">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
            <HelpCircle size={14} />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="display mt-2 text-3xl text-foreground sm:text-4xl">
            Working with Se7en Studio
          </h2>

          <dl className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {englishFaqs.map((faq) => (
              <div
                key={faq.id}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <dt className="text-base font-semibold text-foreground">
                  {faq.question}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Bottom CTA */}
        <div className="mt-20 rounded-2xl border border-accent/35 bg-surface p-8 md:p-12 text-center flex flex-col items-center">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-accent">
            <Sparkles size={13} />
            <span>2 Project Slots Available This Month</span>
          </span>
          <h2 className="display mt-3 text-3xl text-foreground sm:text-4xl">
            Ready to ship your product in 2 to 3 weeks?
          </h2>
          <p className="mt-2 max-w-lg text-sm text-muted">
            Send us your brief or message us directly on WhatsApp. You will get a technical proposal with fixed pricing and timeline within 24 hours.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/start"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-background hover:bg-accent/90"
            >
              <span>Start Project Brief</span>
              <ArrowRight size={15} />
            </Link>
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-7 py-3.5 text-sm font-medium text-foreground hover:border-accent/40"
            >
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </Container>
    </main>
  );
}

