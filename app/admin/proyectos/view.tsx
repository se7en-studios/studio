"use client";

// Todos los proyectos: en tablero por etapa (se arrastran de una a otra), en
// lista (etapa, responsable, avance y entrega se cambian ahí mismo) o en
// galería. Los cambios son optimistas y quedan en el registro.
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, FolderKanban, GalleryHorizontalEnd, LayoutGrid, List, Search } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import type { PanelProject } from "@/lib/admin/panel";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import {
  ACTIVE_STATUSES,
  PROJECT_STATUS,
  PROJECT_STATUSES,
  defaultState,
  type ProjectState,
  type ProjectStateInput,
  type ProjectStatus,
} from "@/lib/admin/project-shared";
import { dayKey, dueLabel } from "@/lib/admin/task-shared";
import { Empty, Face, Progress, Segmented, StatusPill, cn, searchInput } from "../kit";
import { useStoredChoice, useToast } from "../overlay";
import { updateProjectState } from "./actions";

type View = "tablero" | "lista" | "galeria";
const VIEWS: readonly View[] = ["tablero", "lista", "galeria"];
type Scope = "activos" | "todos" | ProjectStatus;
type Row = { p: PanelProject; s: ProjectState };

const DRAG = "application/x-se7en-project";

export function ProjectsView({
  projects,
  states: initial,
  editable,
}: {
  projects: PanelProject[];
  states: Record<string, ProjectState>;
  /** Sin panel-v2.sql no hay dónde guardar etapas: se ve, pero no se edita. */
  editable: boolean;
}) {
  const flash = useToast();
  const [states, setStates] = useState(initial);
  const [view, pickView] = useStoredChoice<View>("panel:proyectos:vista", "tablero", VIEWS);
  const [scope, setScope] = useState<Scope>("todos");
  const [owner, setOwner] = useState<"todos" | LeadOwner>("todos");
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query);
  const [over, setOver] = useState<ProjectStatus | null>(null);
  const [, startTransition] = useTransition();
  const today = dayKey();

  const rows: Row[] = useMemo(
    () => projects.map((p) => ({ p, s: states[p.slug] ?? defaultState(p.slug, p.isCase) })),
    [projects, states],
  );

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter(({ p, s }) => {
      if (scope === "activos" && !ACTIVE_STATUSES.includes(s.status)) return false;
      if (scope !== "activos" && scope !== "todos" && s.status !== scope) return false;
      if (owner !== "todos" && s.owner !== owner) return false;
      return !needle || [p.name, p.category, s.client].some((v) => v.toLowerCase().includes(needle));
    });
  }, [rows, scope, owner, q]);

  const statesRef = useRef(states);
  useEffect(() => {
    statesRef.current = states;
  }, [states]);

  const save = useCallback(
    (p: PanelProject, patch: ProjectStateInput) => {
      if (!editable) return flash("Falta correr supabase/panel-v2.sql para guardar esto.");
      const before = statesRef.current;
      const cur = before[p.slug] ?? defaultState(p.slug, p.isCase);
      const next = { ...cur, ...patch };
      if (patch.status === "entregado" && cur.progress < 100 && patch.progress === undefined) next.progress = 100;
      setStates((ss) => ({ ...ss, [p.slug]: next }));
      startTransition(async () => {
        try {
          const saved = await updateProjectState(p.slug, { ...patch, ...(next.progress !== cur.progress && { progress: next.progress }) });
          setStates((ss) => ({ ...ss, [p.slug]: saved }));
        } catch (e) {
          setStates(before);
          flash(e instanceof Error ? e.message : "No se pudo guardar");
        }
      });
    },
    [editable, flash],
  );

  const counts = useMemo(() => {
    const c = Object.fromEntries(PROJECT_STATUSES.map((s) => [s, 0])) as Record<ProjectStatus, number>;
    for (const r of rows) c[r.s.status]++;
    return c;
  }, [rows]);
  const activeCount = ACTIVE_STATUSES.reduce((n, s) => n + counts[s], 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[200px] flex-1 items-center">
          <Search size={14} className="pointer-events-none absolute left-3 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyecto o cliente…"
            className={searchInput}
          />
        </label>
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value as Scope)}
          aria-label="Etapa"
          className="focus-ring rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-2 text-[13px]"
        >
          <option value="todos">Todas las etapas ({rows.length})</option>
          <option value="activos">En curso ({activeCount})</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS[s].label} ({counts[s]})
            </option>
          ))}
        </select>
        <Segmented
          value={owner}
          onChange={setOwner}
          options={[{ id: "todos", label: "Todos" }, ...PEOPLE_IDS.map((o) => ({ id: o, label: PEOPLE[o].name }))]}
        />
        <Segmented
          value={view}
          onChange={pickView}
          options={[
            { id: "tablero", label: <LayoutGrid size={14} aria-label="Tablero" /> },
            { id: "lista", label: <List size={14} aria-label="Lista" /> },
            { id: "galeria", label: <GalleryHorizontalEnd size={14} aria-label="Galería" /> },
          ]}
        />
      </div>

      {!visible.length ? (
        <div className="rounded-xl border border-dashed border-[var(--line-strong)]">
          <Empty icon={<FolderKanban size={18} />} title="Nada coincide">
            Probá con otra etapa o sacá la búsqueda.
          </Empty>
        </div>
      ) : view === "tablero" ? (
        /* Etapas como franjas apiladas, no como columnas. Con columnas, una
           etapa vacía ocupa toda la altura y hay que scrollear al costado para
           llegar a columnas donde no hay nada; acá una etapa vacía es una
           franja de dos renglones. Se arrastra de arriba abajo para cambiar de
           etapa, y las tarjetas corren a lo ancho dentro de su franja. */
        <div className="flex flex-col gap-3">
          {(scope === "todos" ? PROJECT_STATUSES : scope === "activos" ? ACTIVE_STATUSES : [scope]).map(
            (st) => {
              const items = visible.filter((r) => r.s.status === st);
              return (
                <section
                  key={st}
                  aria-label={PROJECT_STATUS[st].label}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(DRAG)) return;
                    e.preventDefault();
                    if (over !== st) setOver(st);
                  }}
                  onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    const slug = e.dataTransfer.getData(DRAG);
                    const row = rows.find((r) => r.p.slug === slug);
                    if (row && row.s.status !== st) save(row.p, { status: st });
                  }}
                  className={cn(
                    "rounded-xl border p-2 transition-colors",
                    over === st ? "border-accent/50 bg-accent/[0.05]" : "border-[var(--line)] bg-white/[0.012]",
                  )}
                >
                  <header className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
                    <span className={cn("h-2 w-2 rounded-full", PROJECT_STATUS[st].dot)} />
                    <h2 className="text-[13px] font-medium">{PROJECT_STATUS[st].label}</h2>
                    <span className="font-mono text-[11px] text-muted">{items.length}</span>
                  </header>
                  {items.length ? (
                    <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-1">
                      {items.map((r) => (
                        <BoardCard key={r.p.slug} row={r} today={today} draggable={editable} />
                      ))}
                    </div>
                  ) : (
                    /* La franja vacía sigue siendo zona de descarte: el
                       onDragOver está en la sección, no en la lista. */
                    <p className="rounded-lg border border-dashed border-[var(--line)] px-3 py-3.5 text-center text-[12px] text-muted">
                      Soltá un proyecto acá para pasarlo a {PROJECT_STATUS[st].label.toLowerCase()}.
                    </p>
                  )}
                </section>
              );
            },
          )}
        </div>
      ) : view === "lista" ? (
        <ProjectTable rows={visible} today={today} onSave={save} editable={editable} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((r) => (
            <li key={r.p.slug}>
              <GalleryCard row={r} today={today} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


function Due({ due, today, status }: { due: string | null; today: string; status: ProjectStatus }) {
  if (!due) return <span className="text-muted/60">Sin fecha</span>;
  const late = due < today && ACTIVE_STATUSES.includes(status);
  return (
    <span className={cn("inline-flex items-center gap-1", late ? "text-red-400" : "text-muted")}>
      <CalendarClock size={12} /> {dueLabel(due, today)}
    </span>
  );
}

function Thumb({ p, className }: { p: PanelProject; className: string }) {
  if (!p.cover) return <span className={className} style={{ background: `linear-gradient(135deg, ${p.accent}cc, #111 70%)` }} />;
  return p.isCase ? (
    <Image src={p.cover} alt="" width={320} height={200} className={cn(className, "object-cover object-top")} />
  ) : (
    // URL firmada de Supabase: ver feed.tsx.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.cover} alt="" loading="lazy" className={cn(className, "object-cover object-top")} />
  );
}

const BoardCard = memo(function BoardCard({ row: { p, s }, today, draggable }: { row: Row; today: string; draggable: boolean }) {
  return (
    <Link
      href={`/admin/proyectos/${p.slug}`}
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG, p.slug);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="focus-ring group block w-[208px] shrink-0 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-colors hover:border-[var(--line-strong)]"
    >
      <Thumb p={p} className="mb-2.5 block aspect-[16/9] w-full rounded-md border border-[var(--line)]" />
      <p className="flex items-center gap-1.5 text-[13px] font-medium">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.accent }} />
        <span className="truncate">{p.name}</span>
      </p>
      <p className="mt-0.5 truncate text-[12px] text-muted">{s.client || p.category || "—"}</p>
      <div className="mt-2.5">
        <Progress value={s.progress} accent={p.accent} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <Due due={s.due} today={today} status={s.status} />
        <span className="flex items-center gap-1.5">
          {p.files > 0 && <span className="text-muted">{p.files} arch.</span>}
          <Face who={s.owner} size={18} />
        </span>
      </div>
    </Link>
  );
});

