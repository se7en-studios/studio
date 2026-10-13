import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { listCobros, listEntries } from "@/lib/admin/finance";
import type { Entry } from "@/lib/admin/finance-shared";
import { fetchRates, type Rates } from "@/lib/admin/fx";
import {
  PanelNotReady,
  caseProjects,
  listProjects,
  type PanelProject,
} from "@/lib/admin/panel";
import { paidBySlug } from "@/lib/admin/payments";
import { balance } from "@/lib/admin/payment-shared";
import { listStates } from "@/lib/admin/projects";
import { listTools } from "@/lib/admin/tools";
import { dayKey } from "@/lib/admin/task-shared";
import { AdminGate, PageHeader } from "../ui";
import { FinanceSetup } from "./setup";
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

/** Cotización de referencia: MEP, después oficial, después blue; 0 si no hay ninguna. */
const referenceRate = (r: Rates) => r.mep ?? r.oficial ?? r.blue ?? 0;

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ nuevo?: string }>;
}) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const { nuevo } = await searchParams;

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
  const [cobros, projects, states, paid, tools] = await Promise.all([
    optional(listCobros(fx), [] as Entry[]),
    optional(listProjects(), caseProjects() as PanelProject[]),
    optional(listStates(), null),
    optional(paidBySlug(), null),
    optional(listTools(), null),
  ]);

  // Proyectos con monto acordado y saldo por cobrar (en USD), igual que en Inicio.
  const owed =
    states && paid
      ? projects.flatMap((p) => {
          const s = states.get(p.slug);
          const left =
            s && s.status !== "pausado"
              ? balance(s.budget, paid.get(p.slug) ?? 0)
              : null;
          return left ? [{ slug: p.slug, name: p.name, balance: left }] : [];
        })
      : null;

  return (
    <div className="space-y-6">
      <PageHeader title="Finanzas">
        Ingresos y costos del estudio repartidos entre Franco y Federico, en
        pesos o en dólares y siempre con el equivalente en la otra moneda. Los
        cobros que cargás en cada proyecto entran solos.
      </PageHeader>
      {setup ? (
        <FinanceSetup />
      ) : (
        <FinanceView
          entries={[...manual, ...cobros]}
          rates={rates}
          fx={fx}
          projects={projects.map((p) => ({ slug: p.slug, name: p.name }))}
          owed={owed}
          tools={tools}
          today={dayKey()}
          initialAdd={nuevo === "1"}
        />
      )}
    </div>
  );
}
