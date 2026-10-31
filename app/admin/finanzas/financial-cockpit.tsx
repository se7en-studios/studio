"use client";

import { useState, useMemo } from "react";
import {
  TrendingUp,
  Calculator,
  ShieldCheck,
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

    // 3. Reserva de seguridad (15% para colchón de caja / runway)
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
    <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 md:p-6">
      {/* Header del Cockpit */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--line)] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 adm-label text-accent">
            <Gauge size={13} />
            Cockpit Financiero · Se7en OS
          </div>
          <h3 className="adm-title mt-2 text-base text-foreground">
            Simulador de Runway, MRR & Dividendos
          </h3>
          <p className="mt-1 text-xs text-muted">
            Modelá el ritmo de ventas mensual para proyectar facturación, recurrencia y reparto limpio entre socios.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--well-soft)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setCurrency("USD");
              sound.tick();
            }}
            className={`rounded-full px-3 py-1 transition-colors adm-label ${
              currency === "USD" ? "bg-foreground text-background font-semibold" : "text-muted hover:text-foreground"
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
            className={`rounded-full px-3 py-1 transition-colors adm-label ${
              currency === "ARS" ? "bg-foreground text-background font-semibold" : "text-muted hover:text-foreground"
            }`}
          >
            ARS Pesos
          </button>
        </div>
      </div>

      {/* Grid: Sliders de Control a la Izquierda vs Métricas Proyectadas a la Derecha */}
      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        {/* LADO IZQUIERDO: CONTROLES / SLIDERS */}
        <div className="space-y-4 lg:col-span-6">
          <h4 className="adm-label flex items-center gap-1.5 text-foreground">
            <Calculator size={13} className="text-accent" />
            Parámetros de Operación Mensual:
          </h4>

          {/* Slider 1: Proyectos Cerrados */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-3.5 space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-xs text-muted">Proyectos nuevos entregados al mes:</label>
              <span className="adm-num text-sm text-accent">{closedProjects} proyectos</span>
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
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-accent"
            />
            <div className="flex justify-between adm-label text-[9.5px]">
              <span>1 proyecto</span>
              <span>4 proyectos</span>
              <span>8 proyectos/mes</span>
            </div>
          </div>

          {/* Slider 2: Ticket Promedio */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-3.5 space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-xs text-muted">Ticket promedio por desarrollo (USD):</label>
              <span className="adm-num text-sm text-foreground">USD ${avgTicketUsd.toLocaleString("es-AR")}</span>
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
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-accent"
            />
            <div className="flex justify-between adm-label text-[9.5px]">
              <span>USD $1.000 (Landing)</span>
              <span>USD $2.400 (Tienda)</span>
              <span>USD $4.000 (SaaS)</span>
            </div>
          </div>

          {/* Slider 3: Clientes en Abono de Mantenimiento */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--well)] p-3.5 space-y-2">
            <div className="flex justify-between items-baseline">
              <label className="text-xs text-muted">Clientes en soporte mensual ($120/mes):</label>
              <span className="adm-num text-sm text-emerald-600 dark:text-emerald-400">{retainersCount} clientes</span>
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
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-[var(--line-strong)] accent-emerald-500"
            />
            <div className="flex justify-between adm-label text-[9.5px]">
              <span>0 abonos</span>
              <span>15 abonos</span>
              <span>30 abonos ($3.600 MRR)</span>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: COCKPIT DE RESULTADOS */}
        <div className="space-y-4 lg:col-span-6">
          <h4 className="adm-label flex items-center gap-1.5 text-foreground">
            <TrendingUp size={13} className="text-emerald-600 dark:text-emerald-400" />
            Rendimiento Financiero Proyectado:
          </h4>

          {/* Tarjeta Principal de Facturación y MRR */}
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Facturación Mensual Bruta */}
            <div className="rounded-xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5">
              <span className="adm-label text-[10px] block">Facturación Mensual</span>
              <p className="adm-num mt-1 text-xl text-foreground">
                {fmtCurrency(metrics.totalGrossMonthlyUsd, metrics.totalGrossMonthlyArs)}
              </p>
              <span className="mt-1 block adm-label text-[9.5px]">
                One-Off: USD ${metrics.oneOffMonthlyUsd} · MRR: USD ${metrics.mrrMonthlyUsd}
              </span>
            </div>

            {/* ARR Proyectado Anual */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-emerald-600 dark:text-emerald-300">
              <span className="adm-label text-[10px] block text-emerald-600 dark:text-emerald-400">ARR Proyectado Anual</span>
              <p className="adm-num mt-1 text-xl font-bold">
                {fmtCurrency(metrics.arrAnnualUsd, metrics.arrAnnualArs)}
              </p>
              <span className="mt-1 block adm-label text-[9.5px] text-emerald-600 dark:text-emerald-400/80">
                Caja anualizada con el ritmo actual
              </span>
            </div>
          </div>

          {/* Reparto de Dividendos Socios (Franco & Federico) */}
          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-2.5">
              <span className="adm-title text-xs text-accent flex items-center gap-1.5">
                <Wallet size={14} />
                Reparto Limpio de Dividendos (50% / 50%)
              </span>
              <span className="adm-label text-[9.5px]">Tras costos & 15% reserva</span>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
                <span className="adm-label text-[9.5px] block">Socio 1 · Franco:</span>
                <p className="adm-num mt-0.5 text-base text-foreground">
                  {fmtCurrency(metrics.perFounderMonthlyUsd, metrics.perFounderMonthlyArs)}
                </p>
                <span className="adm-label text-[9px] text-emerald-600 dark:text-emerald-400">100% líquido disponible</span>
              </div>

              <div className="rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
                <span className="adm-label text-[9.5px] block">Socio 2 · Federico:</span>
                <p className="adm-num mt-0.5 text-base text-foreground">
                  {fmtCurrency(metrics.perFounderMonthlyUsd, metrics.perFounderMonthlyArs)}
                </p>
                <span className="adm-label text-[9px] text-emerald-600 dark:text-emerald-400">100% líquido disponible</span>
              </div>
            </div>
          </div>

          {/* Runway de Seguridad y Costos Fijos */}
          <div className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-[var(--well)] p-3 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-muted text-[11px]">Reserva de seguridad:</span>
            </div>
            <div className="text-right">
              <span className="adm-num font-bold text-foreground">
                USD ${metrics.reserveFundMonthlyUsd} / mes
              </span>
              <span className="ml-2 text-emerald-600 dark:text-emerald-400 adm-label text-[10px]">
                ({metrics.runwayMonths} m de runway)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
