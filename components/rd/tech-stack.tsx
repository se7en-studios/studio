"use client";

import { useState, useRef, MouseEvent } from "react";
import { m } from "framer-motion";
import { Cpu, Database, Flame, Globe, Sparkles, Terminal, ShieldCheck, CreditCard, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { EASE_OUT, RdButton, RdLabel, RdRoll } from "@/components/rd/primitives";

interface TechItem {
  id: string;
  name: string;
  category: "frontend" | "backend" | "ai" | "infra";
  icon: typeof Cpu;
  badge: string;
  headline: string;
  businessBenefit: string;
}

const TECHNOLOGIES: TechItem[] = [
  {
    id: "nextjs",
    name: "Next.js 16 (Turbopack)",
    category: "frontend",
    icon: Flame,
    badge: "Lighthouse 100/100",
    headline: "Framework Full-Stack estándar de la industria",
    businessBenefit: "Tu web carga en menos de 0.6s en cualquier celular. Cada 100ms ganados suben un 8% tu tasa de conversión.",
  },
  {
    id: "react",
    name: "React 19 Server Actions",
    category: "frontend",
    icon: Cpu,
    badge: "0 Endpoints REST expuestos",
    headline: "Interactividad instantánea sin recargas de página",
    businessBenefit: "Formularios de pedido y carritos sin parpadeos, con mutaciones atómicas seguras en el servidor.",
  },
  {
    id: "tailwind",
    name: "Tailwind CSS v4",
    category: "frontend",
    icon: Terminal,
    badge: "< 15 KB CSS en producción",
    headline: "Diseño ultraligero sin frameworks pesados",
    businessBenefit: "Elimina los 500KB de estilos que arrastra WordPress, haciendo que la página sea instantánea en datos móviles.",
  },
  {
    id: "supabase",
    name: "Supabase (PostgreSQL & RLS)",
    category: "backend",
    icon: Database,
    badge: "< 25ms Query Latency",
    headline: "Base de datos relacional de grado bancario",
    businessBenefit: "Seguridad a nivel de fila (Row-Level Security) para que los datos de tus clientes y cobros jamás se filtren.",
  },
  {
    id: "ai",
    name: "Claude & OpenAI API",
    category: "ai",
    icon: Sparkles,
    badge: "Streaming RAG a 60 FPS",
    headline: "Agentes y automatizaciones con datos de tu negocio",
    businessBenefit: "Asistentes inteligentes entrenados con tu catálogo o menú para atender y cerrar ventas 24/7 sin humanos.",
  },
  {
    id: "vercel",
    name: "Vercel Fluid Compute",
    category: "infra",
    icon: Globe,
    badge: "Sub-second TTFB Global",
    headline: "Red perimetral distribuida en más de 300 ciudades",
    businessBenefit: "Si recibís 10.000 visitas en un lanzamiento o promo, la web escala sola sin caerse ni cobrar sobrecostos.",
  },
  {
    id: "payments",
    name: "Mercado Pago & Stripe",
    category: "infra",
    icon: CreditCard,
    badge: "0% Comisiones de Se7en",
    headline: "Cobros directos a tu cuenta en ARS y USD",
    businessBenefit: "El dinero entra directo a tu cuenta de Mercado Pago o banco. Se7en no cobra ningún porcentaje por transacción.",
  },
  {
    id: "typescript",
    name: "TypeScript End-to-End",
    category: "infra",
    icon: ShieldCheck,
    badge: "100% Type-Safe",
    headline: "Tipado estricto que previene errores en vivo",
    businessBenefit: "Garantiza que ningún botón de compra o reserva falle en medio de un fin de semana con pico de pedidos.",
  },
];

const CATEGORIES = [
  { id: "all", label: "Todo el Stack" },
  { id: "frontend", label: "Frontend & Diseño" },
  { id: "backend", label: "Backend & Base de Datos" },
  { id: "ai", label: "IA & Agentes" },
  { id: "infra", label: "Infraestructura & Pagos" },
];

function TechCard({ item }: { item: TechItem }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, opacity: 0 }));
  };

  const Icon = item.icon;

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-(--line) bg-white/[0.02] p-6 transition-all duration-300 hover:border-(--signal)/50 hover:bg-white/[0.04] md:p-8"
    >
      {/* Resplandor Spotlight que sigue el cursor */}
      <div
        className="pointer-events-none absolute -inset-px transition-opacity duration-300"
        style={{
          opacity: mousePos.opacity,
          background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,77,46,0.15), transparent 80%)`,
        }}
        aria-hidden
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-(--signal) transition-transform duration-300 group-hover:scale-110 group-hover:border-(--signal)/40">
            <Icon size={22} />
          </span>
          <span className="rd-label rounded-full border border-(--signal)/30 bg-(--signal)/10 px-3 py-1 text-[11px] font-mono text-(--signal)">
            {item.badge}
          </span>
        </div>

        <h3 className="rd-condensed mt-5 text-2xl text-(--paper) md:text-3xl">
          {item.name}
        </h3>
        <p className="rd-label mt-1 text-xs text-(--paper)/50">
          {item.headline}
        </p>

        <p className="rd-body mt-4 text-sm leading-relaxed text-(--paper)/70">
          {item.businessBenefit}
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-(--paper)/40 group-hover:text-(--signal) transition-colors">
        <span>Producción garantizada</span>
        <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </div>
  );
}

export function RdTechStack() {
  const [selectedCat, setSelectedCat] = useState("all");

  const filtered = selectedCat === "all"
    ? TECHNOLOGIES
    : TECHNOLOGIES.filter((t) => t.category === selectedCat);

  return (
    <section
      id="stack"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-24 md:py-36 border-t border-(--line)"
    >
      <div className="rd-wrap relative">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <RdLabel index="05" className="text-(--paper)/60">
              Ingeniería
            </RdLabel>
            <h2 className="rd-condensed mt-4 text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] text-(--paper)">
              TECNOLOGÍA QUE
              <br />
              <span className="text-(--signal)">FACTURA Y NO FALLA.</span>
            </h2>
          </div>
          <p className="rd-body max-w-md text-base text-(--paper)/65 md:text-lg">
            No usamos plantillas recicladas ni plugins que ralentizan tu negocio.
            Construimos con el mismo stack técnico que usan OpenAI, Vercel, Linear y Airbnb.
          </p>
        </div>

        {/* Filtros de categoría */}
        <div className="mt-12 flex flex-wrap gap-2 border-b border-(--line) pb-6">
          {CATEGORIES.map((cat) => {
            const active = cat.id === selectedCat;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCat(cat.id)}
                className={`rd-label relative rounded-full px-5 py-2 text-xs transition-all duration-300 md:text-sm ${
                  active
                    ? "bg-(--paper) text-(--ink) font-semibold shadow-md"
                    : "border border-(--line) text-(--paper)/60 hover:border-(--paper)/40 hover:text-(--paper)"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Grilla interactiva */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((item) => (
            <TechCard key={item.id} item={item} />
          ))}
        </div>

        {/* Barra inferior */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--line) bg-white/[0.02] p-6 text-sm text-(--paper)/60">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="rd-body text-(--paper)/80">
              Stack compatible con los estándares de Google Core Web Vitals 2026.
            </span>
          </div>
          <Link
            href="/tech"
            className="rd-roll inline-flex items-center gap-1.5 font-mono text-xs text-(--signal) hover:underline"
          >
            <span>Ver nuestro radar tecnológico completo (Adopt / Trial / Avoid)</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
