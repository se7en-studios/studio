"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  DollarSign,
  Clock,
  Sparkles,
  Zap,
  ArrowRight,
  Copy,
  Check,
  Calendar,
  Layers,
  ShieldCheck,
  Cpu,
  Database,
  CreditCard,
  Bot,
  Globe2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { useSoundFx } from "@/components/providers/sound-provider";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { SITE } from "@/data/site";

interface ProductBase {
  id: string;
  name: string;
  category: string;
  basePriceUSD: number;
  baseDays: number;
  description: string;
  included: string[];
}

const productBases: ProductBase[] = [
  {
    id: "landing",
    name: "Landing Page de Alta Conversión",
    category: "Web & Marketing",
    basePriceUSD: 1200,
    baseDays: 7,
    description: "Diseñada para maximizar captación de clientes con carga en < 0.4s y diseño en Figma a medida.",
    included: [
      "Diseño UI/UX exclusivo en Figma",
      "Next.js 16 + Tailwind CSS v4",
      "Puntaje Google Lighthouse 100/100",
      "Micro-animaciones a 60 FPS con Framer Motion",
      "Formularios con validación Zod y Resend",
      "30 días de soporte post-lanzamiento",
    ],
  },
  {
    id: "saas",
    name: "SaaS MVP / Producto Digital",
    category: "Full-Stack Software",
    basePriceUSD: 2800,
    baseDays: 18,
    description: "Plataforma completa lista para validar tu modelo de negocio y cobrar a tus primeros usuarios.",
    included: [
      "Autenticación segura (OAuth, Passkeys, Magic Links)",
      "PostgreSQL en Supabase con Row-Level Security",
      "Server Actions y mutaciones en tiempo real",
      "Panel de control / Dashboard interactivo",
      "Integración de pasarela de cobros",
      "Infraestructura Edge en Vercel",
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce a Medida sin Comisiones",
    category: "Comercio Propio",
    basePriceUSD: 2400,
    baseDays: 14,
    description: "Tu propia tienda online ultrarrápida sin pagar el 15-25% de comisión por venta.",
    included: [
      "Catálogo dinámico con filtros instantáneos",
      "Checkout optimizado de 1 solo paso",
      "Pasarela Mercado Pago / Stripe integrada",
      "Panel de administración de stock y pedidos",
      "Notificaciones automáticas a WhatsApp y Email",
      "100% código tuyo en GitHub sin suscripciones",
    ],
  },
  {
    id: "ai-agent",
    name: "Plataforma con Agentes de IA",
    category: "Inteligencia Artificial",
    basePriceUSD: 3600,
    baseDays: 21,
    description: "Integración de modelos LLM (Claude 3.7 / OpenAI) con bases de datos vectoriales RAG.",
    included: [
      "Respuestas contextuales en streaming ultrarrápido",
      "Búsqueda semántica con pgvector en PostgreSQL",
      "Embeddings y sincronización de documentación",
      "Guardrails de seguridad y control de consumo de tokens",
      "Panel analítico de conversaciones",
      "Soporte y tuning de prompts especializado",
    ],
  },
];

interface AddonModule {
  id: string;
  name: string;
  priceUSD: number;
  extraDays: number;
  icon: LucideIcon;
  description: string;
}

const addonModules: AddonModule[] = [
  {
    id: "payments",
    name: "Pasarela de Pagos (Stripe / Mercado Pago)",
    priceUSD: 350,
    extraDays: 2,
    icon: CreditCard,
    description: "Suscripciones recurrentes o cobros directos con webhooks seguros.",
  },
  {
    id: "chatbot",
    name: "Agente Asistente IA (Streaming RAG)",
    priceUSD: 550,
    extraDays: 3,
    icon: Bot,
    description: "Chatbot entrenado con tu catálogo o base de conocimiento.",
  },
  {
    id: "i18n",
    name: "Multi-idioma Internacional (i18n)",
    priceUSD: 250,
    extraDays: 2,
    icon: Globe2,
    description: "Soporte de rutas y traducciones automáticas inglés/español.",
  },
  {
    id: "pwa",
    name: "Aplicación Móvil PWA Instalable",
    priceUSD: 300,
    extraDays: 2,
    icon: Zap,
    description: "Ícono en la pantalla de inicio del teléfono con soporte offline.",
  },
];

export function PricingClient() {
  const [selectedBase, setSelectedBase] = useState<ProductBase>(productBases[1]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [deliveryPace, setDeliveryPace] = useState<"standard" | "express">("standard");
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [copied, setCopied] = useState(false);

  const { playClick, playPop, playSuccess } = useSoundFx();

  const USD_TO_ARS = 1350;

  function toggleAddon(id: string) {
    playPop();
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  // Cálculos
  const calculation = useMemo(() => {
    const addonsCost = selectedAddons.reduce((acc, id) => {
      const found = addonModules.find((a) => a.id === id);
      return acc + (found ? found.priceUSD : 0);
    }, 0);

    const addonsDays = selectedAddons.reduce((acc, id) => {
      const found = addonModules.find((a) => a.id === id);
      return acc + (found ? found.extraDays : 0);
    }, 0);

    const subtotal = selectedBase.basePriceUSD + addonsCost;
    const expressMultiplier = deliveryPace === "express" ? 1.2 : 1;
    const finalPriceUSD = Math.round(subtotal * expressMultiplier);

    const rawDays = selectedBase.baseDays + addonsDays;
    const finalDays = deliveryPace === "express" ? Math.max(5, Math.round(rawDays * 0.6)) : rawDays;

    return {
      finalPriceUSD,
      finalDays,
      addonsCost,
      addonsDays,
    };
  }, [selectedBase, selectedAddons, deliveryPace]);

  const displayMultiplier = currency === "USD" ? 1 : USD_TO_ARS;
  const currencySymbol = currency === "USD" ? "$" : "$";
  const currencySuffix = currency === "USD" ? "USD" : "ARS";

  function formatMoney(amount: number) {
    const val = amount * displayMultiplier;
    return `${currencySymbol}${val.toLocaleString(currency === "USD" ? "en-US" : "es-AR")} ${currencySuffix}`;
  }

  const proposalSummary = `*Propuesta de Proyecto — Se7en Studio:*
• Tipo de producto: ${selectedBase.name}
• Módulos adicionales: ${
    selectedAddons.length > 0
      ? selectedAddons
          .map((id) => addonModules.find((a) => a.id === id)?.name)
          .join(", ")
      : "Ninguno (Alcance estándar)"
  }
• Ritmo de entrega: ${deliveryPace === "express" ? "⚡ Express Acelerado" : "Estándar"}
• Tiempo estimado: ~${calculation.finalDays} días hábiles
• Inversión total estimada: ${formatMoney(calculation.finalPriceUSD)}`;

  function handleCopy() {
    playSuccess();
    navigator.clipboard.writeText(proposalSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsappUrl = `${SITE.whatsapp}?text=${encodeURIComponent(
    `Hola Franco y Federico! Estuve configurando mi presupuesto en su web:\n\n${proposalSummary}\n\n¿Podemos coordinar para iniciar?`
  )}`;

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        {/* Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <Sparkles size={13} className="text-accent" />
            <span>Precios Claros & Sin Letra Chica</span>
          </div>

          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
            Inversión transparente <br />
            <span className="text-accent">para tu próximo producto.</span>
          </h1>

          <p className="mt-6 text-lg leading-relaxed text-muted md:text-xl">
            Elegí el tipo de producto, sumá los módulos técnicos que necesites y obtené un presupuesto formal con plazos de entrega exactos.
          </p>
        </div>

        {/* Layout de Configuración */}
        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Columna Izquierda: Opciones */}
          <div className="space-y-10 lg:col-span-7">
            {/* Paso 1: Tipo de Producto Base */}
            <div>
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
                  1. Seleccioná el Tipo de Producto
                </h3>

                {/* Moneda Toggle */}
                <div className="flex rounded-lg border border-border bg-surface p-0.5 font-mono text-xs">
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

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {productBases.map((base) => {
                  const isSelected = selectedBase.id === base.id;
                  return (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => {
                        playPop();
                        setSelectedBase(base);
                      }}
                      className={`focus-ring text-left rounded-2xl border p-5 transition-all ${
                        isSelected
                          ? "border-accent bg-surface-2 shadow-[0_0_20px_rgba(255,77,46,0.15)]"
                          : "border-border bg-surface hover:border-foreground/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-accent uppercase font-bold">
                          {base.category}
                        </span>
                        <span className="font-mono text-xs font-semibold text-foreground">
                          Desde {formatMoney(base.basePriceUSD)}
                        </span>
                      </div>

                      <h4 className="mt-2 font-medium text-foreground text-sm">
                        {base.name}
                      </h4>

                      <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">
                        {base.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paso 2: Módulos Adicionales */}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted font-bold border-b border-border pb-3 mb-4">
                2. Módulos Técnicos Opcionales
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {addonModules.map((addon) => {
                  const isSelected = selectedAddons.includes(addon.id);
                  const Icon = addon.icon;
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddon(addon.id)}
                      className={`focus-ring text-left rounded-2xl border p-4 transition-all ${
                        isSelected
                          ? "border-accent bg-surface-2 shadow-[0_0_15px_rgba(255,77,46,0.12)]"
                          : "border-border bg-surface hover:border-foreground/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Icon size={16} className={isSelected ? "text-accent" : "text-muted"} />
                          <span className="font-medium text-foreground text-xs">{addon.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-accent">
                          +{formatMoney(addon.priceUSD)}
                        </span>
                      </div>

                      <p className="mt-2 text-[11px] text-muted leading-relaxed">
                        {addon.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paso 3: Ritmo de Entrega */}
            <div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted font-bold border-b border-border pb-3 mb-4">
                3. Plazo de Ejecución
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setDeliveryPace("standard");
                  }}
                  className={`focus-ring text-left rounded-2xl border p-4 transition-all ${
                    deliveryPace === "standard"
                      ? "border-accent bg-surface-2"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock size={15} className="text-muted" />
                    <h4 className="font-medium text-foreground text-xs">Ritmo Estándar</h4>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Entrega planificada en ~{selectedBase.baseDays} días hábiles sin recargos.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setDeliveryPace("express");
                  }}
                  className={`focus-ring text-left rounded-2xl border p-4 transition-all ${
                    deliveryPace === "express"
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap size={15} className="text-accent" />
                    <h4 className="font-medium text-accent text-xs">Express Acelerado (+20%)</h4>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Sprint prioritario para lanzar en ~{Math.max(5, Math.round(selectedBase.baseDays * 0.6))} días.
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de Presupuesto Resumen */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-3xl border border-accent/40 bg-gradient-to-b from-surface via-surface to-background p-6 sm:p-8 shadow-2xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <span className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
                    Resumen de Propuesta
                  </span>
                  <span className="rounded-full bg-accent/15 border border-accent/30 px-2.5 py-0.5 font-mono text-[10px] font-bold text-accent">
                    {deliveryPace === "express" ? "Sprint Express" : "Estándar"}
                  </span>
                </div>

                {/* Número de Inversión */}
                <div className="mt-6 rounded-2xl border border-border/80 bg-background/80 p-6 text-center">
                  <span className="font-mono text-xs uppercase tracking-widest text-muted">
                    Inversión Total Estimada
                  </span>
                  <div className="display mt-2 text-4xl sm:text-5xl text-foreground font-bold text-accent">
                    {formatMoney(calculation.finalPriceUSD)}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2 font-mono text-xs text-muted">
                    <Clock size={13} className="text-accent" />
                    <span>Plazo estimado: <strong>~{calculation.finalDays} días hábiles</strong></span>
                  </div>
                </div>

                {/* Lo que incluye este paquete */}
                <div className="mt-6 space-y-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-muted font-semibold">
                    Incluido en el desarrollo:
                  </span>
                  {selectedBase.included.map((item) => (
                    <div key={item} className="flex items-start gap-2 text-xs text-foreground/90">
                      <CheckCircle2 size={14} className="text-accent shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Envío */}
              <div className="mt-8 space-y-3 pt-6 border-t border-border">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-background transition-all hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(255,77,46,0.35)]"
                >
                  <WhatsAppLogo size={16} />
                  <span>Enviar propuesta por WhatsApp</span>
                  <ArrowRight size={16} />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 font-mono text-xs text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span>{copied ? "¡Copiado!" : "Copiar Resumen"}</span>
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
