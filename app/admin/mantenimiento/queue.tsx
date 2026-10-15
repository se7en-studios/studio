"use client";

// Cola de pedidos de los clientes, estilo Linear: se anota en una línea, se
// cambia el estado y la prioridad en el lugar y se suma el tiempo usado.
// Cambios optimistas: si fallan, vuelven atrás.
import { useState, useTransition } from "react";
import Link from "next/link";
import { Inbox, Plus, Trash2 } from "lucide-react";
import {
  PRIORITY_LABEL,
  REQUEST_PRIORITIES,
  REQUEST_STATUS,
  REQUEST_STATUSES,
  compareRequests,
  durationLabel,
  type MaintRequest,
  type RequestInput,
  type RequestPriority,
} from "@/lib/admin/maintenance-shared";
import {
  Card,
  Empty,
  Segmented,
  btnGhost,
  btnPrimary,
  cn,
  input,
} from "../kit";
import { useToast } from "../overlay";
import { createRequest, deleteRequest, updateRequestAction } from "./actions";

type View = "abiertos" | "esperando" | "hechos";
const VIEWS: { id: View; label: string }[] = [
  { id: "abiertos", label: "Abiertos" },
  { id: "esperando", label: "Esperando al cliente" },
  { id: "hechos", label: "Hechos" },
];
const inView = (r: MaintRequest, v: View) =>
  v === "hechos"
    ? r.status === "hecho"
    : v === "esperando"
      ? r.status === "esperando"
      : r.status !== "hecho";

const PRIORITY_TONE: Record<RequestPriority, string> = {
  urgente: "text-red-400",
  alta: "text-amber-300",
  media: "text-foreground",
  baja: "text-muted",
};
const small = cn(input, "w-auto px-2 py-1 text-[12px]");
const shortDate = (d: string) =>
  new Date(`${d.slice(0, 10)}T12:00:00`)
    .toLocaleDateString("es-AR", { day: "numeric", month: "short" })
    .replace(/\./g, "");

