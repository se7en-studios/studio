"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Check, X, Sparkles, Zap, ArrowUpRight, HelpCircle } from "lucide-react";
import Link from "next/link";
import { EASE_OUT, RdButton, RdLabel, RdRoll } from "@/components/rd/primitives";

interface ComparisonCategory {
  id: string;
  label: string;
  competitor: string;
  tagline: string;
  se7enSummary: string;
  competitorSummary: string;
  rows: {
    question: string;
    se7en: string;
    competitor: string;
    highlight?: boolean;
  }[];
}

const COMPARISONS: ComparisonCategory[] = [
  {
    id: "wordpress",
    label: "vs Plantillas baratas (WordPress)",
    competitor: "Plantillas genéricas de internet",
    tagline: "¿Por qué una plantilla barata te termina saliendo cara?",
    se7enSummary: "Abre al instante en cualquier teléfono, no se rompe y es 100% tuya.",
    competitorSummary: "Páginas pesadas que tardan 5 segundos, se desactualizan y se traban.",
    rows: [
      {
        question: "¿Cuánto tarda en abrir en el celular de tu cliente?",
        se7en: "Menos de 1 segundo (abre al toque, nadie se va esperando)",
        competitor: "4 a 6 segundos (la gente se cansa de esperar y se va a la competencia)",
        highlight: true,
      },
      {
        question: "¿Se puede romper o trabar sola con el tiempo?",
        se7en: "No. Hecha sólida a medida, sin piezas raras que fallen",
        competitor: "Usa 30 aplicaciones y parches que se vencen y rompen la web",
      },
      {
        question: "¿La página es de tu propiedad para siempre?",
        se7en: "Sí, 100% tuya. Como ser dueño de tu propio local",
        competitor: "Atada a licencias anuales de empresas de afuera",
      },
      {
        question: "¿Cuánto pagás por mes para que siga funcionando?",
        se7en: "$0 de mantenimiento obligatorio. No te cobramos alquiler",
        competitor: "USD 30 a 150 por mes en plugins para que no se caiga",
      },
      {
        question: "¿El diseño es exclusivo para tu marca?",
        se7en: "Diseño único pensado para tu negocio y tus clientes",
        competitor: "Una plantilla repetida que usan cientos de otros sitios",
      },
    ],
  },
  {
    id: "tiendanube",
    label: "vs Alquiler de tienda (Tiendanube / Shopify)",
    competitor: "Plataformas de alquiler mensual",
    tagline: "¿Por qué pagar comisiones por cada venta que hacés?",
    se7enSummary: "Toda la plata de tus ventas va a tu cuenta: 0% de comisiones para nosotros.",
    competitorSummary: "Te sacan un porcentaje de cada venta más una mensualidad fija.",
    rows: [
      {
        question: "¿Cuánto te cobran por cada venta que hacés?",
        se7en: "0% de comisión (el 100% de la ganancia es tuyo)",
        competitor: "Te sacan entre 2% y 15% de cada producto que vendés",
        highlight: true,
      },
      {
        question: "¿Cómo recibís la plata de tus clientes?",
        se7en: "Directo a tu Mercado Pago o banco al instante",
        competitor: "La plata pasa por la plataforma y te aplican cargos extra",
      },
      {
        question: "¿Qué pasa si un mes no pagás la cuota?",
        se7en: "Tu web sigue abierta y funcionando, porque es tuya",
        competitor: "Te bajan la persiana y te apagan la tienda online",
      },
      {
        question: "¿Tus clientes pueden pedirte o reservar por WhatsApp?",
        se7en: "Sí, en 1 toque el cliente arma su pedido y te llega listo al WhatsApp",
        competitor: "Formularios largos y complicados donde la gente abandona",
      },
      {
        question: "¿Cómo se ve tu negocio frente a la competencia?",
        se7en: "Tu marca se ve seria, profesional y como una empresa grande",
        competitor: "El mismo formato estándar que tienen todos los demás negocios",
      },
    ],
  },
  {
    id: "agencias",
    label: "vs Agencias tradicionales",
    competitor: "Agencias con intermediarios",
    tagline: "¿Cuánto tardan y con quién hablás de verdad?",
    se7enSummary: "Hablás por WhatsApp directo con Franco y Fede. Lista en 1 a 3 semanas.",
    competitorSummary: "Reuniones eternas, secretarias intermediarias y 4 meses de espera.",
    rows: [
      {
        question: "¿Cuánto tardamos en tenerla lista y funcionando?",
        se7en: "1 a 3 semanas (con fecha pactada de antemano)",
        competitor: "3 a 5 meses entre reuniones, presupuestos y demoras",
        highlight: true,
      },
      {
        question: "¿Con quién hablás durante el proyecto?",
        se7en: "Directo por WhatsApp con Franco y Fede (los fundadores)",
        competitor: "Con un vendedor o intermediario que no sabe programar",
      },
      {
        question: "¿Sabés el precio exacto antes de empezar?",
        se7en: "Sí, precio fijo y claro desde el día 1, sin sorpresas",
        competitor: "Presupuestos inflados de USD 5.000 a USD 15.000 con extras",
      },
      {
        question: "¿Qué pasa si necesitás hacer un ajuste post-entrega?",
        se7en: "Tenés 30 días de garantía incluidos para acomodar lo que quieras",
        competitor: "Te cobran cada hora de reunión o cambio adicional",
      },
      {
        question: "¿Quién programa tu página?",
        se7en: "Nosotros dos directamente, con la mejor ingeniería moderna",
        competitor: "Suelen subcontratar afuera o poner a un pasante",
      },
    ],
  },
];

