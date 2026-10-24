// La cabecera de Inicio, como un tablero: el saludo en un banner con el anillo
// del logo (el mismo de la landing, que gira y sigue al puntero) y, al lado, la
// semana con las reuniones. Sin "use client": el anillo es el único pedazo que
// corre en el navegador.
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { RdHeroRing } from "@/components/rd/hero-ring";
import type { Meeting } from "@/lib/admin/sales-shared";
import { TZ, dayIn } from "@/lib/admin/tz";
import { CardLink, cn } from "./kit";

export function HomeHero({
  eyebrow,
  hello,
  name,
  summary,
  actions,
}: {
  eyebrow: string;
  hello: string;
  name: string;
  summary: string;
  actions: React.ReactNode;
}) {
  return (
    <section className="adm-in relative isolate flex min-h-[220px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-7">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(55%_90%_at_92%_50%,var(--accent-soft),transparent_70%)]"
      />
      <RdHeroRing
        className="pointer-events-none absolute top-1/2 -right-[30%] -z-10 h-[130%] w-auto -translate-y-1/2 opacity-15 md:-right-[16%] md:h-[115%] md:opacity-100"
        hole="var(--panel)"
        ring="var(--accent)"
        follow={0.6}
      />
      <div className="flex min-w-0 flex-col justify-between gap-5 md:max-w-[56%]">
        <div>
          <p className="adm-label">{eyebrow}</p>
          <h1 className="adm-display mt-3 text-[clamp(30px,3.6vw,48px)] text-balance text-foreground">
            {hello}, <span className="adm-serif">{name}.</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted">{summary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </section>
  );
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const time = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });

/**
 * La semana de hoy (lunes a domingo), con un punto en los días que tienen reunión (de acá en
 * adelante) y las de hoy abajo. Desde tablet: en el celular Inicio va directo a lo que hay que
 * hacer, y las reuniones de hoy ya están en «Para atender».
 */
export function WeekCard({ today, meetings }: { today: string; meetings: Meeting[] }) {
  const noon = Date.parse(`${today}T12:00:00Z`);
  const monday = noon - ((new Date(noon).getUTCDay() + 6) % 7) * 86_400_000;
  const days = WEEKDAYS.map((label, i) => {
    const key = new Date(monday + i * 86_400_000).toISOString().slice(0, 10);
    return { label, key, n: meetings.filter((m) => dayIn(m.at) === key).length };
  });
  const month = new Date(noon).toLocaleDateString("es-AR", { timeZone: "UTC", month: "long", year: "numeric" });
  const todays = meetings.filter((m) => dayIn(m.at) === today);
  const next = meetings.find((m) => dayIn(m.at) > today);

  return (
    <section className="adm-in hidden flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:flex">
      <header className="flex items-center justify-between gap-3">
        <h2 className="adm-title flex items-center gap-2 text-[13px] text-foreground first-letter:uppercase">
          <CalendarRange size={14} className="text-muted" />
          {month}
        </h2>
        <CardLink href="/admin/calendario">Calendario →</CardLink>
      </header>
      <ol className="mt-4 grid grid-cols-7 gap-1 text-center">
        {days.map((d) => {
          const on = d.key === today;
          return (
            <li key={d.key} className="flex flex-col items-center gap-1.5">
              <span className="adm-label text-[9.5px]">{d.label}</span>
              <span
                className={cn(
                  "adm-num flex h-9 w-9 items-center justify-center rounded-full text-[18px] tabular-nums",
                  on ? "bg-foreground text-background" : d.key < today ? "text-muted/60" : "text-foreground",
                )}
              >
                {Number(d.key.slice(8))}
              </span>
              <span className={cn("h-1 w-1 rounded-full", d.n ? "bg-accent" : "bg-transparent")} aria-label={d.n ? `${d.n} reuniones` : undefined} />
            </li>
          );
        })}
      </ol>
      <div className="mt-4 border-t border-[var(--line)] pt-3 text-[13px]">
        {todays.length ? (
          <ul className="space-y-1.5">
            {todays.map((m) => (
              <li key={m.lead_id + m.at}>
                <Link href={`/admin/pedidos?pedido=${m.lead_id}`} className="focus-ring flex items-baseline gap-2 rounded-md hover:text-foreground">
                  <span className="font-mono text-[12px] text-accent tabular-nums">{time(m.at)}</span>
                  <span className="truncate">{m.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">
            Sin reuniones hoy
            {next && (
              <>
                {" · "}la próxima,{" "}
                <Link href={`/admin/pedidos?pedido=${next.lead_id}`} className="text-foreground underline-offset-2 hover:underline">
                  {next.name}
                </Link>{" "}
                el {new Date(next.at).toLocaleDateString("es-AR", { timeZone: TZ, weekday: "long", day: "numeric" })}
              </>
            )}
            .
          </p>
        )}
      </div>
    </section>
  );
}
