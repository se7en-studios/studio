// Sección «Portal» de la ficha del cliente: estado del link y último acceso.
// Componente de servidor: carga lo suyo, así la ficha sólo lo monta.
import { ago } from "@/lib/admin/brief";
import { PanelNotReady } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { getLink, portalSecret, type PortalLink } from "@/lib/admin/portal";
import { Card } from "../../kit";
import { PortalLinkControls } from "./portal-link";

export async function PortalCard({
  clientId,
  whatsapp,
  name,
}: {
  clientId: string;
  whatsapp: string;
  name: string;
}) {
  let link: PortalLink | null = null;
  let setup: string | null = null;
  try {
    link = await getLink(clientId);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }
  const off = !portalSecret();
  return (
    <Card title="Portal del cliente">
      <div className="space-y-3 px-4 py-3 text-[13px]">
        {setup ? (
          <p className="text-amber-300">{setup}</p>
        ) : off ? (
          <p className="text-amber-300">
            Falta cargar PORTAL_SESSION_SECRET (32+ caracteres) en Vercel para
            activar el portal.
          </p>
        ) : (
          <>
            <p className="text-muted">
              {link
                ? `Link activo, generado ${ago(link.created_at)}${link.created_by ? ` (lo generó ${PEOPLE[link.created_by].name})` : ""} · ${link.last_used_at ? `último acceso ${ago(link.last_used_at)}` : "todavía no entró"}.`
                : "Sin link. El cliente ve sólo lo marcado «lo ve el cliente»: estado, aprobaciones, pedidos, archivos y cobros de sus proyectos."}
            </p>
            <PortalLinkControls
              clientId={clientId}
              active={Boolean(link)}
              whatsapp={whatsapp}
              name={name}
            />
          </>
        )}
      </div>
    </Card>
  );
}
