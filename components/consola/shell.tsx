"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { ChevronUp, Plus } from "lucide-react";
import { testimonials } from "@/data/team";
import { SITE } from "@/data/site";
import { EASE_OUT } from "@/components/rd/primitives";
import { PanelBody, PanelMenu } from "@/components/consola/panel";
import { ConsolaProvider, SECTIONS, useConsola } from "@/components/consola/section";

// Armazón de la consola: barra arriba, panel fijo a la izquierda (en escritorio)
// y hoja de abajo (en celular), con la columna de contenido a la derecha.

export function ConsolaShell({ children }: { children: ReactNode }) {
  return (
    <ConsolaProvider>
      <TopBar />
      <div className="relative px-(--gutter) pt-(--cs-top) lg:grid lg:grid-cols-[var(--cs-panel)_minmax(0,1fr)] lg:gap-8">
        <aside aria-label="Panel del estudio" className="hidden lg:block">
          <div className="sticky top-(--cs-top) h-[calc(100svh-var(--cs-top)-20px)] pt-3">
            <Device />
          </div>
        </aside>
        <main id="main" className="min-w-0 pb-28 lg:pb-0">
          {children}
        </main>
      </div>
      <MobileSheet />
    </ConsolaProvider>
  );
}

function Logo() {
  return (
    <Link href="/consola" aria-label="Se7en Studio, inicio" className="rd-display flex items-baseline text-[1.65rem] leading-none tracking-[-0.04em]">
      SE<span className="text-(--signal)">7</span>EN
      <span className="rd-label ml-2 hidden text-[9px] tracking-[0.18em] text-(--paper)/50 sm:inline">Studio</span>
    </Link>
  );
}

