import { ConsolaShell } from "@/components/consola/shell";
import { CsHero } from "@/components/consola/hero";
import { CsWork } from "@/components/consola/work";
import { CsOjo } from "@/components/consola/ojo-ascii";
import { CsPlayground } from "@/components/consola/playground";
import { CsNotes } from "@/components/consola/notes";
import { CsCall } from "@/components/consola/call";
import { CsFaq } from "@/components/consola/faq";
import { RdArcade } from "@/components/rd/arcade";
import { CsFooter } from "@/components/consola/footer";

// La home: la propuesta «Consola» (inspirada en la estructura de paisanos.io). La anterior quedó en /clasica.
export default function Home() {
  return (
    <ConsolaShell>
      <CsHero />
      <CsWork />
      {/* Un respiro entre los casos y la pared: el ojo en caracteres que termina en el logo. */}
      <CsOjo />
      <CsPlayground />
      <CsNotes />
      <CsCall />
      {/* «En vivo»: el fichín que te mete en la oficina, el mismo de la home anterior. */}
      <div className="pt-28 md:pt-40">
        <RdArcade />
      </div>
      <CsFaq />
      <CsFooter />
    </ConsolaShell>
  );
}
