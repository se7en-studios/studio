import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { panelSession } from "@/lib/admin/auth";
import { ago } from "@/lib/admin/brief";
import {
  FOLDERS,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_BYTES,
  PanelNotReady,
  folderLabel,
  getProject,
  isFolder,
  listFiles,
  type PanelFile,
} from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { AdminGate, SetupNotice, bytes } from "../../ui";
import { DeleteProject } from "./delete-project";
import { FileCard } from "./file-card";
import { Uploader } from "./uploader";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ carpeta?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug).catch(() => null);
  return { title: `${project?.name ?? slug} · Panel` };
}

// «web» es la carpeta de sólo lectura con lo que el caso ya muestra en el sitio.
const WEB = "web";

export default async function ProjectPage({ params, searchParams }: Props) {
  if (!(await panelSession())) return <AdminGate />;
  const { slug } = await params;
  const { carpeta } = await searchParams;

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

  let files: PanelFile[] = [];
  try {
    files = await listFiles(slug);
  } catch (e) {
    if (!(e instanceof PanelNotReady)) throw e;
    setup = e.message;
  }

  const current = carpeta === WEB && project.isCase ? WEB : carpeta && isFolder(carpeta) ? carpeta : null;
  const visible = current ? files.filter((f) => f.folder === current) : files;
  const count = (id: string) => files.filter((f) => f.folder === id).length;
  const tabs = [
    { id: null, label: "Todo", n: files.length },
    ...FOLDERS.map((f) => ({ id: f.id, label: f.label, n: count(f.id) })),
    ...(project.isCase ? [{ id: WEB, label: "En la web", n: project.video ? 2 : 1 }] : []),
  ];

  return (
    <div className="space-y-8">
      <Link href="/admin/proyectos" className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft size={14} /> Proyectos
      </Link>

      {/* Encabezado del proyecto */}
      <div className="grid items-center gap-6 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-surface-2">
          {project.isCase && project.cover ? (
            <Image src={project.cover} alt="" fill sizes="320px" className="object-cover object-top" priority />
          ) : (
            <span className="block h-full" style={{ background: `radial-gradient(120% 90% at 85% 0%, ${project.accent}66, transparent 60%), #101012` }} />
          )}
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-widest uppercase" style={{ color: project.accent }}>
            ● {[project.category, project.year].filter(Boolean).join(" · ")}
          </p>
          <h1 className="mt-2 text-3xl text-foreground md:text-5xl">{project.name}</h1>
          {project.tagline && <p className="mt-3 max-w-xl text-muted">«{project.tagline}»</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {project.url && (
              <a
                href={project.url}
                target="_blank"
                rel="noopener"
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-background"
              >
                Ver sitio <ArrowUpRight size={14} />
              </a>
            )}
            {project.isCase && (
              <Link
                href={`/work/${project.slug}`}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
              >
                Caso en la web <ArrowUpRight size={14} />
              </Link>
            )}
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 font-mono text-[11px] text-muted">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: project.accent }} />
              {project.accent.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {setup ? (
        <SetupNotice reason={setup} />
      ) : (
        <Uploader
          slug={project.slug}
          folders={FOLDERS.map((f) => ({ id: f.id, label: f.label }))}
          initialFolder={current && current !== WEB ? current : "diseno"}
          maxBytes={MAX_FILE_BYTES}
          maxFiles={MAX_FILES_PER_UPLOAD}
        />
      )}

      {/* Carpetas */}
      <nav aria-label="Carpetas" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <div className="flex w-max gap-1.5">
          {tabs.map((t) => {
            const on = t.id === current;
            return (
              <Link
                key={t.label}
                href={`/admin/proyectos/${project.slug}${t.id ? `?carpeta=${t.id}` : ""}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`focus-ring inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  on ? "border-foreground bg-foreground text-background" : "border-border text-muted hover:text-foreground"
                }`}
              >
                {t.label}
                <span className="font-mono text-[10px] opacity-70">{t.n}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {current === WEB ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {project.cover && (
            <li className="overflow-hidden rounded-xl border border-border bg-background/70">
              <span className="relative block aspect-[16/10]">
                <Image src={project.cover} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover object-top" />
              </span>
              <p className="p-3 font-mono text-[11px] text-muted">{project.cover.split("/").pop()} · captura del caso</p>
            </li>
          )}
          {project.video && (
            <li className="overflow-hidden rounded-xl border border-border bg-background/70">
              <video src={project.video} muted loop playsInline autoPlay className="aspect-[16/10] w-full object-cover" />
              <p className="p-3 font-mono text-[11px] text-muted">{project.video.split("/").pop()} · clip de hover</p>
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
        !setup && (
          <p className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted">
            {current ? `${folderLabel(current)} está vacía.` : "Este proyecto todavía no tiene archivos."} Arrastralos al recuadro de arriba.
          </p>
        )
      )}

      {/* Los casos de la web no llevan botón: viven en data/projects.ts y
          sacarlos es un cambio de repo, no algo que el panel pueda hacer. */}
      {!project.isCase && <DeleteProject slug={project.slug} name={project.name} files={files.length} />}
    </div>
  );
}