export function RequestQueue({
  initial,
  projects,
  today,
}: {
  initial: MaintRequest[];
  projects: { slug: string; name: string }[];
  today: string;
}) {
  const flash = useToast();
  const [items, setItems] = useState(initial);
  const [view, setView] = useState<View>("abiertos");
  const [draft, setDraft] = useState({
    title: "",
    project_slug: "",
    priority: "media" as RequestPriority,
  });
  const [pending, start] = useTransition();
  const names = Object.fromEntries(projects.map((p) => [p.slug, p.name]));
  const shown = items.filter((r) => inView(r, view)).sort(compareRequests);

  function patch(id: string, p: RequestInput) {
    const before = items;
    setItems((xs) =>
      xs.map((r) =>
        r.id === id
          ? {
              ...r,
              ...p,
              done_at: p.status
                ? p.status === "hecho"
                  ? new Date().toISOString()
                  : null
                : r.done_at,
            }
          : r,
      ),
    );
    start(async () => {
      const res = await updateRequestAction(id, p);
      if (res.error || !res.request) {
        setItems(before);
        flash(res.error ?? "No se pudo guardar", "error");
      } else setItems((xs) => xs.map((r) => (r.id === id ? res.request! : r)));
    });
  }

  function remove(r: MaintRequest) {
    if (!confirm(`¿Borrar «${r.title}»?`)) return;
    const before = items;
    setItems((xs) => xs.filter((x) => x.id !== r.id));
    start(async () => {
      const res = await deleteRequest(r.id);
      if (res.error) {
        setItems(before);
        flash(res.error, "error");
      }
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createRequest(draft);
      if (res.error || !res.request)
        return flash(res.error ?? "No se pudo anotar", "error");
      setItems((xs) => [res.request!, ...xs]);
      setDraft((d) => ({ ...d, title: "" }));
      if (view === "hechos") setView("abiertos");
    });
  }

  return (
    <Card
      title="Pedidos de los clientes"
      icon={<Inbox size={14} />}
      count={items.filter((r) => r.status !== "hecho").length || undefined}
      action={
        <Segmented
          value={view}
          onChange={setView}
          options={VIEWS}
          label="Ver"
        />
      }
    >
      <form
        onSubmit={add}
        className="flex flex-wrap gap-2 border-b border-[var(--line)] px-4 py-3"
      >
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          maxLength={200}
          placeholder="Qué pidió el cliente (cambiar una foto, sumar una sección…)"
          aria-label="Pedido"
          className={cn(input, "min-w-[220px] flex-[2]")}
        />
        <select
          required
          value={draft.project_slug}
          onChange={(e) => setDraft({ ...draft, project_slug: e.target.value })}
          aria-label="Proyecto"
          className={cn(input, "w-auto min-w-[160px] flex-1")}
        >
          <option value="">Proyecto…</option>
          {projects.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={draft.priority}
          onChange={(e) =>
            setDraft({ ...draft, priority: e.target.value as RequestPriority })
          }
          aria-label="Prioridad"
          className={cn(input, "w-auto")}
        >
          {REQUEST_PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending || !draft.title.trim() || !draft.project_slug}
          className={btnPrimary}
        >
          <Plus size={14} /> Anotar
        </button>
      </form>

      {shown.length ? (
        <ul className="divide-y divide-[var(--line)]">
          {shown.map((r) => {
            const late = r.due && r.status !== "hecho" && r.due < today;
            return (
              <li
                key={r.id}
                className="grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px]">
                    <span
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        REQUEST_STATUS[r.status].dot,
                      )}
                    />
                    <span
                      className={cn(
                        "truncate",
                        r.status === "hecho" && "text-muted line-through",
                      )}
                    >
                      {r.title}
                    </span>
                  </p>
                  <p className="mt-0.5 pl-4 text-[12px] text-muted">
                    <Link
                      href={`/admin/proyectos/${r.project_slug}`}
                      className="focus-ring hover:text-foreground"
                    >
                      {names[r.project_slug] ?? r.project_slug}
                    </Link>
                    {" · "}
                    {shortDate(r.created_at)}
                    {r.done_at && ` → hecho ${shortDate(r.done_at)}`}
                    {r.due && (
                      <span className={late ? "text-red-400" : undefined}>
                        {" "}
                        · para el {shortDate(r.due)}
                      </span>
                    )}
                    {r.minutes > 0 && ` · ${durationLabel(r.minutes)}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pl-4 md:pl-0">
                  <select
                    value={r.status}
                    onChange={(e) =>
                      patch(r.id, {
                        status: e.target.value as MaintRequest["status"],
                      })
                    }
                    aria-label="Estado"
                    className={small}
                  >
                    {REQUEST_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {REQUEST_STATUS[s].label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={r.priority}
                    onChange={(e) =>
                      patch(r.id, {
                        priority: e.target.value as RequestPriority,
                      })
                    }
                    aria-label="Prioridad"
                    className={cn(small, PRIORITY_TONE[r.priority])}
                  >
                    {REQUEST_PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={r.due ?? ""}
                    onChange={(e) =>
                      patch(r.id, { due: e.target.value || null })
                    }
                    aria-label="Para cuándo"
                    className={cn(small, "[color-scheme:dark]")}
                  />
                  <label className="flex items-center gap-1 text-[12px] text-muted">
                    <input
                      key={r.minutes}
                      type="number"
                      min={0}
                      step={15}
                      defaultValue={r.minutes || ""}
                      placeholder="0"
                      onBlur={(e) => {
                        const m = Number(e.target.value || 0);
                        if (m !== r.minutes) patch(r.id, { minutes: m });
                      }}
                      aria-label="Tiempo usado en minutos"
                      className={cn(small, "w-[72px]")}
                    />
                    min
                  </label>
                  <button
                    type="button"
                    onClick={() => remove(r)}
                    className={btnGhost}
                    aria-label={`Borrar «${r.title}»`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty
          icon={<Inbox size={18} />}
          title={
            view === "hechos"
              ? "Nada terminado todavía"
              : "No hay pedidos pendientes"
          }
        >
          {view === "hechos"
            ? undefined
            : "Lo que pida cada cliente se anota arriba, con su proyecto y prioridad."}
        </Empty>
      )}
    </Card>
  );
}
