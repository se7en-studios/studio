"use client";

// Marco del panel: barra lateral con contadores, barra superior en mobile y
// la paleta de comandos (⌘K). Los contadores salen de /admin/api/pulse, que se
// consulta al entrar, al navegar y cada 30 s con la pestaña visible.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Clapperboard,
  CalendarRange,
  CheckSquare,
  FolderKanban,
  History,
  Home,
  Inbox,
  KeyRound,
  LogOut,
  Menu,
  MessagesSquare,
  Phone,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sun,
  Wallet,
} from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { otherTheme, themeCookie, type Theme } from "@/lib/admin/theme";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import type { Pulse } from "./api/pulse/route";
import { logout } from "./actions";
import { CallListener } from "./call-listener";
import { CommandPalette } from "./command";
import { mapRoom, onMapRoom } from "./presence";
import { Face, Kbd, cn } from "./kit";
import { ToastProvider } from "./overlay";

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: keyof Pulse; tone?: "accent" | "red" };

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: "Trabajo",
    items: [
      { href: "/admin", label: "Inicio", icon: <Home size={16} /> },
      { href: "/admin/llamadas", label: "Llamadas", icon: <Phone size={16} /> },
      { href: "/admin/mensajes", label: "Mensajes", icon: <MessagesSquare size={16} />, badge: "unread", tone: "accent" },
      { href: "/admin/pedidos", label: "Pedidos", icon: <Inbox size={16} />, badge: "newLeads", tone: "accent" },
      { href: "/admin/proyectos", label: "Proyectos", icon: <FolderKanban size={16} /> },
      { href: "/admin/tareas", label: "Tareas", icon: <CheckSquare size={16} />, badge: "overdue", tone: "red" },
      { href: "/admin/calendario", label: "Calendario", icon: <CalendarRange size={16} /> },
      { href: "/admin/contenido", label: "Contenido", icon: <Clapperboard size={16} />, badge: "content", tone: "accent" },
    ],
  },
  {
    title: "Estudio",
    items: [
      { href: "/admin/finanzas", label: "Finanzas", icon: <Wallet size={16} /> },
      { href: "/admin/metricas", label: "Métricas", icon: <BarChart3 size={16} /> },
      { href: "/admin/cambios", label: "Registro", icon: <History size={16} /> },
      { href: "/admin/avisos", label: "Avisos", icon: <Bell size={16} /> },
      { href: "/admin/cuentas", label: "Cuentas", icon: <KeyRound size={16} /> },
      { href: "/admin/seguridad", label: "Seguridad", icon: <ShieldCheck size={16} /> },
      { href: "/admin/marca", label: "Marca", icon: <Palette size={16} /> },
    ],
  },
];

const PulseCtx = createContext<{ pulse: Pulse | null; refresh: () => void }>({ pulse: null, refresh: () => {} });
export const usePulse = () => useContext(PulseCtx);

export function AdminShell({
  who,
  theme: initialTheme,
  callFeed,
  children,
}: {
  who: LeadOwner;
  theme: Theme;
  /** De dónde recibe las llamadas: null si los avisos no están configurados. */
  callFeed: { topic: string; server: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState(initialTheme);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);

  const refresh = useCallback(() => {
    fetch("/admin/api/pulse", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p: Pulse | null) => p && setPulse(p))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && refresh();
    const id = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  // Señal de presencia para «En vivo» de la landing: cada minuto (también con
  // la pestaña de fondo: estar en el panel es estar trabajando), al navegar y
  // al cambiar de sala en el mapa. Lleva el proyecto abierto, si hay uno.
  useEffect(() => {
    const fromPath = pathname.match(/^\/admin\/proyectos\/([a-z0-9-]+)/)?.[1] ?? null;
    const beat = () => {
      const slug = pathname.startsWith("/admin/oficinas") ? mapRoom() : fromPath;
      fetch("/admin/api/presencia", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slug }), keepalive: true }).catch(() => {});
    };
    beat();
    const id = window.setInterval(beat, 60_000);
    const off = onMapRoom(beat);
    return () => {
      window.clearInterval(id);
      off();
    };
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // En la pestaña del navegador: (3) Panel — así se ve desde otra pestaña que hay algo.
  const total = (pulse?.unread ?? 0) + (pulse?.newLeads ?? 0);
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s/, "");
    document.title = total ? `(${total}) ${base}` : base;
  }, [total, pathname]);

  function toggleTheme() {
    const next = otherTheme(theme);
    setTheme(next);
    document.cookie = themeCookie(next);
  }

  const sidebar = (
    <Sidebar who={who} pathname={pathname} pulse={pulse} theme={theme} onTheme={toggleTheme} onSearch={() => setPalette(true)} />
  );

  return (
    <PulseCtx.Provider value={{ pulse, refresh }}>
      <ToastProvider>
        <div className="admin-app min-h-dvh text-foreground" data-theme={theme}>
          <aside className="fixed inset-y-0 left-0 z-40 hidden w-[244px] border-r border-[var(--line)] bg-[var(--panel-0)] lg:block">
            {sidebar}
          </aside>

          {menu && (
            <div className="fixed inset-0 z-[75] lg:hidden">
              <button aria-label="Cerrar menú" onClick={() => setMenu(false)} className="admin-overlay absolute inset-0 bg-black/60" />
              <aside
                onClickCapture={(e) => (e.target as HTMLElement).closest("a") && setMenu(false)}
                className="admin-drawer absolute inset-y-0 left-0 w-[272px] border-r border-[var(--line)] bg-[var(--panel-0)] [animation-name:admin-fade]"
              >
                {sidebar}
              </aside>
            </div>
          )}

          <div className="lg:pl-[244px]">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg)]/90 px-3 backdrop-blur lg:hidden">
              <button onClick={() => setMenu(true)} aria-label="Abrir menú" className="focus-ring relative rounded-lg p-2 text-muted hover:text-foreground">
                <Menu size={18} />
                {total > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />}
              </button>
              <Image src="/logo-simbolo.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
              <span className="text-[13px] font-medium">Se7en · Panel</span>
              <button onClick={() => setPalette(true)} aria-label="Buscar" className="focus-ring ml-auto rounded-lg p-2 text-muted hover:text-foreground">
                <Search size={18} />
              </button>
            </header>
            <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">{children}</main>
          </div>

          {palette && <CommandPalette onClose={() => setPalette(false)} />}
          {callFeed && <CallListener who={who} topic={callFeed.topic} server={callFeed.server} />}
        </div>
      </ToastProvider>
    </PulseCtx.Provider>
  );
}

