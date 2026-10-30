"use client";

// Marco del panel: barra flotante en la compu (Rail: angosta o abierta), barra superior
// y menú lateral en el celular (Sidebar), la paleta de comandos (⌘K) y la
// entrada de cada sección (Entrance). Los contadores salen de /admin/api/pulse,
// que se consulta al entrar, al navegar y cada 30 s con la pestaña visible.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Clapperboard,
  CalendarRange,
  CheckSquare,
  FolderKanban,
  Home,
  Inbox,
  KeyRound,
  LogOut,
  Menu,
  MessagesSquare,
  Phone,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Sun,
  Target,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { otherTheme, themeCookie, type Theme } from "@/lib/admin/theme";
import { railCookie } from "@/lib/admin/rail";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import type { Pulse } from "./api/pulse/route";
import { logout } from "./actions";
import { CallListener } from "./call-listener";
import { CommandPalette } from "./command";
import { mapRoom, onMapRoom } from "./presence";
import { Face, Kbd, cn } from "./kit";
import { ToastProvider, useModKey, useToast } from "./overlay";
import { ringPerson } from "./llamadas/actions";
import { RunningTimer } from "./horas/running";

type NavItem = { href: string; label: string; icon: React.ReactNode; badge?: keyof Pulse; tone?: "accent" | "red" };

// Ordenado por el ciclo del cliente: vender → entregar → cobrar. Lo que se
// configura una vez (Avisos, Seguridad, Registro, Llamadas) vive en Ajustes, al pie.
const NAV: { title: string | null; items: NavItem[] }[] = [
  {
    title: null,
    items: [
      { href: "/admin", label: "Inicio", icon: <Home size={16} /> },
      { href: "/admin/mensajes", label: "Mensajes", icon: <MessagesSquare size={16} />, badge: "unread", tone: "accent" },
    ],
  },
  {
    title: "Clientes",
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: <Inbox size={16} />, badge: "newLeads", tone: "accent" },
      { href: "/admin/prospectos", label: "Prospectos", icon: <Target size={16} /> },
      { href: "/admin/clientes", label: "Clientes", icon: <Users size={16} /> },
      { href: "/admin/proyectos", label: "Proyectos", icon: <FolderKanban size={16} />, badge: "lateProjects", tone: "red" },
      { href: "/admin/mantenimiento", label: "Mantenimiento", icon: <Wrench size={16} />, badge: "maintenance", tone: "accent" },
    ],
  },
  {
    title: "Día a día",
    items: [
      { href: "/admin/tareas", label: "Tareas", icon: <CheckSquare size={16} />, badge: "overdue", tone: "red" },
      { href: "/admin/calendario", label: "Calendario", icon: <CalendarRange size={16} /> },
    ],
  },
  {
    title: "Plata",
    items: [
      { href: "/admin/finanzas", label: "Finanzas", icon: <Wallet size={16} />, badge: "lateCharges", tone: "red" },
      { href: "/admin/metricas", label: "Números", icon: <BarChart3 size={16} /> },
    ],
  },
  {
    title: "Estudio",
    items: [
      { href: "/admin/contenido", label: "Contenido", icon: <Clapperboard size={16} />, badge: "content", tone: "accent" },
      { href: "/admin/marca", label: "Marca", icon: <Palette size={16} /> },
      { href: "/admin/cuentas", label: "Cuentas", icon: <KeyRound size={16} /> },
    ],
  },
];

/** Secciones que se abren desde Ajustes: con cualquiera abierta, Ajustes queda marcado. */
export const SETTINGS_PATHS = ["/admin/ajustes", "/admin/avisos", "/admin/seguridad", "/admin/cambios", "/admin/llamadas"];

const PulseCtx = createContext<{ pulse: Pulse | null; refresh: () => void }>({ pulse: null, refresh: () => {} });
export const usePulse = () => useContext(PulseCtx);

