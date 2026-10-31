"use client";

import { useState, useMemo } from "react";
import { m, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  CheckCircle2,
  DollarSign,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Percent,
  Plus,
  Minus,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { EASE_OUT, RdButton, RdLabel, RdRoll } from "@/components/rd/primitives";
import { SITE } from "@/data/site";
import { useSoundFx } from "@/lib/use-sound-fx";

type TabId = "padel" | "gastro" | "roi";

const PADEL_DAYS = [
  { id: "hoy", label: "Hoy", sub: "Quedan 3 turnos" },
  { id: "manana", label: "Mañana", sub: "Quedan 5 turnos" },
  { id: "viernes", label: "Viernes", sub: "Horarios pico" },
];

const PADEL_COURTS = [
  { id: "c1", name: "Cancha 1 · Panorámica Techada", type: "Blindex Pro" },
  { id: "c2", name: "Cancha 2 · Cristal Exterior", type: "Césped Sintético" },
];

const PADEL_HOURS = [
  { time: "18:00 hs", available: true },
  { time: "19:30 hs", available: true },
  { time: "21:00 hs", available: false },
  { time: "22:30 hs", available: true },
];

interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  emoji: string;
}

const MENU_ITEMS: FoodItem[] = [
  {
    id: "burger",
    name: "Burger Doble Smash Cheddar",
    description: "Doble carne 120g, queso cheddar fundido, salsa secreta",
    price: 9800,
    emoji: "🍔",
  },
  {
    id: "pizza",
    name: "Pizza Napolitana Masa Madre",
    description: "Salsa de tomates italianos, mozzarella fresca y albahaca",
    price: 11500,
    emoji: "🍕",
  },
  {
    id: "beer",
    name: "Cerveza Artesanal IPA Patagonia",
    description: "Pinta tirada 500cc fría con lúpulos patagónicos",
    price: 4200,
    emoji: "🍺",
  },
];

