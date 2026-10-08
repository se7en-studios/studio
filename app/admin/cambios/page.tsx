import type { Metadata } from "next";
import Link from "next/link";
import { panelSession } from "@/lib/admin/auth";
import { PanelNotReady, caseProjects, listEvents, listProjects, type EventKind, type PanelEvent } from "@/lib/admin/panel";
import { EventList, KIND_LABEL } from "../feed";
import { AdminGate, PageHeader, SetupNotice } from "../ui";

export const metadata: Metadata = { title: "Cambios · Panel" };

const KINDS = Object.keys(KIND_LABEL) as EventKind[];

export default async function CambiosPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  if (!(await panelSession())) return <AdminGate />;
  const { tipo } = await searchParams;
  const kind = KINDS.find((k) => k === tipo);

  let events: PanelEvent[] = [];
  let names = Object.fromEntries(caseProjects().map((p) => [p.slug, p.name]));
  let setup: string | null = null;
  try {
    const [list, projects] = await Promise.all([listEvents({ limit: 200, kind }), listProjects()]);
    events = list;
    names = Object.fromEntries(projects.map((p) => [p.slug, p.name]));
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  const chips: { id: EventKind | null; label: string }[] = [{ id: null, label: "Todo" }, ...KINDS.map((k) => ({ id: k, label: KIND_LABEL[k] }))];

  return (
    <div className="space-y-8">
      <PageHeader title="Cambios">Todo lo que pasa en el panel: archivos que se suben o se borran, proyectos nuevos y pedidos que cambian de etapa.</PageHeader>

      {setup ? (
        <SetupNotice reason={setup} />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => {
              const on = (c.id ?? undefined) === kind;
              return (
                <Link
                  key={c.label}
                  href={c.id ? `/admin/cambios?tipo=${c.id}` : "/admin/cambios"}
                  aria-current={on ? "page" : undefined}
                  className={`focus-ring rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {c.label}
                </Link>
              );
            })}
          </div>
          <div className="max-w-3xl">
            <EventList events={events} names={names} grouped />
          </div>
        </>
      )}
    </div>
  );
}
