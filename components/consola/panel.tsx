"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { projects } from "@/data/projects";
import { team, testimonials } from "@/data/team";
import { blogPosts } from "@/data/blog";
import { SITE } from "@/data/site";
import { sendLead } from "@/lib/send-lead";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { EASE_OUT } from "@/components/rd/primitives";
import { SECTIONS, useConsola, type SectionId } from "@/components/consola/section";
import { MailButton, WhatsAppButton } from "@/components/consola/contact-buttons";

// Contenido del panel-consola. Una vista por sección; «Hablemos» lo fija en contacto.

const cases = [...projects].sort((a, b) => a.order - b.order);
const quotes = testimonials.filter((t) => t.published).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

/** Color de marca de un caso (o la señal del estudio). */
const accentOf = (slug?: string) => cases.find((p) => p.slug === slug)?.brand?.accent ?? "#ff4d2e";

export function PanelBody() {
  const { shown } = useConsola();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <m.div
        key={shown}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="flex flex-col gap-3"
      >
        {VIEWS[shown]()}
      </m.div>
    </AnimatePresence>
  );
}

const VIEWS: Record<SectionId, () => ReactNode> = {
  inicio: () => <InicioView />,
  trabajos: () => <TrabajosView />,
  piezas: () => <PiezasView />,
  notas: () => <NotasView />,
  equipo: () => <EquipoView />,
  contacto: () => <ContactoView />,
};

/** Rota cada `ms` entre `n` elementos (quieto si el sistema pide menos movimiento). */
function useRotate(n: number, ms: number) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setI((v) => (v + 1) % n), ms);
    return () => window.clearInterval(id);
  }, [n, ms, reduced]);
  return i;
}

function Tag({ children }: { children: ReactNode }) {
  return <p className="rd-label text-[10px] whitespace-nowrap text-(--paper)/45">( {children} )</p>;
}

/** Miniatura cuadrada de un caso: la parte de arriba de su captura de celular. */
function Thumb({ slug, size = 40, ring = false }: { slug: string; size?: number; ring?: boolean }) {
  const p = cases.find((c) => c.slug === slug);
  if (!p) return null;
  return (
    <span
      className={`relative block shrink-0 overflow-hidden rounded-[30%] bg-(--paper)/10 ${ring ? "ring-2 ring-[#0b0b0c]" : ""}`}
      style={{ width: size, height: size }}
    >
      <Image src={p.screens?.mobile ?? p.image} alt="" fill sizes={`${size * 2}px`} className="object-cover object-top" />
    </span>
  );
}

