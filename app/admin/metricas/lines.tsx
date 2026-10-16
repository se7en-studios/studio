// Las líneas de «Números»: cada una con su semáforo y la comparación con el
// período anterior. Componente de servidor: las cuentas están en
// lib/admin/numbers-shared.ts (y las que ya existían, en plata-shared,
// maintenance-shared y metrics).
import { Timer } from "lucide-react";
import type { Lead } from "@/lib/admin/db";
import type { Entry } from "@/lib/admin/finance-shared";
import {
  mrr,
  type MaintRequest,
  type Plan,
} from "@/lib/admin/maintenance-shared";
import { CHANNEL_LABEL, weightedPipeline } from "@/lib/admin/metrics";
import {
  CONCENTRATION,
  DAYS_TO_COLLECT,
  RATE_VS_STUDIO,
  RECURRING_SHARE,
  RUNWAY_MONTHS,
  WIN_RATE,
  change,
  channelConversion,
  daysToCollectIn,
  decidedIn,
  last12,
  overdueAt,
  rateRows,
  recurringIncome,
  studioRate,
  toneDown,
  toneUp,
  windows,
  winRateIn,
  type Compare,
  type Rate,
  type RateRow,
  type Tone,
} from "@/lib/admin/numbers-shared";
import { concentration, overdue, runway } from "@/lib/admin/plata-shared";
import { periodMonths } from "@/lib/admin/finance-shared";
import type { TimeEntry } from "@/lib/admin/time-shared";
import { Card, cn, usd } from "../kit";

type Cmp = {
  now: number | null;
  prev: number | null;
  fmt: (n: number) => string;
  better: "up" | "down";
};
export type Line = {
  label: string;
  value: string;
  detail: string;
  tone: Tone | null;
  /** El umbral del semáforo, en palabras. */
  rule: string;
  cmp: Cmp | null;
};

const pct = (n: number | null) =>
  n === null ? "—" : `${Math.round(n * 100)} %`;
const money = (n: number) => `USD ${Math.round(n).toLocaleString("es-AR")}`;
const days = (n: number) => `${Math.round(n)} días`;
const RANK: Record<Tone, number> = { green: 0, amber: 1, red: 2 };
const worst = (...ts: (Tone | null)[]) =>
  ts
    .filter((t): t is Tone => t !== null)
    .sort((a, b) => RANK[b] - RANK[a])[0] ?? null;

type Data = {
  entries: Entry[];
  plans: Plan[];
  fx: number;
  leads: Lead[];
  time: TimeEntry[];
  requests: MaintRequest[];
  clientOf: (slug: string) => string;
  today: string;
};

