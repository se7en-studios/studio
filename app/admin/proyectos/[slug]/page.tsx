import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { ago } from "@/lib/admin/brief";
import { projectChannel } from "@/lib/admin/message-shared";
import {
  FOLDERS,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_BYTES,
  PanelNotReady,
  countFiles,
  folderLabel,
  getProject,
  isFolder,
  listEvents,
  listFiles,
  type PanelEvent,
  type PanelFile,
} from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { defaultState, type ProjectState } from "@/lib/admin/project-shared";
import { getState } from "@/lib/admin/projects";
import { listPayments } from "@/lib/admin/payments";
import type { Payment } from "@/lib/admin/payment-shared";
import type { Task, TaskLinks } from "@/lib/admin/task-shared";
import { listTasks, taskLinks } from "@/lib/admin/tasks";
import { EventList } from "../../feed";
import { Card, CardLink, Face, Progress, StatusPill, TabLinks, btnPrimary, btnSecondary, usd } from "../../kit";
import { Chat } from "../../mensajes/chat";
import { AdminGate, SetupNotice, bytes } from "../../ui";
import { DeleteProject } from "./delete-project";
import { FileCard } from "./file-card";
import { Payments } from "./payments";
import { ProjectTasks } from "./project-tasks";
import { EditInfo, StatePanel } from "./state-panel";
import { Uploader } from "./uploader";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ carpeta?: string; tab?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return { title: project?.name ?? slug };
}

// «web» es la carpeta de sólo lectura con lo que el caso ya muestra en el sitio.
const WEB = "web";
const TABS = ["resumen", "archivos", "chat", "cambios"] as const;
type Tab = (typeof TABS)[number];

