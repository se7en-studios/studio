"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Calendar,
  Clock,
  Video,
  X,
  CheckCircle2,
  Send,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { SITE } from "@/data/site";
import { sendLead } from "@/lib/send-lead";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { LeadError } from "@/components/ui/lead-error";

const availableSlots = [
  "10:00 AM (GMT-3)",
  "11:30 AM (GMT-3)",
  "02:00 PM (GMT-3)",
  "04:30 PM (GMT-3)",
  "06:00 PM (GMT-3)",
];

const meetingDays = [
  "Mañana",
  "En 2 días",
  "Esta semana",
  "Próxima semana",
];

export function BookingModal() {
  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(meetingDays[0]);
  const [selectedSlot, setSelectedSlot] = useState(availableSlots[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [projectIdea, setProjectIdea] = useState("");
  const [booked, setBooked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    function handleOpen() {
      setOpen(true);
      setBooked(false);
      setSendError(null);
    }
    window.addEventListener("open-booking-modal", handleOpen);
    return () => window.removeEventListener("open-booking-modal", handleOpen);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    setSendError(null);

    const result = await sendLead({
      source: "reserva",
      name,
      email,
      projectType: "Discovery Call (15 min)",
      budget: "Llamada inicial",
      timeline: `${selectedDay} — ${selectedSlot}`,
      idea: `Solicitud de reunión de 15 min: ${projectIdea || "Revisión general de proyecto"}`,
    });
    setLoading(false);
    if (!result.ok) {
      setSendError(result.error);
      return;
    }
    setBooked(true);
  }

  const whatsappBooking = `${SITE.whatsapp}?text=${encodeURIComponent(
    `Hola Se7en Studio! Me gustaría coordinar una Discovery Call de 15 min (${selectedDay} - ${selectedSlot}) para charlar sobre un proyecto.`
  )}`;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <Calendar size={20} />
                </span>
                <div>
                  <h3 className="font-medium text-foreground text-lg">
                    Discovery Call — 15 Minutos
                  </h3>
                  <p className="text-xs text-muted">
                    Con Franco (Tech Lead) y Federico (Product Lead)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="focus-ring rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {booked ? (
              <div className="p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="display mt-4 text-2xl text-foreground">
                  ¡Solicitud de llamada enviada!
                </h4>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
                  Te responderemos a <strong>{email}</strong> en menos de 2 horas con el enlace de Google Meet para confirmar el horario ({selectedDay}, {selectedSlot}).
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <a
                    href={whatsappBooking}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-5 py-2.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20"
                  >
                    <WhatsAppLogo size={14} />
                    <span>Confirmar por WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="focus-ring rounded-full border border-border bg-background px-5 py-2.5 text-xs font-medium text-muted hover:text-foreground"
                  >
                    Cerrar ventana
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6">
                {/* Lo que cubriremos */}
                <div className="rounded-xl border border-border/80 bg-background/60 p-4 mb-6">
                  <span className="font-mono text-[11px] uppercase tracking-widest text-accent font-medium block mb-2">
                    En esta llamada resolveremos:
                  </span>
                  <ul className="space-y-1.5 text-xs text-muted">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Viabilidad técnica y alcance exacto de tu producto
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Estimación de plazos (sprints) y presupuesto
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      Recomendación de arquitectura y stack tecnológico
                    </li>
                  </ul>
                </div>

                {/* Selección de Preferencia Horaria */}
                <div className="mb-4">
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted mb-2">
                    1. ¿Cuándo preferís que nos reunamos?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {meetingDays.map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className={`focus-ring rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                          selectedDay === day
                            ? "border-accent bg-accent text-background font-medium"
                            : "border-border bg-background text-muted hover:text-foreground"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-mono text-xs uppercase tracking-widest text-muted mb-2">
                    2. Franja horaria sugerida
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`focus-ring rounded-lg border px-3 py-1.5 font-mono text-xs transition-all ${
                          selectedSlot === slot
                            ? "border-accent bg-accent text-background font-medium"
                            : "border-border bg-background text-muted hover:text-foreground"
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Datos de contacto */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
                  <div>
                    <label className="block font-mono text-xs text-muted mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre"
                      className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block font-mono text-xs text-muted mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block font-mono text-xs text-muted mb-1">
                    ¿De qué trata tu producto? (opcional)
                  </label>
                  <input
                    type="text"
                    value={projectIdea}
                    onChange={(e) => setProjectIdea(e.target.value)}
                    placeholder="Ej: SaaS de pedidos, Rediseño de marca, etc."
                    className="focus-ring w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted/60 focus:border-accent"
                  />
                </div>

                <LeadError error={sendError} whatsappUrl={whatsappBooking} />

                {/* Footer Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-xs font-medium text-background transition-all hover:bg-accent/90 disabled:opacity-50"
                  >
                    <span>{loading ? "Agendando..." : "Solicitar llamada de 15 min"}</span>
                    <ArrowRight size={14} />
                  </button>

                  <a
                    href={whatsappBooking}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                  >
                    <WhatsAppLogo size={14} />
                    <span>O coordinar por WhatsApp</span>
                  </a>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
