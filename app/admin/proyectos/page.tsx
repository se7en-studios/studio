import type { Metadata } from "next";
import { panelSession } from "@/lib/admin/auth";
import { PanelNotReady, caseProjects, listProjects, type PanelProject } from "@/lib/admin/panel";
import type { ProjectState } from "@/lib/admin/project-shared";
import { listStates } from "@/lib/admin/projects";
import { PageHeader } from "../kit";
import { AdminGate, SetupNotice } from "../ui";
import { NewProject } from "./new-project";
import { ProjectsView } from "./view";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProyectosPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const { nuevo } = await searchParams;

  let projects: PanelProject[] = caseProjects();
  let states = new Map<string, ProjectState>();
  let setup: string | null = null;
  let stateSetup: string | null = null;
  const [p, s] = await Promise.allSettled([listProjects(), listStates()]);
  if (p.status === "fulfilled") projects = p.value;
  else if (p.reason instanceof PanelNotReady) setup = p.reason.message;
  else throw p.reason;
  if (s.status === "fulfilled") states = s.value;
  else if (s.reason instanceof PanelNotReady) stateSetup = s.reason.message;
  else throw s.reason;

  return (
    <div className="space-y-6">
      <PageHeader title="Proyectos" right={!setup && <NewProject initialOpen={nuevo === "1"} />}>
        Todos los proyectos del estudio: en qué etapa está cada uno, quién lo lleva, cuánto falta y para cuándo.
      </PageHeader>
      {(setup || stateSetup) && <SetupNotice reason={(setup ?? stateSetup) as string} />}
      <ProjectsView projects={projects} states={Object.fromEntries(states)} editable={!stateSetup && !setup} />
    </div>
  );
}
