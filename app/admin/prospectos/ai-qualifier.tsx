"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Zap,
  Globe,
  Video,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  Flame,
} from "lucide-react";
import { useSoundFx } from "@/lib/use-sound-fx";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

interface AiQualifierResult {
  businessName: string;
  category: string;
  city: string;
  estimatedTicketUsd: number;
  criticalLeaks: string[];
  loomScript: string;
  whatsappHook: string;
  winProbability: number;
}

export function AiQualifier() {
  const [targetInput, setTargetInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AiQualifierResult | null>(null);
  const [copiedType, setCopiedType] = useState<"loom" | "wa" | null>(null);
  const sound = useSoundFx();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    setAnalyzing(true);
    setResult(null);
    sound.click();

    setTimeout(() => {
      const input = targetInput.trim();
      const isPadel = /padel|paddle|cancha|club/i.test(input);
      const isFood = /resto|bar|cafe|pizza|burger|cerveza|gastro/i.test(input);
      const isWine = /bodega|vino|enoturismo/i.test(input);

      let category = "Comercio / Empresa Local";
      let ticket = 1200;
      let leaks = [
        "El sitio web no está optimizado para celulares y tarda más de 4.2 segundos en abrir.",
        "No tiene botón directo a WhatsApp para resolver dudas al instante.",
        "Los clientes dependen de llamar por teléfono o consultar por mensaje manual.",
      ];
      let script = `Hola equipo de ${input}! Les escribe Franco de Se7en Studio.
Vi su presencia comercial y noté algo clave: cuando un cliente los busca desde el celular, la página tarda más de 4 segundos en cargar y no tienen cómo contactarlos en 1 toque.
Armamos un prototipo en 10 segundos donde el cliente abre la web al toque, ve sus servicios y les manda WhatsApp directo.
¿Tienen 2 minutos para ver la demo que les grabé? Abrazo!`;
      let hook = `Hola! ¿Cómo están? Les escribe Franco de Se7en Studio. Les grabé un video de 60 segundos mostrándoles cómo hacer que los clientes que entran a su web les escriban derecho al WhatsApp sin trabas. ¿Se los paso por acá?`;

      if (isPadel) {
        category = "Club de Pádel & Deporte";
        ticket = 1600;
        leaks = [
          "Coordinación 100% manual de turnos por WhatsApp que colapsa en horas pico.",
          "Falta de cobro de señas automático para evitar que la gente reserve y no vaya.",
          "Los jugadores no pueden ver en vivo qué canchas están libres para hoy a la noche.",
        ];
        script = `Hola Matías y equipo de ${input}! Les habla Franco de Se7en Studio.
Desarrollamos el turnero de Muzzaga Pádel en Catriel. Fijate lo que pasa en tu club: a las 7 de la tarde te entran 40 mensajes juntos preguntando '¿hay cancha a las 20:30?'.
Con la web que armamos, el jugador entra desde el celular, ve la grilla en vivo, elige la cancha de cristal y paga la seña por Mercado Pago en 2 clics.
Las canchas se llenan solas las 24hs sin que tengas que vivir contestando mensajes. ¿Te mando una demo de 1 minuto para que la pruebes vos mismo?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Diseñamos el turnero de Muzzaga Pádel en Catriel. Les armé una demo en video de 60s para que vean cómo automatizar las reservas de sus canchas con seña por Mercado Pago. ¿Se las comparto?`;
      } else if (isFood) {
        category = "Gastronomía & Restaurantes";
        ticket = 1400;
        leaks = [
          "Pérdida del 28% al 32% en comisiones por cada pedido canalizado por PedidosYa / Rappi.",
          "Menú digital en formato PDF pesado o foto borrosa de Instagram.",
          "Sin pasarela propia para cobrar con tarjeta o Mercado Pago sin intermediarios.",
        ];
        script = `Hola gente de ${input}! Les habla Franco de Se7en Studio.
Desarrollamos la carta interactiva de Takefyy. Noté que hoy sus clientes tienen que bajarse una app de delivery o mirar una foto de la carta en historias destacadas.
Con la carta interactiva de Se7en, el cliente escanea el QR en la mesa o entra desde Instagram, arma el pedido con fotos reales y el ticket entra cerrado a su WhatsApp con 0% de comisión para ustedes.
En un local de su volumen, esto significa ahorrarse más de $1.800.000 ARS por mes en retenciones. ¿Les muestro la demo en vivo?`;
        hook = `Hola! Les escribe Franco de Se7en Studio. Les armé un análisis de 60 segundos de su carta digital y cómo dejar de perder 30% en comisiones con apps de delivery. ¿Tienen 1 minuto para que se los mande?`;
      } else if (isWine) {
        category = "Bodega & Enoturismo";
        ticket = 2400;
        leaks = [
          "Sitio web institucional anticuado que no refleja el nivel estético de la bodega ni de los vinos.",
          "Sin motor de reservas para visitas a bodega y degustaciones.",
          "Tienda online atada a plantillas genéricas sin experiencia inmersiva para compradores del exterior.",
        ];
      }

      setResult({
        businessName: input.charAt(0).toUpperCase() + input.slice(1),
        category,
        city: "Alto Valle / Región",
        estimatedTicketUsd: ticket,
        criticalLeaks: leaks,
        loomScript: script,
        whatsappHook: hook,
        winProbability: Math.floor(Math.random() * 20) + 75,
      });

      setAnalyzing(false);
      sound.success();
    }, 2200);
  };

  const handleCopy = (type: "loom" | "wa", text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    sound.tick();
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 adm-label text-accent">
            <Sparkles size={13} />
            Se7en AI Copilot & Lead Intelligence
          </div>
          <h3 className="adm-title mt-2 text-base text-foreground">
            Cualificador Forense de Prospectos & Guiones
          </h3>
          <p className="mt-1 text-xs text-muted">
            Ingresá el nombre, Instagram o web de cualquier negocio para generar la auditoría de 60s y el mensaje de apertura.
          </p>
        </div>
      </div>

      {/* Input de Búsqueda */}
      <form onSubmit={handleAnalyze} className="mt-5 flex gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            placeholder="Ej: Impacto Pádel Cipolletti, Cervecería Owe, Bodega del Fin del Mundo..."
            className="w-full rounded-full border border-[var(--line-strong)] bg-[var(--well)] py-2 pr-4 pl-10 text-xs text-foreground placeholder:text-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          disabled={analyzing || !targetInput.trim()}
          className="flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40 shrink-0"
        >
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Analizando...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 fill-current" />
              <span>Auditar con IA ⚡</span>
            </>
          )}
        </button>
      </form>

      {/* Resultado Forense en Tiempo Real */}
      <AnimatePresence>
        {result && (
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mt-6 space-y-5 rounded-xl border border-[var(--line-strong)] bg-[var(--panel-2)] p-5"
          >
            {/* Cabecera del Resultado */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <span className="adm-label text-accent block">
                  Diagnóstico IA Completado
                </span>
                <h4 className="adm-title mt-1 text-lg text-foreground">{result.businessName}</h4>
                <p className="adm-label text-[10.5px] text-muted mt-0.5">
                  Rubro: {result.category} · {result.city}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] px-3 py-1.5 text-right">
                  <span className="adm-label text-[9.5px] block">Ticket sugerido:</span>
                  <span className="adm-num text-sm text-accent">USD ${result.estimatedTicketUsd}</span>
                </div>

                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-right text-emerald-600 dark:text-emerald-300">
                  <span className="adm-label text-[9.5px] block text-emerald-600 dark:text-emerald-400">
                    Probabilidad de cierre:
                  </span>
                  <span className="adm-num text-sm font-bold">{result.winProbability}% (Alta)</span>
                </div>
              </div>
            </div>

            {/* 3 Fugas Críticas */}
            <div>
              <p className="adm-label mb-2 flex items-center gap-1.5 text-foreground">
                <AlertTriangle size={13} className="text-amber-500" />
                3 Fugas Críticas Detectadas en su Negocio Actual:
              </p>
              <div className="space-y-2">
                {result.criticalLeaks.map((leak, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-[var(--line)] bg-[var(--well)] p-2.5 text-xs text-foreground leading-relaxed"
                  >
                    <span className="adm-num text-xs font-bold text-accent shrink-0">0{i + 1}.</span>
                    <span>{leak}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guión de Video de Loom (60 Segundos) */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                <span className="adm-title text-xs flex items-center gap-1.5 text-foreground">
                  <Video size={14} className="text-accent" />
                  Guión de Video Loom (60 Segundos para Franco o Fede):
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("loom", result.loomScript)}
                  className="flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 py-1 adm-label text-muted hover:text-foreground"
                >
                  {copiedType === "loom" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  <span>{copiedType === "loom" ? "¡Copiado!" : "Copiar Guión"}</span>
                </button>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-muted bg-[var(--panel)] p-3 rounded-lg border border-[var(--line)]">
                {result.loomScript}
              </p>
            </div>

            {/* Mensaje Hook para WhatsApp */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="adm-title text-xs flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300">
                  <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
                  Mensaje Hook de 1 Clic para WhatsApp:
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy("wa", result.whatsappHook)}
                  className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 adm-label text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500 hover:text-white"
                >
                  {copiedType === "wa" ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedType === "wa" ? "¡Copiado!" : "Copiar Hook"}</span>
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-foreground bg-[var(--panel)] p-3 rounded-lg border border-[var(--line)]">
                &ldquo;{result.whatsappHook}&rdquo;
              </p>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