/** Lo opcional (tablas que todavía no existen) no rompe la ficha. */
async function optional<T>(p: Promise<T>, fallback: T): Promise<{ value: T; missing: string | null }> {
  try {
    return { value: await p, missing: null };
  } catch (e) {
    if (e instanceof PanelNotReady) return { value: fallback, missing: e.message };
    throw e;
  }
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const me = await panelSession();
  if (!me) return <AdminGate />;
  const [{ slug }, { carpeta, tab: rawTab }] = await Promise.all([params, searchParams]);
  const tab: Tab = (TABS as readonly string[]).includes(rawTab ?? "") ? (rawTab as Tab) : carpeta ? "archivos" : "resumen";

  let setup: string | null = null;
  let project = null;
  try {
    project = await getProject(slug);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }
  if (!project && !setup) notFound();
  if (!project) return <SetupNotice reason={setup ?? ""} />;

  // Sólo lo que necesita la pestaña abierta, y en paralelo.
  const [stateR, filesR, tasksR, linksR, eventsR, countR, paymentsR] = await Promise.all([
    optional<ProjectState>(getState(slug, project.isCase), defaultState(slug, project.isCase)),
    tab === "archivos" ? optional<PanelFile[]>(listFiles(slug), []) : null,
    tab === "resumen" ? optional<Task[] | null>(listTasks({ projectSlug: slug }), null) : null,
    tab === "resumen" ? optional<TaskLinks>(taskLinks(), { leads: [], projects: [] }) : null,
    tab === "resumen" || tab === "cambios"
      ? optional<PanelEvent[]>(listEvents({ projectSlug: slug, limit: tab === "cambios" ? 150 : 8 }), [])
      : null,
    // En Archivos el largo de filesR ya es la cuenta; en las otras pestañas hay
    // que pedirla. Va un count sin filas y no listFiles, que firmaría una URL
    // por archivo para terminar usando nada más que el largo.
    tab !== "archivos" ? optional<number>(countFiles(slug), 0) : null,
    tab === "resumen" ? optional<Payment[]>(listPayments(slug), []) : null,
  ]);
  const state = stateR.value;
  // No sale de project.files: getProject arma la ficha sin estadísticas y ese
  // campo queda siempre en 0, así que el contador de la pestaña nunca aparecía.
  // En la lista sí funciona, porque ahí listProjects pasa las suyas.
  const files = filesR?.value.length ?? countR?.value ?? 0;
  const base = `/admin/proyectos/${project.slug}`;

  return (
    <div className="space-y-6">
      <nav aria-label="Ruta" className="flex items-center gap-1.5 text-[13px] text-muted">
        <Link href="/admin/proyectos" className="focus-ring hover:text-foreground">
          Proyectos
        </Link>
        <ChevronRight size={13} />
        <span className="truncate text-foreground">{project.name}</span>
      </nav>

      {/* Encabezado del proyecto */}
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel-2)]">
          {project.isCase && project.cover ? (
            <Image src={project.cover} alt="" fill sizes="280px" className="object-cover object-top" priority />
          ) : (
            <span className="block h-full" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${project.accent}77, transparent 60%), var(--panel-2)` }} />
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={state.status} />
            <span className="text-[12px] text-muted">{[project.category, project.year].filter(Boolean).join(" · ")}</span>
            {project.isCase && (
              <span className="rounded-md bg-emerald-400/10 px-1.5 py-0.5 text-[11px] text-emerald-300 ring-1 ring-emerald-400/20 ring-inset">En la web</span>
            )}
          </div>
          <h1 className="mt-2 flex items-center gap-3 text-[24px] leading-tight font-semibold tracking-[-0.02em] md:text-[28px]">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: project.accent }} />
            {project.name}
          </h1>
          {project.tagline && <p className="mt-1.5 max-w-xl text-[14px] text-muted">«{project.tagline}»</p>}

          <dl className="mt-4 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <div>
              <dt className="text-[11px] text-muted">Responsable</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-[13px]">
                <Face who={state.owner} size={20} /> {state.owner ? PEOPLE[state.owner].name : "Sin asignar"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Avance</dt>
              <dd className="mt-1.5 flex items-center gap-2 text-[13px] tabular-nums">
                <span className="w-16">
                  <Progress value={state.progress} accent={project.accent} />
                </span>
                {state.progress}%
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Entrega</dt>
              <dd className="mt-1 text-[13px]">
                {state.due ? new Date(`${state.due}T12:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted">Monto</dt>
              <dd className="mt-1 text-[13px]">{usd(state.budget)}</dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {project.url && (
              <a href={project.url} target="_blank" rel="noopener" className={btnPrimary}>
                Ver sitio <ArrowUpRight size={13} />
              </a>
            )}
            {project.isCase && (
              <Link href={`/work/${project.slug}`} className={btnSecondary}>
                Caso en la web <ArrowUpRight size={13} />
              </Link>
            )}
            {!project.isCase && (
              <EditInfo slug={project.slug} initial={{ name: project.name, category: project.category, url: project.url ?? "", accent: project.accent }} />
            )}
          </div>
        </div>
      </div>

      <TabLinks
        current={tab}
        tabs={[
          { id: "resumen", label: "Resumen", href: base },
          { id: "archivos", label: "Archivos", href: `${base}?tab=archivos`, count: files || undefined },
          { id: "chat", label: "Conversación", href: `${base}?tab=chat` },
          { id: "cambios", label: "Cambios", href: `${base}?tab=cambios` },
        ]}
      />

      {stateR.missing && tab === "resumen" && <SetupNotice reason={stateR.missing} />}

      {tab === "resumen" && (
        <>
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <StatePanel
              slug={project.slug}
              initial={state}
              accent={project.accent}
              leads={linksR?.value.leads ?? []}
              editable={!stateR.missing}
            />
            <div className="min-w-0 space-y-4">
              {paymentsR?.missing ? (
                <SetupNotice reason={paymentsR.missing} />
              ) : (
                <Payments slug={project.slug} budget={state.budget} initial={paymentsR?.value ?? []} me={me.who} accent={project.accent} />
              )}
              {tasksR?.value ? (
                <ProjectTasks slug={project.slug} tasks={tasksR.value} links={linksR?.value ?? { leads: [], projects: [] }} me={me.who} owner={state.owner} />
              ) : null}
              <Card title="Últimos cambios" action={<CardLink href={`${base}?tab=cambios`}>Ver todo →</CardLink>}>
                <EventList events={eventsR?.value ?? []} names={{}} hideProject />
              </Card>
            </div>
          </div>

          {/* Al pie del Resumen, que es la pestaña que se abre por defecto.
              Antes vivía dentro de Archivos: para borrar un proyecto había que
              entrar a una pestaña que habla de otra cosa y bajar hasta el final.
              Los casos de la web no llevan botón — viven en data/projects.ts y
              sacarlos es un cambio de repo, no algo que el panel pueda hacer. */}
          {!project.isCase && <DeleteProject slug={project.slug} name={project.name} files={files} />}
        </>
      )}

      {tab === "chat" && (
        <div className="h-[calc(100dvh-260px)] min-h-[440px] overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]">
          <Chat channel={projectChannel(project.slug)} me={me.who} className="h-full" placeholder={`Escribí sobre ${project.name}…`} />
        </div>
      )}

      {tab === "cambios" &&
        (eventsR?.missing ? <SetupNotice reason={eventsR.missing} /> : <div className="max-w-3xl"><EventList events={eventsR?.value ?? []} names={{}} grouped hideProject /></div>)}

      {tab === "archivos" && <Files project={project} files={filesR?.value ?? []} missing={filesR?.missing ?? null} carpeta={carpeta} base={base} />}
    </div>
  );
}

