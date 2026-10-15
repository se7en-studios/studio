import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findByToken } from "@/lib/admin/proposals";
import { statusOf } from "@/lib/admin/proposal-shared";
import { dayKey } from "@/lib/admin/task-shared";
import { ProposalView, type PublicProposal } from "./view";

// La propuesta que abre el cliente con su link. Fuera de buscadores y sin
// mandar el link como referrer a los sitios que se abran desde acá.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Propuesta | Se7en Studio",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  referrer: "no-referrer",
};

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const p = await findByToken(token).catch((e) => {
    console.error("[propuesta] leer:", e instanceof Error ? e.message : e);
    return null;
  });
  if (!p) notFound();
  const today = dayKey();
  // Sólo lo que el cliente tiene que ver: nada de IDs internos, IP ni quién la armó.
  const view: PublicProposal = {
    version: p.version,
    title: p.title,
    intro: p.intro,
    items: p.items,
    optionals: p.optionals,
    base_amount: p.base_amount,
    currency: p.currency,
    days: p.days,
    valid_until: p.valid_until,
    payment: p.payment,
    state:
      p.revoked_at && (p.status === "enviada" || p.status === "vista")
        ? "anulada"
        : statusOf(p, today),
    selected: p.selected ?? [],
    accepted: p.acceptance
      ? {
          name: p.acceptance.name,
          at: p.acceptance.at,
          hash: p.acceptance.hash,
        }
      : null,
  };
  return <ProposalView token={token} p={view} today={today} />;
}
