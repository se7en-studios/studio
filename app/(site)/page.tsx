import { PageTransition } from "@/components/ui/page-transition";
import { Hero } from "@/components/sections/hero";
import { SelectedWork } from "@/components/sections/selected-work";
import { Proof } from "@/components/sections/proof";
import { Services } from "@/components/sections/services";
import { Process } from "@/components/sections/process";
import { About } from "@/components/sections/about";
import { FAQ } from "@/components/sections/faq";
import { Contact } from "@/components/sections/contact";

export default function Home() {
  return (
    <PageTransition>
      <Hero />
      <SelectedWork />
      <Proof />
      <Services />
      <Process />
      <About />
      <FAQ />
      <Contact />
    </PageTransition>
  );
}
