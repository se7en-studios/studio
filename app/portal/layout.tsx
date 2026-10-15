import type { Metadata, Viewport } from "next";
import Image from "next/image";

// Portal del cliente: fuera de buscadores, sin el chrome del sitio ni del panel,
// y sin mandar la URL (que puede llevar el token) a otros sitios como Referer.
export const metadata: Metadata = {
  title: { default: "Portal", template: "%s · Portal Se7en" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#0a0a0b" };

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-app min-h-dvh text-foreground">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16 sm:px-6 sm:pt-10">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Image
            src="/logo.png"
            alt="Se7en Studio"
            width={800}
            height={224}
            sizes="120px"
            className="h-7 w-auto"
            priority
          />
          <span className="font-mono text-[11px] tracking-[0.18em] text-muted uppercase">
            Portal de clientes
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}