export function AdminShell({
  who,
  theme: initialTheme,
  railOpen: initialRailOpen,
  callFeed,
  myRoom,
  children,
}: {
  who: LeadOwner;
  theme: Theme;
  /** La barra de la compu abierta (con los nombres) o angosta (sólo íconos): sale de la cookie. */
  railOpen: boolean;
  /** Sala fija de Meet de quien está (MEET_LINK_<NOMBRE>): con ella, «Llamar» es un clic. */
  myRoom: string | null;
  /** De dónde recibe las llamadas: null si los avisos no están configurados. */
  callFeed: { topic: string; server: string } | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [theme, setTheme] = useState(initialTheme);
  const [railOpen, setRailOpen] = useState(initialRailOpen);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  // La primera sección se ve tal como llega del servidor; desde la primera navegación, cada una entra animada.
  const [shown, setShown] = useState(pathname);
  const [navigated, setNavigated] = useState(false);
  if (shown !== pathname) {
    setShown(pathname);
    setNavigated(true);
  }

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

  const toggleRail = useCallback(() => {
    setRailOpen((v) => {
      document.cookie = railCookie(!v);
      return !v;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
      }
      // ⌘B abre o achica la barra, salvo escribiendo (ahí puede ser negrita).
      const typing = (e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b" && !typing) {
        e.preventDefault();
        toggleRail();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleRail]);

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
    <Sidebar who={who} myRoom={myRoom} pathname={pathname} pulse={pulse} theme={theme} onTheme={toggleTheme} onSearch={() => setPalette(true)} />
  );
  const rail = (
    <Rail who={who} myRoom={myRoom} pathname={pathname} pulse={pulse} theme={theme} open={railOpen} onTheme={toggleTheme} onSearch={() => setPalette(true)} />
  );

  return (
    <PulseCtx.Provider value={{ pulse, refresh }}>
      <ToastProvider>
        <div className="admin-app min-h-dvh text-foreground" data-theme={theme}>
          <aside
            className={cn(
              "fixed inset-y-3 left-3 z-40 hidden transition-[width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:block",
              railOpen ? "w-[232px]" : "w-16",
            )}
          >
            {rail}
            {/* Abrir o achicar la barra: un botoncito redondo montado en el borde, a la altura del logo. */}
            <button
              type="button"
              onClick={toggleRail}
              aria-expanded={railOpen}
              aria-label={railOpen ? "Achicar la barra (⌘B)" : "Abrir la barra (⌘B)"}
              title={railOpen ? "Achicar la barra (⌘B)" : "Abrir la barra (⌘B)"}
              className="focus-ring absolute top-[26px] -right-3 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--rail)] text-[#f2eee6]/70 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.6)] ring-1 ring-[var(--rail-line)] transition-colors hover:text-[#f2eee6]"
            >
              {railOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
            </button>
          </aside>
          {/* El cronómetro, si corre, flota al pie junto a la barra: se ve desde cualquier sección. */}
          <div
            className={cn(
              "fixed bottom-4 z-40 hidden rounded-lg bg-[var(--panel-2)] shadow-[var(--shadow-pop)] transition-[left] duration-300 lg:block",
              railOpen ? "left-[260px]" : "left-[92px]",
            )}
          >
            <RunningTimer />
          </div>

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

          <div className={cn("transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", railOpen ? "lg:pl-[256px]" : "lg:pl-[88px]")}>
            <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg)]/90 px-3 backdrop-blur lg:hidden">
              <button onClick={() => setMenu(true)} aria-label="Abrir menú" className="focus-ring relative rounded-lg p-2 text-muted hover:text-foreground">
                <Menu size={18} />
                {total > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />}
              </button>
              <Image src="/logo-simbolo.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
              <Wordmark className="text-[16px]" />
              <span className="adm-label">Panel</span>
              <button onClick={() => setPalette(true)} aria-label="Buscar" className="focus-ring ml-auto rounded-lg p-2 text-muted hover:text-foreground">
                <Search size={18} />
              </button>
            </header>
            <main className="mx-auto w-full max-w-[1440px] px-4 py-6 md:px-8 md:py-8">
              <Entrance key={pathname} animate={navigated}>
                {children}
              </Entrance>
            </main>
          </div>

          {palette && <CommandPalette onClose={() => setPalette(false)} />}
          {callFeed && <CallListener who={who} topic={callFeed.topic} server={callFeed.server} />}
        </div>
      </ToastProvider>
    </PulseCtx.Provider>
  );
}

/**
 * Cada sección entra como en un tablero: el contenido nuevo aparece por tarjetas
 * (las que llevan `adm-in`), de a una, subiendo y desenfocadas. Las que llegan
 * después por streaming (cuando termina de cargar el esqueleto) también entran
 * escalonadas. Pasado el arranque, lo que se agrega (un mensaje nuevo, un filtro)
 * aparece sin animación. La primera carga no se anima: llega lista del servidor.
 */
function Entrance({ animate, children }: { animate: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [entering, setEntering] = useState(animate);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !animate) return;
    // Cada tanda de tarjetas nuevas se numera desde cero: --i es su lugar en la escalera.
    const mark = () => {
      let i = 0;
      root.querySelectorAll<HTMLElement>(".adm-in:not([data-in])").forEach((el) => {
        el.dataset.in = "";
        el.style.setProperty("--i", String(Math.min(i++, 12)));
      });
    };
    mark();
    const mo = new MutationObserver(mark);
    mo.observe(root, { childList: true, subtree: true });
    const t = window.setTimeout(() => {
      mo.disconnect();
      setEntering(false);
    }, 2500);
    return () => {
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, [animate]);
  return (
    <div ref={ref} data-entering={entering ? "" : undefined}>
      {children}
    </div>
  );
}

/**
 * Desde la compu, la barra es una pastilla de tinta que flota al costado. Angosta
 * muestra sólo los íconos (el nombre sale en un cartelito al pasar o enfocar);
 * abierta, los nombres y los grupos. Todo va alineado a la izquierda con el mismo
 * margen, así los íconos no se mueven al abrirla. La sección elegida la marca una
 * pastilla de papel que se desliza de una a otra. Abajo, Ajustes y la cara de
 * quien está, que abre lo demás (llamar, tema, ver el sitio, salir).
 * Va siempre en tinta (también en el tema claro): por eso sus colores son fijos.
 */
function Rail({
  who,
  myRoom,
  pathname,
  pulse,
  theme,
  open,
  onTheme,
  onSearch,
}: {
  who: LeadOwner;
  myRoom: string | null;
  pathname: string;
  pulse: Pulse | null;
  theme: Theme;
  open: boolean;
  onTheme: () => void;
  onSearch: () => void;
}) {
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const inSettings = SETTINGS_PATHS.some(isActive);
  const other = PEOPLE_IDS.find((p) => p !== who) ?? null;
  const mod = useModKey();
  const navRef = useRef<HTMLElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [menu, setMenu] = useState(false);

  // La marca de la sección elegida: se mide dónde quedó su fila y se desliza hasta ahí.
  useLayoutEffect(() => {
    const mark = markRef.current;
    const on = navRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!mark) return;
    mark.style.opacity = on ? "1" : "0";
    if (on) mark.style.transform = `translateY(${on.offsetTop}px)`;
  }, [pathname, open]);

  // El cartelito con el nombre (sólo angosta): uno solo, fijo en la pantalla (la lista scrollea y lo cortaría).
  const tip = (label: string | null) => (e: React.SyntheticEvent<HTMLElement>) => {
    const el = tipRef.current;
    if (!el) return;
    if (!label) {
      el.dataset.on = "false";
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    el.textContent = label;
    el.style.top = `${r.top + r.height / 2}px`;
    el.dataset.on = "true";
  };
  const hint = (label: string) =>
    open ? {} : { onPointerEnter: tip(label), onPointerLeave: tip(null), onFocus: tip(label), onBlur: tip(null) };
  // Al abrirla, el cartelito que hubiera quedado se apaga (ya no hay íconos sueltos).
  useEffect(() => {
    if (open && tipRef.current) tipRef.current.dataset.on = "false";
  }, [open]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  // 36 px por fila: las 14 secciones entran enteras en una pantalla de 900 de alto. Angosta,
  // la fila es un círculo; abierta, una pastilla a todo el ancho con el ícono en el mismo lugar.
  const row = cn(
    "focus-ring relative z-10 flex h-9 shrink-0 items-center rounded-full transition-colors duration-300",
    open ? "w-full gap-3 px-2.5 text-[13px]" : "w-9 justify-center",
  );
  const idle = "text-[#f2eee6]/55 hover:bg-[#f2eee6]/10 hover:text-[#f2eee6]";
  const label = (text: string) => open && <span className="admin-fade truncate">{text}</span>;
  const rule = <span aria-hidden className="my-2 h-px w-full shrink-0 bg-[#f2eee6]/12" />;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[2rem] bg-[var(--rail)] px-3.5 py-4 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)] ring-1 ring-[var(--rail-line)]">
      <Link href="/admin" aria-label="Inicio" className="focus-ring mb-3 flex h-9 shrink-0 items-center gap-2.5 rounded-full">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          <Image src="/logo-simbolo.png" alt="" width={28} height={28} className="h-7 w-7" />
        </span>
        {open && <Wordmark className="admin-fade text-[18px] text-[#f2eee6]" />}
      </Link>
      <button type="button" onClick={onSearch} aria-label="Buscar o saltar a una sección" {...hint(`Buscar · ${mod} K`)} className={cn(row, idle)}>
        <Search size={17} className="shrink-0" />
        {open && (
          <>
            <span className="admin-fade">Buscar…</span>
            <span className="admin-fade ml-auto font-mono text-[11px] text-[#f2eee6]/40">{mod} K</span>
          </>
        )}
      </button>
      {rule}

      <nav ref={navRef} aria-label="Secciones del panel" className={cn("relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [scrollbar-width:none]", open ? "gap-0" : "gap-0.5")}>
        {/* La marca de la sección elegida: pastilla de papel y una rayita al borde de la barra. */}
        <span
          ref={markRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-0 left-0 h-9 rounded-full bg-[#f2eee6] opacity-0 transition-[transform,opacity,width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
            open ? "w-full" : "w-9",
          )}
        />
        {NAV.map((group, gi) => (
          <div key={group.title ?? gi} className="contents">
            {gi > 0 &&
              (open && group.title ? (
                <p className="admin-fade mt-2.5 mb-0.5 shrink-0 truncate px-2.5 font-mono text-[10px] tracking-[0.13em] text-[#f2eee6]/35 uppercase">{group.title}</p>
              ) : (
                rule
              ))}
            {group.items.map((it) => {
              const on = isActive(it.href);
              const n = it.badge ? pulse?.[it.badge] ?? 0 : 0;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  aria-label={n ? `${it.label} (${n})` : it.label}
                  aria-current={on ? "page" : undefined}
                  {...hint(it.label)}
                  className={cn(row, on ? "font-medium text-[#0b0b0c]" : idle)}
                >
                  <span className="shrink-0">{it.icon}</span>
                  {label(it.label)}
                  <RailPending open={open} />
                  {n > 0 && (
                    <span
                      className={cn(
                        "min-w-4 rounded-full px-1 text-center font-mono text-[10px] leading-4 font-medium",
                        open ? "ml-auto" : "absolute -top-0.5 -right-0.5 ring-2 ring-[var(--rail)]",
                        it.tone === "red" ? "bg-red-500 text-white" : "bg-accent text-[#0b0b0c]",
                      )}
                    >
                      {n > 99 ? "99+" : n}
                    </span>
                  )}
                </Link>
              );
            })}
            {gi === 0 && (
              <Link
                href="/admin/oficinas"
                aria-label="En vivo"
                aria-current={isActive("/admin/oficinas") ? "page" : undefined}
                {...hint("En vivo")}
                className={cn(row, isActive("/admin/oficinas") ? "font-medium text-[#0b0b0c]" : idle)}
              >
                <span aria-hidden className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                  <span className="absolute h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400/60 motion-reduce:animate-none" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                {label("En vivo")}
                <RailPending open={open} />
              </Link>
            )}
          </div>
        ))}
      </nav>

      {rule}
      <Link
        href="/admin/ajustes"
        aria-label="Ajustes"
        aria-current={inSettings ? "page" : undefined}
        {...hint("Ajustes")}
        className={cn(row, inSettings ? "bg-[#f2eee6] font-medium text-[#0b0b0c]" : idle)}
      >
        <Settings size={17} className="shrink-0" />
        {label("Ajustes")}
        <RailPending open={open} />
      </Link>

      <button
        type="button"
        onClick={() => setMenu((v) => !v)}
        aria-expanded={menu}
        aria-haspopup="menu"
        aria-label={`${PEOPLE[who].name}: llamar, tema, sitio y salir`}
        {...hint(PEOPLE[who].name)}
        className={cn(
          "focus-ring relative mt-2 flex h-11 shrink-0 items-center gap-2.5 rounded-full text-left transition-colors",
          open ? "w-full pr-2 hover:bg-[#f2eee6]/10" : "w-9",
        )}
      >
        <span className="relative flex h-11 w-9 shrink-0 items-center justify-center">
          <Face who={who} size={32} alt="" />
          <span className="absolute right-0 bottom-1 h-2.5 w-2.5 rounded-full border-2 border-[var(--rail)] bg-emerald-400" />
        </span>
        {open && (
          <span className="admin-fade min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium text-[#f2eee6]">{PEOPLE[who].name}</span>
            <span className="block truncate text-[11px] text-[#f2eee6]/50">{other ? `Con ${PEOPLE[other].name}` : "Equipo"}</span>
          </span>
        )}
      </button>
      {menu && (
        <>
          <button type="button" aria-label="Cerrar" tabIndex={-1} onClick={() => setMenu(false)} className="fixed inset-0 z-40 cursor-default" />
          {/* Fijo y no adentro de la barra: la barra recorta lo que se sale (para abrirse y cerrarse limpia). */}
          <div
            role="menu"
            onClickCapture={(e) => (e.target as HTMLElement).closest("a") && setMenu(false)}
            className={cn(
              "admin-pop fixed bottom-3 z-50 w-64 overflow-hidden rounded-xl bg-[var(--panel-2)] p-1.5 text-foreground shadow-[var(--shadow-pop)]",
              open ? "left-[260px]" : "left-[92px]",
            )}
          >
            <div className="flex items-center gap-2.5 px-2.5 py-2">
              <Face who={who} size={28} alt="" />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-medium">{PEOPLE[who].name}</span>
                <span className="block truncate text-[11px] text-muted">{other ? `Con ${PEOPLE[other].name}` : "Equipo"}</span>
              </span>
              {other && <CallButton other={other} myRoom={myRoom} />}
            </div>
            <span aria-hidden className="mx-2 my-1 block h-px bg-[var(--line)]" />
            <Link href="/" role="menuitem" className="focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground">
              <ArrowUpRight size={15} /> Ver el sitio
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={onTheme}
              className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              {theme === "dark" ? "Tema claro" : "Tema oscuro"}
            </button>
            <form action={logout}>
              <button role="menuitem" className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-white/[0.05] hover:text-red-400">
                <LogOut size={15} /> Salir
              </button>
            </form>
          </div>
        </>
      )}

      <div
        ref={tipRef}
        aria-hidden
        data-on="false"
        className="pointer-events-none fixed left-[92px] z-50 -translate-y-1/2 rounded-md bg-foreground px-2 py-1 text-[12px] font-medium whitespace-nowrap text-background opacity-0 transition-opacity duration-150 data-[on=true]:opacity-100"
      />
    </div>
  );
}

