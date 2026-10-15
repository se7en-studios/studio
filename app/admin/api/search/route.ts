// Lo que busca la paleta de comandos (⌘K): pedidos, clientes, proyectos, tareas,
// mensajes y movimientos de Finanzas, sólo lo necesario para mostrarlos y saltar a cada uno.
// Cada lista es lo más reciente: una tabla que falte (o falle) queda vacía y el
// resto se busca igual.
import { db } from "@/lib/admin/db";
import { categoryLabel, fmt, type Currency, type FinanceKind } from "@/lib/admin/finance-shared";
import { parseChannel } from "@/lib/admin/message-shared";
import { caseProjects, projectNames } from "@/lib/admin/panel";
import { withSession } from "../guard";

export type SearchIndex = {
  leads: { id: string; name: string; company: string; status: string }[];
  clients: { id: string; name: string }[];
  projects: { slug: string; name: string }[];
  tasks: { id: string; title: string; done: boolean }[];
  messages: { id: string; channel: string; body: string; where: string }[];
  movements: { id: string; label: string; hint: string }[];
};

const RECENT = 500;
const SNIPPET = 120;

type MessageRow = { id: string; channel: string; body: string };
type MovementRow = { id: string; kind: FinanceKind; category: string; description: string; amount: number | string; currency: Currency; occurred_on: string };

export function GET() {
  return withSession<SearchIndex>(async () => {
    const c = db();
    if (!c)
      return { leads: [], clients: [], projects: caseProjects().map((p) => ({ slug: p.slug, name: p.name })), tasks: [], messages: [], movements: [] };
    const [leads, clients, names, tasks, messages, movements] = await Promise.all([
      c.from("leads").select("id, name, company, status").order("created_at", { ascending: false }).limit(RECENT),
      c.from("panel_clients").select("id, name").order("name").limit(RECENT),
      projectNames(),
      c.from("panel_tasks").select("id, title, done_at").order("created_at", { ascending: false }).limit(RECENT),
      c.from("panel_messages").select("id, channel, body").order("created_at", { ascending: false }).limit(RECENT),
      c
        .from("panel_finance")
        .select("id, kind, category, description, amount, currency, occurred_on")
        .order("occurred_on", { ascending: false })
        .limit(RECENT),
    ]);
    const leadRows = (leads.data ?? []) as SearchIndex["leads"];
    const leadName = new Map(leadRows.map((l) => [l.id, l.name]));
    const where = (channel: string) => {
      const ch = parseChannel(channel);
      if (ch.kind === "proyecto") return names[ch.slug] ?? "Proyecto";
      if (ch.kind === "pedido") return leadName.get(ch.id) ?? "Pedido";
      return "General";
    };
    return {
      leads: leadRows,
      clients: (clients.data ?? []) as SearchIndex["clients"],
      projects: Object.entries(names).map(([slug, name]) => ({ slug, name })),
      tasks: ((tasks.data ?? []) as { id: string; title: string; done_at: string | null }[]).map((t) => ({
        id: t.id,
        title: t.title,
        done: Boolean(t.done_at),
      })),
      messages: ((messages.data ?? []) as MessageRow[]).map((m) => ({
        id: m.id,
        channel: m.channel,
        body: m.body.replace(/\s+/g, " ").slice(0, SNIPPET),
        where: where(m.channel),
      })),
      movements: ((movements.data ?? []) as MovementRow[]).map((f) => ({
        id: f.id,
        label: f.description || categoryLabel(f.kind, f.category),
        hint: `${f.kind === "costo" ? "−" : "+"}${fmt(Number(f.amount), f.currency)} · ${f.occurred_on}`,
      })),
    };
  });
}
