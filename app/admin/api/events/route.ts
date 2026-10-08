// Registro de cambios de un pedido o un proyecto, para las fichas.
import type { NextRequest } from "next/server";
import { listEvents, type PanelEvent } from "@/lib/admin/panel";
import { withSession } from "../guard";

export function GET(req: NextRequest) {
  return withSession<{ events: PanelEvent[] }>(async () => {
    const p = req.nextUrl.searchParams;
    const lead = p.get("lead");
    const project = p.get("project");
    if (lead && !/^[0-9a-f-]{36}$/i.test(lead)) throw new Error("Pedido inválido.");
    if (project && !/^[a-z0-9-]{1,64}$/.test(project)) throw new Error("Proyecto inválido.");
    if (!lead && !project) throw new Error("Falta el pedido o el proyecto.");
    const events = await listEvents({
      limit: 60,
      leadId: lead ?? undefined,
      projectSlug: project ?? undefined,
    });
    return { events };
  });
}
