import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { getOficinasData } from "@/lib/admin/oficinas";
import type { OficinasData } from "@/lib/admin/oficinas-shared";
import { PanelNotReady } from "@/lib/admin/panel";
import { pixel } from "@/lib/site-fonts";
import { PageHeader } from "../kit";
import { AdminGate, SetupNotice } from "../ui";
import { OficinasView } from "./view";

export const metadata: Metadata = { title: "En vivo" };

// Letras pixel para los carteles del mapa y el cartel LED. Sólo se bajan acá.
// «En vivo»: el estudio como un mapa. Cada proyecto es una sala que se va
// apagando con los días sin entrar; entrar la vuelve a prender.
export default async function OficinasPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  let data: OficinasData | null = null;
  let setup: string | null = null;
  try {
    data = await getOficinasData(me.who);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="En vivo" eyebrow="Oficinas">
        El estudio como un mapa: cada proyecto es una sala y se va apagando con los días sin entrar. Entrar la vuelve a prender.
      </PageHeader>
      {setup ? <SetupNotice reason={setup} /> : data && <OficinasView data={data} font={pixel.style.fontFamily} fontClass={pixel.className} />}
    </div>
  );
}
