import { ConsolaShell } from "@/components/consola/shell";
import { CsHero } from "@/components/consola/hero";
import { CsWork } from "@/components/consola/work";
import { CsPlayground } from "@/components/consola/playground";
import { CsNotes } from "@/components/consola/notes";
import { CsCall } from "@/components/consola/call";
import { CsFooter } from "@/components/consola/footer";

export default function Consola() {
  return (
    <ConsolaShell>
      <CsHero />
      <CsWork />
      <CsPlayground />
      <CsNotes />
      <CsCall />
      <CsFooter />
    </ConsolaShell>
  );
}
