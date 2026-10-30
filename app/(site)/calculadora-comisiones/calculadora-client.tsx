"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  TrendingUp,
  Percent,
  DollarSign,
  ShieldAlert,
  Sparkles,
  ShoppingBag,
  Store,
  CheckCircle2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

const PLATFORMS = [
  {
    id: "delivery",
    name: "Apps de Delivery (PedidosYa / Rappi)",
    commissionRate: 0.22, // 22% promedio entre comisión y recargos
    description: "Comisiones por venta entre el 18% y el 28% + cargos por servicio",
    badge: "22% comisión",
  },
  {
    id: "mercadolibre",
    name: "Mercado Libre (Clásica / Premium)",
    commissionRate: 0.16, // 16% promedio
    description: "Comisiones entre 13% y 18% por venta + costo fijo por unidad",
    badge: "16% comisión",
  },
  {
    id: "tiendanube_shopify",
    name: "Tiendanube / Shopify + Apps",
    commissionRate: 0.04, // 2% plataforma + 2% en apps / costos mensuales
    description: "Suscripción mensual fija en USD + comisión por transacción + apps pagas",
    badge: "Costos fijos + 4%",
  },
];

export function CommissionCalculatorClient() {
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
  const [monthlySalesARS, setMonthlySalesARS] = useState<number>(6000000); // 6 millones ARS default
  const [currency, setCurrency] = useState<"ARS" | "USD">("ARS");

  // Cotización de referencia para equivalencia
  const FX_RATE = 1350;

  const calculations = useMemo(() => {
    const rate = selectedPlatform.commissionRate;
    const monthlyLostARS = Math.round(monthlySalesARS * rate);
    const annualLostARS = monthlyLostARS * 12;

    const monthlySalesUSD = Math.round(monthlySalesARS / FX_RATE);
    const monthlyLostUSD = Math.round(monthlyLostARS / FX_RATE);
    const annualLostUSD = Math.round(annualLostARS / FX_RATE);

    // Costo de referencia de una tienda a medida en Se7en Studio: USD 2.400 (~$3.240.000 ARS)
    const se7enCostUSD = 2400;
    const se7enCostARS = se7enCostUSD * FX_RATE;

    // Días hasta recuperar la inversión (ROI)
    const paybackMonths = monthlyLostARS > 0 ? (se7enCostARS / monthlyLostARS).toFixed(1) : "—";
    const paybackDays = monthlyLostARS > 0 ? Math.round((se7enCostARS / monthlyLostARS) * 30) : 0;

    return {
      monthlyLostARS,
      annualLostARS,
      monthlySalesUSD,
      monthlyLostUSD,
      annualLostUSD,
      se7enCostUSD,
      se7enCostARS,
      paybackMonths,
      paybackDays,
    };
  }, [monthlySalesARS, selectedPlatform]);

  const fmtARS = (n: number) =>
    "$" + n.toLocaleString("es-AR") + " ARS";
  const fmtUSD = (n: number) =>
    "$" + n.toLocaleString("en-US") + " USD";

  const whatsappMessage = encodeURIComponent(
    `Hola Franco y Fede! Estuve usando la Calculadora de Comisiones de Se7en Studio:\n\n• Canal actual: ${selectedPlatform.name}\n• Facturación mensual estimada: ${currency === "ARS" ? fmtARS(monthlySalesARS) : fmtUSD(calculations.monthlySalesUSD)}\n• Dinero que se va en comisiones al año: ${currency === "ARS" ? fmtARS(calculations.annualLostARS) : fmtUSD(calculations.annualLostUSD)}\n\nQuiero ver cómo armar una tienda/plataforma propia sin comisiones. ¿Podemos coordinar?`
  );

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Cabecera */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-accent">
            <Calculator size={13} />
            <span>Herramienta gratuita para comercios y marcas</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
            Calculadora de Comisiones: <br />
            <span className="text-accent">¿Cuánto dinero estás perdiendo por mes?</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Ingresá cuánto factura tu negocio por mes en apps de delivery o marketplaces y calculá exactamente cuánto se llevan en comisiones frente a tener una tienda propia en Next.js.
          </p>
        </div>

        {/* Bloque interactivo de la calculadora */}
        <div className="mt-16 mx-auto max-w-4xl rounded-3xl border border-border bg-surface p-6 md:p-12 shadow-2xl">
          <div className="grid gap-10 lg:grid-cols-12">
            {/* Columna Izquierda: Controles del Usuario */}
            <div className="space-y-8 lg:col-span-7">
              {/* Selector de Plataforma */}
              <div>
                <label className="block font-mono text-xs tracking-wider uppercase text-muted mb-3">
                  1. ¿Dónde vendés principalmente hoy?
                </label>
                <div className="space-y-2.5">
                  {PLATFORMS.map((plat) => {
                    const active = plat.id === selectedPlatform.id;
                    return (
                      <button
                        key={plat.id}
                        type="button"
                        onClick={() => setSelectedPlatform(plat)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                          active
                            ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(255,77,46,0.15)]"
                            : "border-border bg-background hover:border-foreground/30"
                        }`}
                      >
                        <div>
                          <span className="block font-medium text-foreground text-sm">
                            {plat.name}
                          </span>
                          <span className="block text-xs text-muted mt-0.5">
                            {plat.description}
                          </span>
                        </div>
                        <span
                          className={`font-mono text-xs px-2.5 py-1 rounded-full shrink-0 ${
                            active
                              ? "bg-accent text-background font-semibold"
                              : "bg-surface text-muted border border-border"
                          }`}
                        >
                          {plat.badge}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slider de Facturación Mensual */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="font-mono text-xs tracking-wider uppercase text-muted">
                    2. Facturación bruta mensual promedio
                  </label>
                  <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 text-xs font-mono">
                    <button
                      type="button"
                      onClick={() => setCurrency("ARS")}
                      className={`px-2 py-0.5 rounded ${
                        currency === "ARS" ? "bg-accent text-background font-semibold" : "text-muted"
                      }`}
                    >
                      ARS
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrency("USD")}
                      className={`px-2 py-0.5 rounded ${
                        currency === "USD" ? "bg-accent text-background font-semibold" : "text-muted"
                      }`}
                    >
                      USD
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-border bg-background flex items-baseline justify-between">
                  <span className="font-mono text-2xl font-bold text-foreground">
                    {currency === "ARS"
                      ? fmtARS(monthlySalesARS)
                      : fmtUSD(calculations.monthlySalesUSD)}
                  </span>
                  <span className="text-xs font-mono text-muted">por mes</span>
                </div>

                <input
                  type="range"
                  min={1000000}
                  max={30000000}
                  step={500000}
                  value={monthlySalesARS}
                  onChange={(e) => setMonthlySalesARS(Number(e.target.value))}
                  className="w-full mt-4 accent-accent cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[11px] text-muted mt-1">
                  <span>$1M ARS (~$740 USD)</span>
                  <span>$15M ARS</span>
                  <span>$30M ARS (~$22K USD)</span>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Resultado del Impacto Financiero */}
            <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl border border-accent/40 bg-gradient-to-br from-surface to-surface-2 p-6 md:p-8">
              <div>
                <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-accent uppercase tracking-wider">
                  <ShieldAlert size={14} />
                  Fuga de dinero calculada
                </span>

                <div className="mt-6 space-y-4">
                  <div className="border-b border-border pb-4">
                    <span className="block text-xs font-mono text-muted">
                      Comisiones que pagás cada mes:
                    </span>
                    <span className="block text-3xl font-bold text-foreground mt-1">
                      {currency === "ARS"
                        ? fmtARS(calculations.monthlyLostARS)
                        : fmtUSD(calculations.monthlyLostUSD)}
                    </span>
                  </div>

                  <div className="border-b border-border pb-4">
                    <span className="block text-xs font-mono text-muted">
                      En 1 año se llevan de tu negocio:
                    </span>
                    <span className="block text-3xl font-extrabold text-[#ff4d2e] mt-1">
                      {currency === "ARS"
                        ? fmtARS(calculations.annualLostARS)
                        : fmtUSD(calculations.annualLostUSD)}
                    </span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} className="text-emerald-400 shrink-0" />
                      <span className="text-xs font-mono text-emerald-400 font-semibold">
                        Recuperás tu tienda propia en ~{calculations.paybackDays} días
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted mt-1.5">
                      Una tienda a medida en Se7en Studio cuesta desde USD 2.400 (pago único, sin comisiones mensuales). Con tu volumen actual de ventas, el ahorro mensual paga el 100% del desarrollo en {calculations.paybackMonths} meses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botón CTA Directo a WhatsApp */}
              <div className="mt-8 pt-4 border-t border-border">
                <a
                  href={`${SITE.whatsapp}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-sm font-semibold text-background hover:bg-accent/90 transition-all shadow-[0_0_25px_rgba(255,77,46,0.35)]"
                >
                  <WhatsAppLogo size={18} />
                  <span>Quiero mi tienda sin comisiones</span>
                </a>
                <p className="text-center font-mono text-[10px] text-muted mt-2">
                  Hablás directo con Franco y Federico · Respuesta en &lt; 24h
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Casos reales que ya lo hicieron */}
        <div className="mt-20 mx-auto max-w-4xl">
          <div className="text-center max-w-xl mx-auto">
            <span className="font-mono text-xs uppercase tracking-widest text-accent">
              Arquitectura probada en producción
            </span>
            <h2 className="display mt-2 text-3xl text-foreground">
              Negocios que ya dejaron de regalar comisiones
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <span className="font-mono text-xs text-accent">Plataforma SaaS</span>
              <h3 className="display mt-1 text-xl text-foreground">Takefyy</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Catálogo digital en tiempo real con checkout directo a WhatsApp para restaurantes. Decenas de miles de pedidos procesados con 0% de comisión por venta.
              </p>
              <Link
                href="/work/takefyy"
                className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
              >
                <span>Ver caso</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <span className="font-mono text-xs text-accent">E-Commerce Propio</span>
              <h3 className="display mt-1 text-xl text-foreground">Poné La Pava</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Tienda online con identidad editorial, stock en vivo y cobros con Mercado Pago. +120% en tasa de conversión frente a plantillas tradicionales.
              </p>
              <Link
                href="/work/pone-la-pava"
                className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
              >
                <span>Ver caso</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6">
              <span className="font-mono text-xs text-accent">Catálogo Apple</span>
              <h3 className="display mt-1 text-xl text-foreground">iPhone Vita</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Buscador interactivo de iPhone, Plan Canje y panel autogestionable de precios para vender tecnología de alto valor sin pagar el 16% de Mercado Libre.
              </p>
              <Link
                href="/work/iphone-vita"
                className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline"
              >
                <span>Ver caso</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
