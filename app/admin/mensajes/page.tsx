import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { db } from "@/lib/admin/db";
import { channelSummaries } from "@/lib/admin/messages";
import { GENERAL, isChannel, type ChannelSummary } from "@/lib/admin/message-shared";
import { PanelNotReady, projectNames } from "@/lib/admin/panel";
import { AdminGate, SetupNotice } from "../ui";
import { PageHeader } from "../kit";
import { Inbox } from "./inbox";

export const metadata: Metadata = { title: "Mensajes" };

// Conversaciones del equipo: la general y una por proyecto o pedido.
export default async function MensajesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const { c } = await searchParams;
  const channel = c && isChannel(c) ? c : GENERAL;

  let summaries: ChannelSummary[] = [];
  let setup: string | null = null;
  const c2 = db();
  const [names, leads] = await Promise.all([
    projectNames(),
    c2 ? c2.from("leads").select("id, name, company").order("created_at", { ascending: false }).limit(300) : null,
  ]);
  try {
    summaries = await channelSummaries(me.who);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Mensajes">Para hablar entre nosotros: un canal general y uno por cada proyecto o pedido.</PageHeader>
      {setup ? (
        <SetupNotice reason={setup} />
      ) : (
        <Inbox
          me={me.who}
          channel={channel}
          summaries={summaries}
          projects={names}
          leads={Object.fromEntries(((leads?.data ?? []) as { id: string; name: string; company: string }[]).map((l) => [l.id, l.company ? `${l.name} · ${l.company}` : l.name]))}
        />
      )}
    </div>
  );
}
