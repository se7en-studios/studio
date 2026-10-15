// «Para atender» en Inicio: la agenda única de «Hoy» (today-shared.ts), de lo
// más urgente a lo menos. Componente de servidor; cada fila lleva directo a la
// ficha o al filtro. Si alguna lectura falló, lo dice: no muestra «todo al día».
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  BellRing,
  CalendarClock,
  CalendarDays,
  Clock,
  Globe,
  Inbox,
  Snowflake,
  Video,
  Wallet,
  Wrench,
} from "lucide-react";
import { Card, CardLink, usd } from "./kit";
import { ago } from "@/lib/admin/brief";
import type { DuePost } from "@/lib/admin/content";
import { KIND_LABEL } from "@/lib/admin/content-shared";
import type { Lead } from "@/lib/admin/db";
import type { Meeting } from "@/lib/admin/sales-shared";
import {
  ALERT_LABEL,
  type SiteAlertKind,
} from "@/lib/admin/site-health-shared";
import { dayKey, dueLabel } from "@/lib/admin/task-shared";
import {
  sortToday,
  type TodayItem,
  type TodayKind,
} from "@/lib/admin/today-shared";
import { timeLabel } from "@/lib/admin/tz";
import {
  coldDays,
  lastContacts,
  type Activity,
} from "@/lib/admin/activity-shared";

/** Filas a la vista; el resto queda a un clic, en la misma tarjeta. */
const SHOW = 6;

const ICON: Record<TodayKind, React.ReactNode> = {
  pedido: <Inbox size={14} />,
  sitio: <Globe size={14} />,
  cobro: <Wallet size={14} />,
  urgente: <Wrench size={14} />,
  reunion: <Video size={14} />,
  entrega: <Clock size={14} />,
  frio: <Snowflake size={14} />,
  renovacion: <CalendarClock size={14} />,
  post: <CalendarDays size={14} />,
};
const TONE = {
  red: "text-red-400",
  amber: "text-amber-300",
  accent: "text-accent",
} as const;

export type AttentionProps = {
  leads: Lead[];
  activities: Activity[] | null;
  overdueTasks: number;
  now: number;
  /** Proyectos con una cuota vencida, o entregados (o en mantenimiento) con saldo sin cobrar. */
  unpaid?: { slug: string; name: string; left: number; late: boolean }[];
  /** Herramientas que renuevan en los próximos 7 días. */
  renewals?: { id: string; name: string; days: number; price: string }[];
  /** Posts de Instagram de hoy o atrasados, sin publicar. */
  content?: DuePost[];
  /** Alertas de los sitios (caído, lento, SSL, dominio), con el nombre del proyecto. */
  sites?: { slug: string; name: string; kind: SiteAlertKind; days?: number }[];
  /** Pedidos de mantenimiento abiertos con prioridad urgente o alta. */
  requests?: {
    id: string;
    title: string;
    project: string;
    urgent: boolean;
    created_at: string;
  }[];
  /** Reuniones con pedidos agendadas para hoy. */
  meetings?: Meeting[];
  /** Proyectos en curso con la entrega vencida. */
  lateDeliveries?: { slug: string; name: string; due: string }[];
  /** Lecturas que fallaron: lo que no se pudo revisar. */
  failed?: string[];
};

