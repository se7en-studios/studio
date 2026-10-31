"use client";

import { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { useSoundFx } from "@/lib/use-sound-fx";
import { btnPrimary, btnSecondary, cn } from "../kit";

interface PadelRoiProps {
  initialClubName?: string;
  initialPhone?: string;
  onClose?: () => void;
}

export function PadelRoiCalculator({
  initialClubName = "Club de Pádel",
  initialPhone = "",
  onClose,
}: PadelRoiProps) {
  const sound = useSoundFx();

  // Inputs con valores predeterminados de la región (Catriel / 25 de Mayo / Alto Valle)
  const [clubName, setClubName] = useState(initialClubName);
  const [canchas, setCanchas] = useState(3);
  const [turnosPorDia, setTurnosPorDia] = useState(6);
  const [precioTurno, setPrecioTurno] = useState(14000);
  const [tasaCancelacion, setTasaCancelacion] = useState(15);
  const [copied, setCopied] = useState(false);

  // Cálculos matemáticos en tiempo real
  const metrics = useMemo(() => {
    const turnosMes = canchas * turnosPorDia * 30;
    const facturacionBruta = turnosMes * precioTurno;
    const turnosPerdidos = Math.round(turnosMes * (tasaCancelacion / 100));
    const perdidaMensual = turnosPerdidos * precioTurno;
    const perdidaAnual = perdidaMensual * 12;

    // Con el sistema Se7en de seña obligatoria Mercado Pago + recordatorios de WhatsApp
    // se recupera el 90% de los turnos que antes se cancelaban sin aviso
    const recuperadoMensual = Math.round(perdidaMensual * 0.9);
    const recuperadoAnual = recuperadoMensual * 12;

    // Costo típico del turnero Se7en: USD 1.500 * $1.350 ARS = $2.025.000 ARS
    const costoSoftwareArs = 1500 * 1350;
    const diasAmortizacion = Math.max(12, Math.round(costoSoftwareArs / (recuperadoMensual / 30)));

    return {
      turnosMes,
      facturacionBruta,
      turnosPerdidos,
      perdidaMensual,
      perdidaAnual,
      recuperadoMensual,
      recuperadoAnual,
      diasAmortizacion,
    };
  }, [canchas, turnosPorDia, precioTurno, tasaCancelacion]);

  const pitchText = useMemo(() => {
    const perdidaMesFmt = `$${Math.round(metrics.perdidaMensual / 1000).toLocaleString("es-AR")}k`;
    const recuperadoMesFmt = `$${Math.round(metrics.recuperadoMensual / 1000).toLocaleString("es-AR")}k`;
    return `Hola equipo de ${clubName}! ¿Cómo están? Les escribe Franco de Se7en Studio acá en Catriel (desarrollamos la plataforma de reservas de Muzzaga Pádel: se7en.com.ar/work/muzzaga).

Estuvimos calculando la ocupación de sus canchas: con ${canchas} pistas a ${turnosPorDia} turnos diarios y un promedio habitual de ${tasaCancelacion}% de cancelaciones sin aviso previo, el club deja de percibir cerca de ${perdidaMesFmt} ARS por mes en turnos que quedan vacíos a último momento.

Con nuestro turnero web los jugadores señan el 50% por Mercado Pago al reservar y les llega la confirmación por WhatsApp en 3 clics. El club recupera alrededor de ${recuperadoMesFmt} ARS netos por mes y el desarrollo se amortiza solo en apenas ${metrics.diasAmortizacion} días.

¿Tienen 2 minutos para ver la demo funcionando en el celular?`;
  }, [clubName, canchas, turnosPorDia, tasaCancelacion, metrics]);

  const handleCopyPitch = () => {
    navigator.clipboard.writeText(pitchText);
    setCopied(true);
    sound.tick();
    setTimeout(() => setCopied(false), 2200);
  };

  const handleOpenWhatsApp = () => {
    sound.pop();
    const phone = initialPhone.replace(/\D/g, "");
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(pitchText)}`
      : `https://wa.me/?text=${encodeURIComponent(pitchText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  const handleReset = () => {
    setCanchas(3);
    setTurnosPorDia(6);
    setPrecioTurno(14000);
    setTasaCancelacion(15);
    sound.tick();
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Simulador */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 border border-accent/30 text-accent">
              <Calculator size={15} />
            </span>
            <h3 className="adm-title text-base text-foreground">
              Simulador ROI: Turnero Web para Clubes de Pádel
            </h3>
          </div>
          <p className="adm-label text-[11px] text-muted mt-1">
            Cálculo matemático de fuga por turnos caídos vs. dinero recuperado con seña Mercado Pago Se7en.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--well)] px-3 py-1 text-xs adm-label text-muted hover:text-foreground transition-colors self-start sm:self-auto"
        >
          <RotateCcw size={12} />
          <span>Restablecer</span>
        </button>
      </div>

      {/* Grid: Controles de Parámetros vs Resultados Matemáticos */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* COLUMNA IZQUIERDA: SLIDERS */}
        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-4 space-y-4">
            <span className="adm-label text-[10.5px] uppercase tracking-wider text-muted block mb-1">
              Parámetros Operativos del Club
            </span>

            {/* Nombre del Club para personalizar el pitch */}
            <div>
              <label className="adm-label text-[11px] block mb-1">Nombre del Complejo:</label>
              <input
                type="text"
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                placeholder="Ej: Level Pádel 40/15"
                className="w-full rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-3 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
              />
            </div>

            {/* Slider 1: Canchas */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted">Canchas en funcionamiento:</span>
                <span className="adm-num text-sm text-foreground font-semibold">{canchas} canchas</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                step={1}
                value={canchas}
                onChange={(e) => {
                  setCanchas(Number(e.target.value));
                  sound.tick();
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-accent"
              />
              <div className="flex justify-between adm-label text-[9.5px]">
                <span>1 cancha</span>
                <span>4 canchas</span>
                <span>8 canchas</span>
              </div>
            </div>

            {/* Slider 2: Turnos diarios promedio */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted">Turnos promedio por día/cancha:</span>
                <span className="adm-num text-sm text-foreground font-semibold">{turnosPorDia} turnos/día</span>
              </div>
              <input
                type="range"
                min={3}
                max={10}
                step={1}
                value={turnosPorDia}
                onChange={(e) => {
                  setTurnosPorDia(Number(e.target.value));
                  sound.tick();
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-accent"
              />
              <div className="flex justify-between adm-label text-[9.5px]">
                <span>3 turnos (tarde)</span>
                <span>6 turnos (habitual)</span>
                <span>10 turnos (full día)</span>
              </div>
            </div>

            {/* Slider 3: Precio del turno */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted">Precio del turno (1h30m):</span>
                <span className="adm-num text-sm text-accent font-semibold">
                  ${precioTurno.toLocaleString("es-AR")} ARS
                </span>
              </div>
              <input
                type="range"
                min={8000}
                max={26000}
                step={1000}
                value={precioTurno}
                onChange={(e) => {
                  setPrecioTurno(Number(e.target.value));
                  sound.tick();
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-accent"
              />
              <div className="flex justify-between adm-label text-[9.5px]">
                <span>$8.000 ARS</span>
                <span>$14.000 ARS</span>
                <span>$26.000 ARS</span>
              </div>
            </div>

            {/* Slider 4: % de cancelaciones / no-shows */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted">Turnos cancelados sin aviso (%):</span>
                <span className="adm-num text-sm text-red-600 dark:text-red-400 font-semibold">{tasaCancelacion}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={30}
                step={1}
                value={tasaCancelacion}
                onChange={(e) => {
                  setTasaCancelacion(Number(e.target.value));
                  sound.tick();
                }}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-red-500"
              />
              <div className="flex justify-between adm-label text-[9.5px]">
                <span>5% (bajo)</span>
                <span>15% (habitual)</span>
                <span>30% (caótico)</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: RESULTADOS DEL RETORNO */}
        <div className="space-y-4 lg:col-span-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Tarjeta 1: Fuga Actual Mensual */}
            <div className="rounded-xl border adm-badge-red p-4">
              <span className="adm-label text-[10px] uppercase tracking-wider block">
                Fuga Mensual sin Seña
              </span>
              <p className="adm-num mt-1 text-2xl font-bold">
                -${Math.round(metrics.perdidaMensual / 1000).toLocaleString("es-AR")}k{" "}
                <span className="text-xs font-normal">ARS/mes</span>
              </p>
              <span className="mt-1 block adm-label text-[10px]">
                {metrics.turnosPerdidos} turnos vacíos cada 30 días
              </span>
            </div>

            {/* Tarjeta 2: Dinero Recuperado con Se7en */}
            <div className="rounded-xl border adm-badge-green p-4">
              <span className="adm-label text-[10px] uppercase tracking-wider block">
                Recuperado con Se7en
              </span>
              <p className="adm-num mt-1 text-2xl font-bold">
                +${Math.round(metrics.recuperadoMensual / 1000).toLocaleString("es-AR")}k{" "}
                <span className="text-xs font-normal">ARS/mes</span>
              </p>
              <span className="mt-1 block adm-label text-[10px]">
                Seña 50% Mercado Pago asegurada
              </span>
            </div>
          </div>

          {/* Tarjeta de Amortización & Impacto Anual */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <span className="adm-title text-xs text-foreground flex items-center gap-1.5">
                <Sparkles size={14} className="text-accent" />
                Retorno de Inversión (ROI) Garantizado
              </span>
              <span className="adm-label text-[10px] text-accent font-bold">
                Amortización: {metrics.diasAmortizacion} días
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="adm-label text-[10px] text-muted block">Ahorro Anual Neto:</span>
                <span className="adm-num text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  +${((metrics.recuperadoAnual) / 1000000).toFixed(1)}M ARS
                </span>
              </div>
              <div>
                <span className="adm-label text-[10px] text-muted block">Tiempo en WhatsApp ahorrado:</span>
                <span className="adm-num text-lg font-bold text-foreground">
                  ~45 hs/mes
                </span>
              </div>
            </div>

            <p className="text-[11.5px] leading-relaxed text-muted pt-1">
              Al cobrar la seña obligatoria de forma automática, el jugador asume el compromiso del turno. Las canchas no quedan vacías y el canchero no atiende mensajes en horarios de partido.
            </p>
          </div>

          {/* Caja con el Pitch Matemático Listo para WhatsApp */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="adm-label text-[10px] uppercase tracking-wider text-muted flex items-center gap-1">
                <Zap size={12} className="text-accent" />
                Pitch Matemático Generado
              </span>
              <button
                type="button"
                onClick={handleCopyPitch}
                className="flex items-center gap-1 rounded-full border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 py-0.5 text-[11px] adm-label text-foreground hover:bg-[var(--panel-2)] transition-colors"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? "¡Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="rounded-lg bg-[var(--panel)] border border-[var(--line)] p-2.5 text-[11px] leading-relaxed text-foreground font-mono max-h-36 overflow-y-auto admin-scroll whitespace-pre-wrap">
              {pitchText}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black py-2.5 px-3 text-xs font-bold transition-opacity hover:opacity-90 shadow-sm"
              >
                <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
                <span>Enviar Pitch por WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
