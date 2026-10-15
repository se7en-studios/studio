import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { listCobros, listEntries, listTaxCategories } from "@/lib/admin/finance";
import type { Entry } from "@/lib/admin/finance-shared";
import { fetchRates, referenceRate } from "@/lib/admin/fx";
import {
  PanelNotReady,
  caseProjects,
  listProjects,
  type PanelProject,
} from "@/lib/admin/panel";
import { withLegacy } from "@/lib/admin/payment-shared";
import { defaultState } from "@/lib/admin/project-shared";
import { listStates } from "@/lib/admin/projects";
import { listTools } from "@/lib/admin/tools";
import { dayKey } from "@/lib/admin/task-shared";
import { AdminGate, PageHeader, SetupNotice } from "../ui";
import { FinanceSetup } from "./setup";
import { TABS } from "./tabs";
import { FinanceView } from "./view";

export const metadata: Metadata = { title: "Finanzas" };

/** Lo opcional (cobros, proyectos) no tira abajo la página: si falta, se sigue sin eso. */
async function optional<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (!(e instanceof PanelNotReady))
      console.error("[panel] Finanzas:", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string; tab?: string }>;
}) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const { nuevo, tab } = await searchParams;

  const rates = await fetchRates();
  let manual: Entry[] = [];
  let setup = false;
  try {
    manual = await listEntries();
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = true;
  }

  // Sin cotización del día, los cobros se convierten con la del último movimiento cargado a mano.
  const fx =
    referenceRate(rates) || (manual.find((m) => m.currency === "ARS")?.fx ?? 0);
  const [cobros, projects, states, tools, taxCategories] = await Promise.all([
    optional(listCobros(fx), [] as Entry[]),
    optional(listProjects(), caseProjects() as PanelProject[]),
    optional(listStates(), null),
    optional(listTools(), null),
    optional(listTaxCategories(), null),
  ]);

  // Monto acordado y etapa de cada proyecto: con eso y los ingresos, la vista
  // calcula lo que falta cobrar igual que Inicio y la ficha.
  const billable = projects.map((p) => {
    const s = states?.get(p.slug) ?? defaultState(p.slug, p.isCase);
    return { slug: p.slug, name: p.name, budget: s.budget, status: s.status };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Finanzas">
        Ingresos y costos del estudio repartidos entre Franco y Federico, en
        pesos o en dólares y siempre con el equivalente en la otra moneda. Los
        cobros que cargás en cada proyecto entran solos.
      </PageHeader>
      {!setup && cobros.length > 0 && (
        <SetupNotice
          reason={`Falta correr supabase/finance-v4.sql en Supabase: hay ${cobros.length === 1 ? "un cobro de proyecto" : `${cobros.length} cobros de proyectos`} en la tabla vieja.`}
        />
      )}
      {setup ? (
        <FinanceSetup />
      ) : (
        <FinanceView
          entries={withLegacy(manual, cobros)}
          rates={rates}
          fx={fx}
          projects={projects.map((p) => ({ slug: p.slug, name: p.name }))}
          billable={billable}
          tools={tools}
          today={dayKey()}
          me={me.who}
          initialAdd={nuevo === "1"}
          initialTab={TABS.find((t) => t === tab) ?? "resumen"}
          taxCategories={taxCategories}
        />
      )}
    </div>
  );
}
