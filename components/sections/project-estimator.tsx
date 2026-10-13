"use client";

import { useState } from "react";
import {
  Sparkles,
  ArrowRight,
  Clock,
  Cpu,
  Check,
  Layers,
  Copy,
  Calendar,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Magnetic } from "@/components/ui/magnetic";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { SITE } from "@/data/site";

interface ProductTypeOption {
  id: string;
  name: string;
  badge: string;
  baseWeeks: string;
  baseUsd: number;
  description: string;
  highlights: string[];
}

const productTypes: ProductTypeOption[] = [
  {
    id: "saas",
    name: "Plataforma o Aplicación Web",
    badge: "Plataforma Web",
    baseWeeks: "3 - 5 semanas",
    baseUsd: 2500,
    description:
      "Un sistema completo con inicio de sesión, base de datos segura y panel de administración.",
    highlights: [
      "Inicio de sesión",
      "Base de datos segura",
      "Panel de administración",
    ],
  },
  {
    id: "ecommerce",
    name: "E-Commerce de Alta Conversión",
    badge: "Tienda Digital",
    baseWeeks: "2 - 4 semanas",
    baseUsd: 1800,
    description:
      "Experiencia de compra ultrarrápida, sincronización de catálogo en tiempo real y pasarelas de pago.",
    highlights: ["Catálogo en tiempo real", "Pagos online", "Checkout rápido"],
  },
  {
    id: "landing",
    name: "Sitio Corporativo / Landing",
    badge: "Presencia & Conversión",
    baseWeeks: "1 - 2 semanas",
    baseUsd: 1200,
    description:
      "Diseño de alta gama, animaciones suaves y el máximo posicionamiento posible en Google.",
    highlights: [
      "Diseño a medida",
      "Animaciones suaves",
      "Buen posicionamiento en Google",
    ],
  },
  {
    id: "ai-systems",
    name: "Software a Medida con Inteligencia Artificial",
    badge: "Automatización Inteligente",
    baseWeeks: "3 - 5 semanas",
    baseUsd: 2900,
    description:
      "Asistentes con inteligencia artificial, datos en tiempo real y paneles con estadísticas.",
    highlights: [
      "Asistentes con IA",
      "Datos en tiempo real",
      "Paneles con estadísticas",
    ],
  },
  {
    id: "redesign",
    name: "Modernización de tu Sitio Actual",
    badge: "Renovación Completa",
    baseWeeks: "2 - 3 semanas",
    baseUsd: 1500,
    description:
      "Migramos tu sitio actual a una versión moderna, mucho más rápida y fácil de mantener.",
    highlights: ["Migración completa", "Máxima velocidad", "Diseño renovado"],
  },
];

interface FeatureOption {
  id: string;
  name: string;
  costUsd: number;
  category: "core" | "scale" | "ai";
}

const featureOptions: FeatureOption[] = [
  {
    id: "auth",
    name: "Inicio de sesión y permisos",
    costUsd: 250,
    category: "core",
  },
  {
    id: "payments",
    name: "Pagos online",
    costUsd: 300,
    category: "core",
  },
  {
    id: "admin",
    name: "Panel de administración",
    costUsd: 400,
    category: "core",
  },
  {
    id: "motion",
    name: "Animaciones y detalles",
    costUsd: 250,
    category: "scale",
  },
  {
    id: "ai",
    name: "Inteligencia artificial",
    costUsd: 450,
    category: "ai",
  },
  {
    id: "i18n",
    name: "Varios idiomas",
    costUsd: 200,
    category: "scale",
  },
  {
    id: "realtime",
    name: "Datos en tiempo real",
    costUsd: 250,
    category: "scale",
  },
  {
    id: "seo",
    name: "Buen posicionamiento en Google",
    costUsd: 150,
    category: "core",
  },
];