export function buildLines(
  d: Data,
  period: Compare,
): { lines: Line[]; rates: RateRow[]; studio: Rate } {
  const { cur, prev, prevEnd } = windows(period, d.today);
  const when = period === "mes" ? "este mes" : "este trimestre";

  const rec = recurringIncome(d.entries, cur);
  const recPrev = recurringIncome(d.entries, prev);
  const fixed = mrr(d.plans, d.fx);

  const late = overdue(d.entries, d.today);
  const latePrev = overdueAt(d.entries, prevEnd);
  const dso = daysToCollectIn(d.entries, cur);
  const dsoPrev = daysToCollectIn(d.entries, prev);

  const cash = runway(d.entries, d.today, "USD");
  const cashPrev = runway(d.entries, prevEnd, "USD");

  const conc = concentration(d.entries, last12(d.today), d.clientOf);
  const concPrev = concentration(d.entries, last12(prevEnd), d.clientOf);

  const decided = decidedIn(d.leads, cur);
  const won = decided.filter((l) => l.status === "ganado").length;
  const rate = decided.length ? won / decided.length : null;
  const ratePrev = winRateIn(d.leads, prev);
  const open = d.leads.filter(
    (l) =>
      l.status === "nuevo" ||
      l.status === "contactado" ||
      l.status === "propuesta",
  );

  const channels = channelConversion(d.leads, cur);
  const channelsPrev = channelConversion(d.leads, prev);
  const top = channels[0] ?? null;
  const channelName = (k: string) => CHANNEL_LABEL[k] ?? k;

  const hourly = studioRate(d.entries, d.time, d.requests, cur, d.today);
  const hourlyPrev = studioRate(d.entries, d.time, d.requests, prev, d.today);
  const hourlyRatio =
    hourly.rate !== null && hourlyPrev.rate
      ? hourly.rate / hourlyPrev.rate
      : null;

  const lines: Line[] = [
    {
      label: "Ingreso mensual fijo",
      value: usd(fixed),
      detail:
        rec.share === null
          ? `Abonos activos, en USD · sin ingresos cobrados ${when}`
          : `Abonos activos, en USD · lo recurrente es el ${pct(rec.share)} de lo cobrado ${when}`,
      tone: toneUp(rec.share, RECURRING_SHARE),
      rule: "Sano: más de 70 % del ingreso es recurrente",
      cmp: { now: rec.share, prev: recPrev.share, fmt: pct, better: "up" },
    },
    {
      label: "Por cobrar vencido",
      value: money(late.total),
      detail: `${late.count ? `${late.count} ${late.count === 1 ? "cobro" : "cobros"}, el más viejo de hace ${late.oldestDays} días` : "Nada vencido"} · ${
        dso === null
          ? "sin cobros con fecha prevista"
          : `se cobra en ${days(dso)} en promedio${dsoPrev === null ? "" : ` (antes ${days(dsoPrev)})`}`
      }`,
      tone: worst(
        toneDown(dso, DAYS_TO_COLLECT),
        toneDown(late.count ? late.oldestDays : 0, DAYS_TO_COLLECT),
      ),
      rule: "Normal: se cobra en 30 a 45 días",
      cmp: {
        now: late.total,
        prev: latePrev.total,
        fmt: money,
        better: "down",
      },
    },
    {
      label: "Caja",
      value: money(cash.balance),
      detail:
        cash.months === null
          ? "Sin gastos en los últimos 3 meses"
          : `Alcanza para ${cash.months.toLocaleString("es-AR")} meses de gasto (${money(cash.burn)} por mes, promedio de 3 meses)`,
      tone:
        cash.balance < 0
          ? "red"
          : cash.months === null
            ? "green"
            : toneUp(cash.months, RUNWAY_MONTHS),
      rule: "Tranquilo con 6 meses o más; menos de 3, frenar gastos",
      cmp: {
        now: cash.balance,
        prev: cashPrev.balance,
        fmt: money,
        better: "up",
      },
    },
    {
      label: "Cliente más grande",
      value: conc ? `${conc.share} %` : "—",
      detail: conc
        ? `${conc.client}: ${money(conc.amount)} de lo cobrado en los últimos 12 meses`
        : "Sin ingresos con proyecto en los últimos 12 meses",
      tone: conc ? toneDown(conc.share / 100, CONCENTRATION) : null,
      rule: "Riesgo: más de 20 % de un solo cliente",
      cmp: {
        now: conc ? conc.share / 100 : null,
        prev: concPrev ? concPrev.share / 100 : null,
        fmt: pct,
        better: "down",
      },
    },
    {
      label: "Tasa de cierre",
      value: pct(rate),
      detail: `${won} de ${decided.length} ${decided.length === 1 ? "pedido decidido" : "pedidos decididos"} ${when} · pipeline ponderado ${money(weightedPipeline(open))}`,
      tone: toneUp(rate, WIN_RATE),
      rule: "Promedio ~20 %; 30 % o más es muy bueno",
      cmp: { now: rate, prev: ratePrev, fmt: pct, better: "up" },
    },
    {
      label: "Mejor canal",
      value: top ? `${channelName(top.key)} · ${pct(top.rate)}` : "—",
      detail: channels.length
        ? channels
            .map((c) => `${channelName(c.key)} ${c.won}/${c.decided}`)
            .join(" · ")
        : `Ningún pedido decidido ${when}`,
      tone: top ? toneUp(top.rate, WIN_RATE) : null,
      rule: "Ganados sobre decididos por canal; mismo umbral que la tasa de cierre",
      cmp: top
        ? {
            now: top.rate,
            prev: channelsPrev.find((c) => c.key === top.key)?.rate ?? null,
            fmt: pct,
            better: "up",
          }
        : null,
    },
    {
      label: "Tarifa efectiva por hora",
      value: hourly.rate === null ? "—" : `${money(hourly.rate)}/h`,
      detail:
        hourly.hours > 0
          ? `${money(hourly.usd)} cobrados de proyectos / ${hourly.hours.toLocaleString("es-AR")} h trabajadas ${when}`
          : `Sin horas cargadas ${when}: se toman con el cronómetro de cada proyecto`,
      tone: toneUp(hourlyRatio, RATE_VS_STUDIO),
      rule: "Contra el período anterior: igual o mejor, verde; hasta 25 % menos, ámbar",
      cmp: {
        now: hourly.rate,
        prev: hourlyPrev.rate,
        fmt: (n) => `${money(n)}/h`,
        better: "up",
      },
    },
  ];

  const all = periodMonths("todo", d.today, d.entries);
  return {
    lines,
    rates: rateRows(d.entries, d.time, d.requests, d.plans, d.today),
    studio: studioRate(d.entries, d.time, d.requests, all, d.today),
  };
}

const DOT: Record<Tone, string> = {
  green: "bg-emerald-400",
  amber: "bg-amber-400",
  red: "bg-red-400",
};
const TONE_LABEL: Record<Tone, string> = {
  green: "Bien",
  amber: "Atención",
  red: "Riesgo",
};

