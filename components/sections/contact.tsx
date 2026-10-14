"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Mail,
} from "lucide-react";
import { InstagramIcon, LinkedinIcon } from "@/components/ui/brand-icons";
import { Container } from "@/components/ui/container";
import { RevealText } from "@/components/ui/reveal-text";
import { CopyButton } from "@/components/ui/copy-button";
import { SITE } from "@/data/site";
import { SLOTS, useMonthName } from "@/lib/availability";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";

const projectTypes = [
  "Landing page",
  "Plataforma o app web",
  "E-commerce",
  "Inteligencia artificial",
  "Rediseño",
];

const budgetRanges = [
  "Menos de USD 1.500",
  "USD 1.500 – 3.000",
  "USD 3.000 – 6.000",
  "Más de USD 6.000",
  "Todavía no sé",
];

const STEPS = ["Proyecto", "Idea", "Contacto"] as const;
const IDEA_MIN = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Values = {
  projectType: string;
  budget: string;
  idea: string;
  name: string;
  email: string;
  phone: string;
  company: string;
};
type FieldName = keyof Values;
type Errors = Partial<Record<FieldName, string>>;
type Channel = "email" | "whatsapp";

const EMPTY: Values = {
  projectType: "",
  budget: "",
  idea: "",
  name: "",
  email: "",
  phone: "",
  company: "",
};

// Qué campos valida cada paso, en el orden en que se enfoca el primero inválido.
const STEP_FIELDS: FieldName[][] = [
  ["projectType", "budget"],
  ["idea"],
  ["name", "email", "phone"],
];

function validateField(field: FieldName, v: Values): string | undefined {
  switch (field) {
    case "projectType":
      return v.projectType ? undefined : "Elegí el tipo de proyecto.";
    case "budget":
      return v.budget ? undefined : "Elegí un rango (vale «Todavía no sé»).";
    case "idea": {
      const len = v.idea.trim().length;
      if (len === 0) return "Contanos en dos líneas qué querés lograr.";
      return len < IDEA_MIN
        ? `Un poco más de detalle: faltan ${IDEA_MIN - len} caracteres.`
        : undefined;
    }
    case "name":
      return v.name.trim() ? undefined : "¿Cómo te llamás?";
    case "email":
      // Opcional: por mail responde el remitente, por WhatsApp el número.
      return v.email.trim() && !EMAIL_RE.test(v.email.trim())
        ? "Revisá el email: parece incompleto (ej: vos@empresa.com)."
        : undefined;
    case "phone": {
      // Opcional; si viene, que se pueda usar: 8 a 20 dígitos, con código de área.
      const p = v.phone.trim();
      const digits = p.replace(/\D/g, "").length;
      return p && (!/^[0-9+()\s.-]+$/.test(p) || digits < 8 || digits > 20)
        ? "Revisá el número: con código de área (ej: 299 412-3456)."
        : undefined;
    }
    default:
      return undefined;
  }
}

function validateStep(step: number, v: Values): Errors {
  const errors: Errors = {};
  for (const field of STEP_FIELDS[step]) {
    const error = validateField(field, v);
    if (error) errors[field] = error;
  }
  return errors;
}

