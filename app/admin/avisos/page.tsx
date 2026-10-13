import { randomBytes } from "node:crypto";
import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import {
  notificationServer,
  notificationTopic,
  notificationsConfigured,
} from "@/lib/admin/notify";
import { AdminGate, PageHeader } from "../ui";
import { NoticesView } from "./view";

export const metadata: Metadata = { title: "Avisos" };

export default async function AvisosPage() {
  if (!(await panelSession())) return <AdminGate />;

  return (
    <div className="space-y-6">
      <PageHeader title="Avisos">
        Notificaciones en el celular cuando entra un pedido, un resumen a la
        mañana y un recordatorio si falta publicar el post de las 19 h.
      </PageHeader>
      <NoticesView
        configured={notificationsConfigured()}
        topic={notificationTopic()}
        server={notificationServer()}
        cronReady={Boolean(process.env.CRON_SECRET?.trim())}
        suggestion={{
          topic: `se7en-panel-${randomBytes(10).toString("hex")}`,
          secret: randomBytes(24).toString("hex"),
        }}
      />
    </div>
  );
}