function Files({
  project,
  files,
  missing,
  carpeta,
  base,
}: {
  project: NonNullable<Awaited<ReturnType<typeof getProject>>>;
  files: PanelFile[];
  missing: string | null;
  carpeta?: string;
  base: string;
}) {
  const current = carpeta === WEB && project.isCase ? WEB : carpeta && isFolder(carpeta) ? carpeta : null;
  const visible = current ? files.filter((f) => f.folder === current) : files;
  const count = (id: string) => files.filter((f) => f.folder === id).length;
  const tabs = [
    { id: null, label: "Todo", n: files.length },
    ...FOLDERS.map((f) => ({ id: f.id, label: f.label, n: count(f.id) })),
    ...(project.isCase ? [{ id: WEB, label: "En la web", n: project.video ? 2 : 1 }] : []),
  ];

  return (
    <div className="space-y-5">
      {missing ? (
        <SetupNotice reason={missing} />
      ) : (
        <Uploader
          slug={project.slug}
          folders={FOLDERS.map((f) => ({ id: f.id, label: f.label }))}
          initialFolder={current && current !== WEB ? current : "diseno"}
          maxBytes={MAX_FILE_BYTES}
          maxFiles={MAX_FILES_PER_UPLOAD}
        />
      )}

      <nav aria-label="Carpetas" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-0.5">
          {tabs.map((t) => {
            const on = t.id === current;
            return (
              <Link
                key={t.label}
                href={`${base}?tab=archivos${t.id ? `&carpeta=${t.id}` : ""}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`focus-ring inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] transition-colors ${
                  on ? "bg-white/[0.08] text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="font-mono text-[11px] opacity-60">{t.n}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {current === WEB ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {project.cover && (
            <li className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
              <span className="relative block aspect-[16/10]">
                <Image src={project.cover} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover object-top" />
              </span>
              <p className="p-3 text-[12px] text-muted">{project.cover.split("/").pop()} · captura del caso</p>
            </li>
          )}
          {project.video && (
            <li className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
              <video src={project.video} muted loop playsInline autoPlay preload="metadata" className="aspect-[16/10] w-full object-cover" />
              <p className="p-3 text-[12px] text-muted">{project.video.split("/").pop()} · clip de hover</p>
            </li>
          )}
        </ul>
      ) : visible.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {visible.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              folder={current ? undefined : folderLabel(f.folder)}
              meta={[bytes(f.size), f.uploaded_by && PEOPLE[f.uploaded_by].name, ago(f.created_at)].filter(Boolean).join(" · ")}
            />
          ))}
        </ul>
      ) : (
        !missing && (
          <p className="rounded-xl border border-dashed border-[var(--line-strong)] px-6 py-12 text-center text-[13px] text-muted">
            {current ? `${folderLabel(current)} está vacía.` : "Este proyecto todavía no tiene archivos."} Arrastralos al recuadro de arriba.
          </p>
        )
      )}
    </div>
  );
}
