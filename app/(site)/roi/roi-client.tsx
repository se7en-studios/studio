"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  TrendingUp,
  DollarSign,
  Zap,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  Calculator,
  Calendar,
  Sparkles,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { CountUp } from "@/components/ui/count-up";
import { useSoundFx } from "@/components/providers/sound-provider";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { SITE } from "@/data/site";

interface PlatformPreset {
  id: string;
  name: string;
  commissionRate: number; // porcentaje (ej: 15% para marketplaces, 2% para shopify)
  monthlyPluginsCost: number; // costo de plugins promedio
  tagline: string;
}

const platforms: PlatformPreset[] = [
  {
    id: "marketplaces",
    name: "Apps / Marketplaces (PedidosYa, Rappi, etc.)",
    commissionRate: 18,
    monthlyPluginsCost: 0,
    tagline: "Comisiones agresivas de 15% a 25% por cada orden",
  },
  {
    id: "shopify",
    name: "Shopify / Tienda Nube (Comisiones + Apps)",
    commissionRate: 2.5,
    monthlyPluginsCost: 120,
    tagline: "Cobro por transacción + decenas de suscripciones a plugins",
  },
  {
    id: "wordpress",
    name: "WordPress / WooCommerce (Lentitud + Mantenimiento)",
    commissionRate: 0,
    monthlyPluginsCost: 180,
    tagline: "Servidor lento, plugins caídos y costo de mantenimiento técnico",
  },
  {
    id: "custom",
    name: "Configuración Personalizada",
    commissionRate: 5,
    monthlyPluginsCost: 100,
    tagline: "Ajustá los porcentajes a tu caso específico",
  },
];

