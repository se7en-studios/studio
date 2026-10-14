"use client";

// Paso opcional del cotizador: quien deja nombre y un email o WhatsApp queda
// registrado como pedido con lo que cotizó, para que le escribamos nosotros.
// Nada más que eso: el resto del cotizador sigue igual.
import { useState, type FormEvent } from "react";
import { Check, Send } from "lucide-react";
import { sendLead } from "@/lib/send-lead";
import { LeadError } from "@/components/ui/lead-error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\s.-]+$/;

/** Email si tiene @; si no, un teléfono con 8 a 20 dígitos. null si no es ninguno. */
function parseContact(v: string): { email: string } | { phone: string } | null {
  const s = v.trim();
  if (s.includes("@")) return EMAIL_RE.test(s) ? { email: s } : null;
  const digits = s.replace(/\D/g, "").length;
  return PHONE_RE.test(s) && digits >= 8 && digits <= 20 ? { phone: s } : null;
}

const inputClass =
  "focus-ring w-full min-w-0 rounded-full border border-border bg-background px-4 py-2.5 text-xs text-foreground placeholder:text-muted/60 focus:border-accent";

export function SaveQuote({
  quote,
  whatsappUrl,
}: {
  quote: {
    projectType: string;
    budget: string;
    timeline: string;
    idea: string;
  };
  whatsappUrl: string;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const how = parseContact(contact);
    if (!name.trim()) return setError("¿Cómo te llamás?");
    if (!how)
      return setError("Revisá el email o el WhatsApp (con código de área).");
    setSending(true);
    setError(null);
    const result = await sendLead({
      source: "cotizador",
      name: name.trim(),
      ...how,
      ...quote,
    });
    setSending(false);
    if (!result.ok) return setError(result.error);
    setSaved(true);
  }

  if (saved)
    return (
      <p
        role="status"
        className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-foreground"
      >
        <Check size={14} className="shrink-0 text-emerald-400" /> Listo: te
        escribimos con esta propuesta dentro de las 24 h hábiles.
      </p>
    );

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-2 rounded-2xl border border-border bg-background/60 p-4"
    >
      <p className="font-mono text-[11px] tracking-wider text-muted uppercase">
        ¿Preferís que te escribamos? (opcional)
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          aria-label="Tu nombre"
          autoComplete="name"
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className={inputClass}
        />
        <input
          aria-label="Email o WhatsApp"
          autoComplete="email"
          maxLength={200}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Email o WhatsApp"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        disabled={sending}
        className="focus-ring inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-accent/40 px-4 py-2.5 font-mono text-xs text-accent transition-colors hover:bg-accent/10 disabled:opacity-60"
      >
        <Send size={13} />{" "}
        {sending ? "Guardando…" : "Que me escriban con esta propuesta"}
      </button>
      <LeadError error={error} whatsappUrl={whatsappUrl} />
    </form>
  );
}
