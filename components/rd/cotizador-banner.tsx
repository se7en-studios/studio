"use client";

import { useRef, useState, MouseEvent } from "react";
import { m } from "framer-motion";
import { ArrowUpRight, Calculator, CheckCircle2, Clock, Sparkles, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { RdButton, RdLabel, RdRoll } from "@/components/rd/primitives";
import { RdHeroRing } from "@/components/rd/hero-ring";

const PACKAGES = [
  {
    title: "Landing Corporativa",
    price: "Desde USD 1.200",
    time: "7 a 10 días hábiles",
    desc: "Para empresas de servicios, inmobiliarias y marcas que buscan captar leads sin vueltas.",
    href: "/cotizador",
  },
  {
    title: "E-Commerce a Medida",
    price: "Desde USD 2.400",
    time: "14 a 18 días hábiles",
    desc: "Tienda online rápida con cobro por Mercado Pago, stock en vivo y 0% de comisiones por venta.",
    popular: true,
    href: "/cotizador",
  },
  {
    title: "Plataforma / SaaS MVP",
    price: "Desde USD 2.800",
    time: "18 a 25 días hábiles",
    desc: "Aplicación web con usuarios, base de datos PostgreSQL, panel de control y módulos de IA.",
    href: "/cotizador",
  },
];

export function RdCotizadorBanner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, opacity: 0 });

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      opacity: 1,
    });
  };

  const handleMouseLeave = () => {
    setMousePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <section
      id="cotizador-preview"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-24 md:py-36 border-t border-(--line)"
    >
      {/* Anillo de resplandor decorativo de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-1/2 h-[75vw] w-[75vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,77,46,0.12),transparent)]"
      />

      <div className="rd-wrap relative">
        {/* Banner principal enmarcado */}
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative overflow-hidden rounded-[2.5rem] border border-(--signal)/30 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-8 md:p-14 lg:p-16 shadow-[0_0_50px_rgba(255,77,46,0.08)]"
        >
          {/* Spotlight cursor glow */}
          <div
            className="pointer-events-none absolute -inset-px transition-opacity duration-300"
            style={{
              opacity: mousePos.opacity,
              background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(255,77,46,0.18), transparent 80%)`,
            }}
            aria-hidden
          />

          <div className="relative z-10 grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Texto y llamado */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-(--signal)/40 bg-(--signal)/10 px-4 py-1.5 text-xs font-mono text-(--signal)">
                <Calculator size={14} />
                <span>COTIZADOR INTERACTIVO 2026</span>
              </div>

              <h2 className="rd-condensed mt-6 text-[clamp(2.75rem,6.5vw,5.5rem)] leading-[0.9] text-(--paper)">
                SABÉ CUÁNTO SALE TU WEB
                <br />
                <span className="text-(--signal)">ANTES DE HABLAR CON NADIE.</span>
              </h2>

              <p className="rd-body mt-6 max-w-xl text-base leading-relaxed text-(--paper)/75 md:text-lg">
                Seleccioná el tipo de proyecto, las integraciones que necesitás y obtené al
                instante el presupuesto en USD / ARS y la fecha exacta de entrega. Sin llamadas
                sorpresa ni formularios eternos.
              </p>

              {/* Badges de garantía */}
              <div className="mt-8 flex flex-wrap gap-4 text-xs font-mono text-(--paper)/70">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-(--signal)" />
                  Garantía 30 días post-lanzamiento
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-(--signal)" />
                  Código 100% tuyo en GitHub
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-(--signal)" />
                  0% comisiones por venta
                </span>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <RdButton href="/cotizador" variant="signal" className="text-sm md:text-base">
                  Calcular presupuesto en 1 min
                </RdButton>
                <Link
                  href="/calculadora-comisiones"
                  className="rd-btn rd-btn--ghost text-xs md:text-sm"
                >
                  <RdRoll>Calculadora de comisiones</RdRoll>
                </Link>
              </div>
            </div>

            {/* Tarjetas de referencia de paquetes */}
            <div className="space-y-4 lg:col-span-5">
              {PACKAGES.map((pkg) => (
                <Link
                  key={pkg.title}
                  href={pkg.href}
                  className={`group block rounded-2xl p-5 transition-all duration-300 ${
                    pkg.popular
                      ? "border border-(--signal)/60 bg-(--signal)/10 shadow-[0_0_25px_rgba(255,77,46,0.15)]"
                      : "border border-white/[0.08] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rd-condensed text-xl text-(--paper) group-hover:text-(--signal) transition-colors">
                      {pkg.title}
                    </span>
                    <span className="rd-label rounded-full bg-white/[0.06] px-3 py-1 text-xs text-(--signal) font-mono">
                      {pkg.price}
                    </span>
                  </div>
                  <p className="rd-body mt-2 text-xs text-(--paper)/65 leading-relaxed">
                    {pkg.desc}
                  </p>
                  <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/[0.05] text-[11px] font-mono text-(--paper)/40">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {pkg.time}
                    </span>
                    <span className="text-(--signal) group-hover:underline inline-flex items-center gap-1">
                      Cotizar este plan <ArrowUpRight size={12} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
