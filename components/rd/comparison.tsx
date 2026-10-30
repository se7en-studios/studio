"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Zap, Shield, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { EASE_OUT, RdButton, RdLabel, RdLines, RdRoll } from "@/components/rd/primitives";
import { useReducedMotion } from "@/lib/use-reduced-motion";

interface ComparisonCategory {
  id: string;
  label: string;
  competitor: string;
  tagline: string;
  se7enSummary: string;
  competitorSummary: string;
  rows: {
    metric: string;
    se7en: string;
    competitor: string;
    highlight?: boolean;
  }[];
}

const COMPARISONS: ComparisonCategory[] = [
  {
    id: "wordpress",
    label: "vs WordPress / Elementor",
    competitor: "WordPress & Plugins",
    tagline: "Rendimiento, seguridad y costos reales de mantenimiento",
    se7enSummary: "0.5s de carga, cero plugins vulnerables y código 100% propio.",
    competitorSummary: "Webs de 4 a 6 segundos, parches semanales y licencias caras.",
    rows: [
      {
        metric: "Velocidad de carga móvil (LCP)",
        se7en: "0.4s a 0.8s (Lighthouse 95-100)",
        competitor: "3.8s a 6.5s (bloqueado por plugins)",
        highlight: true,
      },
      {
        metric: "Dependencia de plugins externos",
        se7en: "0 plugins (código TypeScript nativo)",
        competitor: "15 a 40 plugins requeridos",
      },
      {
        metric: "Seguridad y superficie de ataque",
        se7en: "Máxima (sin wp-admin ni PHP)",
        competitor: "Vulnerable si no se actualiza a diario",
      },
      {
        metric: "Costo mensual de licencias",
        se7en: "$0 en licencias de plugins",
        competitor: "USD 30 a 150/mes en plugins premium",
      },
      {
        metric: "Propiedad del desarrollo",
        se7en: "Repositorio GitHub 100% a tu nombre",
        competitor: "Instalación atada al hosting o plantilla",
      },
    ],
  },
  {
    id: "tiendanube",
    label: "vs Tiendanube / Shopify",
    competitor: "Plataformas cerradas de E-commerce",
    tagline: "Comisiones por transacción y libertad de diseño",
    se7enSummary: "Cobros directos a tu cuenta, 0% comisión y checkout fluido.",
    competitorSummary: "Comisiones de 2% a 15% sobre tus ventas mes a mes.",
    rows: [
      {
        metric: "Comisión por venta realizada",
        se7en: "0% (la ganancia es 100% tuya)",
        competitor: "2% a 15% por cada venta + abono mensual",
        highlight: true,
      },
      {
        metric: "Pasarela de pagos",
        se7en: "Mercado Pago / Stripe directo a tu cuenta",
        competitor: "Pagos retenidos según plataforma",
      },
      {
        metric: "Flexibilidad de diseño",
        se7en: "Diseño exclusivo en Figma a medida",
        competitor: "Templates idénticos al de tu competencia",
      },
      {
        metric: "Gestión de pedidos gastronómicos o turnos",
        se7en: "Sincronizado a WhatsApp o panel propio",
        competitor: "No soportado o requiere apps extras de pago",
      },
      {
        metric: "Velocidad del checkout en celular",
        se7en: "Instantáneo con 1-click WhatsApp o pago directo",
        competitor: "Multi-paso con formularios largos que pierden ventas",
      },
    ],
  },
  {
    id: "agencias",
    label: "vs Agencias Tradicionales",
    competitor: "Agencias con intermediarios",
    tagline: "Tiempos de entrega, trato directo y transparencia de costos",
    se7enSummary: "Hablás con los 2 ingenieros fundadores. Entrega en 1 a 3 semanas.",
    competitorSummary: "Account managers, presupuestos inflados y 4 meses de espera.",
    rows: [
      {
        metric: "Tiempo de entrega",
        se7en: "1 a 3 semanas (con fecha pactada)",
        competitor: "3 a 6 meses de reuniones y burocracia",
        highlight: true,
      },
      {
        metric: "Interlocutores del proyecto",
        se7en: "Directo con Franco y Federico (fundadores)",
        competitor: "Ejecutivo de cuentas que no programa",
      },
      {
        metric: "Presupuestos y precios",
        se7en: "Desde USD 1.200 (cotizador transparente)",
        competitor: "Desde USD 5.000 a USD 15.000 + comisiones",
      },
      {
        metric: "Garantía post-lanzamiento",
        se7en: "30 días incluidos para ajustes",
        competitor: "Cobro adicional por hora ante cualquier cambio",
      },
      {
        metric: "Tecnología utilizada",
        se7en: "Next.js 16, React 19, Supabase, Tailwind v4",
        competitor: "Suelen tercerizar en WordPress genérico",
      },
    ],
  },
];