function GalleryCard({ row: { p, s }, today }: { row: Row; today: string }) {
  return (
    <Link
      href={`/admin/proyectos/${p.slug}`}
      className="focus-ring group block overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)] transition-colors hover:border-[var(--line-strong)]"
    >
      <span className="relative block aspect-[16/10] overflow-hidden bg-[var(--panel-2)]">
        <Thumb p={p} className="block h-full w-full transition-transform duration-500 group-hover:scale-[1.03]" />
        <span className="absolute top-2.5 left-2.5">
          <StatusPill status={s.status} className="bg-black/60 backdrop-blur" />
        </span>
      </span>
      <span className="block p-3.5">
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-[14px] font-medium">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.accent }} />
            <span className="truncate">{p.name}</span>
          </span>
          <Face who={s.owner} size={20} />
        </span>
        <span className="mt-1 block truncate text-[12px] text-muted">{[s.client || p.category, p.year].filter(Boolean).join(" · ")}</span>
        <span className="mt-3 block">
          <Progress value={s.progress} accent={p.accent} />
        </span>
        <span className="mt-2 flex justify-between text-[12px]">
          <Due due={s.due} today={today} status={s.status} />
          <span className="text-muted">{p.files ? `${p.files} archivos` : "Sin archivos"}</span>
        </span>
      </span>
    </Link>
  );
}

