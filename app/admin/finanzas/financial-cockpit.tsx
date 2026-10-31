"use client";

import { useState, useMemo } from "react";
import { m } from "framer-motion";
import {
  TrendingUp,
  DollarSign,
  Calculator,
  ShieldCheck,
  Users,
  Repeat,
  Sparkles,
  ArrowRight,
  PieChart,
  Wallet,
  Gauge,
} from "lucide-react";
import { useSoundFx } from "@/lib/use-sound-fx";

const FX_RATE = 1350; // Cotización dólar de referencia

export function FinancialCockpit() {
  const [closedProjects, setClosedProjects] = useState(3);
  const [avgTicketUsd, setAvgTicketUsd] = useState(2200);
  const [retainersCount, setRetainersCount] = useState(8);
  const [retainerPriceUsd, setRetainerPriceUsd] = useState(120);
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");

  const sound = useSoundFx();

  const metrics = useMemo(() => {
    // 1. Ingresos
    const oneOffMonthlyUsd = closedProjects * avgTicketUsd;
    const mrrMonthlyUsd = retainersCount * retainerPriceUsd;
    const totalGrossMonthlyUsd = oneOffMonthlyUsd + mrrMonthlyUsd;
    const arrAnnualUsd = totalGrossMonthlyUsd * 12;

    // 2. Costos fijos estimados de infraestructura de estudio
    const cloudCostsMonthlyUsd = 220; // Vercel Pro, Supabase, dominios, APIs de IA
    const netProfitMonthlyUsd = Math.max(0, totalGrossMonthlyUsd - cloudCostsMonthlyUsd);

    // 3. Reserva de seguridad (20% para colchón de caja / runway)
    const reserveFundMonthlyUsd = Math.round(netProfitMonthlyUsd * 0.15);
    const distributableUsd = netProfitMonthlyUsd - reserveFundMonthlyUsd;

    // 4. Split de fundadores 50/50
    const perFounderMonthlyUsd = Math.round(distributableUsd / 2);

    // Conversión a ARS
    const totalGrossMonthlyArs = totalGrossMonthlyUsd * FX_RATE;
    const perFounderMonthlyArs = perFounderMonthlyUsd * FX_RATE;
    const arrAnnualArs = arrAnnualUsd * FX_RATE;

    // Runway en meses (asumiendo costo fijo mensual de $220 USD)
    const runwayMonths = Math.min(24, Math.round((reserveFundMonthlyUsd * 6) / cloudCostsMonthlyUsd));

    return {
      oneOffMonthlyUsd,
      mrrMonthlyUsd,
      totalGrossMonthlyUsd,
      totalGrossMonthlyArs,
      arrAnnualUsd,
      arrAnnualArs,
      cloudCostsMonthlyUsd,
      netProfitMonthlyUsd,
      reserveFundMonthlyUsd,
      perFounderMonthlyUsd,
      perFounderMonthlyArs,
      runwayMonths,
    };
  }, [closedProjects, avgTicketUsd, retainersCount, retainerPriceUsd]);

  const fmtCurrency = (valUsd: number, valArs: number) => {
    if (currency === "USD") {
      return `USD $${valUsd.toLocaleString("es-AR")}`;
    }
    return `$${Math.round(valArs).toLocaleString("es-AR")} ARS`;
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.015] p-6 lg:p-8 backdrop-blur-md">
      {/* Header del Cockpit */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 font-mono text-[11px] text-accent uppercase tracking-wider">
            <Gauge size={13} />
            Bloomberg-Grade Cockpit · Se7en Financial OS
          </div>
          <h3 className="mt-2 text-xl font-bold text-foreground">
            Simulador Ejecutivo de Runway, MRR & Dividendos
          </h3>
          <p className="text-xs text-muted/70 mt-0.5">
            Modelá el ritmo de ventas mensual para proyectar facturación, recurrencia y reparto limpio entre socios.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="inline-flex rounded-full border border-white/10 bg-black/40 p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => {
              setCurrency("USD");
              sound.tick();
            }}
            className={`rounded-full px-3 py-1 transition-colors ${
              currency === "USD" ? "bg-accent text-black font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            USD Dólares
          </button>
          <button
            type="button"
            onClick={() => {
              setCurrency("ARS");
              sound.tick();
            }}
            className={`rounded-full px-3 py-1 transition-colors ${
              currency === "ARS" ? "bg-accent text-black font-bold" : "text-muted hover:text-foreground"
            }`}
          >
            ARS Pesos
          </button>
        </div>
      </div>

      {/* Grid: Sliders de Control a la Izquierda vs Métricas Proyectadas a la Derecha */}
      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        {/* LADO IZQUIERDO: CONTROLES / SLIDERS */}
        <div className="space-y-6 lg:col-span-6">
          <h4 className="font-mono text-xs uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Calculator size={13} className="text-accent" />
            Parámetros de Operación Mensual:
          </h4>

          {/* Slider 1: Proyectos Cerrados */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="flex justify-between items-baseline font-mono">
              <label className="text-xs text-muted/80">Proyectos nuevos entregados al mes:</label>
              <span className="text-base font-bold text-accent">{closedProjects} proyectos</span>
            </div>
            <input
              type="range"
              min={1}
              max={8}
              step={1}
              value={closedProjects}
              onChange={(e) => {
                setClosedProjects(Number(e.target.value));
                sound.tick();
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-accent"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted/40">
              <span>1 proyecto</span>
              <span>4 proyectos</span>
              <span>8 proyectos/mes</span>
            </div>
          </div>

          {/* Slider 2: Ticket Promedio */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="flex justify-between items-baseline font-mono">
              <label className="text-xs text-muted/80">Ticket promedio por desarrollo (USD):</label>
              <span className="text-base font-bold text-foreground">USD ${avgTicketUsd.toLocaleString("es-AR")}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={4000}
              step={100}
              value={avgTicketUsd}
              onChange={(e) => {
                setAvgTicketUsd(Number(e.target.value));
                sound.tick();
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-accent"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted/40">
              <span>USD $1.000 (Landing)</span>
              <span>USD $2.400 (Tienda)</span>
              <span>USD $4.000 (SaaS)</span>
            </div>
          </div>

          {/* Slider 3: Clientes en Abono de Mantenimiento */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2">
            <div className="flex justify-between items-baseline font-mono">
              <label className="text-xs text-muted/80">Clientes activos en abono de soporte ($120/mes):</label>
              <span className="text-base font-bold text-emerald-400">{retainersCount} clientes</span>
            </div>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={retainersCount}
              onChange={(e) => {
                setRetainersCount(Number(e.target.value));
                sound.tick();
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-emerald-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted/40">
              <span>0 abonos</span>
              <span>15 abonos</span>
              <span>30 abonos ($3.600 MRR)</span>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: COCKPIT DE RESULTADOS */}
        <div className="space-y-4 lg:col-span-6">
          <h4 className="font-mono text-xs uppercase tracking-wider text-muted flex items-center gap-1.5">
            <TrendingUp size={13} className="text-emerald-400" />
            Rendimiento Financiero Proyectado:
          </h4>

          {/* Tarjeta Principal de Facturación y MRR */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Facturación Mensual Bruta */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-4 font-mono">
              <span className="text-[11px] text-muted uppercase block">Facturación Mensual</span>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {fmtCurrency(metrics.totalGrossMonthlyUsd, metrics.totalGrossMonthlyArs)}
              </p>
              <span className="mt-1 block text-[10px] text-muted/70">
                One-Off: USD ${metrics.oneOffMonthlyUsd} · MRR: USD ${metrics.mrrMonthlyUsd}
              </span>
            </div>

            {/* ARR Proyectado Anual */}
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4 font-mono text-emerald-300">
              <span className="text-[11px] text-emerald-400 uppercase block">ARR Proyectado Anual</span>
              <p className="mt-1 text-2xl font-bold text-emerald-300">
                {fmtCurrency(metrics.arrAnnualUsd, metrics.arrAnnualArs)}
              </p>
              <span className="mt-1 block text-[10px] text-emerald-400/60">
                Caja anualizada con el ritmo actual
              </span>
            </div>
          </div>

          {/* Reparto de Dividendos Socios (Franco & Federico) */}
          <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                <Wallet size={14} />
                Reparto Limpio de Dividendos (50% / 50%)
              </span>
              <span className="text-[11px] text-muted/70">Tras costos & 15% reserva</span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <span className="text-[11px] text-muted block">Socio 1 · Franco:</span>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  {fmtCurrency(metrics.perFounderMonthlyUsd, metrics.perFounderMonthlyArs)}
                </p>
                <span className="text-[10px] text-emerald-400 font-sans">100% líquido disponible</span>
              </div>

              <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                <span className="text-[11px] text-muted block">Socio 2 · Federico:</span>
                <p className="mt-0.5 text-lg font-bold text-foreground">
                  {fmtCurrency(metrics.perFounderMonthlyUsd, metrics.perFounderMonthlyArs)}
                </p>
                <span className="text-[10px] text-emerald-400 font-sans">100% líquido disponible</span>
              </div>
            </div>
          </div>

          {/* Runway de Seguridad y Costos Fijos */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3.5 font-mono text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-muted/80">Fondo de reserva acumulable:</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-foreground">
                USD ${metrics.reserveFundMonthlyUsd} / mes
              </span>
              <span className="ml-2 text-emerald-400 text-[11px]">
                ({metrics.runwayMonths} meses de runway cubiertos)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
