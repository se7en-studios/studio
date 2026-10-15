"use client";

// Proyectos en Inicio: los que se están haciendo y los sitios que se mantienen.
// Las dos listas vienen armadas del servidor; acá sólo se elige cuál mirar. Si
// no hay nada en curso, abre directo en Mantenimiento.
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, FolderKanban, Wrench } from "lucide-react";
import type { PanelProject } from "@/lib/admin/panel";
import type { ProjectState } from "@/lib/admin/project-shared";
import { dueLabel } from "@/lib/admin/task-shared";
import { Card, CardLink, Empty, Face, Progress, Segmented, StatusPill, cn, usd } from "./kit";

export type HomeProject = {
  p: PanelProject;
  s: ProjectState;
  /** Tareas abiertas del proyecto. */
  tasks: number;
  /** Lo que falta cobrar, en USD (la misma cuenta que Finanzas). */
  owed: number;
};

type Tab = "curso" | "mantenimiento";

const row =
  "focus-ring grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025] md:grid-cols-[auto_minmax(0,1fr)_120px_110px_auto]";

export function ProjectsCard({ active, maintenance, today }: { active: HomeProject[]; maintenance: HomeProject[]; today: string }) {
  const [tab, setTab] = useState<Tab>(active.length || !maintenance.length ? "curso" : "mantenimiento");
  const list = tab === "curso" ? active : maintenance;

  return (
    <Card
      // En el celular no entran título, pestañas y link: quedan el ícono y las pestañas, que ya dicen qué es.
      title={<span className="max-sm:sr-only">Proyectos</span>}
      icon={<FolderKanban size={14} />}
      action={
        <div className="flex shrink-0 items-center gap-2">
          <Segmented
            value={tab}
            onChange={setTab}
            label="Qué proyectos ver"
            options={[
              { id: "curso", label: <Count label="En curso" n={active.length} /> },
              { id: "mantenimiento", label: <Count label="Mantenimiento" n={maintenance.length} /> },
            ]}
          />
          <span className="max-sm:hidden">
            <CardLink href={`/admin/proyectos?etapa=${tab === "curso" ? "activos" : "mantenimiento"}`}>Ver todos →</CardLink>
          </span>
        </div>
      }
    >
      {list.length === 0 ? (
        tab === "curso" ? (
          <Empty icon={<FolderKanban size={18} />} title="Nada en curso">
            Pasá un proyecto a Descubrimiento, Diseño, Desarrollo o Revisión y aparece acá.
          </Empty>
        ) : (
          <Empty icon={<Wrench size={18} />} title="Ningún sitio en mantenimiento">
            Cuando un proyecto entregado pasa a Mantenimiento, aparece acá.
          </Empty>
        )
      ) : (
        <ul className="divide-y divide-[var(--line)]">
          {list.slice(0, tab === "curso" ? 6 : 10).map((x) => (
            <li key={x.p.slug}>{tab === "curso" ? <ActiveRow x={x} today={today} /> : <MaintenanceRow x={x} />}</li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Count({ label, n }: { label: string; n: number }) {
  return (
    <>
      {label}
      <span className="ml-1.5 font-mono text-[11px] text-muted">{n}</span>
    </>
  );
}

function Who({ x }: { x: HomeProject }) {
  return (
    <span className="min-w-0">
      <span className="block truncate text-[14px] font-medium">{x.p.name}</span>
      <span className="mt-0.5 block truncate text-[12px] text-muted">{x.s.client || x.p.category || "Sin cliente"}</span>
    </span>
  );
}

function ActiveRow({ x, today }: { x: HomeProject; today: string }) {
  const { p, s } = x;
  return (
    <Link href={`/admin/proyectos/${p.slug}`} className={row}>
      <Cover project={p} />
      <Who x={x} />
      <span className="hidden md:block">
        <span className="mb-1 flex justify-between text-[11px] text-muted">
          Avance <span className="tabular-nums">{s.progress}%</span>
        </span>
        <Progress value={s.progress} accent={p.accent} />
      </span>
      <span className="hidden md:block">
        <StatusPill status={s.status} />
      </span>
      <span className="flex items-center gap-2">
        {s.due && (
          <span className={cn("hidden text-[12px] sm:inline", s.due < today ? "text-red-400" : "text-muted")}>
            <CalendarClock size={12} className="mr-1 inline -translate-y-px" />
            {dueLabel(s.due, today)}
          </span>
        )}
        <Face who={s.owner} size={22} />
      </span>
    </Link>
  );
}

/** Un sitio que se mantiene: lo que importa es si hay trabajo pendiente y si falta cobrar. */
function MaintenanceRow({ x }: { x: HomeProject }) {
  const { p, s } = x;
  return (
    <Link href={`/admin/proyectos/${p.slug}`} className={row}>
      <Cover project={p} />
      <Who x={x} />
      <span className={cn("hidden text-[12px] md:block", x.tasks ? "text-foreground" : "text-muted")}>
        {x.tasks ? `${x.tasks} ${x.tasks === 1 ? "tarea abierta" : "tareas abiertas"}` : "Sin tareas"}
      </span>
      <span className={cn("hidden text-[12px] tabular-nums md:block", x.owed ? "text-amber-300" : "text-muted")}>
        {x.owed ? `${usd(x.owed)} por cobrar` : "Al día"}
      </span>
      <Face who={s.owner} size={22} />
    </Link>
  );
}

function Cover({ project }: { project: PanelProject }) {
  const cls = "h-9 w-14 shrink-0 rounded-md border border-[var(--line)] object-cover object-top";
  if (!project.cover) return <span className={cls} style={{ background: `linear-gradient(135deg, ${project.accent}, #111)` }} />;
  return project.isCase ? (
    <Image src={project.cover} alt="" width={112} height={72} className={cls} />
  ) : (
    // URL firmada de Supabase: ver feed.tsx.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={project.cover} alt="" className={cls} />
  );
}