export function RdInteractivePlayground() {
  const [activeTab, setActiveTab] = useState<TabId>("padel");
  const sound = useSoundFx();

  // Estado Padel
  const [selectedDay, setSelectedDay] = useState(PADEL_DAYS[0].id);
  const [selectedCourt, setSelectedCourt] = useState(PADEL_COURTS[0].id);
  const [selectedHour, setSelectedHour] = useState("19:30 hs");

  // Estado Gastro
  const [cart, setCart] = useState<Record<string, number>>({
    burger: 2,
    beer: 2,
  });

  // Estado Calculadora ROI
  const [monthlyRevenue, setMonthlyRevenue] = useState(6000000); // 6M ARS

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    sound.pop();
  };

  const updateCart = (id: string, delta: number) => {
    setCart((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
    sound.tick();
  };

  const gastroTotal = useMemo(() => {
    return MENU_ITEMS.reduce((sum, item) => {
      const qty = cart[item.id] || 0;
      return sum + item.price * qty;
    }, 0);
  }, [cart]);

  const gastroCommissionsLost = Math.round(gastroTotal * 0.28); // 28% promedio apps

  // ROI calculations
  const appCommissionMonthly = Math.round(monthlyRevenue * 0.26); // 26% comisiones y costos
  const appCommissionYearly = appCommissionMonthly * 12;

  const padelCourtObj = PADEL_COURTS.find((c) => c.id === selectedCourt);

  return (
    <section
      id="playground"
      data-theme="ink"
      className="relative border-b border-(--line) bg-(--ink) py-24 text-(--paper) selection:bg-(--signal) selection:text-(--ink) lg:py-32"
    >
      <div className="rd-wrap">
        {/* Cabecera */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <RdLabel index="04" className="text-(--paper)/60 lg:col-span-3">
            Simulador Interactivo
          </RdLabel>

          <div className="lg:col-span-9">
            <span className="inline-flex items-center gap-2 rounded-full border border-(--signal)/30 bg-(--signal)/10 px-3 py-1 font-mono text-xs uppercase tracking-wider text-(--signal)">
              <Sparkles className="h-3 w-3" />
              Probá el software en 10 segundos
            </span>
            <h2 className="mt-4 font-serif text-3xl font-light tracking-tight text-(--paper) sm:text-4xl md:text-5xl">
              No te pedimos que nos creas en palabras.{" "}
              <span className="italic text-(--signal)">Tocá y probalo vos mismo.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-base text-(--paper)/70 sm:text-lg">
              Elegí un rubro acá abajo y probá en vivo cómo interactúan tus clientes:
              reservar un turno, pedir comida sin comisiones o calcular cuánta plata te
              están quitando las plataformas todos los meses.
            </p>
          </div>
        </div>

        {/* Selector de Pestañas Interactivas */}
        <div className="mt-12 flex flex-wrap gap-2 border-b border-(--line) pb-4">
          <button
            type="button"
            onClick={() => handleTabChange("padel")}
            className={`group relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-mono uppercase tracking-wider transition-all sm:text-sm ${
              activeTab === "padel"
                ? "border border-(--signal) bg-(--signal) font-bold text-(--ink)"
                : "border border-(--line) bg-white/[0.03] text-(--paper)/70 hover:border-(--paper)/30 hover:text-(--paper)"
            }`}
          >
            <span>🎾 01 · Club de Pádel & Turnos</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("gastro")}
            className={`group relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-mono uppercase tracking-wider transition-all sm:text-sm ${
              activeTab === "gastro"
                ? "border border-(--signal) bg-(--signal) font-bold text-(--ink)"
                : "border border-(--line) bg-white/[0.03] text-(--paper)/70 hover:border-(--paper)/30 hover:text-(--paper)"
            }`}
          >
            <span>🍔 02 · Menú Digital & Pedidos</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("roi")}
            className={`group relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-mono uppercase tracking-wider transition-all sm:text-sm ${
              activeTab === "roi"
                ? "border border-(--signal) bg-(--signal) font-bold text-(--ink)"
                : "border border-(--line) bg-white/[0.03] text-(--paper)/70 hover:border-(--paper)/30 hover:text-(--paper)"
            }`}
          >
            <span>💰 03 · Calculadora de Ahorro Real</span>
          </button>
        </div>

        {/* Contenido Dinámico de la Pestaña Activa */}
        <div className="mt-8">
          <AnimatePresence mode="wait">
            {/* TAB 1: PADEL */}
            {activeTab === "padel" && (
              <m.div
                key="tab-padel"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="grid gap-8 rounded-3xl border border-(--line) bg-white/[0.02] p-6 lg:grid-cols-12 lg:p-10"
              >
                {/* Lado izquierdo: Selector de Turno */}
                <div className="space-y-6 lg:col-span-7">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                      Simulador en Vivo · Muzzaga Pádel
                    </span>
                    <h3 className="mt-1 text-xl font-bold sm:text-2xl">
                      Elegí tu turno como lo haría tu cliente
                    </h3>
                    <p className="mt-1 text-sm text-(--paper)/60">
                      Tus clientes reservan solos desde Instagram o WhatsApp sin que tengas que atender el teléfono.
                    </p>
                  </div>

                  {/* 1. Día */}
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-(--paper)/50">
                      1. Seleccioná el día
                    </label>
                    <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                      {PADEL_DAYS.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setSelectedDay(d.id);
                            sound.tick();
                          }}
                          className={`rounded-2xl border p-3 text-left transition-all ${
                            selectedDay === d.id
                              ? "border-(--signal) bg-(--signal)/10 text-(--paper)"
                              : "border-(--line) bg-white/[0.02] text-(--paper)/70 hover:border-white/20"
                          }`}
                        >
                          <p className="text-sm font-semibold">{d.label}</p>
                          <p className="text-[11px] text-(--paper)/50">{d.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Cancha */}
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-(--paper)/50">
                      2. Seleccioná la cancha
                    </label>
                    <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {PADEL_COURTS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCourt(c.id);
                            sound.tick();
                          }}
                          className={`rounded-2xl border p-3.5 text-left transition-all ${
                            selectedCourt === c.id
                              ? "border-(--signal) bg-(--signal)/10 text-(--paper)"
                              : "border-(--line) bg-white/[0.02] text-(--paper)/70 hover:border-white/20"
                          }`}
                        >
                          <p className="text-sm font-semibold">{c.name}</p>
                          <p className="text-[11px] text-(--signal) font-mono">{c.type}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Horario */}
                  <div>
                    <label className="text-xs font-mono uppercase tracking-wider text-(--paper)/50">
                      3. Horarios disponibles
                    </label>
                    <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PADEL_HOURS.map((h) => {
                        const isSelected = selectedHour === h.time;
                        return (
                          <button
                            key={h.time}
                            type="button"
                            disabled={!h.available}
                            onClick={() => {
                              setSelectedHour(h.time);
                              sound.tick();
                            }}
                            className={`rounded-xl border px-3 py-2.5 text-center text-xs font-mono transition-all ${
                              !h.available
                                ? "cursor-not-allowed border-white/5 bg-white/[0.01] text-(--paper)/20 line-through"
                                : isSelected
                                ? "border-(--signal) bg-(--signal) font-bold text-(--ink)"
                                : "border-(--line) bg-white/[0.02] text-(--paper)/80 hover:border-white/30"
                            }`}
                          >
                            {h.time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Tarjeta de Confirmación Instantánea */}
                <div className="flex flex-col justify-between rounded-2xl border border-(--signal)/30 bg-(--signal)/5 p-6 lg:col-span-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                        Resumen del Turno
                      </span>
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Lugar disponible
                      </span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-(--paper)/50">Cancha elegida:</p>
                      <p className="text-base font-bold text-(--paper)">{padelCourtObj?.name}</p>

                      <div className="flex items-center gap-4 pt-1 font-mono text-sm">
                        <span className="flex items-center gap-1.5 text-(--paper)/80">
                          <Clock className="h-4 w-4 text-(--signal)" />
                          {selectedHour}
                        </span>
                        <span className="flex items-center gap-1.5 text-(--paper)/80">
                          <Calendar className="h-4 w-4 text-(--signal)" />
                          {PADEL_DAYS.find((d) => d.id === selectedDay)?.label}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs space-y-1.5">
                      <div className="flex justify-between text-(--paper)/70">
                        <span>Valor total del turno (90 min):</span>
                        <span className="font-bold text-(--paper)">$28.000 ARS</span>
                      </div>
                      <div className="flex justify-between text-emerald-400">
                        <span>Seña requerida para bloquear cancha:</span>
                        <span className="font-bold">$10.000 ARS</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-1.5 text-xs text-(--signal)">
                        <span>Comisión mensual que pagás por la app:</span>
                        <span className="font-bold">$0 (Cero)</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs text-(--paper)/60">
                      <p className="flex items-center gap-1.5">
                        <ShieldCheck className="h-3.5 w-3.5 text-(--signal)" />
                        La seña entra derecho a tu Mercado Pago.
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-(--signal)" />
                        WhatsApp automático confirmando jugadores y cancha.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <a
                      href={`${SITE.whatsapp}?text=${encodeURIComponent(
                        `Hola Franco y Fede! Probé el simulador de Club de Pádel en la web de Se7en (${padelCourtObj?.name} a las ${selectedHour}) y me interesa tener este sistema para mi complejo.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sound.success()}
                      className="rd-btn w-full !h-12 !justify-center !text-sm !font-bold"
                    >
                      <RdRoll>Quiero este sistema para mi club ↗</RdRoll>
                    </a>
                  </div>
                </div>
              </m.div>
            )}

            {/* TAB 2: GASTRO */}
            {activeTab === "gastro" && (
              <m.div
                key="tab-gastro"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="grid gap-8 rounded-3xl border border-(--line) bg-white/[0.02] p-6 lg:grid-cols-12 lg:p-10"
              >
                {/* Lado izquierdo: Lista de platos */}
                <div className="space-y-6 lg:col-span-7">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                      Simulador en Vivo · Carta Digital Takefyy
                    </span>
                    <h3 className="mt-1 text-xl font-bold sm:text-2xl">
                      Armá un pedido como en tu restaurante
                    </h3>
                    <p className="mt-1 text-sm text-(--paper)/60">
                      Tus clientes escanean el código QR en la mesa o entran desde Instagram y piden sin esperar al mozo.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {MENU_ITEMS.map((item) => {
                      const count = cart[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-2xl border border-(--line) bg-white/[0.02] p-4 transition-all hover:border-white/20"
                        >
                          <div className="flex items-start gap-3">
                            <span className="text-2xl sm:text-3xl">{item.emoji}</span>
                            <div>
                              <p className="text-sm font-bold text-(--paper)">{item.name}</p>
                              <p className="text-xs text-(--paper)/60 line-clamp-1">{item.description}</p>
                              <p className="mt-1 font-mono text-xs font-semibold text-(--signal)">
                                ${item.price.toLocaleString("es-AR")} ARS
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 rounded-full border border-(--line) bg-black/40 px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateCart(item.id, -1)}
                              disabled={count === 0}
                              className="rounded-full p-1 text-(--paper)/60 hover:text-(--paper) disabled:opacity-20"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center font-mono text-xs font-bold">{count}</span>
                            <button
                              type="button"
                              onClick={() => updateCart(item.id, 1)}
                              className="rounded-full p-1 text-(--paper) hover:text-(--signal)"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lado derecho: Comanda y Ahorro */}
                <div className="flex flex-col justify-between rounded-2xl border border-(--signal)/30 bg-(--signal)/5 p-6 lg:col-span-5">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                        Ticket de Comanda Digital
                      </span>
                      <span className="font-mono text-xs text-(--paper)/60">Mesa 07 · Salón</span>
                    </div>

                    <div className="space-y-2">
                      {MENU_ITEMS.filter((i) => (cart[i.id] || 0) > 0).map((item) => (
                        <div key={item.id} className="flex justify-between text-xs font-mono">
                          <span className="text-(--paper)/80">
                            {cart[item.id]}x {item.name}
                          </span>
                          <span className="font-bold text-(--paper)">
                            ${((cart[item.id] || 0) * item.price).toLocaleString("es-AR")}
                          </span>
                        </div>
                      ))}

                      {gastroTotal === 0 && (
                        <p className="py-4 text-center text-xs text-(--paper)/40">
                          Sumá algún plato para ver el cálculo.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs space-y-2">
                      <div className="flex justify-between text-base font-bold text-(--paper)">
                        <span>Total del pedido:</span>
                        <span className="text-(--signal)">${gastroTotal.toLocaleString("es-AR")} ARS</span>
                      </div>

                      <div className="border-t border-white/10 pt-2 space-y-1">
                        <div className="flex justify-between text-rose-400">
                          <span>Comisión PedidosYa / Rappi (28%):</span>
                          <span>-${gastroCommissionsLost.toLocaleString("es-AR")}</span>
                        </div>
                        <div className="flex justify-between text-emerald-400 font-bold">
                          <span>Comisión con Se7en Studios:</span>
                          <span>$0 (100% para vos)</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-emerald-500/10 p-3 text-xs text-emerald-300">
                      💡 En 500 pedidos mensuales te ahorrás más de{" "}
                      <strong className="text-white">
                        ${(gastroCommissionsLost * 500).toLocaleString("es-AR")} ARS
                      </strong>{" "}
                      en comisiones retenidas.
                    </div>
                  </div>

                  <div className="mt-6">
                    <a
                      href={`${SITE.whatsapp}?text=${encodeURIComponent(
                        `Hola Franco y Fede! Probé la demo de carta digital en el simulador de Se7en. Tengo un local gastronómico y quiero una carta interactiva con pedidos a WhatsApp y 0% comisión.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sound.success()}
                      className="rd-btn w-full !h-12 !justify-center !text-sm !font-bold"
                    >
                      <RdRoll>Quiero carta digital sin comisiones ↗</RdRoll>
                    </a>
                  </div>
                </div>
              </m.div>
            )}

            {/* TAB 3: CALCULADORA ROI */}
            {activeTab === "roi" && (
              <m.div
                key="tab-roi"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="grid gap-8 rounded-3xl border border-(--line) bg-white/[0.02] p-6 lg:grid-cols-12 lg:p-10"
              >
                {/* Lado izquierdo: Slider interactivo */}
                <div className="space-y-6 lg:col-span-7">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                      Calculadora de Retorno de Inversión
                    </span>
                    <h3 className="mt-1 text-xl font-bold sm:text-2xl">
                      ¿Cuánta plata le estás regalando a intermediarios?
                    </h3>
                    <p className="mt-1 text-sm text-(--paper)/60">
                      Las plataformas tradicionales cobran entre 20% y 35% por cada venta que hacés más cuotas fijas mensuales.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono uppercase tracking-wider text-(--paper)/60">
                        Facturación mensual promedio de tu negocio:
                      </label>
                      <span className="font-mono text-xl font-bold text-(--signal) sm:text-2xl">
                        ${(monthlyRevenue / 1000000).toFixed(1)}M ARS
                      </span>
                    </div>

                    <input
                      type="range"
                      min={1000000}
                      max={25000000}
                      step={500000}
                      value={monthlyRevenue}
                      onChange={(e) => {
                        setMonthlyRevenue(Number(e.target.value));
                        sound.tick();
                      }}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-(--line) accent-(--signal)"
                    />

                    <div className="flex justify-between font-mono text-[11px] text-(--paper)/40">
                      <span>$1M ARS / mes</span>
                      <span>$12M ARS</span>
                      <span>$25M ARS / mes</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <p className="text-xs font-mono uppercase text-rose-400">Sangría con apps</p>
                      <p className="mt-1 text-lg font-bold text-rose-300">
                        -${appCommissionMonthly.toLocaleString("es-AR")} / mes
                      </p>
                      <p className="text-xs text-(--paper)/50 mt-1">
                        Se te van en retenciones, comisiones y alquileres de software.
                      </p>
                    </div>

                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-xs font-mono uppercase text-emerald-400">Con Se7en Studios</p>
                      <p className="mt-1 text-lg font-bold text-emerald-300">$0 de comisión</p>
                      <p className="text-xs text-(--paper)/50 mt-1">
                        La web es tuya para siempre. Cobrás el 100% de lo que vendés.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Lado derecho: Resultado Anual */}
                <div className="flex flex-col justify-between rounded-2xl border border-(--signal)/30 bg-(--signal)/5 p-6 lg:col-span-5">
                  <div className="space-y-4">
                    <span className="font-mono text-xs uppercase tracking-wider text-(--signal)">
                      Ahorro Proyectado para tu Bolsillo
                    </span>

                    <div>
                      <p className="text-xs text-(--paper)/60">En 1 año calendario recuperás:</p>
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-emerald-400 sm:text-4xl">
                        +${(appCommissionYearly / 1000000).toFixed(1)} Millones
                      </p>
                      <p className="text-xs text-(--paper)/50 font-mono mt-0.5">
                        (${appCommissionYearly.toLocaleString("es-AR")} ARS netos)
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs space-y-2 text-(--paper)/70">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        El desarrollo se paga solo en los primeros meses.
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        No dependés de que una app te aumente comisiones.
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        Base de datos de tus clientes 100% propia.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6">
                    <a
                      href={`${SITE.whatsapp}?text=${encodeURIComponent(
                        `Hola Franco y Fede! Hice el cálculo en la calculadora de Se7en. Facturamos aprox $${(
                          monthlyRevenue / 1000000
                        ).toFixed(1)}M al mes y queremos nuestra propia web para dejar de perder comisiones.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => sound.success()}
                      className="rd-btn w-full !h-12 !justify-center !text-sm !font-bold"
                    >
                      <RdRoll>Quiero dejar de regalar comisiones ↗</RdRoll>
                    </a>
                  </div>
                </div>
              </m.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