function buildItems(p: AttentionProps): TodayItem[] {
  const today = dayKey(0, p.now);
  const last = lastContacts(p.activities ?? []);
  const lead = (l: Lead) => (l.company ? `${l.name} · ${l.company}` : l.name);
  // Los fríos ya van del más frío al menos: sortToday es estable y no los reordena.
  const cold = p.leads
    .map((l) => ({ l, days: coldDays(l, last.get(l.id), p.now) }))
    .filter((x): x is { l: Lead; days: number } => x.days !== null)
    .sort((a, b) => b.days - a.days);
  return sortToday([
    ...p.leads
      .filter((l) => l.status === "nuevo")
      .map<TodayItem>((l) => ({
        id: `n-${l.id}`,
        kind: "pedido",
        href: `/admin/pedidos?pedido=${l.id}`,
        title: lead(l),
        detail: `Sin responder · llegó ${ago(l.created_at)}`,
        tone: "accent",
        at: l.created_at,
      })),
    ...(p.sites ?? []).map<TodayItem>((s) => ({
      id: `s-${s.slug}-${s.kind}`,
      kind: "sitio",
      href: "/admin/mantenimiento",
      title: s.name,
      detail:
        s.days === undefined
          ? ALERT_LABEL[s.kind]
          : `${ALERT_LABEL[s.kind]} · ${s.days < 0 ? `vencido hace ${-s.days} días` : `en ${s.days} días`}`,
      tone:
        s.kind === "caido" || (s.days !== undefined && s.days < 7)
          ? "red"
          : "amber",
    })),
    ...(p.unpaid ?? []).map<TodayItem>((x) => ({
      id: `u-${x.slug}`,
      kind: "cobro",
      href: `/admin/proyectos/${x.slug}`,
      title: x.name,
      detail: `${x.late ? "Cobro vencido" : "Entregado"} · falta cobrar ${usd(x.left)}`,
      tone: x.late ? "red" : "amber",
    })),
    ...(p.requests ?? []).map<TodayItem>((r) => ({
      id: `m-${r.id}`,
      kind: "urgente",
      href: "/admin/mantenimiento",
      title: r.title,
      detail: `${r.urgent ? "Urgente" : "Prioridad alta"} · ${r.project}`,
      tone: r.urgent ? "red" : "amber",
      at: r.created_at,
    })),
    ...(p.meetings ?? []).map<TodayItem>((m) => ({
      id: `r-${m.lead_id}`,
      kind: "reunion",
      href: `/admin/pedidos?pedido=${m.lead_id}`,
      title: m.name,
      detail: `Reunión hoy · ${timeLabel(m.at)}`,
      tone: "accent",
      at: m.at,
    })),
    ...(p.lateDeliveries ?? []).map<TodayItem>((d) => ({
      id: `e-${d.slug}`,
      kind: "entrega",
      href: `/admin/proyectos/${d.slug}`,
      title: d.name,
      detail: `Entrega vencida · era para ${dueLabel(d.due, today)}`,
      tone: "red",
      at: d.due,
    })),
    ...cold.map<TodayItem>(({ l, days }) => ({
      id: `c-${l.id}`,
      kind: "frio",
      href: `/admin/pedidos?pedido=${l.id}`,
      title: lead(l),
      detail: `Frío · ${days} días sin contacto`,
      tone: "amber",
    })),
    ...(p.renewals ?? []).map<TodayItem>((r) => ({
      id: `w-${r.id}`,
      kind: "renovacion",
      href: "/admin/finanzas?tab=herramientas",
      title: r.name,
      detail: `Renueva ${r.days === 0 ? "hoy" : r.days === 1 ? "mañana" : `en ${r.days} días`} · ${r.price}`,
      tone: r.days <= 3 ? "red" : "amber",
    })),
    ...(p.content ?? []).map<TodayItem>((c) => ({
      id: `p-${c.id}`,
      kind: "post",
      href: "/admin/contenido",
      title: c.title,
      detail:
        c.post_date === today
          ? `Para publicar hoy · ${KIND_LABEL[c.kind]}, 19 h`
          : `Sin publicar · era para ${dueLabel(c.post_date, today)}`,
      tone: c.post_date === today ? "accent" : "red",
      at: c.post_date,
    })),
  ]);
}

function Row({ r }: { r: TodayItem }) {
  return (
    <li>
      <Link
        href={r.href}
        className="focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
      >
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ${TONE[r.tone]}`}
        >
          {ICON[r.kind]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium">
            {r.title}
          </span>
          <span className="block text-[12px] text-muted">{r.detail}</span>
        </span>
      </Link>
    </li>
  );
}

export function Attention(props: AttentionProps) {
  const rows = buildItems(props);
  const { overdueTasks, failed = [] } = props;
  const total = rows.length + (overdueTasks > 0 ? 1 : 0);
  const cold = rows.some((r) => r.kind === "frio");

  return (
    <Card
      title="Para atender"
      icon={<BellRing size={14} />}
      count={total || undefined}
      action={
        cold && <CardLink href="/admin/pedidos?frios=1">Ver fríos →</CardLink>
      }
    >
      {failed.length > 0 && (
        <p className="flex items-center gap-2 border-b border-[var(--line)] bg-amber-500/[0.06] px-4 py-2.5 text-[12px] text-amber-200">
          <AlertTriangle size={13} className="shrink-0" />
          No se pudo revisar: {failed.join(", ")}. Puede faltar algo en esta
          lista.
        </p>
      )}
      {total === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">
          {failed.length
            ? "Nada para atender en lo que se pudo revisar."
            : "Todo al día: nada sin responder, caído, sin cobrar, enfriándose ni por renovar."}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {overdueTasks > 0 && (
            <li>
              <Link
                href="/admin/tareas"
                className="focus-ring flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
                  <AlertCircle size={14} />
                </span>
                <span className="text-[13px]">
                  {overdueTasks}{" "}
                  {overdueTasks === 1
                    ? "tarea tuya vencida"
                    : "tareas tuyas vencidas"}
                </span>
              </Link>
            </li>
          )}
          {rows.slice(0, SHOW).map((r) => (
            <Row key={r.id} r={r} />
          ))}
          {rows.length > SHOW && (
            <li>
              <details className="group">
                <summary className="focus-ring cursor-pointer list-none px-4 py-2.5 text-[12px] text-muted hover:text-foreground [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">
                    Ver {rows.length - SHOW} más…
                  </span>
                  <span className="hidden group-open:inline">Ver menos</span>
                </summary>
                <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
                  {rows.slice(SHOW).map((r) => (
                    <Row key={r.id} r={r} />
                  ))}
                </ul>
              </details>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}