export function RoiCalculatorClient() {
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformPreset>(platforms[0]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(8000); // USD
  const [customCommission, setCustomCommission] = useState(15);
  const [copied, setCopied] = useState(false);

  const { playClick, playPop, playSuccess } = useSoundFx();

  const USD_TO_ARS = 1350;

  const commissionRate =
    selectedPlatform.id === "custom"
      ? customCommission
      : selectedPlatform.commissionRate;

  // Cálculos financieros
  const results = useMemo(() => {
    const monthlyCommissions = (monthlyRevenue * commissionRate) / 100;
    const monthlyPlugins = selectedPlatform.monthlyPluginsCost;
    const totalMonthlyCost = monthlyCommissions + monthlyPlugins;
    const annualSavings = totalMonthlyCost * 12;

    // Estimación de ganancia adicional por velocidad (+15% de conversión con carga < 0.8s)
    const speedBoostMonthly = monthlyRevenue * 0.15;
    const annualSpeedBoost = speedBoostMonthly * 12;

    // Beneficio total anual (Ahorro + Ventas extras)
    const totalAnnualBenefit = annualSavings + annualSpeedBoost;

    // Estimación de inversión promedio en Se7en Studio ($2.800 USD)
    const averageInvestment = 2800;
    const paybackMonths = Math.max(0.8, Number((averageInvestment / (totalMonthlyCost + speedBoostMonthly)).toFixed(1)));

    return {
      monthlyCommissions: Math.round(monthlyCommissions),
      monthlyPlugins: Math.round(monthlyPlugins),
      annualSavings: Math.round(annualSavings),
      annualSpeedBoost: Math.round(annualSpeedBoost),
      totalAnnualBenefit: Math.round(totalAnnualBenefit),
      paybackMonths,
    };
  }, [monthlyRevenue, commissionRate, selectedPlatform]);

  const displayMultiplier = currency === "USD" ? 1 : USD_TO_ARS;
  const currencySymbol = currency === "USD" ? "$" : "$";
  const currencySuffix = currency === "USD" ? "USD" : "ARS";

  function formatMoney(amount: number) {
    const val = amount * displayMultiplier;
    return `${currencySymbol}${val.toLocaleString(currency === "USD" ? "en-US" : "es-AR")} ${currencySuffix}`;
  }

  const reportText = `*Reporte de Ahorro & ROI — Se7en Studio:*
• Plataforma analizada: ${selectedPlatform.name}
• Facturación mensual: ${formatMoney(monthlyRevenue)}
• Ahorro anual en comisiones y plugins: ${formatMoney(results.annualSavings)}
• Crecimiento estimado por velocidad (+15% conversión): ${formatMoney(results.annualSpeedBoost)}
• Beneficio financiero total año 1: ${formatMoney(results.totalAnnualBenefit)}
• Tiempo estimado de recuperación de inversión: ${results.paybackMonths} meses`;

  function handleCopy() {
    playSuccess();
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappUrl = `${SITE.whatsapp}?text=${encodeURIComponent(
    `Hola Se7en Studio! Estuve calculando el ahorro de mi negocio:\n\n${reportText}\n\n¿Podemos evaluar la migración a un producto propio?`
  )}`;

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
              <TrendingUp size={13} className="text-accent" />
              <span>Calculadora Financiera de ROI</span>
            </div>

            <h1 className="display mt-4 text-3xl text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Calculá cuánto dinero ahorrás <br />
              <span className="text-accent">con tu propio producto digital.</span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-muted max-w-2xl mx-auto">
              Dejá de regalar el 15% al 25% de tu facturación en comisiones de terceros o pagar plugins lentos. Mirá tu proyección de ahorro en tiempo real.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
            {/* Columna Izquierda: Parámetros */}
            <div className="space-y-6 lg:col-span-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <h3 className="font-medium text-foreground text-sm uppercase tracking-wider font-mono">
                  1. Tus Parámetros Actuales
                </h3>

                {/* Moneda Toggle */}
                <div className="flex rounded-lg border border-border bg-background p-0.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setCurrency("USD");
                    }}
                    className={`rounded px-2.5 py-1 transition-colors ${
                      currency === "USD"
                        ? "bg-accent text-background font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setCurrency("ARS");
                    }}
                    className={`rounded px-2.5 py-1 transition-colors ${
                      currency === "ARS"
                        ? "bg-accent text-background font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    ARS
                  </button>
                </div>
              </div>

              {/* Selector de Plataforma */}
              <div>
                <label className="block font-mono text-xs text-muted mb-2">
                  Plataforma o modelo actual
                </label>
                <div className="space-y-2">
                  {platforms.map((plat) => {
                    const isSelected = selectedPlatform.id === plat.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => {
                          playPop();
                          setSelectedPlatform(plat);
                        }}
                        className={`focus-ring w-full text-left rounded-xl border p-3.5 transition-all text-xs ${
                          isSelected
                            ? "border-accent bg-surface-2 shadow-[0_0_15px_rgba(255,77,46,0.15)]"
                            : "border-border bg-background text-muted hover:border-foreground/30 hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between font-medium text-foreground">
                          <span>{plat.name}</span>
                          {isSelected && <Check size={14} className="text-accent" />}
                        </div>
                        <p className="mt-1 text-[11px] text-muted">{plat.tagline}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Facturación Mensual Slider */}
              <div>
                <div className="flex items-center justify-between font-mono text-xs mb-2">
                  <span className="text-muted">Facturación mensual promedio:</span>
                  <span className="font-bold text-accent text-sm">
                    {formatMoney(monthlyRevenue)}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={50000}
                  step={500}
                  value={monthlyRevenue}
                  onChange={(e) => setMonthlyRevenue(Number(e.target.value))}
                  className="w-full accent-accent cursor-pointer h-2 bg-background rounded-lg border border-border"
                />
                <div className="flex justify-between font-mono text-[10px] text-muted mt-1">
                  <span>{formatMoney(1000)}</span>
                  <span>{formatMoney(25000)}</span>
                  <span>{formatMoney(50000)}+</span>
                </div>
              </div>

              {/* Comisión personalizada si aplica */}
              {selectedPlatform.id === "custom" && (
                <div>
                  <div className="flex items-center justify-between font-mono text-xs mb-1">
                    <span className="text-muted">Porcentaje de comisión que pagás:</span>
                    <span className="font-bold text-foreground">{customCommission}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={30}
                    step={1}
                    value={customCommission}
                    onChange={(e) => setCustomCommission(Number(e.target.value))}
                    className="w-full accent-accent cursor-pointer h-2 bg-background rounded-lg border border-border"
                  />
                </div>
              )}
            </div>

            {/* Columna Derecha: Proyección Financiera */}
            <div className="lg:col-span-6 rounded-2xl border border-accent/40 bg-gradient-to-b from-surface via-surface to-background p-6 sm:p-8 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
                    Proyección de Beneficio Anual
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-400">
                    Ahorro Directo
                  </span>
                </div>

                {/* Número Grande */}
                <div className="mt-6 rounded-2xl border border-border/80 bg-background/80 p-6 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted">
                    Beneficio Total Estimado (Año 1)
                  </span>
                  <div className="display mt-2 text-4xl sm:text-5xl text-foreground font-bold text-accent">
                    {formatMoney(results.totalAnnualBenefit)}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Incluye ahorro en comisiones + ventas adicionales por velocidad sub-segundo.
                  </p>
                </div>

                {/* Desglose de Métricas */}
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-3.5 text-xs">
                    <span className="text-muted">Ahorro anual en comisiones:</span>
                    <strong className="font-mono text-foreground">{formatMoney(results.annualSavings)}</strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-3.5 text-xs">
                    <span className="text-muted">Crecimiento estimado por velocidad (+15%):</span>
                    <strong className="font-mono text-emerald-400">{formatMoney(results.annualSpeedBoost)}</strong>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/60 bg-surface/60 p-3.5 text-xs">
                    <span className="text-muted">Recuperación estimada de la inversión:</span>
                    <strong className="font-mono text-accent">{results.paybackMonths} meses</strong>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="mt-8 space-y-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(255,77,46,0.35)]"
                >
                  <WhatsAppLogo size={16} />
                  <span>Consultar por mi migración</span>
                  <ArrowRight size={16} />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 font-mono text-xs text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? "¡Copiado!" : "Copiar Reporte"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.dispatchEvent(new CustomEvent("open-booking-modal"))}
                    className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 font-mono text-xs text-muted hover:text-foreground transition-colors"
                  >
                    <Calendar size={14} />
                    <span>Agendar 15 min</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
