"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Building2,
  UtensilsCrossed,
  Shirt,
  Briefcase,
  Stethoscope,
  Store,
  Clock,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SITE } from "@/data/site";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

const INDUSTRIES = [
  {
    id: "inmobiliaria",
    name: "Inmobiliaria & Real Estate",
    icon: Building2,
    baseDays: "14 a 21 días",
    baseUsdMin: 1200,
    baseUsdMax: 1600,
    featuresDefault: ["Catálogo de propiedades", "Buscador con filtros", "WhatsApp directo por ficha"],
  },
  {
    id: "gastronomia",
    name: "Gastronomía & Restaurantes",
    icon: UtensilsCrossed,
    baseDays: "7 a 14 días",
    baseUsdMin: 950,
    baseUsdMax: 1300,
    featuresDefault: ["Menú QR ultra veloz", "Pedidos a WhatsApp sin comisión", "Ubicación y reservas"],
  },
  {
    id: "ropa",
    name: "Marcas de Ropa & Moda",
    icon: Shirt,
    baseDays: "14 a 21 días",
    baseUsdMin: 1400,
    baseUsdMax: 1900,
    featuresDefault: ["Tienda 0% comisiones", "Variantes talle/color", "Mercado Pago & envíos"],
  },
  {
    id: "profesionales",
    name: "Estudios & Consultoras",
    icon: Briefcase,
    baseDays: "10 a 15 días",
    baseUsdMin: 1100,
    baseUsdMax: 1500,
    featuresDefault: ["Presentación institucional", "Agenda de reuniones", "Captación de consultas corporativas"],
  },
  {
    id: "salud",
    name: "Clínicas & Salud / Estética",
    icon: Stethoscope,
    baseDays: "10 a 18 días",
    baseUsdMin: 1100,
    baseUsdMax: 1500,
    featuresDefault: ["Ficha de tratamientos", "Gestión de turnos", "Mapa y convenios prepagas"],
  },
  {
    id: "pyme",
    name: "Comercio / Empresa / Pyme",
    icon: Store,
    baseDays: "10 a 18 días",
    baseUsdMin: 1000,
    baseUsdMax: 1500,
    featuresDefault: ["Catálogo de productos o servicios", "WhatsApp integrado", "Diseño a medida"],
  },
];

const GOALS = [
  { id: "ventas", label: "Vender online sin pagar comisiones por venta", addUsd: 200 },
  { id: "leads", label: "Captar consultas de clientes directos al WhatsApp", addUsd: 0 },
  { id: "renovar", label: "Reemplazar una web vieja, fea o lenta", addUsd: 100 },
  { id: "turnos", label: "Automatizar reservas o turnos online", addUsd: 150 },
  { id: "saas", label: "Desarrollar una plataforma o software a medida", addUsd: 600 },
];

const SITUATIONS = [
  { id: "cero", label: "Empezamos de cero (no tenemos web)", note: "Diseño y estructura desde los cimientos" },
  { id: "cambio_plataforma", label: "Tengo Tiendanube / WordPress y quiero algo propio y rápido", note: "Migración limpia de contenido" },
  { id: "rediseño", label: "Tengo web pero está desactualizada y no convierte", note: "Rediseño completo de conversión" },
];

const EXTRA_FEATURES = [
  { id: "admin", label: "Panel autoadministrable fácil para subir fotos/precios", cost: 0, default: true },
  { id: "seo", label: "Optimización SEO para posicionar en Google en mi ciudad", cost: 150, default: true },
  { id: "pagos", label: "Integración de Mercado Pago / Cobros con tarjetas", cost: 100, default: false },
  { id: "en", label: "Versión en dos idiomas (Español + Inglés)", cost: 250, default: false },
];

const FX_RATE = 1350; // Cotización de referencia