function InicioView() {
  const q = useRotate(quotes.length, 5600);
  const quote = quotes[q];
  const qAccent = accentOf(quote.projectSlug);
  return (
    <>
      {/* Lo primero: cuántos sitios están online, con las caras de cada uno. */}
      <a href="#trabajos" className="cs-card cs-card--link group relative block overflow-hidden p-4">
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-[radial-gradient(closest-side,rgb(255_77_46/0.35),transparent)]"
        />
        <div className="flex items-start justify-between">
          <Tag>Online hoy</Tag>
          <ArrowUpRight size={14} className="text-(--paper)/50 transition-transform group-hover:rotate-45" aria-hidden />
        </div>
        <div className="mt-2 flex items-end gap-3">
          <p className="cs-cond text-[4.2rem] leading-[0.8] text-(--paper)">{cases.length}</p>
          <p className="rd-body pb-1 text-[14px] leading-tight text-(--paper)/75">
            proyectos en producción,
            <br />
            <span className="rd-serif text-[1.15em] text-(--signal)">todos en mantenimiento</span>
          </p>
        </div>
        <div className="mt-4 flex -space-x-2.5">
          {cases.map((p) => (
            <Thumb key={p.slug} slug={p.slug} size={34} ring />
          ))}
        </div>
      </a>

      <div className="grid grid-cols-2 gap-3">
        {[
          { n: "24", u: "h", l: "para responderte" },
          { n: "30", u: "días", l: "de garantía" },
        ].map((k) => (
          <div key={k.l} className="cs-card p-4">
            <p className="cs-cond text-[2.6rem] leading-none text-(--paper)">
              {k.n}
              <span className="rd-body ml-1 text-[14px] font-normal tracking-normal normal-case text-(--paper)/60">{k.u}</span>
            </p>
            <p className="rd-body mt-1.5 text-[12.5px] leading-tight text-(--paper)/70">{k.l}</p>
          </div>
        ))}
      </div>

      {/* Testimonio: la cara del caso, la frase y de qué negocio es. */}
      <Link href="/testimonials" className="cs-card cs-card--link block p-4">
        <div className="flex items-center justify-between">
          <Tag>Lo que dicen</Tag>
          <span className="flex gap-1" aria-hidden>
            {quotes.map((_, k) => (
              <span key={k} className={`h-1 rounded-full transition-all ${k === q ? "w-4 bg-(--signal)" : "w-1.5 bg-(--paper)/20"}`} />
            ))}
          </span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={quote.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <p className="rd-body mt-3 text-[1.05rem] leading-snug tracking-[-0.01em] text-(--paper)">
              «{quote.highlight}»
            </p>
            <p className="rd-body mt-2 line-clamp-2 text-[13px] leading-snug text-(--paper)/60">{quote.quote}</p>
            <div className="mt-3 flex items-center gap-2.5">
              {quote.projectSlug && <Thumb slug={quote.projectSlug} size={30} />}
              <span className="min-w-0">
                <span className="rd-body block text-[13px] text-(--paper)">{quote.name}</span>
                <span className="rd-label block text-[9.5px]" style={{ color: qAccent }}>
                  {quote.company}
                </span>
              </span>
            </div>
          </m.div>
        </AnimatePresence>
      </Link>

      <Link href="/#en-vivo" className="cs-card cs-card--link group relative block overflow-hidden p-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="rd-ping absolute inset-0 rounded-full bg-(--signal)" />
            <span className="relative h-2 w-2 rounded-full bg-(--signal)" />
          </span>
          <span className="rd-label text-[10px] text-(--signal)">En vivo</span>
        </div>
        <p className="rd-body mt-3 text-[1.05rem] leading-tight text-(--paper)">
          La oficina está abierta. <span className="rd-serif text-[1.15em]">Entrá al mapa</span> y paseá por el estudio.
        </p>
        <ArrowUpRight size={16} aria-hidden className="absolute top-4 right-4 text-(--paper)/50 transition-transform group-hover:rotate-45" />
      </Link>

      <div className="cs-card p-4">
        <Tag>Trabajamos con</Tag>
        {/* Los nombres enteros: antes se cortaban en dos columnas. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {cases.map((p) => (
            <a
              key={p.slug}
              href={`#caso-${p.slug}`}
              className="rd-body flex items-center gap-1.5 rounded-full border border-(--paper)/12 py-1 pr-3 pl-1 text-[12.5px] text-(--paper)/85 transition-colors hover:border-(--paper)/35 hover:text-(--paper)"
            >
              <Thumb slug={p.slug} size={20} />
              {p.name}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

/** El caso cuya tarjeta está en pantalla, para marcarlo en el índice. */
function useCaseInView() {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>('[id^="caso-"]')];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setSlug(e.target.id.slice(5));
      },
      { rootMargin: "-40% 0px -45% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return slug;
}

function TrabajosView() {
  const current = useCaseInView();
  return (
    <>
      <div className="flex items-end justify-between gap-3 px-1">
        <p className="rd-body text-[1.15rem] leading-tight tracking-[-0.02em]">
          {cases.length} casos, <span className="rd-serif text-[1.15em] text-(--signal)">todos online</span>
        </p>
        <Link href="/work" className="rd-label shrink-0 text-[10px] text-(--paper)/55 hover:text-(--paper)">
          Ver todos ↗
        </Link>
      </div>
      <ol className="flex flex-col gap-2">
        {cases.map((p, i) => {
          const on = current === p.slug;
          const a = p.brand?.accent ?? "#ff4d2e";
          return (
            <li key={p.slug}>
              <a
                href={`#caso-${p.slug}`}
                aria-current={on ? "true" : undefined}
                className={`cs-card group flex items-center gap-3 p-2.5 pr-3.5 transition-[border-color,background-color] duration-300 ${
                  on ? "bg-(--cs-card-2)" : "hover:bg-(--cs-card-2)"
                }`}
                style={on ? { borderColor: `color-mix(in srgb, ${a} 60%, transparent)` } : undefined}
              >
                <Thumb slug={p.slug} size={48} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="rd-label text-[9.5px] text-(--paper)/35">{String(i + 1).padStart(2, "0")}</span>
                    <span className="rd-body text-[14.5px] leading-tight text-(--paper)">{p.name}</span>
                  </span>
                  <span className="rd-body mt-0.5 block text-[12px] leading-snug text-(--paper)/55">{p.category}</span>
                </span>
                <span
                  className="rd-label shrink-0 rounded-full px-2 py-1 text-[9.5px] transition-colors"
                  style={on ? { background: a, color: "#0b0b0c" } : { background: "rgb(242 238 230 / 0.06)", color: "rgb(242 238 230 / 0.55)" }}
                >
                  {p.year}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </>
  );
}

const STACK = ["Next.js", "TypeScript", "Supabase", "Vercel", "Mercado Pago", "Stripe", "IA"];
const STEPS = [
  { n: "01", t: "Brief", d: "Una llamada y un documento corto." },
  { n: "02", t: "Diseño", d: "Pantallas reales, no moodboards." },
  { n: "03", t: "Código", d: "Next.js, rápido y tuyo." },
  { n: "04", t: "Online", d: "Lanzamos y te enseñamos a usarlo." },
];

function PiezasView() {
  return (
    <>
      <div className="cs-card relative overflow-hidden p-4">
        <Tag>Cómo usarlo</Tag>
        <p className="rd-body mt-3 text-[1.05rem] leading-tight">
          Arrastrá la pared para <span className="rd-serif text-[1.15em] text-(--signal)">recorrerla</span>. Cada pieza es una función real de un sitio en producción.
        </p>
      </div>
      <div className="cs-card p-4">
        <Tag>Proceso</Tag>
        <ol className="mt-3 flex flex-col gap-3">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-3">
              <span className="rd-label pt-0.5 text-[10px] text-(--signal)">{s.n}</span>
              <span>
                <span className="rd-body block text-[14px] text-(--paper)">{s.t}</span>
                <span className="rd-body block text-[12.5px] text-(--paper)/55">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className="cs-card p-4">
        <Tag>Stack</Tag>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STACK.map((s) => (
            <span key={s} className="rd-body rounded-full border border-(--paper)/15 px-2.5 py-1 text-[12px] text-(--paper)/85">
              {s}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function NotasView() {
  return (
    <>
      <div className="cs-card p-4">
        <Tag>Notas</Tag>
        <p className="rd-body mt-3 text-[14px] leading-snug text-(--paper)/75">
          Lo que aprendemos haciendo, escrito para dueños de negocio, no para programadores.
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {blogPosts.slice(0, 4).map((post) => (
          <li key={post.slug}>
            <Link href={`/blog/${post.slug}`} className="cs-card cs-card--link block p-4">
              <p className="rd-label text-[10px] text-(--paper)/45">{post.publishedAt}</p>
              <p className="rd-body mt-2 line-clamp-3 text-[14px] leading-snug text-(--paper)">{post.title}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

function EquipoView() {
  const slots = SITE.availability.slots;
  return (
    <>
      <div className="cs-card p-4">
        <Tag>Disponibilidad</Tag>
        <p className="cs-cond mt-3 text-[3.2rem] text-(--paper)">
          {slots}
          <span className="rd-body ml-2 text-base font-normal tracking-normal normal-case text-(--paper)/70">
            lugares
          </span>
        </p>
        <p className="rd-body mt-1 text-[13px] text-(--paper)/65">
          Tomamos pocos proyectos a la vez para hacerlos bien.
        </p>
      </div>
      {team.map((t) => (
        <a
          key={t.id}
          href={t.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="cs-card cs-card--link flex items-center gap-3 p-3"
        >
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-(--paper)/10">
            {t.imageUrl && <Image src={t.imageUrl} alt="" fill sizes="56px" className="object-cover" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="rd-body block text-[15px] text-(--paper)">{t.name ?? "Se7en"}</span>
            <span className="rd-body block text-[12px] text-(--paper)/55">{t.role}</span>
          </span>
          <ArrowUpRight size={15} className="text-(--paper)/45" aria-hidden />
        </a>
      ))}
    </>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ContactoView() {
  const { talk, closeTalk } = useConsola();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idea, setIdea] = useState("");
  const [state, setState] = useState<
    { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string }
  >({ kind: "idle" });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return setState({ kind: "error", message: "Decinos tu nombre." });
    if (!EMAIL_RE.test(email.trim())) {
      return setState({ kind: "error", message: "Revisá el mail: así no te podemos responder." });
    }
    setState({ kind: "sending" });
    const res = await sendLead({
      name: name.trim(),
      email: email.trim(),
      idea: idea.trim() || undefined,
      source: "consola",
    });
    setState(res.ok ? { kind: "sent" } : { kind: "error", message: res.error });
  }

  if (state.kind === "sent") {
    return (
      <div className="cs-card p-5" role="status">
        <p className="cs-cond text-[2.6rem]">
          ¡Listo, <span className="rd-serif text-(--signal)">{name.split(" ")[0]}</span>!
        </p>
        <p className="rd-body mt-3 text-[14px] text-(--paper)/75">
          Te escribimos dentro de las próximas 24 h hábiles a {email}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start justify-between gap-3 px-1">
        <p className="rd-body text-[1.2rem] leading-tight tracking-[-0.02em]">
          Contanos tu idea. <span className="rd-serif text-[1.15em] text-(--signal)">Respondemos</span> en 24 h.
        </p>
        {talk && (
          <button
            type="button"
            onClick={closeTalk}
            aria-label="Cerrar el formulario"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-(--paper)/20 text-(--paper)/70 hover:text-(--paper)"
          >
            <X size={14} />
          </button>
        )}
      </div>
      <form noValidate onSubmit={onSubmit} className="flex flex-col gap-3">
        {/* Si llegó por «Hablemos», el cursor ya queda en el nombre. */}
        <Field label="Me llamo" value={name} onChange={setName} placeholder="Tu nombre" autoComplete="name" autoFocus={talk} />
        <Field
          label="Mi mail es"
          value={email}
          onChange={setEmail}
          placeholder="vos@tunegocio.com"
          type="email"
          autoComplete="email"
        />
        <label className="flex flex-col gap-1.5">
          <span className="rd-label text-[10px] text-(--paper)/50">Mi idea</span>
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            placeholder="Necesito una tienda online que venda sola mientras atiendo el local…"
            className="rd-body resize-none rounded-2xl border border-(--paper)/12 bg-(--paper)/[0.04] px-4 py-3 text-[14px] text-(--paper) placeholder:text-(--paper)/30 focus:border-(--signal)/60 focus:outline-none"
          />
        </label>
        {state.kind === "error" && (
          <p role="alert" className="rd-body text-[13px] text-(--signal)">
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="rd-btn w-full justify-center !pr-6 disabled:opacity-60"
        >
          <span>{state.kind === "sending" ? "Enviando…" : "Enviar"}</span>
        </button>
      </form>
      <div className="grid grid-cols-2 gap-2">
        <WhatsAppButton />
        <MailButton />
      </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
  autoFocus = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="rd-label text-[10px] text-(--paper)/50">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rd-body h-12 rounded-2xl border border-(--paper)/12 bg-(--paper)/[0.04] px-4 text-[14px] text-(--paper) placeholder:text-(--paper)/30 focus:border-(--signal)/60 focus:outline-none"
      />
    </label>
  );
}

/** Menú del panel: las secciones y los atajos al resto del sitio. */
export function PanelMenu({ onPick }: { onPick: () => void }) {
  const { goTo, active } = useConsola();
  return (
    <nav aria-label="Secciones" className="flex flex-col gap-3">
      <ol className="cs-card overflow-hidden">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => {
                onPick();
                goTo(s.id);
              }}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-(--paper)/[0.05]"
            >
              <span className="rd-label w-5 text-[10px] text-(--paper)/40">{String(i + 1).padStart(2, "0")}</span>
              <span className={`cs-cond flex-1 text-[1.6rem] ${active === s.id ? "text-(--signal)" : "text-(--paper)"}`}>
                {s.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <div className="grid grid-cols-2 gap-2">
        {[
          { href: "/cotizador", label: "Cotizador" },
          { href: "/blog", label: "Blog" },
          { href: "/work", label: "Casos" },
          { href: "/", label: "Home actual" },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="cs-card cs-card--link rd-body flex items-center justify-between p-3 text-[13px]">
            {l.label}
            <ArrowUpRight size={13} aria-hidden className="text-(--paper)/50" />
          </Link>
        ))}
      </div>
    </nav>
  );
}
