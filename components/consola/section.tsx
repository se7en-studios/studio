"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// La consola sigue a la sección que está en pantalla: el panel de la izquierda
// (o la hoja de abajo, en celular) cambia de contenido según dónde estés.

export const SECTIONS = [
  { id: "inicio", label: "Inicio" },
  { id: "trabajos", label: "Trabajos" },
  { id: "piezas", label: "Piezas" },
  { id: "notas", label: "Notas" },
  { id: "equipo", label: "Equipo" },
  { id: "faq", label: "Preguntas" },
  { id: "contacto", label: "Contacto" },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

type Ctx = {
  /** Sección en pantalla. */
  active: SectionId;
  /** Lo que muestra el panel: la sección, o contacto si alguien tocó «Hablemos». */
  shown: SectionId;
  /** «Hablemos» fija el panel en el formulario hasta que lo cierren. */
  talk: boolean;
  openTalk: () => void;
  closeTalk: () => void;
  /** Hoja de abajo en celular. */
  sheet: boolean;
  setSheet: (open: boolean) => void;
  goTo: (id: SectionId) => void;
};

const SectionCtx = createContext<Ctx | null>(null);

export function useConsola() {
  const ctx = useContext(SectionCtx);
  if (!ctx) throw new Error("useConsola fuera de <ConsolaProvider>");
  return ctx;
}

export function ConsolaProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<SectionId>("inicio");
  const [talk, setTalk] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-cs-section]")];
    // Una franja en el medio de la pantalla: la sección que la cruza es la activa.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.getAttribute("data-cs-section") as SectionId);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const openTalk = useCallback(() => {
    setTalk(true);
    setSheet(true);
  }, []);
  const closeTalk = useCallback(() => setTalk(false), []);
  // Cerrar la hoja (celular) suelta también el formulario fijado por «Hablemos».
  const toggleSheet = useCallback((open: boolean) => {
    setSheet(open);
    if (!open) setTalk(false);
  }, []);
  const goTo = useCallback((id: SectionId) => {
    setSheet(false);
    setTalk(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      active,
      shown: talk ? "contacto" : active,
      talk,
      openTalk,
      closeTalk,
      sheet,
      setSheet: toggleSheet,
      goTo,
    }),
    [active, talk, openTalk, closeTalk, sheet, toggleSheet, goTo],
  );
  return <SectionCtx.Provider value={value}>{children}</SectionCtx.Provider>;
}

/** Sección de la columna principal que la consola sigue. */
export function CsSection({
  id,
  children,
  className = "",
  label,
}: {
  id: SectionId;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section id={id} data-cs-section={id} aria-label={label} className={`scroll-mt-28 ${className}`}>
      {children}
    </section>
  );
}
