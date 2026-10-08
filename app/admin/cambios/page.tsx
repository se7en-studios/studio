import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { OWNERS, type LeadOwner } from "@/lib/admin/db";
import { PanelNotReady, listEvents, projectNames, type EventKind, type PanelEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { EventList, KIND_LABEL } from "../feed";
import { Face, PageHeader, btnSecondary, cn } from "../kit";
import { AdminGate, SetupNotice } from "../ui";

export const metadata: Metadata = { title: "Registro de cambios" };

const KINDS = Object.keys(KIND_LABEL) as EventKind[];
const PAGE = 100;

type Params = { tipo?: string; quien?: string; q?: string; antes?: string };

// Todo lo que pasa en el panel, con quién lo hizo y, en las ediciones, el
// antes y el después de cada campo. Se filtra por tipo, por persona y por texto.
export default async function CambiosPage({ searchParams }: { searchParams: Promise<Params> }) {
  if (!(await panelSession())) return <AdminGate />;
  const sp = await searchParams;
  const kind = KINDS.find((k) => k === sp.tipo);
  const actor = (OWNERS as readonly string[]).includes(sp.quien ?? "") ? (sp.quien as LeadOwner) : undefined;
  const q = (sp.q ?? "").trim().slice(0, 80) || undefined;
  const before = sp.antes && !Number.isNaN(Date.parse(sp.antes)) ? sp.antes : undefined;

  const [result, names] = await Promise.all([
    listEvents({ limit: PAGE, kind, actor, q, before }).then(
      (events) => ({ events, setup: null as string | null }),
      (e) => {
        if (!(e instanceof PanelNotReady)) throw e;
        return { events: [] as PanelEvent[], setup: e.message as string | null };
      },
    ),
    projectNames(),
  ]);
  const { events, setup } = result;

  const href = (p: Params) => {
    const merged = { tipo: kind, quien: actor, q, ...p };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v as string)}`)
      .join("&");
    return qs ? `/admin/cambios?${qs}` : "/admin/cambios";
  };
  const chip = (on: boolean) =>
    cn(
      "focus-ring inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] whitespace-nowrap transition-colors",
      on ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground",
    );
  const last = events[events.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader title="Registro de cambios">
        Todo lo que pasa en el panel queda anotado: quién lo hizo, cuándo y, si se editó algo, cómo estaba antes y cómo
        quedó.
      </PageHeader>

      {setup ? (
        <SetupNotice reason={setup} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0 space-y-4 lg:order-1">
            {before && (
              <p className="text-[12.5px] text-muted">
                Mostrando lo anterior al {new Date(before).toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })}.{" "}
                <Link href={href({ antes: undefined })} className="text-foreground underline underline-offset-4">
                  Volver a lo último
                </Link>
              </p>
            )}
            <EventList events={events} names={names} grouped />
            {events.length === PAGE && last && (
              <div className="flex justify-center pt-2">
                <Link href={href({ antes: last.created_at })} className={btnSecondary}>
                  Cargar más viejos
                </Link>
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-6 lg:order-2">
            <form action="/admin/cambios" className="relative">
              {kind && <input type="hidden" name="tipo" value={kind} />}
              {actor && <input type="hidden" name="quien" value={actor} />}
              <Search size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Buscar en el registro…"
                className="focus-ring w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] py-2 pr-3 pl-9 text-[13px] placeholder:text-muted/70 focus:border-accent/60"
              />
            </form>
            <div>
              <p className="mb-1.5 px-1 text-[11px] font-medium text-muted/70">Tipo</p>
              <div className="flex flex-wrap gap-0.5 lg:flex-col">
                <Link href={href({ tipo: undefined })} className={chip(!kind)}>
                  Todo
                </Link>
                {KINDS.map((k) => (
                  <Link key={k} href={href({ tipo: k })} className={chip(kind === k)}>
                    {KIND_LABEL[k]}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 px-1 text-[11px] font-medium text-muted/70">Quién</p>
              <div className="flex flex-wrap gap-0.5 lg:flex-col">
                <Link href={href({ quien: undefined })} className={chip(!actor)}>
                  Los dos
                </Link>
                {OWNERS.map((o) => (
                  <Link key={o} href={href({ quien: o })} className={chip(actor === o)}>
                    <Face who={o} size={18} /> {PEOPLE[o].name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
