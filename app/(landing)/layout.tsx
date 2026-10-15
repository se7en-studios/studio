import "./rd.css";
import { wide, serif } from "@/lib/rd-fonts";
import { MotionProvider } from "@/components/providers/motion-provider";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import { IntroProvider } from "@/components/rd/intro";
import { Cursor } from "@/components/rd/cursor";
import { RdNavbar } from "@/components/rd/navbar";

// La home usa su propio marco (preloader, cursor, navbar y footer del
// rediseño); el resto del sitio sigue con app/(site)/layout.tsx.
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="top" className={`rd ${wide.variable} ${serif.variable}`}>
      <MotionProvider>
        <SmoothScroll />
        <IntroProvider>
          <RdNavbar />
          <Cursor />
          <main>{children}</main>
        </IntroProvider>
      </MotionProvider>
    </div>
  );
}