export function ProjectEstimator() {
  const [selectedProduct, setSelectedProduct] = useState<ProductTypeOption>(
    productTypes[0],
  );
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "auth",
    "admin",
    "seo",
  ]);
  const [speed, setSpeed] = useState<"express" | "standard">("standard");
  const [currency, setCurrency] = useState<"USD" | "ARS">("USD");
  const [copied, setCopied] = useState(false);

  const USD_TO_ARS = 1350; // Tipo de cambio de referencia

  function toggleFeature(id: string) {
    setSelectedFeatures((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  // Cálculo de estimación
  const totalFeatureCost = selectedFeatures.reduce((acc, featId) => {
    const feat = featureOptions.find((f) => f.id === featId);
    return acc + (feat ? feat.costUsd : 0);
  }, 0);

  const rawBase = selectedProduct.baseUsd + totalFeatureCost;
  const speedMultiplier = speed === "express" ? 1.25 : 1.0;
  const estimatedUsd = Math.round(rawBase * speedMultiplier);
  const estimatedArs = estimatedUsd * USD_TO_ARS;

  const formattedPrice =
    currency === "USD"
      ? `$${estimatedUsd.toLocaleString("en-US")} USD`
      : `$${estimatedArs.toLocaleString("es-AR")} ARS`;

  // Generar texto estructurado para WhatsApp / Copiar
  const featureNames = featureOptions
    .filter((f) => selectedFeatures.includes(f.id))
    .map((f) => f.name)
    .join(", ");

  const summaryText = `*Cotización Se7en Studio:*
• Producto: ${selectedProduct.name}
• Modalidad: ${speed === "express" ? "Entrega Exprés (Prioridad)" : "Entrega Estándar"}
• Tiempo estimado: ${speed === "express" ? "2 - 3 semanas" : selectedProduct.baseWeeks}
• Inversión estimada: ${formattedPrice}
• Módulos incluidos: ${featureNames || "Básico"}`;

  const whatsappMessage = `Hola Se7en Studio! Estuve probando el cotizador interactivo:\n\n${summaryText}\n\n¿Podemos coordinar para revisarlo?`;
  const whatsappUrl = `${SITE.whatsapp}?text=${encodeURIComponent(whatsappMessage)}`;

  function handleCopy() {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <section id="estimator" className="border-t border-border py-24 md:py-32">
      <Container>
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            kicker="Calculador de Proyecto"
            title="Estimá el alcance de tu producto."
            subtitle="Elegí el tipo de proyecto y las funcionalidades que necesitás, y mirá el presupuesto y tiempo estimado al instante."
          />
        </div>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Columna Izquierda: Configuración Interactiva */}
          <div className="space-y-10 lg:col-span-7">
            {/* Paso 1: Tipo de Proyecto */}
            <div>
              <label className="mb-4 flex items-center gap-2 font-mono text-xs tracking-widest text-muted uppercase">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
                  1
                </span>
                <span>¿Qué tipo de producto querés construir?</span>
              </label>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {productTypes.map((prod) => {
                  const isSelected = selectedProduct.id === prod.id;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProduct(prod)}
                      className={`focus-ring text-left rounded-xl border p-4 transition-all duration-300 ${
                        isSelected
                          ? "border-accent bg-surface-2 shadow-[0_0_20px_rgba(255,77,46,0.15)]"
                          : "border-border bg-surface hover:border-foreground/30 hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] text-accent uppercase">
                          {prod.badge}
                        </span>
                        {isSelected && (
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-background">
                            <Check size={10} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 font-medium text-foreground text-base">
                        {prod.name}
                      </h4>
                      <p className="mt-1 text-xs text-muted line-clamp-2">
                        {prod.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paso 2: Funcionalidades / Módulos Clave */}
            <div>
              <label className="mb-4 flex items-center gap-2 font-mono text-xs tracking-widest text-muted uppercase">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
                  2
                </span>
                <span>Módulos & Funcionalidades requeridas</span>
              </label>

              <div className="flex flex-wrap gap-2.5">
                {featureOptions.map((feat) => {
                  const isChecked = selectedFeatures.includes(feat.id);
                  return (
                    <button
                      key={feat.id}
                      type="button"
                      onClick={() => toggleFeature(feat.id)}
                      className={`focus-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 font-mono text-xs transition-all ${
                        isChecked
                          ? "border-accent bg-accent/15 text-foreground font-medium"
                          : "border-border bg-surface text-muted hover:border-foreground/30 hover:text-foreground"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "border-accent bg-accent text-background"
                            : "border-border bg-background"
                        }`}
                      >
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </span>
                      <span>{feat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paso 3: Ritmo de Entrega */}
            <div>
              <label className="mb-4 flex items-center gap-2 font-mono text-xs tracking-widest text-muted uppercase">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/10 text-accent font-bold">
                  3
                </span>
                <span>Ritmo de desarrollo deseado</span>
              </label>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSpeed("standard")}
                  className={`focus-ring rounded-xl border p-4 text-left transition-all ${
                    speed === "standard"
                      ? "border-accent bg-surface-2"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <span className="font-mono text-xs text-muted uppercase">
                    Entrega Estándar
                  </span>
                  <p className="mt-1 font-medium text-foreground">
                    Avances semana a semana
                  </p>
                  <span className="mt-2 block font-mono text-xs text-accent">
                    Podés ver el progreso cada semana
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSpeed("express")}
                  className={`focus-ring rounded-xl border p-4 text-left transition-all ${
                    speed === "express"
                      ? "border-accent bg-surface-2 shadow-[0_0_20px_rgba(255,77,46,0.15)]"
                      : "border-border bg-surface hover:border-foreground/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-accent uppercase">
                      Prioridad Alta
                    </span>
                    <Sparkles size={14} className="text-accent" />
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    Entrega Exprés
                  </p>
                  <span className="mt-2 block font-mono text-xs text-emerald-400">
                    Dedicación intensiva inmediata
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Resumen de Alcance & Inversión */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-2xl border border-border bg-gradient-to-b from-surface via-surface to-background p-6 md:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <span className="font-mono text-xs text-muted uppercase tracking-wider">
                  Resumen de Inversión
                </span>

                {/* Switcher de moneda */}
                <div className="flex items-center rounded-lg border border-border bg-background p-0.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrency("USD")}
                    className={`rounded px-2 py-0.5 transition-colors ${
                      currency === "USD"
                        ? "bg-accent text-background font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrency("ARS")}
                    className={`rounded px-2 py-0.5 transition-colors ${
                      currency === "ARS"
                        ? "bg-accent text-background font-bold"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    ARS
                  </button>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <span className="text-xs text-muted">
                    Producto Seleccionado:
                  </span>
                  <h3 className="display mt-1 text-2xl text-foreground">
                    {selectedProduct.name}
                  </h3>
                </div>

                {/* Caja de Inversión Estimada */}
                <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
                    Presupuesto estimado
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="display text-3xl text-foreground font-bold">
                      {formattedPrice}
                    </span>
                    <span className="font-mono text-xs text-muted">
                      (aprox)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/80 p-4">
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-accent" />
                    <span className="text-sm font-medium text-foreground">
                      Tiempo estimado:
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold text-accent">
                    {speed === "express"
                      ? "2 - 3 semanas"
                      : selectedProduct.baseWeeks}
                  </span>
                </div>

                {/* Qué incluye */}
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-muted mb-2">
                    <Cpu size={14} className="text-accent" />
                    <span>Qué incluye:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProduct.highlights.map((tech) => (
                      <span
                        key={tech}
                        className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-[11px] text-muted"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Módulos seleccionados count */}
                <div className="flex items-center justify-between border-t border-border/60 pt-4 text-xs font-mono text-muted">
                  <span className="flex items-center gap-1.5">
                    <Layers size={14} className="text-accent" />
                    <span>Módulos incluidos:</span>
                  </span>
                  <span className="font-bold text-foreground">
                    {selectedFeatures.length} funcionalidades
                  </span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="mt-8 space-y-3">
                <Magnetic className="w-full">
                  <button
                    type="button"
                    onClick={() =>
                      window.dispatchEvent(
                        new CustomEvent("open-booking-modal"),
                      )
                    }
                    className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(255,77,46,0.35)]"
                  >
                    <Calendar size={16} />
                    <span>Agendar llamada para esta cotización</span>
                    <ArrowRight size={16} />
                  </button>
                </Magnetic>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 font-mono text-xs text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? (
                      <Check size={14} className="text-emerald-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    <span>{copied ? "¡Copiado!" : "Copiar resumen"}</span>
                  </button>

                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 font-mono text-xs text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <WhatsAppLogo size={14} />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
