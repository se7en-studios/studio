"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Laptop,
  Smartphone,
  ArrowRight,
  Info,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { projects } from "@/data/projects";
import { useSoundFx } from "@/components/providers/sound-provider";

interface Hotspot {
  id: string;
  x: number; // porcentaje horizontal (0 a 100)
  y: number; // porcentaje vertical (0 a 100)
  title: string;
  description: string;
  tag: string;
}

const projectHotspots: Record<string, Hotspot[]> = {
  takefyy: [
    {
      id: "takefyy-catalog",
      x: 30,
      y: 35,
      title: "Catálogo en Tiempo Real",
      description: "Sincronización instantánea de stock y platos con base de datos Supabase Postgres.",
      tag: "Supabase Realtime",
    },
    {
      id: "takefyy-order",
      x: 75,
      y: 65,
      title: "Flujo de Checkout Directo",
      description: "Conversión sin fricción directo al WhatsApp del local con detalle de pedido y geolocalización.",
      tag: "0 Fricción",
    },
  ],
  "pone-la-pava": [
    {
      id: "pava-motion",
      x: 45,
      y: 40,
      title: "Animaciones a 60 FPS",
      description: "Motion cinemático con Framer Motion y scroll inercial suave optimizado para móviles.",
      tag: "Motion Craft",
    },
    {
      id: "pava-perf",
      x: 70,
      y: 80,
      title: "Carga Instantánea (<0.6s)",
      description: "Imágenes optimizadas en formato AVIF y Server-Side Rendering en el Edge de Vercel.",
      tag: "Vercel Edge",
    },
  ],
  sentinel: [
    {
      id: "sentinel-map",
      x: 50,
      y: 45,
      title: "Consumo de Datos Satelitales",
      description: "Pipeline en vivo con satélites NASA FIRMS e indexación de riesgo ambiental en tiempo real.",
      tag: "NASA FIRMS API",
    },
    {
      id: "sentinel-ui",
      x: 25,
      y: 75,
      title: "Dashboard Dark-Mode",
      description: "Arquitectura de datos de alto contraste diseñada para analistas y toma de decisiones rápida.",
      tag: "Design System",
    },
  ],
};