export function RdComparison() {
  const [activeTab, setActiveTab] = useState<string>("wordpress");
  const current = COMPARISONS.find((c) => c.id === activeTab) ?? COMPARISONS[0];

  return (
    <section
      id="comparativa"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-24 md:py-36 border-t border-(--line)"
    >
      {/* Resplandor suave de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[60vw] w-[60vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,77,46,0.06),transparent)]"
      />

      <div className="rd-wrap relative">
        {/* Cabecera en lenguaje humano y simple */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <RdLabel index="04" className="text-(--paper)/60">
              Sin tecnicismos
            </RdLabel>
            <h2 className="rd-condensed mt-4 text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] text-(--paper)">
              QUÉ DIFERENCIA HAY
              <br />
              <span className="text-(--signal)">CON OTRAS OPCIONES.</span>
            </h2>
          </div>
          <p className="rd-body max-w-md text-base text-(--paper)/75 md:text-lg">
            Te lo explicamos en cristiano: por qué una web bien hecha te hace ganar clientes
            y una opción barata o improvisada te termina saliendo cara.
          </p>
        </div>

        {/* Pestañas de comparación */}
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
                    ? "bg-(--signal) text-(--ink) font-bold shadow-[0_0_20px_rgba(255,77,46,0.3)]"
                    : "border border-(--line) text-(--paper)/60 hover:border-(--paper)/40 hover:text-(--paper)"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido de la comparativa */}
        <AnimatePresence mode="wait">
          <m.div
            key={current.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
            className="mt-8"
          >
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Columna Se7en */}
              <div className="relative overflow-hidden rounded-2xl border border-(--signal)/50 bg-gradient-to-b from-(--signal)/10 to-white/[0.01] p-6 lg:col-span-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="rd-label rounded-full bg-(--signal) px-3.5 py-1 text-xs font-bold text-(--ink)">
                    HACERLA CON SE7EN
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-(--signal)">
                    <Zap size={14} className="fill-current" />
                    Pensada para vender
                  </span>
                </div>

                <h3 className="rd-condensed mt-4 text-2xl text-(--paper) md:text-3xl">
                  {current.se7enSummary}
                </h3>

                <div className="mt-8 space-y-4">
                  {current.rows.map((row) => (
                    <div
                      key={row.question}
                      className={`flex flex-col gap-1.5 rounded-xl p-4 transition-colors ${
                        row.highlight
                          ? "bg-(--signal)/15 border border-(--signal)/35"
                          : "bg-white/[0.03] border border-white/[0.05]"
                      }`}
                    >
                      <span className="rd-label text-[11px] text-(--paper)/55 flex items-center gap-1.5">
                        <HelpCircle size={12} className="text-(--signal)" />
                        {row.question}
                      </span>
                      <div className="flex items-start gap-2.5">
                        <Check size={18} className="text-(--signal) shrink-0 mt-0.5" strokeWidth={3} />
                        <span className="rd-body text-sm font-medium text-(--paper) md:text-base leading-snug">
                          {row.se7en}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna Alternativas */}
              <div className="rounded-2xl border border-(--line) bg-white/[0.02] p-6 lg:col-span-6 md:p-8">
                <div className="flex items-center justify-between">
                  <span className="rd-label rounded-full border border-(--line) px-3 py-1 text-xs text-(--paper)/50">
                    {current.competitor.toUpperCase()}
                  </span>
                  <span className="text-xs font-mono text-(--paper)/40">
                    Otras opciones
                  </span>
                </div>

                <h3 className="rd-condensed mt-4 text-2xl text-(--paper)/60 md:text-3xl">
                  {current.competitorSummary}
                </h3>

                <div className="mt-8 space-y-4">
                  {current.rows.map((row) => (
                    <div
                      key={row.question}
                      className="flex flex-col gap-1.5 rounded-xl border border-white/[0.04] bg-white/[0.01] p-4"
                    >
                      <span className="rd-label text-[11px] text-(--paper)/40">
                        {row.question}
                      </span>
                      <div className="flex items-start gap-2.5">
                        <X size={18} className="text-red-400/80 shrink-0 mt-0.5" strokeWidth={2.5} />
                        <span className="rd-body text-sm text-(--paper)/65 md:text-base leading-snug">
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

        {/* Tarjeta de soporte y llamada a la acción */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-(--line) bg-white/[0.02] p-6 md:p-8">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--signal)/15 text-(--signal)">
              <Sparkles size={22} />
            </span>
            <div>
              <p className="rd-body text-sm font-medium text-(--paper) md:text-base">
                ¿Tenés dudas sobre cuál opción te conviene a vos?
              </p>
              <p className="rd-label text-xs text-(--paper)/50">
                Mandanos un WhatsApp y te decimos con total honestidad qué te conviene hacer.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <RdButton href="/cotizador" variant="signal">
              Cotizar mi página en 1 min
            </RdButton>
          </div>
        </div>
      </div>
    </section>
  );
}
