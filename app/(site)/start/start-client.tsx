"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Send,
  Sparkles,
  Layers,
  Clock,
  Check,
  Calendar,
  Layout,
  ShoppingCart,
  Zap,
  Bot,
  RefreshCw,
  Copy,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { useSoundFx } from "@/components/providers/sound-provider";
import { SITE } from "@/data/site";
import { sendLead } from "@/lib/send-lead";
import { LeadError } from "@/components/ui/lead-error";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

const productTypes = [
  {
    id: "saas",
    title: "SaaS / Aplicación Web",
    subtitle: "Paneles de administración, base de datos PostgreSQL y autenticación",
    icon: Layout,
  },
  {
    id: "ecommerce",
    title: "E-Commerce de Alta Conversión",
    subtitle: "Tienda digital ultrarrápida con catálogo en tiempo real y pasarelas de pago",
    icon: ShoppingCart,
  },
  {
    id: "landing",
    title: "Sitio Corporativo / Landing",
    subtitle: "Diseño visual de alta gama, micro-interacciones a 60 FPS y SEO 100/100",
    icon: Zap,
  },
  {
    id: "ai",
    title: "Software a Medida & Modelos IA",
    subtitle: "Integración de modelos LLM (OpenAI/Claude), APIs y dashboards analíticos",
    icon: Bot,
  },
  {
    id: "redesign",
    title: "Modernización & Refactor a Next.js",
    subtitle: "Migración de plataformas obsoletas (WordPress/legacy) a Next.js 16 y Core Web Vitals 100",
    icon: RefreshCw,
  },
];

const businessGoals = [
  "Validar y lanzar un MVP al mercado rápidamente",
  "Aumentar drásticamente la tasa de conversión y ventas",
  "Reemplazar una web lenta en WordPress / Wix / Shopify",
  "Escalar la infraestructura y mejorar la arquitectura técnica",
  "Elevar la percepción de marca y credibilidad corporativa",
];

const availableFeatures = [
  "Autenticación & Roles de Usuario",
  "Pasarela de Pagos (Stripe / MercadoPago)",
  "Dashboard / CMS Autogestionable",
  "Motion & Animaciones a 60 FPS",
  "Base de Datos PostgreSQL en Supabase",
  "Integración con Inteligencia Artificial (LLMs)",
  "Multi-idioma (i18n Internacional)",
  "Optimización SEO 100 / 100 & Schema",
];

const timelines = [
  "Urgente (menos de 2 semanas — Sprint Exprés)",
  "Normal (2 a 4 semanas)",
  "Flexible (1 a 2 meses)",
];

const budgets = [
  "< $1.500 USD",
  "$1.500 – $3.000 USD",
  "$3.000 – $6.000 USD",
  "$6.000+ USD",
  "A definir según alcance",
];

