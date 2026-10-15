import { Navbar } from "@/components/sections/navbar";
import Se7enFooter from "@/components/footer/Se7enFooter";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { SoundProvider } from "@/components/providers/sound-provider";
import { CommandPalette } from "@/components/ui/command-palette";
import { BookingModal } from "@/components/ui/booking-modal";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { WhatsAppWidget } from "@/components/ui/whatsapp-widget";
import { jsonLdHtml, organizationJsonLd } from "@/lib/json-ld";

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
        dangerouslySetInnerHTML={jsonLdHtml(organizationJsonLd)}
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