function ProjectTable({
  rows,
  today,
  onSave,
  editable,
}: {
  rows: Row[];
  today: string;
  onSave: (p: PanelProject, patch: ProjectStateInput) => void;
  editable: boolean;
}) {
  const cell = "focus-ring rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] transition-colors hover:border-[var(--line-strong)] focus:border-accent/60 disabled:hover:border-transparent";
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[var(--panel)]">
      <table className="w-full min-w-[980px] text-left text-[13px]">
        <thead className="border-b border-[var(--line)] text-[12px] text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Proyecto</th>
            <th className="px-2 py-2.5 font-medium">Etapa</th>
            <th className="px-2 py-2.5 font-medium">Responsable</th>
            <th className="w-[170px] px-2 py-2.5 font-medium">Avance</th>
            <th className="px-2 py-2.5 font-medium">Entrega</th>
            <th className="px-4 py-2.5 text-right font-medium">Archivos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--line)]">
          {rows.map(({ p, s }) => (
            <tr key={p.slug} className="transition-colors hover:bg-white/[0.02]">
              <td className="px-4 py-2">
                <Link href={`/admin/proyectos/${p.slug}`} className="focus-ring flex items-center gap-3">
                  <Thumb p={p} className="h-8 w-12 shrink-0 rounded border border-[var(--line)]" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium hover:underline">{p.name}</span>
                    <span className="block truncate text-[12px] text-muted">{s.client || p.category || "—"}</span>
                  </span>
                </Link>
              </td>
              <td className="px-2 py-2">
                <select
                  value={s.status}
                  disabled={!editable}
                  onChange={(e) => onSave(p, { status: e.target.value as ProjectStatus })}
                  aria-label={`Etapa de ${p.name}`}
                  className={cn(cell, PROJECT_STATUS[s.status].tone.split(" ")[0])}
                >
                  {PROJECT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {PROJECT_STATUS[st].label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-2 py-2">
                <span className="flex items-center gap-1">
                  <Face who={s.owner} size={20} />
                  <select
                    value={s.owner ?? ""}
                    disabled={!editable}
                    onChange={(e) => onSave(p, { owner: (e.target.value || null) as LeadOwner | null })}
                    aria-label={`Responsable de ${p.name}`}
                    className={cell}
                  >
                    <option value="">Sin asignar</option>
                    {PEOPLE_IDS.map((o) => (
                      <option key={o} value={o}>
                        {PEOPLE[o].name}
                      </option>
                    ))}
                  </select>
                </span>
              </td>
              <td className="px-2 py-2">
                <ProgressInput value={s.progress} accent={p.accent} disabled={!editable} onSave={(v) => onSave(p, { progress: v })} />
              </td>
              <td className="px-2 py-2">
                <span className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={s.due ?? ""}
                    disabled={!editable}
                    onChange={(e) => onSave(p, { due: e.target.value || null })}
                    aria-label={`Entrega de ${p.name}`}
                    className={cn(cell, "[color-scheme:dark]", s.due && s.due < today && ACTIVE_STATUSES.includes(s.status) && "text-red-400")}
                  />
                </span>
              </td>
              <td className="px-4 py-2 text-right text-[13px] text-muted tabular-nums">{p.files || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Barra de avance que se arrastra; guarda al soltar. */
export function ProgressInput({
  value,
  accent,
  disabled,
  onSave,
}: {
  value: number;
  accent?: string;
  disabled?: boolean;
  onSave: (v: number) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  const commit = () => draft !== value && onSave(draft);
  return (
    <span className="flex items-center gap-2">
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        aria-label="Avance"
        className="h-1 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 disabled:cursor-default [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
        style={{ background: `linear-gradient(90deg, ${accent ?? "var(--accent)"} ${draft}%, rgba(255,255,255,0.1) ${draft}%)` }}
      />
      <span className="w-9 text-right text-[12px] text-muted tabular-nums">{draft}%</span>
    </span>
  );
}
