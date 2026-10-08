// «Para atender» en Inicio: lo que se está enfriando, en un solo lugar.
// Componente de servidor; cada fila lleva directo a la ficha o al filtro.
import Link from "next/link";
import { AlertCircle, BellRing, Inbox, Snowflake } from "lucide-react";
import { Card, CardLink } from "./kit";
import { ago } from "@/lib/admin/brief";
import type { Lead } from "@/lib/admin/db";
import {
  coldDays,
  lastContacts,
  type Activity,
} from "@/lib/admin/activity-shared";

const SHOW = 4;

type Row = {
  id: string;
  href: string;
  icon: React.ReactNode;
  title: string;
  detail: string;
  tone: string;
};

export function Attention({
  leads,
  activities,
  overdueTasks,
  now,
}: {
  leads: Lead[];
  activities: Activity[] | null;
  overdueTasks: number;
  now: number;
}) {
  const fresh = leads
    .filter((l) => l.status === "nuevo")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const last = lastContacts(activities ?? []);
  const cold = leads
    .map((l) => ({ l, days: coldDays(l, last.get(l.id), now) }))
    .filter((x): x is { l: Lead; days: number } => x.days !== null)
    .sort((a, b) => b.days - a.days);

  const rows: Row[] = [
    ...fresh.map((l) => ({
      id: `n-${l.id}`,
      href: `/admin/pedidos?pedido=${l.id}`,
      icon: <Inbox size={14} />,
      title: l.company ? `${l.name} · ${l.company}` : l.name,
      detail: `Sin responder · llegó ${ago(l.created_at)}`,
      tone: "text-accent",
    })),
    ...cold.map(({ l, days }) => ({
      id: `c-${l.id}`,
      href: `/admin/pedidos?pedido=${l.id}`,
      icon: <Snowflake size={14} />,
      title: l.company ? `${l.name} · ${l.company}` : l.name,
      detail: `Frío · ${days} días sin contacto`,
      tone: "text-amber-300",
    })),
  ];

  const total = rows.length + overdueTasks;
  return (
    <Card
      title="Para atender"
      icon={<BellRing size={14} />}
      count={total || undefined}
      action={cold.length > 0 && <CardLink href="/admin/pedidos?frios=1">Ver fríos →</CardLink>}
    >
      {total === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">Todo al día: nada sin responder ni enfriándose.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {overdueTasks > 0 && (
            <li>
              <Link href="/admin/tareas" className="focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <AlertCircle size={14} />
                </span>
                <span className="text-[13px]">
                  {overdueTasks} {overdueTasks === 1 ? "tarea vencida" : "tareas vencidas"}
                </span>
              </Link>
            </li>
          )}
          {rows.slice(0, SHOW).map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ${r.tone}`}>{r.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{r.title}</span>
                  <span className="block text-[12px] text-muted">{r.detail}</span>
                </span>
              </Link>
            </li>
          ))}
          {rows.length > SHOW && (
            <li>
              <Link href="/admin/pedidos" className="focus-ring block px-4 py-2.5 text-[12px] text-muted hover:text-foreground">
                y {rows.length - SHOW} más en Pedidos…
              </Link>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