function Dot({ tone }: { tone: Tone | null }) {
  return (
    <span
      className={cn(
        "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full",
        tone ? DOT[tone] : "border border-[var(--line-strong)]",
      )}
      role="img"
      aria-label={tone ? TONE_LABEL[tone] : "Sin dato"}
      title={tone ? TONE_LABEL[tone] : "Sin dato"}
    />
  );
}

function Delta({ cmp, label }: { cmp: Cmp | null; label: string }) {
  if (!cmp || cmp.prev === null)
    return <span className="text-muted">{label}: —</span>;
  const c = change(cmp.now, cmp.prev);
  const same = cmp.now === cmp.prev || (c !== null && Math.abs(c) < 0.005);
  const good =
    cmp.now !== null &&
    (cmp.better === "up" ? cmp.now > cmp.prev : cmp.now < cmp.prev);
  return (
    <span className="text-muted">
      {label}: <span className="text-foreground">{cmp.fmt(cmp.prev)}</span>
      {!same && cmp.now !== null && (
        <span
          className={cn(
            "ml-1.5 font-mono",
            good ? "text-emerald-300" : "text-red-400",
          )}
        >
          {cmp.now > cmp.prev ? "▲" : "▼"}
          {c !== null && ` ${Math.abs(Math.round(c * 100))} %`}
        </span>
      )}
    </span>
  );
}

export function NumberLines({
  lines,
  period,
}: {
  lines: Line[];
  period?: Compare;
}) {
  const label = period === "trimestre" ? "Trimestre anterior" : "Mes anterior";
  return (
    <Card>
      <ul className="divide-y divide-[var(--line)]">
        {lines.map((l) => (
          <li
            key={l.label}
            className="grid gap-x-6 gap-y-1 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(0,13rem)_minmax(0,14rem)] md:items-baseline"
          >
            <div className="flex min-w-0 gap-3">
              <Dot tone={l.tone} />
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground">
                  {l.label}
                </p>
                <p className="mt-0.5 text-[12px] text-muted">{l.detail}</p>
                <p className="mt-0.5 text-[11px] text-muted">{l.rule}</p>
              </div>
            </div>
            <p className="adm-num pl-[22px] text-[26px] leading-none text-foreground tabular-nums md:pl-0 md:text-right">
              {l.value}
            </p>
            <p className="pl-[22px] text-[12px] tabular-nums md:pl-0 md:text-right">
              <Delta cmp={l.cmp} label={label} />
            </p>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Tarifa por proyecto y por abono: ¿rinde el abono? Semáforo contra la tarifa de todo el estudio. */
export function RateTable({
  rows,
  studio,
  names,
}: {
  rows: RateRow[];
  studio: Rate;
  names: (slug: string) => string;
}) {
  return (
    <Card
      title="Tarifa por hora, por proyecto y abono"
      icon={<Timer size={14} />}
      action={
        <span className="text-[11px] text-muted">
          Estudio: {studio.rate === null ? "—" : `${money(studio.rate)}/h`} ·
          todo lo cargado
        </span>
      }
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="text-left font-mono text-[10.5px] tracking-[0.13em] text-muted uppercase">
                <th className="px-4 py-2 font-normal">Proyecto</th>
                <th className="px-2 py-2 text-right font-normal">Cobrado</th>
                <th className="px-2 py-2 text-right font-normal">Horas</th>
                <th className="px-4 py-2 text-right font-normal">Por hora</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const tone =
                  r.rate !== null && studio.rate
                    ? toneUp(r.rate / studio.rate, RATE_VS_STUDIO)
                    : null;
                return (
                  <tr
                    key={`${r.slug}-${r.kind}`}
                    className="border-t border-[var(--line)]"
                  >
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Dot tone={tone} />
                        <span className="text-foreground">{names(r.slug)}</span>
                        <span className="text-[11px] text-muted">
                          {r.kind === "abono" ? "abono" : "proyecto"}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[12px] tabular-nums">
                      {money(r.usd)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-mono text-[12px] tabular-nums">
                      {r.hours.toLocaleString("es-AR")} h
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-[12px] text-foreground tabular-nums">
                      {r.rate === null ? "—" : `${money(r.rate)}/h`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-[var(--line)] px-4 py-2.5 text-[11px] text-muted">
            En un proyecto con abono, lo cobrado como mantenimiento y las horas
            desde el inicio del plan son del abono. Verde: rinde como el estudio
            o más; ámbar: hasta 25 % menos; rojo: menos que eso.
          </p>
        </div>
      ) : (
        <p className="px-4 py-6 text-center text-[13px] text-muted">
          Todavía no hay horas cargadas. El cronómetro está en la ficha de cada
          proyecto y en cada pedido de mantenimiento.
        </p>
      )}
    </Card>
  );
}
