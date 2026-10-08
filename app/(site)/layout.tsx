import { SiteChrome } from "@/components/site/site-chrome";

// Las páginas públicas del sitio. El panel (/admin) queda afuera de este grupo
// a propósito: ver components/site/site-chrome.tsx.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <SiteChrome>{children}</SiteChrome>;
}
