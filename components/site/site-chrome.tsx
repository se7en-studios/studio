import { Navbar } from "@/components/sections/navbar";
import Se7enFooter from "@/components/footer/Se7enFooter";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { SoundProvider } from "@/components/providers/sound-provider";
import { CommandPalette } from "@/components/ui/command-palette";
import { BookingModal } from "@/components/ui/booking-modal";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { WhatsAppWidget } from "@/components/ui/whatsapp-widget";
import { SITE } from "@/data/site";
import { team } from "@/data/team";
import { capabilities } from "@/data/services";

const sameAs = [
  SITE.social.instagram,
  SITE.social.linkedin,
  SITE.social.github,
].filter((url): url is string => Boolean(url));

// Sólo datos reales de data/: nada de redes o direcciones inventadas.
const organizationJsonLd = {
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

/**
 * Todo lo que envuelve a las páginas públicas: auroras, scroll suave, navbar,
 * footer, paleta de comandos, reserva y WhatsApp. Vive acá y no en el layout
 * raíz para que /admin no cargue ni ejecute nada de esto: el panel tiene su
 * propio layout, liviano.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <AuroraBackground />
      <SmoothScroll />
      <SoundProvider>
        <MotionProvider>
          <Navbar />
          <main>{children}</main>
          <Se7enFooter />
          <CommandPalette />
          <BookingModal />
          <WhatsAppWidget />
        </MotionProvider>
      </SoundProvider>
    </>
  );
}
