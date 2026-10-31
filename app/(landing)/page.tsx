import { RdHero } from "@/components/rd/hero";
import { RdMarquee } from "@/components/rd/marquee";
import { RdManifesto } from "@/components/rd/manifesto";
import { RdStats } from "@/components/rd/stats";
import { RdWork } from "@/components/rd/work";
import { RdServices } from "@/components/rd/services";
import { RdComparison } from "@/components/rd/comparison";
import { RdProcess } from "@/components/rd/process";
import { RdTechStack } from "@/components/rd/tech-stack";
import { RdCotizadorBanner } from "@/components/rd/cotizador-banner";
import { RdTestimonials } from "@/components/rd/testimonials";
import { RdArcade } from "@/components/rd/arcade";
import { RdTeam } from "@/components/rd/team";
import { RdFaq } from "@/components/rd/faq";
import { RdContact } from "@/components/rd/contact";
import { RdFooter } from "@/components/rd/footer";
import { RdMobileStickyBar } from "@/components/rd/mobile-sticky-bar";

export default function Home() {
  return (
    <>
      <RdHero />
      <RdMarquee />
      <RdManifesto />
      <RdStats />
      <RdWork />
      <RdServices />
      <RdComparison />
      <RdProcess />
      <RdTechStack />
      <RdCotizadorBanner />
      <RdTestimonials />
      <RdArcade />
      <RdTeam />
      <RdFaq />
      <RdContact />
      <RdFooter />
      <RdMobileStickyBar />
    </>
  );
}