function Sidebar({
  who,
  pathname,
  pulse,
  theme,
  onTheme,
  onSearch,
}: {
  who: LeadOwner;
  pathname: string;
  pulse: Pulse | null;
  theme: Theme;
  onTheme: () => void;
  onSearch: () => void;
}) {
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const other = PEOPLE_IDS.find((p) => p !== who) ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-gradient-to-b from-white/[0.08] to-transparent shadow-[0_0_18px_-4px_var(--accent)]">
          <Image src="/logo-simbolo.png" alt="" width={20} height={20} className="h-5 w-5" />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[13px] font-semibold">Se7en Studio</span>
          <span className="block text-[11px] text-muted">Panel del equipo</span>
        </span>
      </div>

      <div className="px-3">
        <button
          onClick={onSearch}
          className="focus-ring flex w-full items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--well-soft)] px-2.5 py-2 text-[13px] text-muted transition-colors hover:border-[var(--line-strong)] hover:text-foreground"
        >
          <Search size={14} />
          Buscar o saltar a…
          <span className="ml-auto flex gap-0.5">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav aria-label="Secciones del panel" className="admin-scroll mt-4 flex-1 overflow-y-auto px-3">
        {NAV.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="mb-1.5 px-2.5 text-[11px] font-medium tracking-[0.12em] text-muted uppercase">{group.title}</p>
            <ul className="space-y-px">
              {group.items.map((item) => {
                const on = isActive(item.href);
                const n = item.badge ? pulse?.[item.badge] ?? 0 : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={on ? "page" : undefined}
                      className={cn(
                        "focus-ring group relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] transition-colors",
                        on ? "bg-white/[0.07] font-medium text-foreground" : "text-muted hover:bg-white/[0.04] hover:text-foreground",
                      )}
                    >
                      {on && <span aria-hidden className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
                      <span className={cn("transition-colors", on ? "text-accent" : "text-muted group-hover:text-foreground")}>{item.icon}</span>
                      {item.label}
                      <Pending />
                      {n > 0 && (
                        <span
                          className={cn(
                            "ml-auto min-w-[20px] rounded-full px-1.5 py-px text-center font-mono text-[11px] font-medium",
                            item.tone === "red" ? "bg-red-500/15 text-red-300" : "bg-accent text-background",
                          )}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        <LiveLink on={isActive("/admin/oficinas")} />
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <Link
          href="/"
          className="focus-ring mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <ArrowUpRight size={16} /> Ver el sitio
        </Link>
        <div className="flex items-center gap-2.5 rounded-lg border border-[var(--line)] bg-white/[0.02] px-2 py-1.5">
          <span className="relative">
            <Face who={who} size={28} />
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--panel-0)] bg-emerald-400" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{PEOPLE[who].name}</span>
            <span className="block truncate text-[11px] text-muted">{other ? `Con ${PEOPLE[other].name}` : "Equipo"}</span>
          </span>
          <button
            type="button"
            onClick={onTheme}
            aria-label={theme === "dark" ? "Cambiar al tema claro" : "Cambiar al tema oscuro"}
            title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
            className="focus-ring rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <form action={logout}>
            <button aria-label="Salir" title="Salir" className="focus-ring rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** «En vivo»: el mapa del estudio. Va aparte y en naranja, con el punto de «al aire». */
function LiveLink({ on }: { on: boolean }) {
  return (
    <Link
      href="/admin/oficinas"
      aria-current={on ? "page" : undefined}
      className={cn(
        "focus-ring relative mb-5 flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[14px] font-medium text-accent transition-colors hover:bg-accent-soft",
        on && "bg-accent-soft",
      )}
    >
      {on && <span aria-hidden className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-accent shadow-[0_0_10px_var(--accent)]" />}
      <span aria-hidden className="relative flex h-4 w-4 items-center justify-center">
        <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-accent opacity-50 motion-reduce:hidden" />
        <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
      </span>
      En vivo
      <Pending />
    </Link>
  );
}

/** Puntito mientras carga la sección elegida (si todavía no estaba precargada). */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> : null;
}