/** En la barra, mientras carga la sección elegida: un punto naranja (abajo del ícono, o al final de la fila abierta). */
function RailPending({ open }: { open: boolean }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return <span aria-hidden className={cn("h-1 w-1 animate-pulse rounded-full bg-accent", open ? "ml-auto shrink-0" : "absolute bottom-0.5")} />;
}

function Sidebar({
  who,
  myRoom,
  pathname,
  pulse,
  theme,
  onTheme,
  onSearch,
}: {
  who: LeadOwner;
  myRoom: string | null;
  pathname: string;
  pulse: Pulse | null;
  theme: Theme;
  onTheme: () => void;
  onSearch: () => void;
}) {
  const isActive = (href: string) =>
    href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  const inSettings = SETTINGS_PATHS.some(isActive);
  const other = PEOPLE_IDS.find((p) => p !== who) ?? null;
  const mod = useModKey();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
        <Image src="/logo-simbolo.png" alt="" width={26} height={26} className="h-[26px] w-[26px]" />
        <Wordmark className="text-[19px]" />
        <span className="adm-label ml-auto">Panel</span>
      </div>

      <div className="px-3">
        <button
          onClick={onSearch}
          className="focus-ring flex w-full items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--well-soft)] py-2 pr-2 pl-3 text-[13px] text-muted transition-colors hover:border-[var(--line-strong)] hover:text-foreground"
        >
          <Search size={14} />
          Buscar o saltar a…
          <span className="ml-auto flex gap-0.5">
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
      </div>

      <nav aria-label="Secciones del panel" className="admin-scroll mt-4 flex-1 overflow-y-auto px-3">
        {NAV.map((group, gi) => (
          <div key={group.title ?? gi} className="mb-5">
            {group.title && <p className="adm-label mb-1.5 px-2.5">{group.title}</p>}
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
                        "focus-ring group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] transition-colors",
                        on ? "bg-foreground font-medium text-background" : "text-muted hover:bg-white/[0.04] hover:text-foreground",
                      )}
                    >
                      <span className={cn("transition-colors", on ? "text-background" : "text-muted group-hover:text-foreground")}>{item.icon}</span>
                      {item.label}
                      <Pending />
                      {n > 0 && (
                        <span
                          className={cn(
                            "ml-auto min-w-[20px] rounded-full px-1.5 py-px text-center font-mono text-[11px] font-medium",
                            item.tone === "red" ? "bg-red-500 text-white" : "bg-accent text-background",
                          )}
                        >
                          {n}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
              {gi === 0 && (
                <li>
                  <LiveLink on={isActive("/admin/oficinas")} />
                </li>
              )}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--line)] p-3">
        <RunningTimer className="mb-2" />
        <Link
          href="/"
          className="focus-ring mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] text-muted transition-colors hover:bg-white/[0.04] hover:text-foreground"
        >
          <ArrowUpRight size={16} /> Ver el sitio
        </Link>
        <Link
          href="/admin/ajustes"
          aria-current={inSettings ? "page" : undefined}
          className={cn(
            "focus-ring mb-1 flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors",
            inSettings ? "bg-foreground font-medium text-background" : "text-muted hover:bg-white/[0.04] hover:text-foreground",
          )}
        >
          <Settings size={16} /> Ajustes
          <Pending />
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] px-2 py-2">
          <span className="relative">
            <Face who={who} size={28} />
            <span className="absolute -right-0.5 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--panel-0)] bg-emerald-400" />
          </span>
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-[13px] font-medium">{PEOPLE[who].name}</span>
            <span className="block truncate text-[11px] text-muted">{other ? `Con ${PEOPLE[other].name}` : "Equipo"}</span>
          </span>
          {other && <CallButton other={other} myRoom={myRoom} />}
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

/**
 * «En vivo»: el mapa del estudio, arriba junto a Inicio. Sin el naranja (que en el
 * panel quiere decir «atender»): es identidad, no urgencia. El punto verde es «al aire».
 */
function LiveLink({ on }: { on: boolean }) {
  return (
    <Link
      href="/admin/oficinas"
      aria-current={on ? "page" : undefined}
      className={cn(
        "focus-ring group relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[14px] transition-colors",
        on ? "bg-foreground font-medium text-background" : "text-muted hover:bg-white/[0.04] hover:text-foreground",
      )}
    >
      <span aria-hidden className="relative flex h-4 w-4 items-center justify-center">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />
      </span>
      En vivo
      <Pending />
    </Link>
  );
}

/**
 * «Llamar» junto a la cara del socio. Con sala fija abre Meet y le suena el panel al
 * otro en un clic; sin sala fija lleva a Llamadas, que guía el paso a paso.
 */
function CallButton({ other, myRoom }: { other: LeadOwner; myRoom: string | null }) {
  const flash = useToast();
  const [pending, start] = useTransition();
  const name = PEOPLE[other].name;
  const cls = "focus-ring rounded-lg p-1.5 text-muted transition-colors hover:bg-white/[0.06] hover:text-foreground disabled:opacity-50";
  if (!myRoom)
    return (
      <Link href="/admin/llamadas" aria-label={`Llamar a ${name}`} title={`Llamar a ${name}`} className={cls}>
        <Phone size={16} />
      </Link>
    );
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Llamar a ${name}`}
      title={`Llamar a ${name}`}
      className={cls}
      onClick={() => {
        // La pestaña se abre en el mismo clic: si no, el navegador la bloquea.
        window.open(myRoom, "_blank", "noopener");
        start(async () => {
          const res = await ringPerson(other, myRoom);
          flash(res.error ?? `Le suena el panel a ${name}.`, res.error ? "error" : undefined);
        });
      }}
    >
      <Phone size={16} />
    </button>
  );
}

/** «SE7EN» en Archivo ancha, con el 7 en naranja (como en la landing). */
function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("adm-display leading-none", className)}>
      Se<span className="text-accent">7</span>en
    </span>
  );
}

/** Puntito mientras carga la sección elegida (si todavía no estaba precargada). */
function Pending() {
  const { pending } = useLinkStatus();
  return pending ? <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" /> : null;
}
