"use client";

import { useRef, useState, MouseEvent } from "react";
import { Zap, CreditCard, MessageSquare, ShieldCheck, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { RdButton, RdLabel, RdRoll } from "@/components/rd/primitives";

interface ValueItem {
  id: string;
  icon: typeof Zap;
  number: string;
  badge: string;
  title: string;
  headline: string;
  explanation: string;
  proof: string;
}

const ADVANTAGES: ValueItem[] = [
  {
    id: "speed",
    icon: Zap,
    number: "01",
    badge: "Menos de 1 segundo",
    title: "Abre al instante en cualquier celular",
    headline: "Tus clientes no esperan: tocan el enlace y ya abrió.",
    explanation:
      "Casi todos tus clientes entran desde el teléfono con datos móviles o 4G. Si una página tarda más de 2 segundos en cargar, la persona se cansa, cierra la pestaña y le compra a la competencia. Nuestras páginas abren al toque.",
    proof: "5 veces más rápida que el promedio de páginas de internet.",
  },
  {
    id: "payments",
    icon: CreditCard,
    number: "02",
    badge: "0% comisiones",
    title: "Toda la plata entra directo a tu cuenta",
    headline: "Sin intermediarios que te descuenten dinero de cada venta.",
    explanation:
      "Tus clientes pagan con Mercado Pago, transferencia bancaria o tarjeta de crédito. La plata entra directamente a tu cuenta bancaria o billetera virtual. Se7en no te cobra ninguna comisión por venta ni alquiler mensual.",
    proof: "Ahorrás entre 2% y 15% en cada venta frente a otras plataformas.",
  },
  {
    id: "whatsapp",
    icon: MessageSquare,
    number: "03",
    badge: "En 1 solo clic",
    title: "Tus clientes te piden o reservan directo",
    headline: "Menos vueltas, más ventas: directo a tu WhatsApp o sistema.",
    explanation:
      "Nada de formularios largos donde la gente se aburre y abandona. Tu cliente elige lo que quiere, toca un botón y el pedido o la reserva de turno te llega armado a tu WhatsApp con el detalle listo para preparar.",
    proof: "Funciona 24/7, incluso cuando tu negocio físico está cerrado.",
  },
  {
    id: "ownership",
    icon: ShieldCheck,
    number: "04",
    badge: "100% tuya",
    title: "Sos dueño de tu web para siempre",
    headline: "Como ser dueño de tu propio local, sin pagar alquiler mensual.",
    explanation:
      "Cuando terminamos el trabajo, la web es totalmente tuya. Nadie te puede venir a aumentar una cuota sorpresa ni te puede apagar la página. Además, tenés 30 días de garantía incluidos para cualquier cambio que necesites.",
    proof: "Garantía de 30 días post-lanzamiento incluida.",
  },
];

function AdvantageCard({ item }: { item: ValueItem }) {
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
      {/* Resplandor suave con el movimiento del ratón */}
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
            <Icon size={24} />
          </span>
          <span className="rd-label rounded-full border border-(--signal)/30 bg-(--signal)/10 px-3 py-1 text-xs font-mono text-(--signal)">
            {item.badge}
          </span>
        </div>

        <span className="rd-label mt-4 block text-xs text-(--paper)/40">
          VENTAJA {item.number}
        </span>

        <h3 className="rd-condensed mt-2 text-2xl text-(--paper) md:text-3xl">
          {item.title}
        </h3>
        <p className="rd-label mt-1 text-xs text-(--signal)">
          {item.headline}
        </p>

        <p className="rd-body mt-4 text-sm leading-relaxed text-(--paper)/75">
          {item.explanation}
        </p>
      </div>

      <div className="relative z-10 mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-mono text-(--paper)/50 group-hover:text-(--paper) transition-colors">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-(--signal)" />
          {item.proof}
        </span>
      </div>
    </div>
  );
}

export function RdTechStack() {
  return (
    <section
      id="ventajas"
      data-theme="ink"
      className="relative overflow-hidden bg-(--ink) py-24 md:py-36 border-t border-(--line)"
    >
      <div className="rd-wrap relative">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <RdLabel index="06" className="text-(--paper)/60">
              Por qué funciona
            </RdLabel>
            <h2 className="rd-condensed mt-4 text-[clamp(2.5rem,6vw,5.5rem)] leading-[0.92] text-(--paper)">
              LO QUE HACE QUE
              <br />
              <span className="text-(--signal)">TU PÁGINA VENDA MÁS.</span>
            </h2>
          </div>
          <p className="rd-body max-w-md text-base text-(--paper)/75 md:text-lg">
            No necesitas saber de programación para tener una web de primer nivel.
            Nosotros nos encargamos de que sea rápida, fácil de usar y que te traiga clientes todos los días.
          </p>
        </div>

        {/* Las 4 ventajas claras */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ADVANTAGES.map((item) => (
            <AdvantageCard key={item.id} item={item} />
          ))}
        </div>

        {/* Pie de sección con lenguaje cercano */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-(--line) bg-white/[0.02] p-6 text-sm text-(--paper)/65">
          <div className="flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="rd-body text-(--paper)/80">
              Todas nuestras páginas incluyen diseño exclusivo y soporte directo por WhatsApp.
            </span>
          </div>
          <Link
            href="/cotizador"
            className="rd-roll inline-flex items-center gap-1.5 font-mono text-xs text-(--signal) hover:underline"
          >
            <span>Ver cuánto saldría tu página en 1 minuto</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