function buildMessage(v: Values): string {
  return [
    `Hola Se7en Studio! Soy ${v.name.trim()}${
      v.company.trim() ? ` (${v.company.trim()})` : ""
    }.`,
    "",
    `Proyecto: ${v.projectType}`,
    `Presupuesto: ${v.budget}`,
    v.email.trim() ? `Email: ${v.email.trim()}` : null,
    v.phone.trim() ? `WhatsApp: ${v.phone.trim()}` : null,
    "",
    v.idea.trim(),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildHref(channel: Channel, v: Values): string {
  const message = buildMessage(v);
  if (channel === "whatsapp") {
    return `${SITE.whatsapp}?text=${encodeURIComponent(message)}`;
  }
  const subject = `Nuevo proyecto: ${v.projectType} — ${v.name.trim()}`;
  return `mailto:${SITE.email}?subject=${encodeURIComponent(
    subject,
  )}&body=${encodeURIComponent(message)}`;
}

const labelClass =
  "mb-2 block font-mono text-xs tracking-widest text-muted uppercase";
const inputClass =
  "focus-ring w-full rounded-lg border bg-background px-4 py-3.5 text-base text-foreground transition-colors placeholder:text-muted/60 hover:border-foreground/25 focus:border-accent aria-[invalid=true]:border-red-500/60";

export function Contact() {
  const month = useMonthName();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState(0);
  const [sent, setSent] = useState<{ channel: Channel; href: string } | null>(
    null,
  );
  const [announce, setAnnounce] = useState("");
  const stepRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);

  // Al cambiar de paso el foco va al primer control del paso nuevo; si no, el
  // teclado queda en un botón que acaba de desaparecer. No en el primer render:
  // robarle el foco a quien recién entra a la página sería peor.
  useEffect(() => {
    if (!hasNavigated.current) return;
    stepRef.current
      ?.querySelector<HTMLElement>("input, textarea")
      ?.focus();
  }, [step]);

  useEffect(() => {
    if (sent) doneRef.current?.focus();
  }, [sent]);

  function update(field: FieldName, value: string) {
    const next = { ...values, [field]: value };
    setValues(next);
    // Una vez marcado, el error se re-evalúa al tipear: desaparece apenas se
    // corrige, pero no aparece mientras la persona todavía está escribiendo.
    if (errors[field]) {
      setErrors({ ...errors, [field]: validateField(field, next) });
    }
  }

  function goTo(nextStep: number) {
    hasNavigated.current = true;
    setStep(nextStep);
    setAnnounce(`Paso ${nextStep + 1} de ${STEPS.length}: ${STEPS[nextStep]}.`);
  }

  function checkStep(): boolean {
    const stepErrors = validateStep(step, values);
    setErrors({ ...errors, ...stepErrors });
    const firstInvalid = STEP_FIELDS[step].find((f) => stepErrors[f]);
    if (!firstInvalid) return true;
    setAnnounce(stepErrors[firstInvalid] ?? "");
    document.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
    return false;
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!checkStep()) return;
    if (step < STEPS.length - 1) return goTo(step + 1);

    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const channel: Channel =
      submitter?.getAttribute("value") === "whatsapp" ? "whatsapp" : "email";
    const href = buildHref(channel, values);
    // El pedido queda registrado para el panel /admin (keepalive: sigue aunque
    // la página se vaya al mailto). La charla sigue en la app del visitante con
    // el mensaje armado; no podemos confirmar ese envío, y el éxito lo dice así.
    fetch("/api/leads", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, channel }),
    }).catch(() => {});
    if (channel === "whatsapp") {
      window.open(href, "_blank", "noopener,noreferrer");
    } else {
      window.location.href = href;
    }
    setSent({ channel, href });
    setAnnounce("");
  }

  return (
    <section id="contact" className="border-t border-border py-20 md:py-28">
      <Container>
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-20">
          <div className="@container min-w-0 lg:col-span-5">
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-xs text-emerald-400">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span>
                  {month ? `${month}: ` : ""}
                  {SLOTS} cupos abiertos
                </span>
              </span>
            </div>

            {/* El tamaño sigue al ancho de la columna (cqw), no al viewport:
                "CONSTRUYÁMOSLA." mide ~9.3em y con tamaños fijos por
                breakpoint desbordaba en mobile, tablet y desktop. */}
            <h2 className="display text-[clamp(1.6rem,10cqw,4rem)] uppercase text-foreground">
              <span className="line-mask block">
                <RevealText>¿Tenés una idea?</RevealText>
              </span>
              <span className="line-mask block">
                <RevealText index={1}>
                  <span className="text-accent">Construyámosla.</span>
                </RevealText>
              </span>
            </h2>

            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
              Tres pasos cortos y te llega a nosotros por email o WhatsApp.
              Respondemos cada mensaje, personalmente, dentro de las 24 h
              hábiles.
            </p>

            <div className="mt-10 space-y-4 rounded-xl border border-border bg-surface/60 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-mono text-xs text-muted">
                  ¿Preferís escribir directo?
                </span>
                <CopyButton text={SITE.email} label="Copiar email" />
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <a
                  href={`mailto:${SITE.email}`}
                  className="focus-ring inline-flex min-w-0 items-center gap-2.5 text-sm text-foreground transition-colors hover:text-accent"
                >
                  <Mail
                    size={16}
                    className="shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <span className="truncate">{SITE.email}</span>
                </a>

                <a
                  href={SITE.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring inline-flex items-center gap-2.5 text-sm text-emerald-400 transition-colors hover:text-emerald-300"
                >
                  <WhatsAppLogo
                    size={16}
                    className="shrink-0"
                    aria-hidden="true"
                  />
                  <span>WhatsApp +54 9 299 424-7985</span>
                </a>
              </div>
            </div>

            {(SITE.social.instagram || SITE.social.linkedin) && (
              <div className="mt-8 flex gap-6">
                {SITE.social.instagram && (
                  <DirectLink
                    href={SITE.social.instagram}
                    icon={InstagramIcon}
                    label="Instagram"
                  />
                )}
                {SITE.social.linkedin && (
                  <DirectLink
                    href={SITE.social.linkedin}
                    icon={LinkedinIcon}
                    label="LinkedIn"
                  />
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 lg:col-span-7">
            <p role="status" aria-live="polite" className="sr-only">
              {announce}
            </p>

            {sent ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-surface p-8 text-center md:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <Check size={28} aria-hidden="true" />
                </div>
                <h3
                  ref={doneRef}
                  tabIndex={-1}
                  className="display mt-6 text-2xl text-foreground outline-none sm:text-3xl"
                >
                  Tu mensaje está listo.
                </h3>
                <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted">
                  Lo abrimos en{" "}
                  {sent.channel === "email" ? "tu app de email" : "WhatsApp"}{" "}
                  con todo cargado. Sólo falta tocar{" "}
                  <strong className="text-foreground">Enviar</strong> ahí.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={sent.href}
                    data-testid="contact-handoff"
                    {...(sent.channel === "whatsapp"
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background transition-colors hover:bg-accent/90"
                  >
                    ¿No se abrió? Abrir de nuevo
                  </a>
                  <CopyButton
                    text={buildMessage(values)}
                    label="Copiar mensaje"
                  />
                  <button
                    type="button"
                    onClick={() => setSent(null)}
                    className="focus-ring rounded-full border border-border bg-background px-6 py-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                aria-label="Contanos tu proyecto"
                className="rounded-2xl border border-border bg-surface p-6 md:p-10"
              >
                <StepProgress step={step} />

                <div ref={stepRef} className="mt-8">
                  {step === 0 && (
                    <div className="space-y-8">
                      <ChoiceGroup
                        name="projectType"
                        legend="¿Qué querés construir?"
                        options={projectTypes}
                        value={values.projectType}
                        error={errors.projectType}
                        onChange={(v) => update("projectType", v)}
                      />
                      <ChoiceGroup
                        name="budget"
                        legend="Presupuesto estimado"
                        options={budgetRanges}
                        value={values.budget}
                        error={errors.budget}
                        onChange={(v) => update("budget", v)}
                      />
                    </div>
                  )}

                  {step === 1 && (
                    <Field
                      name="idea"
                      label="Contanos tu idea"
                      hint="Qué querés lograr, funcionalidades clave o una fecha objetivo."
                      error={errors.idea}
                    >
                      {(a11y) => (
                        <textarea
                          {...a11y}
                          rows={5}
                          value={values.idea}
                          onChange={(e) => update("idea", e.target.value)}
                          placeholder="Ej: una tienda para vender ropa con Mercado Pago, lista para marzo."
                          className={`${inputClass} resize-y`}
                        />
                      )}
                    </Field>
                  )}

                  {step === 2 && (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <Field name="name" label="Nombre" error={errors.name}>
                        {(a11y) => (
                          <input
                            {...a11y}
                            type="text"
                            autoComplete="name"
                            value={values.name}
                            onChange={(e) => update("name", e.target.value)}
                            className={inputClass}
                          />
                        )}
                      </Field>
                      <Field
                        name="email"
                        label="Email (opcional)"
                        error={errors.email}
                      >
                        {(a11y) => (
                          <input
                            {...a11y}
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            spellCheck={false}
                            value={values.email}
                            onChange={(e) => update("email", e.target.value)}
                            placeholder="vos@empresa.com"
                            className={inputClass}
                          />
                        )}
                      </Field>
                      <Field
                        name="phone"
                        label="WhatsApp (opcional)"
                        error={errors.phone}
                      >
                        {(a11y) => (
                          <input
                            {...a11y}
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            maxLength={40}
                            value={values.phone}
                            onChange={(e) => update("phone", e.target.value)}
                            placeholder="299 412-3456"
                            className={inputClass}
                          />
                        )}
                      </Field>
                      <Field
                        name="company"
                        label="Empresa o marca (opcional)"
                      >
                        {(a11y) => (
                          <input
                            {...a11y}
                            type="text"
                            autoComplete="organization"
                            value={values.company}
                            onChange={(e) =>
                              update("company", e.target.value)
                            }
                            className={inputClass}
                          />
                        )}
                      </Field>
                    </div>
                  )}
                </div>

                <StepActions step={step} onBack={() => goTo(step - 1)} />
              </form>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}

function StepProgress({ step }: { step: number }) {
  return (
    <div>
      <p className="font-mono text-xs text-muted">
        Paso {step + 1} de {STEPS.length}
      </p>
      <ol className="mt-3 grid grid-cols-3 gap-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className="min-w-0"
          >
            <span
              aria-hidden="true"
              className={`block h-1 rounded-full transition-colors duration-300 ${
                i <= step ? "bg-accent" : "bg-border"
              }`}
            />
            <span
              className={`mt-2 flex items-center gap-1 truncate font-mono text-[11px] tracking-widest uppercase ${
                i === step ? "text-foreground" : "text-muted"
              }`}
            >
              {i < step && (
                <Check
                  size={12}
                  className="shrink-0 text-accent"
                  aria-hidden="true"
                />
              )}
              {label}
              {i < step && <span className="sr-only"> (completo)</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepActions({ step, onBack }: { step: number; onBack: () => void }) {
  const isLast = step === STEPS.length - 1;
  const primary =
    "focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-background transition-colors duration-300 hover:bg-accent/90";

  return (
    <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      {step > 0 ? (
        <button
          type="button"
          onClick={onBack}
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Atrás
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}

      {isLast ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            name="channel"
            value="whatsapp"
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-full border border-emerald-500/40 px-6 py-3.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
          >
            <WhatsAppLogo size={16} aria-hidden="true" />
            Enviar por WhatsApp
          </button>
          <button
            type="submit"
            name="channel"
            value="email"
            className={primary}
          >
            <Mail size={16} aria-hidden="true" />
            Enviar por email
          </button>
        </div>
      ) : (
        <button type="submit" className={primary}>
          Siguiente
          <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ChoiceGroup({
  name,
  legend,
  options,
  value,
  error,
  onChange,
}: {
  name: FieldName;
  legend: string;
  options: string[];
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const errorId = `${name}-error`;
  // Radios nativos: flechas, Tab y lector de pantalla gratis. El chip es sólo
  // la piel del <input>, que queda visualmente oculto pero enfocable.
  return (
    <fieldset
      aria-describedby={error ? errorId : undefined}
    >
      <legend className={labelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option} className="relative cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="inline-block rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-muted transition-colors hover:border-foreground/30 hover:text-foreground peer-checked:border-accent peer-checked:bg-accent peer-checked:font-medium peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
              {option}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} message={error} />
    </fieldset>
  );
}

type A11yProps = {
  id: string;
  name: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function Field({
  name,
  label,
  hint,
  error,
  children,
}: {
  name: FieldName;
  label: string;
  hint?: string;
  error?: string;
  children: (a11y: A11yProps) => ReactNode;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
      </label>
      {children({
        id: name,
        name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-xs text-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${name}-error`} message={error} />
    </div>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-2 text-xs text-red-400">
      {message}
    </p>
  );
}

function DirectLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: (props: { size?: number }) => React.ReactNode;
  label: string;
}) {
  const isMail = href.startsWith("mailto:");
  return (
    <a
      href={href}
      {...(isMail ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className="focus-ring inline-flex items-center gap-2.5 text-sm text-muted transition-colors hover:text-accent"
    >
      <Icon size={16} />
      {label}
    </a>
  );
}
