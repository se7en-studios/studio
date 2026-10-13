import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import {
  notificationServer,
  notificationTopic,
  notificationsConfigured,
} from "@/lib/admin/notify";
import { hasPersonalTopic } from "@/lib/admin/notify";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { AdminGate, PageHeader } from "../ui";
import { NoticesView } from "./view";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const partnerId = PEOPLE_IDS.find((p) => p !== me.who) ?? me.who;

  return (
    <div className="space-y-6">
      <PageHeader title="Avisos">
        Notificaciones en el celular cuando entra un pedido, llega un mensaje o
        un cobro, un resumen a la mañana y un recordatorio si falta publicar el
        post de las 19 h. También podés mandarle un aviso suelto al otro.
      </PageHeader>
      <NoticesView
        configured={notificationsConfigured()}
        topic={notificationTopic()}
        server={notificationServer()}
        cronReady={Boolean(process.env.CRON_SECRET?.trim())}
        partner={{ name: PEOPLE[partnerId].name, personal: hasPersonalTopic(partnerId) }}
        suggestion={{
          topic: `se7en-panel-${randomBytes(10).toString("hex")}`,
          secret: randomBytes(24).toString("hex"),
        }}
      />
    </div>
  );
}
