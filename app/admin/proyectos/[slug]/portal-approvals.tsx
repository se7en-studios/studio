// Aprobaciones del cliente en la ficha del proyecto. Componente de servidor:
// carga lo suyo, así la ficha sólo lo monta.
import { PanelNotReady } from "@/lib/admin/panel";
import { fileOptions, listApprovals } from "@/lib/admin/portal";
import { Card } from "../../kit";
import { ApprovalsBoard } from "./approvals-board";

export async function PortalApprovals({ slug }: { slug: string }) {
  const data = await Promise.all([
    listApprovals(slug),
    fileOptions(slug),
  ]).catch((e: unknown) => {
    if (e instanceof PanelNotReady) return e.message;
    throw e;
  });
  if (typeof data === "string")
    return (
      <Card title="Aprobaciones del cliente">
        <p className="px-4 py-3 text-[13px] text-amber-300">{data}</p>
      </Card>
    );
  const [{ approvals, decisions }, files] = data;
  return (
    <ApprovalsBoard
      slug={slug}
      initial={approvals}
      decisions={decisions}
      files={files}
    />
  );
}
