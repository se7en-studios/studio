"use client";

// Paleta de comandos (⌘K / Ctrl K): saltar a una sección, a un pedido, a un
// proyecto, a una tarea, a un mensaje, a un movimiento de finanzas o a un prospecto del radar.
// Incluye comandos rápidos (prefijo '>' o búsqueda directa) y soporte de teclado Vim/Linear.
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
  Settings,
  Sparkles,
  SunMoon,
  Target,
  Terminal,
  Users,
  Wallet,
  Wrench,
  Keyboard,
} from "lucide-react";
import type { SearchIndex } from "./api/search/route";
import { Kbd, cn } from "./kit";
import { Dialog } from "./overlay";

export type CommandItem = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  href: string;
  action?: () => void;
};

const BASE_SECTIONS: CommandItem[] = [
  { id: "n-inicio", group: "Navegación", label: "Inicio", hint: "Panel", icon: <Home size={16} />, href: "/admin" },
  { id: "n-prospectos", group: "Navegación", label: "Prospectos & Radar Local", hint: "Catriel, NQN, MDZ", icon: <Target size={16} />, href: "/admin/prospectos" },
  { id: "n-pedidos", group: "Navegación", label: "Pedidos Entrantes", hint: "Leads", icon: <Inbox size={16} />, href: "/admin/pedidos" },
  { id: "n-proyectos", group: "Navegación", label: "Proyectos & Telemetría Edge", hint: "Pings, SSL", icon: <FolderKanban size={16} />, href: "/admin/proyectos" },
  { id: "n-clientes", group: "Navegación", label: "Clientes", hint: "Directorio", icon: <Users size={16} />, href: "/admin/clientes" },
  { id: "n-finanzas", group: "Navegación", label: "Finanzas & Runway Cockpit", hint: "USD / ARS", icon: <Wallet size={16} />, href: "/admin/finanzas" },
  { id: "n-metricas", group: "Navegación", label: "Números & Métricas", hint: "KPIs", icon: <BarChart3 size={16} />, href: "/admin/metricas" },
  { id: "n-tareas", group: "Navegación", label: "Tareas", hint: "Sprint", icon: <CheckSquare size={16} />, href: "/admin/tareas" },
  { id: "n-calendario", group: "Navegación", label: "Calendario", hint: "Fechas clave", icon: <CalendarRange size={16} />, href: "/admin/calendario" },
  { id: "n-mensajes", group: "Navegación", label: "Mensajes del Estudio", hint: "Chat interno", icon: <MessagesSquare size={16} />, href: "/admin/mensajes" },
  { id: "n-mantenimiento", group: "Navegación", label: "Mantenimiento & Retainers", hint: "Abonos mensuales", icon: <Wrench size={16} />, href: "/admin/mantenimiento" },
  { id: "n-oficinas", group: "Navegación", label: "Virtual Studio HQ", hint: "En vivo", icon: <Radio size={16} />, href: "/admin/oficinas" },
  { id: "n-cuentas", group: "Navegación", label: "Cuentas & Caja Fuerte", hint: "Vault", icon: <KeyRound size={16} />, href: "/admin/cuentas" },
  { id: "n-seguridad", group: "Navegación", label: "Seguridad & Accesos", hint: "2FA", icon: <ShieldCheck size={16} />, href: "/admin/seguridad" },
  { id: "n-llamadas", group: "Navegación", label: "Llamar por Meet", hint: "Franco & Fede", icon: <Phone size={16} />, href: "/admin/llamadas" },
  { id: "n-contenido", group: "Navegación", label: "Contenido de Instagram", hint: "Reels / Carruseles", icon: <Clapperboard size={16} />, href: "/admin/contenido" },
  { id: "n-marca", group: "Navegación", label: "Identidad de Marca", hint: "Tokens, Logos", icon: <Palette size={16} />, href: "/admin/marca" },
  { id: "n-registro", group: "Navegación", label: "Registro de Cambios", hint: "Audit log", icon: <History size={16} />, href: "/admin/cambios" },
  { id: "n-avisos", group: "Navegación", label: "Avisos al Celular", hint: "Notificaciones", icon: <Bell size={16} />, href: "/admin/avisos" },
  { id: "n-ajustes", group: "Navegación", label: "Ajustes Generales", hint: "Config", icon: <Settings size={16} />, href: "/admin/ajustes" },
  { id: "a-pedido", group: "Acciones Rápidas", label: "Nuevo pedido de cliente", hint: "Crear", icon: <Plus size={16} />, href: "/admin/pedidos?nuevo=1" },
  { id: "a-proyecto", group: "Acciones Rápidas", label: "Nuevo proyecto", hint: "Crear", icon: <Plus size={16} />, href: "/admin/proyectos?nuevo=1" },
  { id: "a-tarea", group: "Acciones Rápidas", label: "Nueva tarea del equipo", hint: "Crear", icon: <Plus size={16} />, href: "/admin/tareas?nueva=1" },
  { id: "a-movimiento", group: "Acciones Rápidas", label: "Nuevo movimiento de finanzas", hint: "Ingreso / Costo", icon: <Plus size={16} />, href: "/admin/finanzas?nuevo=1" },
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

export function CommandPalette({
  onClose,
  onToggleTheme,
  onShowShortcuts,
}: {
  onClose: () => void;
  onToggleTheme?: () => void;
  onShowShortcuts?: () => void;
}) {
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
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [attempt]);

  const studioActions = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: "act-ai",
        group: "Comandos Rápidos",
        label: "Abrir Cualificador Forense de IA",
        hint: "Copilot",
        icon: <Sparkles size={16} className="text-amber-500" />,
        href: "/admin/prospectos?ai=1",
      },
      {
        id: "act-sim",
        group: "Comandos Rápidos",
        label: "Simulador Financiero Monte Carlo & Runway",
        hint: "Cockpit",
        icon: <BarChart3 size={16} className="text-emerald-500" />,
        href: "/admin/finanzas",
      },
      {
        id: "act-telemetry",
        group: "Comandos Rápidos",
        label: "Telemetría Edge en Vivo (Pings & SSL)",
        hint: "Datadog / Vercel",
        icon: <Radio size={16} className="text-sky-500" />,
        href: "/admin/proyectos",
      },
      {
        id: "act-theme",
        group: "Comandos Rápidos",
        label: "Alternar Tema Visual (Claro / Oscuro)",
        hint: "⌘T",
        icon: <SunMoon size={16} />,
        href: "#theme",
        action: onToggleTheme,
      },
      {
        id: "act-shortcuts",
        group: "Comandos Rápidos",
        label: "Ver Todos los Atajos de Teclado del Panel",
        hint: "?",
        icon: <Keyboard size={16} />,
        href: "#shortcuts",
        action: onShowShortcuts,
      },
    ];
    return list;
  }, [onToggleTheme, onShowShortcuts]);

  const items = useMemo(() => {
    const all: CommandItem[] = [
      ...studioActions,
      ...BASE_SECTIONS,
      ...(index?.prospects ?? []).map((p) => ({
        id: `pr-${p.id}`,
        group: "Radar de Prospectos Locales",
        label: `${p.name} · ${p.city}`,
        hint: p.category,
        icon: <Target size={16} />,
        href: `/admin/prospectos?q=${encodeURIComponent(p.name)}`,
      })),
      ...(index?.leads ?? []).map((l) => ({
        id: `l-${l.id}`,
        group: "Pedidos",
        label: l.company ? `${l.name} · ${l.company}` : l.name,
        hint: STATUS[l.status] ?? l.status,
        icon: <Inbox size={16} />,
        href: `/admin/pedidos?pedido=${l.id}`,
      })),
      ...(index?.clients ?? []).map((cl) => ({
        id: `c-${cl.id}`,
        group: "Clientes",
        label: cl.name,
        icon: <Users size={16} />,
        href: `/admin/clientes/${cl.id}`,
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

    const cleanQ = q.trim();
    if (!cleanQ) {
      return all.filter((i) => i.group === "Comandos Rápidos" || i.group === "Navegación" || i.group === "Acciones Rápidas");
    }

    // Modo terminal si arranca con '>' o ':'
    const isCommandMode = cleanQ.startsWith(">") || cleanQ.startsWith(":");
    const queryTerm = isCommandMode ? cleanQ.slice(1).trim() : cleanQ;
    const words = norm(queryTerm).split(/\s+/).filter(Boolean);

    if (isCommandMode && !words.length) {
      return all.filter((i) => i.group === "Comandos Rápidos" || i.group === "Acciones Rápidas");
    }

    return all
      .filter((i) => {
        if (isCommandMode && i.group !== "Comandos Rápidos" && i.group !== "Acciones Rápidas") return false;
        const hay = norm(`${i.label} ${i.group} ${i.hint ?? ""}`);
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 45);
  }, [index, q, studioActions]);

  useEffect(() => {
    list.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function go(item: CommandItem | undefined) {
    if (!item) return;
    onClose();
    if (item.action) {
      item.action();
      return;
    }
    if (item.href && item.href !== "#") {
      router.push(item.href);
    }
  }

  let lastGroup = "";
  return (
    <Dialog onClose={onClose} label="Paleta Raycast Universal" width="max-w-xl">
      <div className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 bg-[var(--panel)]">
        {q.startsWith(">") || q.startsWith(":") ? (
          <Terminal size={17} className="shrink-0 text-accent" />
        ) : (
          <Search size={16} className="shrink-0 text-muted" />
        )}
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || (e.ctrlKey && e.key === "n")) {
              e.preventDefault();
              setActive((a) => Math.min(items.length - 1, a + 1));
            } else if (e.key === "ArrowUp" || (e.ctrlKey && e.key === "p")) {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            } else if (e.key === "Enter") {
              e.preventDefault();
              go(items[active]);
            }
          }}
          placeholder="Escribe para buscar o '>' para comandos rápidos..."
          aria-label="Paleta Universal"
          className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted/70 focus:outline-none"
        />
        <Kbd>Esc</Kbd>
      </div>

      <ul ref={list} role="listbox" className="admin-scroll max-h-[min(60vh,420px)] overflow-y-auto p-2 bg-[var(--panel)]">
        {items.length === 0 && (
          <li className="px-3 py-8 text-center text-[13px] text-muted">
            {index ? "Ningún comando o registro coincide." : failed ? "No se pudo sincronizar el índice de búsqueda." : "Indexando estudio..."}
          </li>
        )}
        {failed && !index && (
          <li className="flex items-center justify-between gap-3 px-2.5 pt-2 text-[12px] text-amber-500">
            Búsqueda limitada a secciones estáticas (error al consultar la base).
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
          const isSelected = i === active;
          return (
            <li key={item.id} role="option" aria-selected={isSelected}>
              {head && <p className="adm-label px-2.5 pt-3 pb-1 text-muted">{item.group}</p>}
              <button
                data-i={i}
                onMouseMove={() => setActive(i)}
                onClick={() => go(item)}
                className={cn(
                  "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] transition-colors",
                  isSelected
                    ? "bg-foreground text-background font-medium"
                    : "text-foreground hover:bg-[var(--well)]",
                )}
              >
                <span className={isSelected ? "text-background" : "text-muted shrink-0"}>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.hint && (
                  <span
                    className={cn(
                      "shrink-0 text-[11px] font-mono",
                      isSelected ? "text-background/80" : "text-muted",
                    )}
                  >
                    {item.hint}
                  </span>
                )}
                {isSelected && <CornerDownLeft size={14} className="shrink-0 text-background/80" />}
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2.5 text-[11px] text-muted bg-[var(--well)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> ejecutar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>&gt;</Kbd> modo terminal
          </span>
        </div>
        <span className="hidden sm:inline">Presiona <Kbd>?</Kbd> para atajos</span>
      </div>
    </Dialog>
  );
}
