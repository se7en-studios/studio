import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { panelSession } from "@/lib/admin/auth";
import { ago } from "@/lib/admin/brief";
import { PanelNotReady, caseProjects, listProjects, type PanelProject } from "@/lib/admin/panel";
import { AdminGate, PageHeader, SetupNotice } from "../ui";
import { NewProject } from "./new-project";

export const metadata: Metadata = { title: "Proyectos · Panel" };

export default async function ProyectosPage() {
  if (!(await panelSession())) return <AdminGate />;

  let projects: PanelProject[] = caseProjects();
  let setup: string | null = null;
  try {
    projects = await listProjects();
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Proyectos" right={!setup && <NewProject />}>
        Los {projects.filter((p) => p.isCase).length} casos de la web y los proyectos internos, cada uno con sus carpetas.
      </PageHeader>

      {setup && <SetupNotice reason={setup} />}

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {projects.map((p) => (
          <li key={p.slug}>
            <Link
              href={`/admin/proyectos/${p.slug}`}
              className="focus-ring group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-foreground/20"
            >
              <span className="relative block aspect-[16/10] overflow-hidden bg-surface-2">
                {p.cover ? (
                  p.isCase ? (
                    <Image
                      src={p.cover}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-top transition-transform duration-[var(--dur-base)] ease-[var(--ease)] group-hover:scale-[1.03]"
                    />
                  ) : (
                    // URL firmada de Supabase: ver feed.tsx.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover} alt="" className="h-full w-full object-cover object-top" />
                  )
                ) : (
                  <span className="flex h-full items-end p-4" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${p.accent}55, transparent 60%), #101012` }}>
                    <span className="text-3xl text-foreground">{p.name}</span>
                  </span>
                )}
              </span>
              <span className="block p-4">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-foreground">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.accent }} />
                    <span className="truncate">{p.name}</span>
                  </span>
                  {p.isCase && (
                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-[9px] tracking-wider text-emerald-300 uppercase">
                      En la web
                    </span>
                  )}
                </span>
                <span className="mt-1.5 block truncate font-mono text-[10px] tracking-widest text-muted uppercase">
                  {[p.category, p.year].filter(Boolean).join(" · ")}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {p.files ? `${p.files} ${p.files === 1 ? "archivo" : "archivos"}` : "Sin archivos"}
                  {p.files > 0 && p.updatedAt && ` · ${ago(p.updatedAt)}`}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