function TopBar() {
  const { openTalk, setSheet } = useConsola();
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-(--cs-top) bg-linear-to-b from-[#070708] via-[#070708]/90 to-transparent">
      <div className="flex h-full items-center gap-4 px-(--gutter) lg:grid lg:grid-cols-[var(--cs-panel)_minmax(0,1fr)_auto] lg:gap-8">
        <Logo />
        <div className="hidden min-w-0 justify-center lg:flex">
          <Ticker />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/cotizador"
            className="rd-body hidden h-11 items-center rounded-full border border-(--paper)/15 px-5 text-[14px] text-(--paper)/85 transition-colors hover:border-(--paper)/40 hover:text-(--paper) md:inline-flex"
          >
            Cotizá en 1 min
          </Link>
          <button
            type="button"
            onClick={openTalk}
            className="rd-body inline-flex h-11 items-center rounded-full bg-(--signal) px-5 text-[14px] font-medium text-(--ink) transition-colors hover:bg-(--paper)"
          >
            Hablemos
          </button>
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label="Abrir el menú"
            className="grid h-11 w-11 place-items-center rounded-full border border-(--paper)/20 lg:hidden"
          >
            <span aria-hidden className="flex w-4 flex-col gap-[5px]">
              <span className="h-[1.5px] bg-(--paper)" />
              <span className="h-[1.5px] bg-(--paper)" />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

/** Pastilla de la barra: los testimonios publicados corren de un lado al otro. */
function Ticker() {
  const quotes = testimonials.filter((t) => t.published);
  const items = [...quotes, ...quotes];
  return (
    <div className="flex h-11 w-full max-w-[640px] items-center gap-1 rounded-full border border-(--paper)/12 bg-[#0d0d0f] p-1">
      <span className="rd-label flex h-full shrink-0 items-center gap-1.5 rounded-full bg-(--paper)/[0.07] px-3 text-[10px] text-(--paper)">
        <span className="h-1.5 w-1.5 rounded-full bg-(--signal)" aria-hidden />
        Clientes
      </span>
      <div className="cs-ticker min-w-0 flex-1 overflow-hidden" aria-label="Lo que dicen nuestros clientes">
        <ul className="cs-ticker__track flex w-max gap-10 pl-4">
          {items.map((t, i) => (
            <li key={i} aria-hidden={i >= quotes.length} className="rd-body text-[12.5px] whitespace-nowrap text-(--paper)/65">
              «{t.highlight}» <span className="text-(--paper)/40">— {t.name}, {t.company}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        href="/testimonials"
        className="rd-body flex h-full shrink-0 items-center gap-1 rounded-full bg-(--paper)/[0.07] px-3.5 text-[12.5px] text-(--paper) transition-colors hover:bg-(--paper)/15"
      >
        Ver todo <Plus size={13} aria-hidden />
      </Link>
    </div>
  );
}

/** Hora en la Patagonia; null hasta montar para no romper la hidratación. */
export function useClock(seconds = false) {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      hour: "2-digit",
      minute: "2-digit",
      ...(seconds ? { second: "2-digit" } : {}),
      hour12: false,
    });
    const tick = () => setTime(fmt.format(new Date()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);
  return time;
}

function DeviceHeader({ menu, onMenu }: { menu: boolean; onMenu: () => void }) {
  const { shown } = useConsola();
  const index = SECTIONS.findIndex((s) => s.id === shown);
  const label = menu ? "Menú" : SECTIONS[index].label;
  return (
    <div className="flex items-center justify-between gap-3 px-5 pt-7 pb-4">
      <div className="min-w-0">
        <p className="rd-label text-[10px] text-(--paper)/45">
          Sección {menu ? "" : `· ${String(index + 1).padStart(2, "0")}/${String(SECTIONS.length).padStart(2, "0")}`}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <m.p
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE_OUT }}
            className="cs-cond text-[2rem] text-(--paper)"
          >
            {label}
          </m.p>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={onMenu}
        aria-expanded={menu}
        aria-label={menu ? "Cerrar el menú" : "Abrir el menú"}
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-(--paper)/20 transition-colors hover:border-(--signal)"
      >
        <span aria-hidden className="relative block h-3 w-4">
          <span
            className={`absolute left-0 h-[1.5px] w-4 bg-(--paper) transition-transform duration-300 ${menu ? "top-1.5 rotate-45" : "top-0.5"}`}
          />
          <span
            className={`absolute left-0 h-[1.5px] w-4 bg-(--paper) transition-transform duration-300 ${menu ? "top-1.5 -rotate-45" : "top-2"}`}
          />
        </span>
      </button>
    </div>
  );
}

function DeviceFooter() {
  const time = useClock();
  return (
    <div className="flex items-center justify-between border-t border-(--paper)/[0.07] px-5 py-3">
      <span className="rd-label text-[10px] text-(--paper)/45">
        Catriel, RN · <span className="tabular-nums text-(--paper)/70">{time ?? "--:--"}</span>
      </span>
      <span className="rd-label flex items-center gap-1.5 text-[10px] text-(--paper)/70">
        <span className="h-1.5 w-1.5 rounded-full bg-[#5cdb8b]" aria-hidden />
        {SITE.availability.slots} lugares
      </span>
    </div>
  );
}

/** El panel-consola de escritorio. */
function Device() {
  const [menu, setMenu] = useState(false);
  return (
    <div className="cs-device relative flex h-full flex-col overflow-hidden">
      <DeviceHeader menu={menu} onMenu={() => setMenu((v) => !v)} />
      <div className="cs-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {menu ? <PanelMenu onPick={() => setMenu(false)} /> : <PanelBody />}
      </div>
      <DeviceFooter />
    </div>
  );
}

/** Celular: pastilla abajo que abre la consola como hoja. */
function MobileSheet() {
  const { sheet, setSheet, shown, talk } = useConsola();
  const [menu, setMenu] = useState(false);
  const label = SECTIONS.find((s) => s.id === shown)?.label;

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, setSheet]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => {
          setMenu(false);
          setSheet(true);
        }}
        className="fixed bottom-4 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-3 rounded-full border border-(--paper)/15 bg-[#0d0d0f]/95 pr-5 pl-2 shadow-[0_20px_40px_-12px_#000] backdrop-blur"
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-(--paper)/10">
          <ChevronUp size={18} aria-hidden />
        </span>
        <span className="rd-body text-[15px] whitespace-nowrap">
          Tocá para ver más <span className="text-(--paper)/45">· {label}</span>
        </span>
      </button>
      <AnimatePresence>
        {sheet && (
          <>
            <m.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheet(false)}
              className="fixed inset-0 z-50 bg-black/60"
              aria-hidden
            />
            <m.div
              key="sheet"
              role="dialog"
              aria-modal="true"
              aria-label="Consola del estudio"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.5, ease: EASE_OUT }}
              className="cs-device fixed inset-x-2 bottom-2 z-50 flex max-h-[86svh] flex-col overflow-hidden"
            >
              <DeviceHeader
                menu={menu && !talk}
                onMenu={() => {
                  if (menu) setMenu(false);
                  else if (talk) setSheet(false);
                  else setMenu(true);
                }}
              />
              <div className="cs-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
                {menu && !talk ? <PanelMenu onPick={() => setMenu(false)} /> : <PanelBody />}
              </div>
              <button
                type="button"
                onClick={() => setSheet(false)}
                className="rd-label border-t border-(--paper)/[0.07] py-4 text-[10px] text-(--paper)/60"
              >
                Cerrar
              </button>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
