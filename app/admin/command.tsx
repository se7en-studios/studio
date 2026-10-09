"use client";

// Paleta de comandos (⌘K): saltar a una sección, a un pedido, a un proyecto o
// a una tarea, o empezar algo nuevo. El índice se pide una vez por apertura a
// /admin/api/search y se filtra en el navegador.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  CornerDownLeft,
  FolderKanban,
  History,
  Home,
  Inbox,
  MessagesSquare,
  Palette,
  Plus,
  Search,
} from "lucide-react";
import type { SearchIndex } from "./api/search/route";
import { Kbd, cn } from "./kit";
import { Dialog } from "./overlay";

type Item = { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; href: string };

const BASE: Item[] = [
  { id: "n-inicio", group: "Ir a", label: "Inicio", icon: <Home size={16} />, href: "/admin" },
  { id: "n-mensajes", group: "Ir a", label: "Mensajes", icon: <MessagesSquare size={16} />, href: "/admin/mensajes" },
  { id: "n-pedidos", group: "Ir a", label: "Pedidos", icon: <Inbox size={16} />, href: "/admin/pedidos" },
  { id: "n-proyectos", group: "Ir a", label: "Proyectos", icon: <FolderKanban size={16} />, href: "/admin/proyectos" },
  { id: "n-tareas", group: "Ir a", label: "Tareas", icon: <CheckSquare size={16} />, href: "/admin/tareas" },
  { id: "n-metricas", group: "Ir a", label: "Métricas", icon: <BarChart3 size={16} />, href: "/admin/metricas" },
  { id: "n-registro", group: "Ir a", label: "Registro de cambios", icon: <History size={16} />, href: "/admin/cambios" },
  { id: "n-marca", group: "Ir a", label: "Marca", icon: <Palette size={16} />, href: "/admin/marca" },
  { id: "a-pedido", group: "Crear", label: "Nuevo pedido", icon: <Plus size={16} />, href: "/admin/pedidos?nuevo=1" },
  { id: "a-proyecto", group: "Crear", label: "Nuevo proyecto", icon: <Plus size={16} />, href: "/admin/proyectos?nuevo=1" },
  { id: "a-tarea", group: "Crear", label: "Nueva tarea", icon: <Plus size={16} />, href: "/admin/tareas?nueva=1" },
  { id: "a-mensaje", group: "Crear", label: "Mensaje al equipo", icon: <Plus size={16} />, href: "/admin/mensajes" },
];

const STATUS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  propuesta: "Propuesta",
  ganado: "Ganado",
  perdido: "Perdido",
};

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [index, setIndex] = useState<SearchIndex | null>(null);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    fetch("/admin/api/search", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: SearchIndex | null) => d && setIndex(d))
      .catch(() => {});
  }, []);

  const items = useMemo(() => {
    const all: Item[] = [
      ...BASE,
      ...(index?.leads ?? []).map((l) => ({
        id: `l-${l.id}`,
        group: "Pedidos",
        label: l.company ? `${l.name} · ${l.company}` : l.name,
        hint: STATUS[l.status] ?? l.status,
        icon: <Inbox size={16} />,
        href: `/admin/pedidos?pedido=${l.id}`,
      })),
      ...(index?.projects ?? []).map((p) => ({
        id: `p-${p.slug}`,
        group: "Proyectos",
        label: p.name,
        icon: <FolderKanban size={16} />,
        href: `/admin/proyectos/${p.slug}`,
      })),
      ...(index?.tasks ?? []).map((t) => ({
        id: `t-${t.id}`,
        group: "Tareas",
        label: t.title,
        hint: t.done ? "Hecha" : undefined,
        icon: <CheckSquare size={16} />,
        href: `/admin/tareas?tarea=${t.id}`,
      })),
    ];
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return all.filter((i) => i.group === "Ir a" || i.group === "Crear");
    return all
      .filter((i) => {
        const hay = norm(`${i.label} ${i.group} ${i.hint ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 40);
  }, [index, q]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(item: Item | undefined) {
    if (!item) return;
    onClose();
    router.push(item.href);
  }

  let lastGroup = "";
  return (
    <Dialog onClose={onClose} label="Buscar" width="max-w-xl">
      <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(items[active]);
            }
          }}
          placeholder="Buscar pedidos, proyectos, tareas o secciones…"
          aria-label="Buscar"
          className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul ref={list} role="listbox" className="admin-scroll max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {items.length === 0 && (
          <li className="px-3 py-8 text-center text-[13px] text-muted">{index ? "Nada coincide." : "Cargando…"}</li>
        )}
        {items.map((item, i) => {
          const head = item.group !== lastGroup;
          lastGroup = item.group;
          return (
            <li key={item.id} role="option" aria-selected={i === active}>
              {head && <p className="px-2.5 pt-2.5 pb-1 text-[11px] font-medium text-muted/70">{item.group}</p>}
              <button
                data-i={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(item)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors",
                  i === active ? "bg-white/[0.07] text-foreground" : "text-foreground/85",
                )}
              >
                <span className={i === active ? "text-accent" : "text-muted"}>{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-[12px] text-muted">{item.hint}</span>}
                {i === active && <CornerDownLeft size={14} className="shrink-0 text-muted" />}
              </button>
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
