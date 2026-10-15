// Lo que necesitan la lista de clientes y la ficha: clientes, proyectos con su
// estado y cliente, planes de mantenimiento, ingresos y salud de los sitios.
// Sólo servidor.
import { projectClients } from "@/lib/admin/clients";
import { listCobros, listEntries } from "@/lib/admin/finance";
import type { Entry } from "@/lib/admin/finance-shared";
import { fetchRates, referenceRate } from "@/lib/admin/fx";
import { listPlans } from "@/lib/admin/maintenance";
import type { Plan } from "@/lib/admin/maintenance-shared";
import {
  PanelNotReady,
  caseProjects,
  listProjects,
  type PanelProject,
} from "@/lib/admin/panel";
import {
  receivables,
  withLegacy,
  type Receivable,
} from "@/lib/admin/payment-shared";
import { defaultState, type ProjectState } from "@/lib/admin/project-shared";
import { listStates } from "@/lib/admin/projects";
import { latestChecks } from "@/lib/admin/site-health";
import type { SiteCheck } from "@/lib/admin/site-health-shared";

export type BookProject = PanelProject & {
  state: ProjectState;
  clientId: string | null;
};

/** Lo opcional (tablas que faltan) no rompe la página: se sigue sin eso y se avisa qué correr. */
export async function optional<T>(
  p: Promise<T>,
  fallback: T,
  missing: string[],
): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof PanelNotReady) missing.push(e.message);
    else console.error("[clientes]", e instanceof Error ? e.message : e);
    return fallback;
  }
}

export async function loadBook(missing: string[]) {
  const [projects, states, links, plans, entries, rates, checks] =
    await Promise.all([
      optional(listProjects(), caseProjects(), missing),
      optional(listStates(), new Map<string, ProjectState>(), missing),
      optional(projectClients(), new Map<string, string>(), missing),
      optional(listPlans(), [] as Plan[], missing),
      optional(
        Promise.all([listEntries(), listCobros(0)]).then(([a, b]) =>
          withLegacy(a, b),
        ),
        [] as Entry[],
        missing,
      ),
      fetchRates(),
      latestChecks(),
    ]);
  const book: BookProject[] = projects.map((p) => ({
    ...p,
    state: states.get(p.slug) ?? defaultState(p.slug, p.isCase),
    clientId: links.get(p.slug) ?? null,
  }));
  return {
    projects: book,
    plans: new Map(plans.map((p) => [p.project_slug, p])),
    entries,
    // Sin cotización del día, la del último movimiento en pesos.
    fx:
      referenceRate(rates) ||
      (entries.find((e) => e.currency === "ARS")?.fx ?? 0),
    checks: checks as Map<string, SiteCheck>,
  };
}

/** El «por cobrar» de un grupo de proyectos, igual que Inicio y Finanzas (receivables de #70), sin los sueltos. */
export function owedOf(
  projects: BookProject[],
  entries: Entry[],
  today: string,
): Receivable {
  const slugs = new Set(projects.map((p) => p.slug));
  return receivables(
    projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      budget: p.state.budget,
      status: p.state.status,
    })),
    entries.filter((e) => e.project_slug && slugs.has(e.project_slug)),
    today,
  );
}