export function CotizadorClient() {
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [selectedGoal, setSelectedGoal] = useState(GOALS[1]);
  const [selectedSituation, setSelectedSituation] = useState(SITUATIONS[0]);
  const [activeExtras, setActiveExtras] = useState<string[]>(["admin", "seo"]);
  const [currency, setCurrency] = useState<"ARS" | "USD">("USD");

  const toggleExtra = (id: string) => {
    setActiveExtras((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const calculation = useMemo(() => {
    let extraCost = selectedGoal.addUsd;
    EXTRA_FEATURES.forEach((item) => {
      if (activeExtras.includes(item.id)) {
        extraCost += item.cost;
      }
    });

    const minUsd = selectedIndustry.baseUsdMin + extraCost;
    const maxUsd = selectedIndustry.baseUsdMax + extraCost;

    const minArs = minUsd * FX_RATE;
    const maxArs = maxUsd * FX_RATE;

    const extrasLabels = EXTRA_FEATURES.filter((e) => activeExtras.includes(e.id)).map((e) => e.label);

    const waText = `Hola Franco y Fede! Armé una cotización en el cotizador de Se7en Studio:
- Rubro: ${selectedIndustry.name}
- Objetivo: ${selectedGoal.label}
- Situación: ${selectedSituation.label}
- Funciones seleccionadas: ${extrasLabels.join(", ")}
- Estimación calculada: USD ${minUsd.toLocaleString("es-AR")} - USD ${maxUsd.toLocaleString("es-AR")} (o aprox $${(minArs / 1000000).toFixed(1)}M - $${(maxArs / 1000000).toFixed(1)}M ARS)

Quiero coordinar para ver cómo podemos avanzar con la web de mi negocio.`;

    const waUrl = `${SITE.whatsapp}?text=${encodeURIComponent(waText)}`;

    return {
      minUsd,
      maxUsd,
      minArs,
      maxArs,
      timeline: selectedIndustry.baseDays,
      waUrl,
    };
  }, [selectedIndustry, selectedGoal, selectedSituation, activeExtras]);

  return (
    <div className="relative min-h-screen bg-(--ink) text-(--paper) pt-24 pb-20 selection:bg-(--signal) selection:text-(--ink)">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-(--line) bg-white/5 px-3 py-1 text-xs font-mono uppercase tracking-wider text-(--signal)">
            <Calculator className="h-3.5 w-3.5" />
            Cotizador Instantáneo para Negocios
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight md:text-5xl">
            Cotizá la página web de tu negocio en 1 minuto
          </h1>
          <p className="mt-4 text-base text-(--paper)/70 md:text-lg">
            Seleccioná tu rubro y qué necesitás. Calculamos al instante el tiempo de desarrollo,
            el rango de inversión transparente y las funcionalidades clave para tu proyecto.
          </p>
        </div>

        {/* Currency Switch */}
        <div className="mt-8 flex items-center justify-end">
          <div className="inline-flex rounded-full border border-(--line) bg-white/5 p-1 text-xs font-mono">
            <button
              onClick={() => setCurrency("USD")}
              className={`rounded-full px-3 py-1 transition-colors ${
                currency === "USD" ? "bg-(--signal) text-(--ink) font-semibold" : "text-(--paper)/60 hover:text-(--paper)"
              }`}
            >
              Ver en USD
            </button>
            <button
              onClick={() => setCurrency("ARS")}
              className={`rounded-full px-3 py-1 transition-colors ${
                currency === "ARS" ? "bg-(--signal) text-(--ink) font-semibold" : "text-(--paper)/60 hover:text-(--paper)"
              }`}
            >
              Ver en Pesos (ARS)
            </button>
          </div>
        </div>

        {/* Wizard & Results Grid */}
        <div className="mt-6 grid gap-8 lg:grid-cols-12">
          {/* Left: Configuration Steps */}
          <div className="space-y-8 lg:col-span-7">
            {/* Step 1: Industry */}
            <div className="rounded-2xl border border-(--line) bg-white/[0.02] p-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
                Paso 1 · ¿Cuál es el rubro de tu negocio?
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {INDUSTRIES.map((ind) => {
                  const Icon = ind.icon;
                  const isSelected = selectedIndustry.id === ind.id;
                  return (
                    <button
                      key={ind.id}
                      type="button"
                      onClick={() => setSelectedIndustry(ind)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-(--signal) bg-(--signal)/10 text-(--paper)"
                          : "border-(--line) bg-white/5 text-(--paper)/80 hover:border-(--paper)/30"
                      }`}
                    >
                      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${isSelected ? "text-(--signal)" : "text-(--paper)/50"}`} />
                      <div>
                        <p className="text-sm font-semibold">{ind.name}</p>
                        <p className="text-xs text-(--paper)/60 mt-0.5">Entrega: {ind.baseDays}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Goal */}
            <div className="rounded-2xl border border-(--line) bg-white/[0.02] p-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
                Paso 2 · ¿Cuál es el objetivo principal de la web?
              </h2>
              <div className="mt-4 space-y-2.5">
                {GOALS.map((goal) => {
                  const isSelected = selectedGoal.id === goal.id;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setSelectedGoal(goal)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-(--signal) bg-(--signal)/10 text-(--paper)"
                          : "border-(--line) bg-white/5 text-(--paper)/80 hover:border-(--paper)/30"
                      }`}
                    >
                      <span className="text-sm font-medium">{goal.label}</span>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-(--signal) shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Situation */}
            <div className="rounded-2xl border border-(--line) bg-white/[0.02] p-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
                Paso 3 · ¿Cuál es la situación actual de tu marca?
              </h2>
              <div className="mt-4 space-y-2.5">
                {SITUATIONS.map((sit) => {
                  const isSelected = selectedSituation.id === sit.id;
                  return (
                    <button
                      key={sit.id}
                      type="button"
                      onClick={() => setSelectedSituation(sit)}
                      className={`flex w-full items-start justify-between rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? "border-(--signal) bg-(--signal)/10 text-(--paper)"
                          : "border-(--line) bg-white/5 text-(--paper)/80 hover:border-(--paper)/30"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{sit.label}</p>
                        <p className="text-xs text-(--paper)/60 mt-0.5">{sit.note}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-(--signal) shrink-0 ml-2 mt-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Add-ons / Features */}
            <div className="rounded-2xl border border-(--line) bg-white/[0.02] p-6">
              <h2 className="text-sm font-mono uppercase tracking-wider text-(--signal)">
                Paso 4 · Funcionalidades adicionales
              </h2>
              <div className="mt-4 space-y-2.5">
                {EXTRA_FEATURES.map((extra) => {
                  const isChecked = activeExtras.includes(extra.id);
                  return (
                    <label
                      key={extra.id}
                      onClick={() => toggleExtra(extra.id)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all ${
                        isChecked
                          ? "border-(--signal) bg-(--signal)/10 text-(--paper)"
                          : "border-(--line) bg-white/5 text-(--paper)/70 hover:border-(--paper)/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            isChecked ? "border-(--signal) bg-(--signal) text-(--ink)" : "border-(--line) bg-black/40"
                          }`}
                        >
                          {isChecked && <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />}
                        </div>
                        <span className="text-sm">{extra.label}</span>
                      </div>
                      <span className="text-xs font-mono text-(--paper)/50">
                        {extra.cost === 0 ? "Incluido" : `+USD ${extra.cost}`}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Real-Time Dynamic Summary & WhatsApp CTA */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-2xl border border-(--signal)/40 bg-(--signal)/5 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-(--line) pb-4">
                <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                  Presupuesto Estimado
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Cupos disponibles
                </span>
              </div>

              {/* Price display */}
              <div className="mt-6">
                <p className="text-xs font-mono text-(--paper)/60 uppercase">Rango de inversión estimado</p>
                <div className="mt-1">
                  {currency === "USD" ? (
                    <p className="text-3xl font-extrabold tracking-tight md:text-4xl text-(--signal)">
                      USD {calculation.minUsd.toLocaleString("es-AR")} – {calculation.maxUsd.toLocaleString("es-AR")}
                    </p>
                  ) : (
                    <div>
                      <p className="text-3xl font-extrabold tracking-tight md:text-4xl text-(--signal)">
                        ${(calculation.minArs / 1000000).toFixed(1)}M – ${(calculation.maxArs / 1000000).toFixed(1)}M ARS
                      </p>
                      <p className="text-xs text-(--paper)/50 mt-1 font-mono">
                        (Ref. aprox. USD {calculation.minUsd} – {calculation.maxUsd} a $1.350/USD)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Specs & Timeline */}
              <div className="mt-6 space-y-3 border-t border-(--line) pt-4 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-(--paper)/70">
                    <Clock className="h-3.5 w-3.5 text-(--signal)" /> Plazo de entrega:
                  </span>
                  <span className="font-bold text-(--paper)">{calculation.timeline}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-(--paper)/70">
                    <Zap className="h-3.5 w-3.5 text-(--signal)" /> Tecnología:
                  </span>
                  <span className="font-bold text-(--paper)">Next.js 16 + Vercel (Velocidad &lt;1s)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-(--paper)/70">
                    <ShieldCheck className="h-3.5 w-3.5 text-(--signal)" /> Comisiones:
                  </span>
                  <span className="font-bold text-emerald-400">0% de comisión por venta</span>
                </div>
              </div>

              {/* Included Checklist */}
              <div className="mt-6 rounded-xl border border-(--line) bg-black/40 p-4">
                <p className="text-xs font-semibold text-(--paper)/90 mb-2.5">
                  ¿Qué incluye tu proyecto con Se7en Studio?
                </p>
                <ul className="space-y-1.5 text-xs text-(--paper)/70">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Diseño a medida exclusivo (sin plantillas de Tiendanube/WordPress)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Carga instantánea en celulares y computadoras
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Atención directa con Franco y Fede (los dos fundadores)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    Garantía técnica de 30 días post-lanzamiento
                  </li>
                </ul>
              </div>

              {/* WhatsApp Action Button */}
              <div className="mt-6">
                <a
                  href={calculation.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 px-4 font-semibold text-zinc-950 transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <WhatsAppLogo className="h-5 w-5 fill-current" />
                  <span>Enviar cotización a Franco por WhatsApp</span>
                </a>
                <p className="mt-2.5 text-center text-[11px] text-(--paper)/50">
                  Abre WhatsApp con todo el resumen ya redactado. Sin compromiso de compra.
                </p>
              </div>

              {/* Direct links to solutions */}
              <div className="mt-6 border-t border-(--line) pt-4 text-center">
                <Link
                  href="/para"
                  className="text-xs font-mono text-(--paper)/60 hover:text-(--signal) underline transition-colors"
                >
                  Ver soluciones específicas por rubro de negocio →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

