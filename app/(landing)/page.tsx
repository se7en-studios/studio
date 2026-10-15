import { RdHero } from "@/components/rd/hero";
import { RdMarquee } from "@/components/rd/marquee";
import { RdManifesto } from "@/components/rd/manifesto";
import { RdStats } from "@/components/rd/stats";
import { RdWork } from "@/components/rd/work";
import { RdServices } from "@/components/rd/services";
import { RdProcess } from "@/components/rd/process";
import { RdTestimonials } from "@/components/rd/testimonials";
import { RdTeam } from "@/components/rd/team";
import { RdFaq } from "@/components/rd/faq";
import { RdContact } from "@/components/rd/contact";
import { RdFooter } from "@/components/rd/footer";

export default function Home() {
  return (
    <>
      <RdHero />
      <RdMarquee />
      <RdManifesto />
      <RdStats />
      <RdWork />
      <RdServices />
      <RdProcess />
      <RdTestimonials />
      <RdTeam />
      <RdFaq />
      <RdContact />
      <RdFooter />
    </>
  );
}
