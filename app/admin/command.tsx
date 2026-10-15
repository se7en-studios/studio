"use client";

// Paleta de comandos (⌘K / Ctrl K): saltar a una sección, a un pedido, a un
// proyecto, a una tarea, a un mensaje o a un movimiento, o empezar algo nuevo. El índice se pide una vez por apertura a
// /admin/api/search y se filtra en el navegador.
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Bell,
  CalendarRange,
  CheckSquare,
  Clapperboard,
  CornerDownLeft,
  FolderKanban,
  History,
  Home,
  Inbox,
  KeyRound,
  ShieldCheck,
  MessagesSquare,
  Phone,
  Palette,
  Plus,
  Radio,
  RotateCw,
  Search,
  Wallet,
} from "lucide-react";
import type { SearchIndex } from "./api/search/route";
import { Kbd, cn } from "./kit";
import { Dialog } from "./overlay";

type Item = { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; href: string };

const BASE: Item[] = [
  { id: "n-inicio", group: "Ir a", label: "Inicio", icon: <Home size={16} />, href: "/admin" },
  { id: "n-cuentas", group: "Ir a", label: "Cuentas (caja fuerte)", icon: <KeyRound size={16} />, href: "/admin/cuentas" },
  { id: "n-seguridad", group: "Ir a", label: "Seguridad", icon: <ShieldCheck size={16} />, href: "/admin/seguridad" },
  { id: "n-llamadas", group: "Ir a", label: "Llamadas por Meet", icon: <Phone size={16} />, href: "/admin/llamadas" },
  { id: "n-mensajes", group: "Ir a", label: "Mensajes", icon: <MessagesSquare size={16} />, href: "/admin/mensajes" },
  { id: "n-pedidos", group: "Ir a", label: "Pedidos", icon: <Inbox size={16} />, href: "/admin/pedidos" },
  { id: "n-proyectos", group: "Ir a", label: "Proyectos", icon: <FolderKanban size={16} />, href: "/admin/proyectos" },
  { id: "n-tareas", group: "Ir a", label: "Tareas", icon: <CheckSquare size={16} />, href: "/admin/tareas" },
  { id: "n-calendario", group: "Ir a", label: "Calendario", icon: <CalendarRange size={16} />, href: "/admin/calendario" },
  { id: "n-contenido", group: "Ir a", label: "Contenido de Instagram", icon: <Clapperboard size={16} />, href: "/admin/contenido" },
  { id: "n-finanzas", group: "Ir a", label: "Finanzas", icon: <Wallet size={16} />, href: "/admin/finanzas" },
  { id: "n-metricas", group: "Ir a", label: "Métricas", icon: <BarChart3 size={16} />, href: "/admin/metricas" },
  { id: "n-registro", group: "Ir a", label: "Registro de cambios", icon: <History size={16} />, href: "/admin/cambios" },
  { id: "n-avisos", group: "Ir a", label: "Avisos al celular", icon: <Bell size={16} />, href: "/admin/avisos" },
  { id: "n-marca", group: "Ir a", label: "Marca", icon: <Palette size={16} />, href: "/admin/marca" },
  { id: "n-envivo", group: "Ir a", label: "En vivo (mapa del estudio)", icon: <Radio size={16} />, href: "/admin/oficinas" },
  { id: "a-pedido", group: "Crear", label: "Nuevo pedido", icon: <Plus size={16} />, href: "/admin/pedidos?nuevo=1" },
  { id: "a-proyecto", group: "Crear", label: "Nuevo proyecto", icon: <Plus size={16} />, href: "/admin/proyectos?nuevo=1" },
  { id: "a-tarea", group: "Crear", label: "Nueva tarea", icon: <Plus size={16} />, href: "/admin/tareas?nueva=1" },
  { id: "a-movimiento", group: "Crear", label: "Nuevo ingreso o costo", icon: <Plus size={16} />, href: "/admin/finanzas?nuevo=1" },
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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [active, setActive] = useState(0);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let live = true;
    fetch("/admin/api/search", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<SearchIndex>;
      })
      .then((d) => live && setIndex(d))
      // Las secciones siguen andando; sólo falta buscar en los datos.
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [attempt]);

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
      ...(index?.messages ?? []).map((m) => ({
        id: `m-${m.id}`,
        group: "Mensajes",
        label: m.body,
        hint: m.where,
        icon: <MessagesSquare size={16} />,
        href: m.channel === "general" ? "/admin/mensajes" : `/admin/mensajes?c=${encodeURIComponent(m.channel)}`,
      })),
      ...(index?.movements ?? []).map((f) => ({
        id: `f-${f.id}`,
        group: "Finanzas",
        label: f.label,
        hint: f.hint,
        icon: <Wallet size={16} />,
        href: "/admin/finanzas",
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
          placeholder="Buscar pedidos, proyectos, tareas, mensajes, movimientos…"
          aria-label="Buscar"
          className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <ul ref={list} role="listbox" className="admin-scroll max-h-[min(60vh,420px)] overflow-y-auto p-2">
        {items.length === 0 && (
          <li className="px-3 py-8 text-center text-[13px] text-muted">
            {index ? "Nada coincide." : failed ? "No se pudo cargar la búsqueda." : "Cargando…"}
          </li>
        )}
        {failed && !index && (
          <li className="flex items-center justify-between gap-3 px-2.5 pt-2 text-[12px] text-amber-300">
            Sólo se buscan las secciones: no se pudieron cargar pedidos, proyectos ni tareas.
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setAttempt((a) => a + 1);
              }}
              className="focus-ring inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-muted hover:text-foreground"
            >
              <RotateCw size={12} /> Reintentar
            </button>
          </li>
        )}
        {items.map((item, i) => {
          const head = item.group !== lastGroup;
          lastGroup = item.group;
          return (
            <li key={item.id} role="option" aria-selected={i === active}>
              {head && <p className="px-2.5 pt-3 pb-1 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{item.group}</p>}
              <button
                data-i={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(item)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors",
                  i === active ? "bg-white/[0.07] text-foreground" : "text-foreground/85",
                )}
              >
                {i === active && <span aria-hidden className="absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full bg-accent" />}
                <span className={i === active ? "text-accent" : "text-muted"}>{item.icon}</span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-[12px] text-muted">{item.hint}</span>}
                {i === active && <CornerDownLeft size={14} className="shrink-0 text-muted" />}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-4 border-t border-[var(--line)] bg-white/[0.012] px-4 py-2 text-[11px] text-muted">
        <span className="flex items-center gap-1">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> navegar
        </span>
        <span className="flex items-center gap-1">
          <Kbd>↵</Kbd> abrir
        </span>
        <span className="flex items-center gap-1">
          <Kbd>Esc</Kbd> cerrar
        </span>
      </div>
    </Dialog>
  );
}
