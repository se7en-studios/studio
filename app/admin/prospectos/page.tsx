import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { AdminGate } from "../ui";
import { ProspectosClient } from "./prospectos-client";

export const metadata: Metadata = {
  title: "Radar de Prospectos & Leads | Se7en Studio Admin",
};

export default async function ProspectosPage() {
  const me = await panelSession();
  if (!me) return <AdminGate />;

  return <ProspectosClient />;
}