export function DeviceShowcase() {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [selectedSlug, setSelectedSlug] = useState("takefyy");
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const { playSwitch, playPop } = useSoundFx();

  const currentProject = projects.find((p) => p.slug === selectedSlug) || projects[0];
  const hotspots = projectHotspots[selectedSlug] || projectHotspots["takefyy"];

  function handleDeviceChange(newDevice: "desktop" | "mobile") {
    playSwitch();
    setDevice(newDevice);
    setActiveHotspot(null);
  }

  function handleProjectChange(slug: string) {
    playPop();
    setSelectedSlug(slug);
    setActiveHotspot(null);
  }

  return (
    <section className="border-t border-border py-20 md:py-28 overflow-hidden">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="Inspección de Viewports"
            title="Diseño y código en cada pantalla."
            subtitle="Explorá nuestros productos en producción con simulador de dispositivos y detalle de ingeniería."
          />

          {/* Selector de Dispositivo Desktop / Mobile */}
          <div className="inline-flex rounded-full border border-border bg-surface p-1 shadow-sm shrink-0">
            <button
              type="button"
              onClick={() => handleDeviceChange("desktop")}
              className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs transition-all ${
                device === "desktop"
                  ? "bg-accent text-background font-medium shadow-[0_0_15px_rgba(255,77,46,0.3)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Laptop size={14} />
              <span>MacBook Pro</span>
            </button>
            <button
              type="button"
              onClick={() => handleDeviceChange("mobile")}
              className={`focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono text-xs transition-all ${
                device === "mobile"
                  ? "bg-accent text-background font-medium shadow-[0_0_15px_rgba(255,77,46,0.3)]"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Smartphone size={14} />
              <span>iPhone 16 Pro</span>
            </button>
          </div>
        </div>

        {/* Selector de Proyectos Tabs */}
        <div className="mt-10 flex flex-wrap items-center gap-2.5 border-b border-border pb-4">
          <span className="font-mono text-xs text-muted mr-2">Inspeccionar:</span>
          {["takefyy", "pone-la-pava", "sentinel"].map((slug) => {
            const p = projects.find((item) => item.slug === slug);
            if (!p) return null;
            const isSelected = selectedSlug === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => handleProjectChange(slug)}
                className={`focus-ring rounded-lg border px-3.5 py-1.5 font-mono text-xs transition-all ${
                  isSelected
                    ? "border-accent bg-accent/10 text-foreground font-semibold"
                    : "border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Escaparate Central con Marco de Dispositivo */}
        <div className="relative mt-12 flex items-center justify-center min-h-[480px] md:min-h-[580px] rounded-3xl border border-border/80 bg-gradient-to-b from-surface/80 via-surface/40 to-background p-6 md:p-12">
          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-radial-accent opacity-30 pointer-events-none blur-3xl" />

          <AnimatePresence mode="wait">
            {device === "desktop" ? (
              /* MacBook Pro Mockup */
              <motion.div
                key={`desktop-${selectedSlug}`}
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-4xl"
              >
                {/* Pantalla & Bisel */}
                <div className="relative mx-auto rounded-t-2xl border-4 border-b-0 border-[#2b2b2e] bg-[#121214] p-2.5 shadow-2xl">
                  {/* Notch / Cámara */}
                  <div className="absolute top-2.5 left-1/2 -translate-x-1/2 h-3.5 w-20 rounded-b-md bg-[#0a0a0c] z-20 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#1b1b22]" />
                  </div>

                  {/* Canvas de imagen */}
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-background">
                    <Image
                      src={currentProject.image}
                      alt={currentProject.name}
                      fill
                      className="object-cover object-top"
                      sizes="(min-width: 1024px) 896px, 100vw"
                      priority
                    />

                    {/* Hotspots interactivos */}
                    {hotspots.map((spot) => (
                      <div
                        key={spot.id}
                        style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setActiveHotspot(activeHotspot === spot.id ? null : spot.id);
                          }}
                          className="group relative flex h-7 w-7 items-center justify-center rounded-full bg-accent text-background font-bold shadow-lg transition-transform duration-300 hover:scale-125"
                          aria-label={`Ver detalle: ${spot.title}`}
                        >
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                          <Info size={13} strokeWidth={2.5} />
                        </button>

                        {/* Tooltip Anotación */}
                        <AnimatePresence>
                          {activeHotspot === spot.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, y: 5 }}
                              className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-64 rounded-xl border border-border bg-surface/95 p-3.5 shadow-2xl backdrop-blur-md z-40"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[10px] text-accent uppercase font-bold">
                                  {spot.tag}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setActiveHotspot(null)}
                                  className="font-mono text-[10px] text-muted hover:text-foreground"
                                >
                                  ✕
                                </button>
                              </div>
                              <h5 className="mt-1 font-medium text-foreground text-xs">
                                {spot.title}
                              </h5>
                              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                                {spot.description}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Base inferior del MacBook */}
                <div className="relative mx-auto h-3 w-full max-w-[96%] rounded-b-xl bg-[#222226] border-t border-[#333339]">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-16 rounded-b bg-[#121214]" />
                </div>
              </motion.div>
            ) : (
              /* iPhone 16 Pro Mockup */
              <motion.div
                key={`mobile-${selectedSlug}`}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-[300px]"
              >
                {/* Marco de Titanio */}
                <div className="relative overflow-hidden rounded-[42px] border-[7px] border-[#2b2b2e] bg-[#0c0c0e] p-2 shadow-2xl">
                  {/* Dynamic Island */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 h-6 w-24 rounded-full bg-black z-30 flex items-center justify-between px-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#151518]" />
                    <span className="h-2 w-2 rounded-full bg-[#0d3326]" />
                  </div>

                  {/* Pantalla Móvil */}
                  <div className="relative aspect-[9/19.5] overflow-hidden rounded-[34px] bg-background">
                    <Image
                      src={currentProject.image}
                      alt={currentProject.name}
                      fill
                      className="object-cover object-top"
                      sizes="300px"
                      priority
                    />

                    {/* Hotspot Móvil */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
                      <button
                        type="button"
                        onClick={() => {
                          playPop();
                          setActiveHotspot(activeHotspot === "mobile-main" ? null : "mobile-main");
                        }}
                        className="group relative flex h-7 w-7 items-center justify-center rounded-full bg-accent text-background font-bold shadow-lg transition-transform hover:scale-125"
                      >
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-70" />
                        <Info size={13} strokeWidth={2.5} />
                      </button>

                      <AnimatePresence>
                        {activeHotspot === "mobile-main" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 5 }}
                            className="absolute left-1/2 bottom-full mb-3 -translate-x-1/2 w-56 rounded-xl border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-md z-40"
                          >
                            <span className="font-mono text-[9px] text-accent uppercase font-bold">
                              Mobile-First Craft
                            </span>
                            <h5 className="mt-0.5 font-medium text-foreground text-xs">
                              Touch Targets & 60 FPS
                            </h5>
                            <p className="mt-1 text-[10px] leading-relaxed text-muted">
                              Optimizada para interacción táctil fluida con gestos nativos y respuesta instantánea.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer info con link al caso de estudio */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4">
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="font-mono uppercase text-accent font-bold">Caso:</span>
            <span className="text-foreground font-medium">{currentProject.name}</span>
            <span>—</span>
            <span>{currentProject.shortDescription}</span>
          </div>

          <Link
            href={`/work/${currentProject.slug}`}
            className="focus-ring inline-flex items-center gap-1.5 font-mono text-xs text-accent hover:underline shrink-0"
          >
            <span>Ver ficha técnica completa</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </Container>
    </section>
  );
}
