"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  m,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { SITE } from "@/data/site";
import { sendLead } from "@/lib/send-lead";
import { COARSE_POINTER, useMediaQuery } from "@/lib/use-media-query";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { RdHeroRing } from "@/components/rd/hero-ring";
import { EASE_OUT, RdLabel, RdRoll } from "@/components/rd/primitives";

const PROJECT_TYPES = [
  "Landing page",
  "Plataforma o app web",
  "E-commerce",
  "Inteligencia artificial",
  "Rediseño",
];

const BUDGETS = [
  "Menos de USD 1.500",
  "USD 1.500 – 3.000",
  "USD 3.000 – 6.000",
  "Más de USD 6.000",
  "Todavía no sé",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAGNET_STRENGTH = 0.25;
const MAGNET_MAX = 12;
const MAGNET_PAD = 24;
const MAGNET_SPRING = { stiffness: 200, damping: 15, mass: 0.3 };

/** Atrae el contenido hacia el cursor; en touch o sin movimiento no hace nada. */
function Magnetic({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const coarse = useMediaQuery(COARSE_POINTER);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, MAGNET_SPRING);
  const sy = useSpring(y, MAGNET_SPRING);

  if (reduced || coarse) return <span className={className}>{children}</span>;

  const pull = (d: number) =>
    Math.max(-MAGNET_MAX, Math.min(MAGNET_MAX, d * MAGNET_STRENGTH));

  return (
    <m.span
      ref={ref}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set(pull(e.clientX - (r.left + r.width / 2)));
        y.set(pull(e.clientY - (r.top + r.height / 2)));
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={{ x: sx, y: sy, margin: -MAGNET_PAD, padding: MAGNET_PAD }}
      className={`inline-block ${className}`}
    >
      {children}
    </m.span>
  );
}

export function RdContact() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });
  const scale = useTransform(scrollYProgress, [0, 1], [0.55, 1]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-6, 0]);

  return (
    <section
      id="contacto"
      ref={ref}
      data-theme="signal"
      className="relative -mt-10 overflow-hidden rounded-t-[2.5rem] bg-(--signal) pt-20 pb-20 text-(--ink) md:-mt-16 md:rounded-t-[4rem] md:pt-28 md:pb-28"
    >
      <RdHeroRing
        outline
        ring="rgba(11,11,12,0.22)"
        follow={0.5}
        className="pointer-events-none absolute top-[8%] left-1/2 w-[160vw] -translate-x-1/2 md:w-[110vw]"
      />
      <div className="rd-wrap relative">
        <div className="flex items-center justify-between gap-4">
          <RdLabel index="08" className="text-(--ink)/70">
            Contacto
          </RdLabel>
          <span className="rd-label hidden text-(--ink)/70 sm:inline">
            Respondemos en 24 h hábiles
          </span>
        </div>

        <m.h2
          style={reduced ? undefined : { scale, rotate }}
          className="rd-display mt-10 origin-left text-[clamp(2.6rem,12.4vw,14.5rem)] leading-[0.8] whitespace-nowrap md:mt-14"
        >
          ¿Habla<span className="rd-serif">mos</span>?
        </m.h2>

        <div className="mt-14 grid gap-12 md:mt-20 lg:grid-cols-12">
          <div className="flex flex-col gap-8 lg:col-span-4">
            <p className="rd-body max-w-sm text-xl leading-snug font-medium md:text-2xl">
              Contanos qué tenés en mente. Te respondemos con una propuesta
              concreta, sin compromiso.
            </p>
            <div className="flex items-center gap-6">
              <Magnetic>
                <a
                  href={SITE.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative grid h-40 w-40 place-items-center overflow-hidden rounded-full bg-(--ink) text-center text-(--paper) md:h-44 md:w-44"
                >
                  <span
                    aria-hidden
                    className="absolute inset-0 scale-0 rounded-full bg-(--paper) transition-transform duration-700 ease-(--ease-io) group-hover:scale-100"
                  />
                  <span className="rd-label relative text-[12px] font-bold transition-colors duration-500 group-hover:text-(--ink)">
                    Escribinos
                    <br />
                    por WhatsApp
                  </span>
                </a>
              </Magnetic>
            </div>
            <CopyEmail />
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function CopyEmail() {
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(SITE.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Sin permiso de portapapeles: se deja el mail seleccionado para copiarlo a mano.
      const el = textRef.current;
      const sel = window.getSelection();
      if (el && sel) {
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }

  return (
    <div className="relative">
      <p className="rd-label text-(--ink)/70">o por mail</p>
      <button
        type="button"
        onClick={copy}
        className="rd-body group mt-1 flex items-center gap-3 text-xl font-semibold tracking-[-0.02em] md:text-2xl"
      >
        <span ref={textRef} className="rd-link">
          {SITE.email}
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full border border-(--ink)/25 transition-colors group-hover:bg-(--ink) group-hover:text-(--paper)">
          {copied ? <Check size={15} /> : <Copy size={15} />}
        </span>
      </button>
      <AnimatePresence>
        {copied && (
          <m.span
            role="status"
            initial={{ opacity: 0, y: 8, rotate: -6 }}
            animate={{ opacity: 1, y: 0, rotate: -3 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="rd-label absolute -top-6 left-24 rounded-full bg-(--ink) px-3 py-1.5 text-[10px] text-(--paper)"
          >
            {"¡Mail copiado! ✌"}
          </m.span>
        )}
      </AnimatePresence>
    </div>
  );
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

function ContactForm() {
  const [projectType, setProjectType] = useState("");
  const [budget, setBudget] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idea, setIdea] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [fieldError, setFieldError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return setFieldError("Decinos tu nombre.");
    if (!EMAIL_RE.test(email.trim())) {
      return setFieldError("Revisá el mail: así no te podemos responder.");
    }
    setFieldError(null);
    setStatus({ kind: "sending" });
    // Mismo envío que el resto del sitio: /api/contact (rate-limit y guardado en /admin).
    const res = await sendLead({
      name: name.trim(),
      email: email.trim(),
      projectType: projectType || undefined,
      budget: budget || undefined,
      idea: idea.trim() || undefined,
    });
    setStatus(
      res.ok ? { kind: "sent" } : { kind: "error", message: res.error },
    );
  }

  if (status.kind === "sent") {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: EASE_OUT }}
        className="flex flex-col justify-center gap-4 rounded-[2rem] bg-(--ink) p-8 text-(--paper) md:p-12 lg:col-span-8"
        role="status"
      >
        <p className="rd-display text-[clamp(2.2rem,4.5vw,4.4rem)]">
          ¡Listo,{" "}
          <span className="rd-serif text-(--signal)">{name.split(" ")[0]}</span>
          !
        </p>
        <p className="rd-body max-w-md text-lg text-(--paper)/75">
          Te escribimos dentro de las próximas 24 h hábiles a {email}.
        </p>
      </m.div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="rounded-[2rem] bg-(--ink) p-6 text-(--paper) md:p-10 lg:col-span-8"
    >
      <ChipGroup
        legend="¿Qué necesitás?"
        options={PROJECT_TYPES}
        value={projectType}
        onChange={setProjectType}
      />
      <ChipGroup
        legend="¿Con qué presupuesto?"
        options={BUDGETS}
        value={budget}
        onChange={setBudget}
        className="mt-8"
      />
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <TextField
          label="Tu nombre"
          value={name}
          onChange={setName}
          autoComplete="name"
        />
        <TextField
          label="Tu mail"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
        />
      </div>
      <label className="mt-5 block">
        <span className="rd-label text-(--paper)/60">
          Tu idea, en dos líneas
        </span>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={3}
          placeholder="Ej: una tienda para vender ropa con Mercado Pago, lista para marzo."
          className="rd-body mt-2 w-full resize-none border-b border-(--line) bg-transparent pb-3 text-lg outline-none placeholder:text-(--paper)/30 focus:border-(--signal)"
        />
      </label>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <p role="alert" className="rd-label min-h-[1.4em] text-(--signal-2)">
          {fieldError ?? (status.kind === "error" ? status.message : "")}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {status.kind === "error" && (
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="rd-btn rd-btn--ghost"
            >
              <RdRoll>Ir a WhatsApp</RdRoll>
            </a>
          )}
          <button
            type="submit"
            disabled={status.kind === "sending"}
            className="rd-btn disabled:opacity-60"
          >
            <RdRoll>
              {status.kind === "sending" ? "Enviando…" : "Enviar consulta"}
            </RdRoll>
            <span className="rd-btn__icon" aria-hidden>
              <ArrowUpRight size={18} strokeWidth={2.25} />
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}

function ChipGroup({
  legend,
  options,
  value,
  onChange,
  className = "",
}: {
  legend: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <fieldset className={className}>
      <legend className="rd-label text-(--paper)/60">{legend}</legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = value === opt;
          return (
            <label
              key={opt}
              className={`rd-body relative cursor-pointer rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-300 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--signal) ${
                on
                  ? "border-(--signal) bg-(--signal) text-(--ink)"
                  : "border-(--line) hover:border-(--paper)/50"
              }`}
            >
              <input
                type="radio"
                name={legend}
                value={opt}
                checked={on}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              {opt}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="rd-label text-(--paper)/60">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="rd-body mt-2 w-full border-b border-(--line) bg-transparent pb-3 text-lg outline-none focus:border-(--signal)"
      />
    </label>
  );
}