export function StartClient() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(productTypes[0].id);
  const [selectedGoal, setSelectedGoal] = useState(businessGoals[0]);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "Autenticación & Roles de Usuario",
    "Dashboard / CMS Autogestionable",
    "Optimización SEO 100 / 100 & Schema",
  ]);
  const [selectedTimeline, setSelectedTimeline] = useState(timelines[1]);
  const [selectedBudget, setSelectedBudget] = useState(budgets[1]);
  const [references, setReferences] = useState("");

  // Datos de contacto
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [extraDetails, setExtraDetails] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { playClick, playPop, playSuccess, playSwitch } = useSoundFx();

  function toggleFeature(feat: string) {
    playPop();
    setSelectedFeatures((prev) =>
      prev.includes(feat) ? prev.filter((f) => f !== feat) : [...prev, feat]
    );
  }

  function nextStep() {
    playClick();
    setStep((s) => Math.min(s + 1, 4));
  }

  function prevStep() {
    playSwitch();
    setStep((s) => Math.max(s - 1, 1));
  }

  const selectedTypeName =
    productTypes.find((p) => p.id === selectedType)?.title || selectedType;

  const briefSummary = `*Brief Ejecutivo — Se7en Studio:*
• Producto: ${selectedTypeName}
• Objetivo: ${selectedGoal}
• Plazo deseado: ${selectedTimeline}
• Presupuesto: ${selectedBudget}
• Módulos requeridos: ${selectedFeatures.join(", ")}
${references ? `• Referencias: ${references}` : ""}
${extraDetails ? `• Detalles: ${extraDetails}` : ""}
• Contacto: ${name} (${email})${company ? ` - ${company}` : ""}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSendError(null);

    const result = await sendLead({
      source: "start",
      name,
      email,
      company,
      projectType: selectedTypeName,
      budget: selectedBudget,
      timeline: selectedTimeline,
      idea: `${briefSummary}\n\nObjetivo: ${selectedGoal}\nReferencias: ${references}\nDetalles adicionales: ${extraDetails}`,
    });
    setLoading(false);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    playSuccess();
    setSubmitted(true);
  }

  const whatsappBriefUrl = `${SITE.whatsapp}?text=${encodeURIComponent(
    `Hola Se7en Studio! Acabo de completar el Briefing Interactivo en la web:\n\n${briefSummary}\n\n¿Cuándo podemos coordinar los próximos pasos?`
  )}`;

  function handleCopy() {
    playPop();
    navigator.clipboard.writeText(briefSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
              <Sparkles size={13} className="text-accent" />
              <span>Configurador de Briefing</span>
            </div>

            <h1 className="display mt-4 text-3xl text-foreground sm:text-4xl md:text-5xl">
              Diseñemos el producto que <br />
              <span className="text-accent">tu negocio necesita.</span>
            </h1>

            <p className="mt-3 text-sm text-muted md:text-base">
              Completá estos pasos guiados para generar el brief técnico de tu proyecto. Te responderemos en menos de 24hs con una propuesta y roadmap detallado.
            </p>
          </div>

          {/* Barra de progreso */}
          {!submitted && (
            <div className="mt-10">
              <div className="flex items-center justify-between text-xs font-mono text-muted mb-2">
                <span>Paso {step} de 4</span>
                <span>
                  {step === 1 && "Tipo de Producto"}
                  {step === 2 && "Objetivo de Negocio"}
                  {step === 3 && "Módulos & Plazos"}
                  {step === 4 && "Contacto & Envío"}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface overflow-hidden border border-border">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${(step / 4) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Formulario / Tarjeta de Pasos */}
          <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-10 shadow-xl">
            {submitted ? (
              <div className="text-center py-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="display mt-6 text-2xl text-foreground sm:text-3xl">
                  ¡Briefing recibido con éxito!
                </h3>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
                  Analizaremos tu requerimiento para <strong>{selectedTypeName}</strong> y te enviaremos una propuesta formal con estimación de sprints a <strong>{email}</strong>.
                </p>

                {/* Resumen del Briefing */}
                <div className="mt-8 rounded-xl border border-border bg-background/80 p-5 text-left font-mono text-xs text-muted">
                  <p className="text-accent font-bold mb-2">Resumen generado:</p>
                  <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90 leading-relaxed">
                    {briefSummary}
                  </pre>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <a
                    href={whatsappBriefUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-6 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <WhatsAppLogo size={16} />
                    <span>Continuar por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                    <span>{copied ? "¡Copiado al portapapeles!" : "Copiar Brief"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Paso 1: Tipo de Producto */}
                {step === 1 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h3 className="text-lg font-medium text-foreground">
                      1. ¿Qué tipo de solución estás buscando construir?
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Seleccioná la categoría principal que mejor define tu iniciativa.
                    </p>

                    <div className="mt-6 space-y-3">
                      {productTypes.map((type) => {
                        const Icon = type.icon;
                        const isSelected = selectedType === type.id;
                        return (
                          <button
                            key={type.id}
                            type="button"
                            onClick={() => {
                              playPop();
                              setSelectedType(type.id);
                            }}
                            className={`focus-ring flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? "border-accent bg-surface-2 shadow-[0_0_20px_rgba(255,77,46,0.15)]"
                                : "border-border bg-background hover:border-foreground/30 hover:bg-surface-2"
                            }`}
                          >
                            <div className="flex items-center gap-3.5">
                              <span
                                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                  isSelected
                                    ? "bg-accent text-background"
                                    : "bg-surface border border-border text-muted"
                                }`}
                              >
                                <Icon size={18} />
                              </span>
                              <div>
                                <h4 className="text-sm font-medium text-foreground">
                                  {type.title}
                                </h4>
                                <p className="text-xs text-muted">
                                  {type.subtitle}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? "border-accent bg-accent text-background"
                                  : "border-border bg-background"
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Paso 2: Objetivo de Negocio */}
                {step === 2 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h3 className="text-lg font-medium text-foreground">
                      2. ¿Cuál es el objetivo de negocio principal?
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Esto nos permite definir la arquitectura técnica y el enfoque de diseño correcto.
                    </p>

                    <div className="mt-6 space-y-3">
                      {businessGoals.map((goal) => {
                        const isSelected = selectedGoal === goal;
                        return (
                          <button
                            key={goal}
                            type="button"
                            onClick={() => {
                              playPop();
                              setSelectedGoal(goal);
                            }}
                            className={`focus-ring flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? "border-accent bg-surface-2 shadow-[0_0_15px_rgba(255,77,46,0.15)]"
                                : "border-border bg-background hover:border-foreground/30 hover:bg-surface-2"
                            }`}
                          >
                            <span className="text-xs font-medium text-foreground">
                              {goal}
                            </span>
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                                isSelected
                                  ? "border-accent bg-accent text-background"
                                  : "border-border bg-background"
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Paso 3: Funcionalidades, Presupuesto & Plazos */}
                {step === 3 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h3 className="text-lg font-medium text-foreground">
                      3. Funcionalidades, plazos e inversión estimada
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Elegí los módulos que necesitás incluir en tu versión inicial.
                    </p>

                    {/* Módulos */}
                    <div className="mt-5">
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
                        Módulos deseados
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableFeatures.map((feat) => {
                          const isChecked = selectedFeatures.includes(feat);
                          return (
                            <button
                              key={feat}
                              type="button"
                              onClick={() => toggleFeature(feat)}
                              className={`focus-ring inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                                isChecked
                                  ? "border-accent bg-accent/10 text-foreground font-semibold"
                                  : "border-border bg-background text-muted hover:border-foreground/30 hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${
                                  isChecked
                                    ? "border-accent bg-accent text-background"
                                    : "border-border"
                                }`}
                              >
                                {isChecked && <Check size={9} strokeWidth={3} />}
                              </span>
                              <span>{feat}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Plazo */}
                    <div className="mt-6">
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
                        Plazo deseado de entrega
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {timelines.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => {
                              playPop();
                              setSelectedTimeline(time);
                            }}
                            className={`focus-ring rounded-lg border p-2.5 text-left font-mono text-xs transition-all ${
                              selectedTimeline === time
                                ? "border-accent bg-accent/10 text-foreground font-semibold"
                                : "border-border bg-background text-muted hover:text-foreground"
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Presupuesto */}
                    <div className="mt-6">
                      <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
                        Rango de inversión estimado
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {budgets.map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => {
                              playPop();
                              setSelectedBudget(b);
                            }}
                            className={`focus-ring rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                              selectedBudget === b
                                ? "border-accent bg-accent text-background font-semibold"
                                : "border-border bg-background text-muted hover:text-foreground"
                            }`}
                          >
                            {b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Paso 4: Contacto & Envío */}
                {step === 4 && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                  >
                    <h3 className="text-lg font-medium text-foreground">
                      4. ¿A dónde te enviamos la propuesta?
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Ingresá tus datos para que podamos estructurar el roadmap y coordinar contigo.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-mono text-xs text-muted mb-1">
                            Tu nombre completo *
                          </label>
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nombre y apellido"
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent"
                          />
                        </div>

                        <div>
                          <label className="block font-mono text-xs text-muted mb-1">
                            Email corporativo o personal *
                          </label>
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@empresa.com"
                            className="focus-ring w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-xs text-muted mb-1">
                          Empresa o nombre del proyecto (opcional)
                        </label>
                        <input
                          type="text"
                          value={company}
                          onChange={(e) => setCompany(e.target.value)}
                          placeholder="Nombre de marca o startup"
                          className="focus-ring w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-xs text-muted mb-1">
                          Sitios de referencia o links que te gusten (opcional)
                        </label>
                        <input
                          type="text"
                          value={references}
                          onChange={(e) => setReferences(e.target.value)}
                          placeholder="Ej: stripe.com, linear.app, competidores..."
                          className="focus-ring w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent"
                        />
                      </div>

                      <div>
                        <label className="block font-mono text-xs text-muted mb-1">
                          Comentarios o notas adicionales (opcional)
                        </label>
                        <textarea
                          rows={3}
                          value={extraDetails}
                          onChange={(e) => setExtraDetails(e.target.value)}
                          placeholder="Cualquier detalle que quieras resaltar sobre tu producto..."
                          className="focus-ring w-full resize-none rounded-lg border border-border bg-background px-3.5 py-2.5 text-xs text-foreground focus:border-accent"
                        />
                      </div>

                      <LeadError error={sendError} whatsappUrl={whatsappBriefUrl} />
                      <div className="pt-4 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={prevStep}
                          className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground"
                        >
                          <ArrowLeft size={14} />
                          <span>Volver</span>
                        </button>

                        <button
                          type="submit"
                          disabled={loading}
                          className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 text-xs font-medium text-background hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(255,77,46,0.35)] disabled:opacity-50"
                        >
                          <span>{loading ? "Generando propuesta..." : "Finalizar y Enviar Briefing"}</span>
                          <Send size={14} />
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {/* Botones de navegación (Pasos 1 a 3) */}
                {step < 4 && (
                  <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={prevStep}
                        className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground"
                      >
                        <ArrowLeft size={14} />
                        <span>Atrás</span>
                      </button>
                    ) : (
                      <div />
                    )}

                    <button
                      type="button"
                      onClick={nextStep}
                      className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-xs font-medium text-background hover:bg-accent/90 transition-all hover:shadow-[0_0_20px_rgba(255,77,46,0.25)]"
                    >
                      <span>Siguiente</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
