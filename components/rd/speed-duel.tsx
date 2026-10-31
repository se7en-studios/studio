"use client";

import { useState, useEffect } from "react";
import { m } from "framer-motion";
import { Zap, AlertTriangle, CheckCircle2, RotateCcw, Smartphone, Gauge } from "lucide-react";
import { RdButton, RdLabel, RdRoll } from "@/components/rd/primitives";
import { SITE } from "@/data/site";
import { useSoundFx } from "@/lib/use-sound-fx";

export function RdSpeedDuel() {
  const [racing, setRacing] = useState(false);
  const [competitorProgress, setCompetitorProgress] = useState(100);
  const [se7enProgress, setSe7enProgress] = useState(100);
  const [finished, setFinished] = useState(true);
  const [se7enDone, setSe7enDone] = useState(true);
  const [competitorDone, setCompetitorDone] = useState(true);
  const sound = useSoundFx();

  const startRace = () => {
    if (racing) return;
    setRacing(true);
    setFinished(false);
    setSe7enDone(false);
    setCompetitorDone(false);
    setCompetitorProgress(0);
    setSe7enProgress(0);
    sound.click();

    // Se7en carga casi instantáneamente: 350ms
    setTimeout(() => {
      setSe7enProgress(100);
      setSe7enDone(true);
      sound.pop();
    }, 350);

    // Competidor avanza lento, con pausas simulando plugins y base de datos pesada
    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setCompetitorProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          setCompetitorDone(true);
          setFinished(true);
          setRacing(false);
          sound.tick();
          return 100;
        }
        // Saltos desparejos típicos de TTFB y scripts de terceros
        const increment = step < 4 ? 6 : step < 12 ? 4 : 12;
        return Math.min(95, prev + increment);
      });
    }, 200);
  };

  return (
    <section
      id="velocidad"
      data-theme="ink"
      className="relative border-b border-(--line) bg-(--ink) py-24 text-(--paper) selection:bg-(--signal) selection:text-(--ink) lg:py-32"
    >
      <div className="rd-wrap">
        {/* Cabecera */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <RdLabel index="08" className="text-(--paper)/60 lg:col-span-3">
            Duelo de Velocidad
          </RdLabel>

          <div className="lg:col-span-9">
            <span className="inline-flex items-center gap-2 rounded-full border border-(--signal)/30 bg-(--signal)/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-(--signal)">
              <Gauge className="h-3.5 w-3.5" />
              Tu web actual vs Se7en Studios
            </span>
            <h2 className="mt-4 font-serif text-3xl font-light tracking-tight text-(--paper) sm:text-4xl md:text-5xl">
              ¿Por qué una web lenta te espanta a la{" "}
              <span className="italic text-(--signal)">mitad de los clientes</span>?
            </h2>
            <p className="mt-4 max-w-2xl text-base text-(--paper)/70 sm:text-lg">
              En internet no hay segundas oportunidades. Si alguien toca tu anuncio en Instagram
              y tu página tarda 4 segundos en abrir, toca &ldquo;Atrás&rdquo; y le compra a tu competencia.
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={startRace}
                disabled={racing}
                className="inline-flex items-center gap-2.5 rounded-full border border-(--signal) bg-(--signal) px-6 py-3 text-xs font-mono font-bold uppercase tracking-wider text-(--ink) transition-all hover:bg-white disabled:opacity-50"
              >
                {racing ? (
                  <>
                    <RotateCcw className="h-4 w-4 animate-spin" />
                    Midiendo velocidad de carga...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 fill-(--ink)" />
                    Iniciar Carrera de Velocidad en Vivo ⚡
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dual Phone Frame Simulator */}
        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {/* Lado 1: Competidor tradicional */}
          <div className="rounded-3xl border border-rose-500/20 bg-rose-950/10 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-rose-400">
                  Web Tradicional (WordPress / Plantilla)
                </span>
                <p className="text-sm font-semibold text-(--paper)/80 mt-0.5">
                  Cargada con 35 plugins, parches y servidor lento
                </p>
              </div>
              <span className="rounded-full bg-rose-500/10 px-3 py-1 font-mono text-xs text-rose-400">
                {competitorDone ? "4.8 segundos" : `${(competitorProgress * 0.048).toFixed(1)}s...`}
              </span>
            </div>

            {/* Simulación de Pantalla */}
            <div className="mt-6 flex h-64 flex-col justify-between rounded-2xl border border-white/10 bg-black/60 p-5 font-mono text-xs">
              <div className="space-y-3">
                {/* Barra de progreso */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-rose-500 transition-all duration-200"
                    style={{ width: `${competitorProgress}%` }}
                  />
                </div>

                {!competitorDone ? (
                  <div className="flex h-36 flex-col items-center justify-center space-y-2 text-(--paper)/40">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
                    <p className="text-[11px]">Esperando respuesta del servidor...</p>
                    <p className="text-[10px] text-rose-400/80">Ejecutando 18 scripts de rastreo</p>
                  </div>
                ) : (
                  <div className="space-y-3 pt-4 text-(--paper)/70">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      53% de tus visitas ya abandonaron la web
                    </div>
                    <p className="text-[11px] leading-relaxed text-(--paper)/50">
                      El cliente tocó el link desde el celular con 4G, se cansó de esperar la pantalla blanca
                      y volvió al feed a buscar a otro negocio.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-between border-t border-white/10 pt-3 text-[11px] text-(--paper)/40">
                <span>Puntaje Google Móvil:</span>
                <span className="font-bold text-rose-400">38 / 100 (Crítico)</span>
              </div>
            </div>
          </div>

          {/* Lado 2: Se7en Studios */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/10 p-6 sm:p-8">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-emerald-400">
                  Web Se7en Studios (Next.js 16 Edge)
                </span>
                <p className="text-sm font-semibold text-(--paper) mt-0.5">
                  Código puro ultra optimizado distribuido en servidores locales
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 font-mono text-xs font-bold text-emerald-300">
                0.35 segundos ⚡
              </span>
            </div>

            {/* Simulación de Pantalla */}
            <div className="mt-6 flex h-64 flex-col justify-between rounded-2xl border border-emerald-500/20 bg-black/60 p-5 font-mono text-xs">
              <div className="space-y-3">
                {/* Barra de progreso */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-300"
                    style={{ width: `${se7enProgress}%` }}
                  />
                </div>

                <div className="space-y-3 pt-4 text-(--paper)">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Carga instantánea · 100% de retención
                  </div>
                  <p className="text-[11px] leading-relaxed text-(--paper)/70">
                    Abre de inmediato en cualquier celular, incluso con señal débil o datos móviles.
                    Tus clientes ven tus fotos, precios y botón de compra sin esperar ni un segundo.
                  </p>
                </div>
              </div>

              <div className="flex justify-between border-t border-white/10 pt-3 text-[11px]">
                <span className="text-(--paper)/60">Puntaje Google Móvil:</span>
                <span className="font-bold text-emerald-400">99 / 100 (Excelente)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Banner de Auditoría Gratuita */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center sm:p-8">
          <h3 className="text-lg font-bold sm:text-xl">
            ¿Querés saber cuánto tarda tu página web actual y cuánto estás perdiendo?
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-(--paper)/70">
            Mandanos el link de tu web por WhatsApp. Te respondemos con un video de 60 segundos
            mostrándote exactamente qué la hace lenta y cómo arreglarla. 100% gratis.
          </p>
          <div className="mt-5">
            <a
              href={`${SITE.whatsapp}?text=${encodeURIComponent(
                "Hola Franco y Fede! Vi el duelo de velocidad en la web de Se7en. Les paso el link de mi web actual para que me hagan la auditoría en video de 60s gratuita."
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => sound.success()}
              className="rd-btn !h-12 !px-6 !text-xs font-mono uppercase"
            >
              <RdRoll>Pedir auditoría en video de 60s por WhatsApp ↗</RdRoll>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

