"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Gauge,
  ShieldAlert,
  Zap,
  Search,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Send,
  Clock,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { useSoundFx } from "@/components/providers/sound-provider";
import { SITE } from "@/data/site";
import { sendLead } from "@/lib/send-lead";
import { LeadError } from "@/components/ui/lead-error";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

const platformOptions = [
  "WordPress / WooCommerce",
  "Shopify / Tienda Nube",
  "Wix / Squarespace",
  "Desarrollo a Medida (React / Node / PHP)",
  "No estoy seguro",
];

const painPoints = [
  { id: "speed", label: "Lentitud en teléfonos móviles (Tarda > 3s en cargar)" },
  { id: "commissions", label: "Comisiones excesivas en ventas (15% a 25%)" },
  { id: "design", label: "Diseño anticuado que no genera confianza" },
  { id: "conversion", label: "Muchas visitas pero pocas ventas / leads" },
  { id: "bugs", label: "Plugins caídos y errores constantes" },
];

export function AuditClient() {
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState(platformOptions[0]);
  const [selectedPains, setSelectedPains] = useState<string[]>(["speed"]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { playClick, playPop, playSuccess } = useSoundFx();

  function togglePain(id: string) {
    playPop();
    setSelectedPains((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url || !email || !name) return;

    setIsSubmitting(true);
    setSendError(null);
    playClick();

    const payload = {
      source: "auditoría",
      name,
      email,
      projectType: "Auditoría Técnica Gratuita",
      budget: "N/A (Auditoría Gratuita)",
      idea: `[Solicitud de Auditoría Técnica]:
• URL a auditar: ${url}
• Plataforma actual: ${platform}
• Dolores seleccionados: ${selectedPains.join(", ")}
• WhatsApp de contacto: ${whatsapp || "No especificado"}`,
    };

    const result = await sendLead(payload);
    setIsSubmitting(false);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    playSuccess();
    setSubmitted(true);
  }

  const whatsappDirectUrl = `${SITE.whatsapp}?text=${encodeURIComponent(
    `Hola Franco y Federico! Quiero solicitar la auditoría técnica gratuita de mi sitio:\n• URL: ${url || "Mi web"}\n• Plataforma: ${platform}\n• Mi email: ${email}`
  )}`;

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-xs text-accent">
              <Gauge size={13} />
              <span>Diagnóstico Técnico Sin Costo</span>
            </div>

            <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
              Descubrí qué está frenando <br />
              <span className="text-accent">las ventas de tu sitio web.</span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-muted max-w-xl mx-auto md:text-lg">
              Analizamos tu web actual y te enviamos un video de 3 minutos con el diagnóstico de velocidad, vulnerabilidades y puntos de fuga en conversión.
            </p>
          </div>

          {/* Formulario / Estado de Éxito */}
          <div className="mt-12 rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-2xl">
            {submitted ? (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h3 className="display text-2xl sm:text-3xl text-foreground">
                    ¡Solicitud de Auditoría Recibida!
                  </h3>
                  <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">
                    Franco y Federico analizarán tu sitio ({url}) en las próximas 24 horas y te enviarán el video diagnóstico a <strong>{email}</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <a
                    href={whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
                  >
                    <WhatsAppLogo size={15} />
                    <span>Avisar por WhatsApp</span>
                  </a>

                  <Link
                    href="/"
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3 text-xs font-medium text-muted hover:text-foreground transition-colors"
                  >
                    <span>Volver al inicio</span>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Campo URL */}
                <div>
                  <label className="block font-mono text-xs text-muted mb-2 font-semibold uppercase">
                    1. URL de tu sitio web actual *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      required
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://tutienda.com o https://miempresa.com"
                      className="focus-ring w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                    />
                  </div>
                </div>

                {/* Plataforma Actual */}
                <div>
                  <label className="block font-mono text-xs text-muted mb-2 font-semibold uppercase">
                    2. ¿En qué plataforma está construida hoy?
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="focus-ring w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm text-foreground focus:border-accent cursor-pointer"
                  >
                    {platformOptions.map((opt) => (
                      <option key={opt} value={opt} className="bg-surface text-foreground">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dolores / Problemas */}
                <div>
                  <label className="block font-mono text-xs text-muted mb-3 font-semibold uppercase">
                    3. ¿Qué problemas notas actualmente?
                  </label>
                  <div className="space-y-2">
                    {painPoints.map((pain) => {
                      const isSelected = selectedPains.includes(pain.id);
                      return (
                        <button
                          key={pain.id}
                          type="button"
                          onClick={() => togglePain(pain.id)}
                          className={`focus-ring w-full text-left rounded-xl border p-3.5 text-xs transition-all flex items-center justify-between gap-3 ${
                            isSelected
                              ? "border-accent bg-surface-2 text-foreground font-medium"
                              : "border-border bg-background text-muted hover:border-foreground/30 hover:text-foreground"
                          }`}
                        >
                          <span>{pain.label}</span>
                          {isSelected && <CheckCircle2 size={16} className="text-accent shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Datos de Contacto */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-4 border-t border-border">
                  <div>
                    <label className="block font-mono text-xs text-muted mb-1.5 font-semibold">
                      Tu Nombre *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Franco Riquero"
                      className="focus-ring w-full rounded-xl border border-border bg-background py-2.5 px-3.5 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs text-muted mb-1.5 font-semibold">
                      Tu Email (Para enviarte el video) *
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="franco@empresa.com"
                      className="focus-ring w-full rounded-xl border border-border bg-background py-2.5 px-3.5 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-mono text-xs text-muted mb-1.5 font-semibold">
                      WhatsApp (Opcional, para aviso rápido)
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+54 9 299 123-4567"
                      className="focus-ring w-full rounded-xl border border-border bg-background py-2.5 px-3.5 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
                    />
                  </div>
                </div>

                <LeadError error={sendError} whatsappUrl={whatsappDirectUrl} />

                {/* Botón de Envío */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 text-sm font-semibold text-background transition-all hover:bg-accent/90 disabled:opacity-50 shadow-[0_0_25px_rgba(255,77,46,0.3)]"
                >
                  <Send size={16} />
                  <span>{isSubmitting ? "Enviando solicitud..." : "Solicitar Auditoría Gratuita en Video"}</span>
                </button>

                <p className="text-center font-mono text-[11px] text-muted">
                  🔒 Cero spam. Recibís un análisis técnico directo y personalizado.
                </p>
              </form>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