export function RdComparison() {
  const [activeTab, setActiveTab] = useState<string>("wordpress");
  const reduced = useReducedMotion();
  const current = COMPARISONS.find((c) => c.id === activeTab) ?? COMPARISONS[0];

  return (
    <section
      id="comparativa"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-24 md:py-36"
    >
      {/* Fondo sutil con resplandor radial */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,77,46,0.06),transparent)]"
      />

      <div className="rd-wrap relative">
        {/* Cabecera de la sección */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <RdLabel index="04" className="text-(--paper)/60">
              Comparativa
            </RdLabel>
            <h2 className="rd-condensed mt-4 text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] text-(--paper)">
              POR QUÉ SE7EN
              <br />
              <span className="text-(--signal)">Y NO UNA PLANTILLA.</span>
            </h2>
          </div>
          <p className="rd-body max-w-md text-base text-(--paper)/65 md:text-lg">
            Desarrollo a medida en Next.js pensado para facturar más: sin cuotas mensuales
            por transacción, sin plugins que se caen y con carga antes de 1 segundo.
          </p>
        </div>

        {/* Selector de competidor */}
        <div className="mt-12 flex flex-wrap gap-2 border-b border-(--line) pb-6">
          {COMPARISONS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rd-label relative rounded-full px-5 py-2.5 text-xs transition-all duration-300 md:text-sm ${
                  isActive
                    ? "bg-(--signal) text-(--ink) font-semibold shadow-[0_0_20px_rgba(255,77,46,0.3)]"
                    : "border border-(--line) text-(--paper)/60 hover:border-(--paper)/40 hover:text-(--paper)"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tabla comparativa interactiva */}
        <AnimatePresence mode="wait">
          <m.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="mt-8"
          >
            {/* Headers de las dos columnas */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Columna Se7en */}
              <div className="relative overflow-hidden rounded-2xl border border-(--signal)/40 bg-gradient-to-b from-(--signal)/10 to-transparent p-6 lg:col-span-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="rd-label rounded-full bg-(--signal) px-3 py-1 text-xs font-bold text-(--ink)">
                    SE7EN STUDIO
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-(--signal)">
                    <Zap size={14} className="fill-current" />
                    Ingeniería a medida
                  </span>
                </div>
                <h3 className="rd-condensed mt-4 text-2xl text-(--paper) md:text-3xl">
                  {current.se7enSummary}
                </h3>

                <div className="mt-8 space-y-4">
                  {current.rows.map((row) => (
                    <div
                      key={row.metric}
                      className={`flex flex-col gap-1 rounded-xl p-3.5 transition-colors ${
                        row.highlight
                          ? "bg-(--signal)/15 border border-(--signal)/30"
                          : "bg-white/[0.03] border border-white/[0.05]"
                      }`}
                    >
                      <span className="rd-label text-[10px] text-(--paper)/50 uppercase">
                        {row.metric}
                      </span>
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-(--signal) shrink-0" strokeWidth={3} />
                        <span className="rd-body text-sm font-medium text-(--paper) md:text-base">
                          {row.se7en}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna Competidor */}
              <div className="rounded-2xl border border-(--line) bg-white/[0.02] p-6 lg:col-span-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="rd-label rounded-full border border-(--line) px-3 py-1 text-xs text-(--paper)/50">
                    {current.competitor.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-(--paper)/40">
                    La vieja manera
                  </span>
                </div>
                <h3 className="rd-condensed mt-4 text-2xl text-(--paper)/60 md:text-3xl">
                  {current.competitorSummary}
                </h3>

                <div className="mt-8 space-y-4">
                  {current.rows.map((row) => (
                    <div
                      key={row.metric}
                      className="flex flex-col gap-1 rounded-xl border border-white/[0.04] bg-white/[0.01] p-3.5"
                    >
                      <span className="rd-label text-[10px] text-(--paper)/40 uppercase">
                        {row.metric}
                      </span>
                      <div className="flex items-center gap-2">
                        <X size={16} className="text-red-400/80 shrink-0" strokeWidth={2.5} />
                        <span className="rd-body text-sm text-(--paper)/60 md:text-base">
                          {row.competitor}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </m.div>
        </AnimatePresence>

        {/* Footer de la comparativa con CTA a cotizador y comparativas completas */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-(--line) bg-white/[0.02] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--signal)/15 text-(--signal)">
              <Sparkles size={20} />
            </span>
            <div>
              <p className="rd-body text-sm font-medium text-(--paper) md:text-base">
                ¿Querés comparar tu caso puntual o el stack de tu empresa?
              </p>
              <p className="rd-label text-xs text-(--paper)/50">
                Analizamos tu web actual gratis y te mostramos métricas reales de Core Web Vitals.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/vs"
              className="rd-btn rd-btn--ghost text-xs md:text-sm"
            >
              <RdRoll>Ver todas las comparativas</RdRoll>
            </Link>
            <RdButton href="/cotizador" variant="signal">
              Cotizar mi proyecto
            </RdButton>
          </div>
        </div>
      </div>
    </section>
  );
}
