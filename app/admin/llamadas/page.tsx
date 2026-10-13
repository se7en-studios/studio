import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { parseMeetLink } from "@/lib/admin/calls";
import { hasPersonalTopic, notificationsConfigured } from "@/lib/admin/notify";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { AdminGate, PageHeader } from "../ui";
import { CallsView } from "./view";

export const metadata: Metadata = { title: "Llamadas" };

export default async function LlamadasPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  const otherId = PEOPLE_IDS.find((p) => p !== me.who) ?? me.who;
  // Sala fija de cada uno (opcional): se crea una vez en Meet y se carga en Vercel.
  const room = (id: string) =>
    parseMeetLink(process.env[`MEET_LINK_${id.toUpperCase()}`]);

  return (
    <div className="space-y-6">
      <PageHeader title="Llamadas">
        Llamá a {PEOPLE[otherId].name} por Google Meet. Se abre la sala en otra
        pestaña y a {PEOPLE[otherId].name} le suena el panel en la computadora,
        con un botón para unirse.
      </PageHeader>
      <CallsView
        me={me.who}
        other={{ id: otherId, name: PEOPLE[otherId].name }}
        myRoom={room(me.who)}
        otherHasRoom={room(otherId) !== null}
        noticesOn={notificationsConfigured()}
        personalTopic={hasPersonalTopic(otherId)}
      />
    </div>
  );
}
