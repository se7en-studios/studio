"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FolderGit2,
  Palette,
  MessageSquare,
  Globe2,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Send,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { useSoundFx } from "@/components/providers/sound-provider";
import { SITE } from "@/data/site";
import { sendLead } from "@/lib/send-lead";
import { LeadError } from "@/components/ui/lead-error";

export function KickoffClient() {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [githubOrg, setGithubOrg] = useState("");
  const [hasExistingGithub, setHasExistingGithub] = useState<"yes" | "no">("no");
  const [brandColor, setBrandColor] = useState("#ff4d2e");
  const [assetsLink, setAssetsLink] = useState("");
  const [commChannel, setCommChannel] = useState<"whatsapp" | "slack">("whatsapp");
  const [contactLeader, setContactLeader] = useState("");
  const [domainName, setDomainName] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const { playClick, playPop, playSuccess } = useSoundFx();

  function nextStep() {
    playClick();
    setStep((s) => Math.min(4, s + 1));
  }

  function prevStep() {
    playClick();
    setStep((s) => Math.max(1, s - 1));
  }

  const kickoffSummary = `*Ficha de Kickoff de Proyecto — Se7en Studio:*
• Nombre del Proyecto: ${projectName || "Sin especificar"}
• Repositorio GitHub: ${
    hasExistingGithub === "yes"
      ? `Org/Usuario: ${githubOrg}`
      : "Crear desde Se7en Studio y transferir"
  }
• Color Primario de Marca: ${brandColor}
• Enlace de Assets (Drive/Figma): ${assetsLink || "Se enviará por chat"}
• Canal de Comunicación VIP: ${commChannel === "whatsapp" ? "WhatsApp VIP Group" : "Slack Connect"}
• Contacto Líder del Cliente: ${contactLeader || "Por definir"}
• Dominio Final de Producción: ${domainName || "staging.se7enstudios.com"}`;

  function handleCopy() {
    playSuccess();
    navigator.clipboard.writeText(kickoffSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFinalSubmit() {
    setSending(true);
    setSendError(null);
    const result = await sendLead({
      source: "kickoff",
      name: contactLeader || projectName || "Cliente Kickoff",
      projectType: "Kickoff de Proyecto",
      budget: "Confirmado",
      idea: kickoffSummary,
    });
    setSending(false);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    playSuccess();
    setSubmitted(true);
  }

  const whatsappDirectUrl = `${SITE.whatsapp}?text=${encodeURIComponent(
    `Hola Franco y Federico! Completamos nuestra Ficha de Kickoff para iniciar el proyecto:\n\n${kickoffSummary}\n\n¿Abrimos el canal de comunicación?`
  )}`;

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Portal de Kickoff Oficial de Clientes</span>
            </div>

            <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
              Configurá el inicio <br />
              <span className="text-accent">de tu desarrollo.</span>
            </h1>

            <p className="mt-4 text-base leading-relaxed text-muted max-w-xl mx-auto md:text-lg">
              Completá estos 4 pasos para configurar tus accesos de GitHub, canal de comunicación prioritario y entorno de staging.
            </p>
          </div>

          {/* Stepper Progress */}
          <div className="mt-10 flex items-center justify-between border-y border-border py-4 font-mono text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-background font-bold text-[11px]">
                {step}
              </span>
              <span className="text-foreground font-semibold">
                Paso {step} de 4
              </span>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    step >= s ? "bg-accent" : "bg-surface-2"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Card Principal */}
          <div className="mt-8 rounded-3xl border border-border bg-surface p-6 sm:p-10 shadow-2xl">
            {submitted ? (
              <div className="py-8 text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={32} />
                </div>

                <div>
                  <h3 className="display text-2xl sm:text-3xl text-foreground">
                    ¡Ficha de Kickoff Generada con Éxito!
                  </h3>
                  <p className="mt-2 text-sm text-muted max-w-md mx-auto leading-relaxed">
                    Hemos registrado los datos de tu proyecto. El siguiente paso es abrir el canal directo de comunicación con Franco y Federico.
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 pt-4">
                  <a
                    href={whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-background hover:bg-accent/90 transition-all shadow-[0_0_25px_rgba(255,77,46,0.3)]"
                  >
                    <Send size={15} />
                    <span>Iniciar Canal de WhatsApp VIP</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="focus-ring inline-flex items-center gap-2 rounded-full border border-border bg-background px-6 py-3.5 text-sm font-medium text-muted hover:text-foreground transition-colors"
                  >
                    {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
                    <span>{copied ? "¡Copiado!" : "Copiar Ficha"}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Paso 1: Accesos & GitHub */}
                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <FolderGit2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">
                          Paso 1: Nombre del Proyecto & Repositorio GitHub
                        </h3>
                        <p className="text-xs text-muted">
                          Garantizamos que el código pertenezca 100% a tu empresa
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        Nombre de tu Producto o Empresa *
                      </label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="Ej: Takefyy / Sentinel Cloud"
                        className="focus-ring w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        ¿Tenés una organización o cuenta existente de GitHub?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setHasExistingGithub("yes");
                          }}
                          className={`focus-ring rounded-xl border p-3.5 text-xs font-mono transition-all ${
                            hasExistingGithub === "yes"
                              ? "border-accent bg-surface-2 text-foreground font-bold"
                              : "border-border bg-background text-muted"
                          }`}
                        >
                          Sí, tengo GitHub
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setHasExistingGithub("no");
                          }}
                          className={`focus-ring rounded-xl border p-3.5 text-xs font-mono transition-all ${
                            hasExistingGithub === "no"
                              ? "border-accent bg-surface-2 text-foreground font-bold"
                              : "border-border bg-background text-muted"
                          }`}
                        >
                          No, que Se7en lo cree
                        </button>
                      </div>
                    </div>

                    {hasExistingGithub === "yes" && (
                      <div>
                        <label className="block font-mono text-xs text-muted mb-2">
                          Usuario u Organización de GitHub
                        </label>
                        <input
                          type="text"
                          value={githubOrg}
                          onChange={(e) => setGithubOrg(e.target.value)}
                          placeholder="github.com/tu-organizacion"
                          className="focus-ring w-full rounded-2xl border border-border bg-background py-3 px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-accent font-mono text-xs"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Paso 2: Brand Assets & Identidad */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Palette size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">
                          Paso 2: Identidad Visual & Brand Assets
                        </h3>
                        <p className="text-xs text-muted">
                          Logos SVG, paletas de color y referencias en Figma
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        Enlace a carpeta de assets (Google Drive / Figma / Dropbox)
                      </label>
                      <input
                        type="url"
                        value={assetsLink}
                        onChange={(e) => setAssetsLink(e.target.value)}
                        placeholder="https://drive.google.com/... o https://figma.com/..."
                        className="focus-ring w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        Color Primario de tu Marca (Hex o Acento)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="h-12 w-16 rounded-xl border border-border bg-background cursor-pointer p-1"
                        />
                        <input
                          type="text"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="focus-ring w-full rounded-xl border border-border bg-background py-2.5 px-3.5 text-xs text-foreground font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Paso 3: Canal VIP */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <MessageSquare size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">
                          Paso 3: Canal VIP Directo de Comunicación
                        </h3>
                        <p className="text-xs text-muted">
                          Hablá sin intermediarios con Franco y Federico
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        ¿Dónde preferís el grupo de trabajo?
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setCommChannel("whatsapp");
                          }}
                          className={`focus-ring rounded-xl border p-4 text-xs font-mono transition-all text-left ${
                            commChannel === "whatsapp"
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                              : "border-border bg-background text-muted"
                          }`}
                        >
                          <span className="block text-sm">💬 WhatsApp VIP</span>
                          <span className="text-[10px] text-muted">Respuesta en menos de 15 min</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            playPop();
                            setCommChannel("slack");
                          }}
                          className={`focus-ring rounded-xl border p-4 text-xs font-mono transition-all text-left ${
                            commChannel === "slack"
                              ? "border-accent bg-surface-2 text-foreground font-bold"
                              : "border-border bg-background text-muted"
                          }`}
                        >
                          <span className="block text-sm">⚡ Slack Connect</span>
                          <span className="text-[10px] text-muted">Canal compartido de equipo</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        Nombre y Teléfono / Email del Responsable del Proyecto *
                      </label>
                      <input
                        type="text"
                        value={contactLeader}
                        onChange={(e) => setContactLeader(e.target.value)}
                        placeholder="Ej: Franco Gómez · +54 9 299 123-4567"
                        className="focus-ring w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                      />
                    </div>
                  </div>
                )}

                {/* Paso 4: Dominio & Staging */}
                {step === 4 && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Globe2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-base">
                          Paso 4: Dominio Final & Entorno de Staging
                        </h3>
                        <p className="text-xs text-muted">
                          Configuramos tu entorno de pruebas privado en Vercel Edge
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block font-mono text-xs text-muted mb-2">
                        Dominio web definitivo (si ya lo tenés)
                      </label>
                      <input
                        type="text"
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        placeholder="ejemplo.com o app.ejemplo.com"
                        className="focus-ring w-full rounded-2xl border border-border bg-background py-3.5 px-4 text-sm text-foreground placeholder:text-muted/60 focus:border-accent"
                      />
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4 text-xs font-mono text-muted space-y-1">
                      <strong className="text-foreground">Entorno de Staging asignado:</strong>
                      <p className="text-accent">
                        https://staging-{projectName ? projectName.toLowerCase().replace(/\s+/g, "-") : "proyecto"}.se7enstudios.com
                      </p>
                    </div>
                  </div>
                )}

                {/* Botones de Navegación de Pasos */}
                {step === 4 && <LeadError error={sendError} whatsappUrl={whatsappDirectUrl} />}
                <div className="mt-10 flex items-center justify-between border-t border-border pt-6">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-5 py-2.5 font-mono text-xs text-muted hover:text-foreground transition-colors"
                    >
                      <ArrowLeft size={13} />
                      <span>Anterior</span>
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 4 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-accent px-6 py-2.5 font-mono text-xs font-bold text-background hover:bg-accent/90 transition-colors"
                    >
                      <span>Siguiente Paso</span>
                      <ArrowRight size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFinalSubmit}
                      disabled={sending}
                      className="focus-ring inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-600 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                    >
                      <CheckCircle2 size={15} />
                      <span>{sending ? "Enviando ficha..." : "Finalizar & Generar Ficha de Kickoff"}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
