import type { Metadata, Viewport } from "next";
import { Archivo, Chivo_Mono } from "next/font/google";
import { SITE } from "@/data/site";
import "./globals.css";

// Archivo y Chivo Mono: familias de Omnibus-Type (Buenos Aires), en lugar de la
// Geist que trae por defecto create-next-app.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const chivoMono = Chivo_Mono({
  variable: "--font-chivo-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
    siteName: SITE.name,
    type: "website",
    locale: "es_AR",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

// Mismo fondo que --background en globals.css: pinta la barra del navegador en
// mobile del color de la página en vez de blanco.
export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

// El layout raíz sólo pone el documento, las fuentes y los estilos. Lo que
// envuelve al sitio público vive en app/(site)/layout.tsx; el panel tiene el
// suyo en app/admin/layout.tsx.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${archivo.variable} ${chivoMono.variable}`}>
      <body className="antialiased selection:bg-accent selection:text-background">
        {children}
      </body>
    </html>
  );
}
