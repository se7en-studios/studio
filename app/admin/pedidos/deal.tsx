"use client";

// Datos editables del pedido en la ficha: monto acordado y contacto. Cada
// campo se guarda al salir de él.
import { useState } from "react";
import { MessageCircle, Phone } from "lucide-react";
import type { Lead } from "@/lib/admin/db";
import type { ContactFields } from "./actions";

/** Link de WhatsApp: sólo dígitos; sin código de país se asume Argentina. */
export function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits.length <= 10 ? `549${digits}` : digits}`;
}

function Field({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="block">
      <span className="text-[11px] font-medium tracking-wide text-muted uppercase">
        {label}
      </span>
      <span className="mt-1 flex items-center rounded-lg border border-[var(--line-strong)] bg-black/30 focus-within:border-accent">
        {prefix && (
          <span className="pl-3 font-mono text-xs text-muted">{prefix}</span>
        )}
        <input
          type={type}
          value={draft}
          inputMode={type === "number" ? "decimal" : undefined}
          min={type === "number" ? 0 : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== value && onSave(draft.trim())}
          onKeyDown={(e) =>
            e.key === "Enter" && (e.target as HTMLInputElement).blur()
          }
          placeholder={placeholder}
          className="w-full min-w-0 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:outline-none"
        />
      </span>
    </label>
  );
}

export function DealFields({
  lead,
  onContact,
  onValue,
}: {
  lead: Lead;
  onContact: (fields: ContactFields) => void;
  onValue: (value: number | null) => void;
}) {
  const wa = lead.phone ? waLink(lead.phone) : null;
  return (
    <>
      <p className="mt-6 mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">
        Negocio y contacto
      </p>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--line)] bg-black/20 p-3">
        <div className="col-span-2">
          <Field
            label="Monto acordado"
            type="number"
            prefix="USD"
            value={lead.value == null ? "" : String(lead.value)}
            placeholder={lead.budget ? `Pidió ${lead.budget}` : "Sin definir"}
            onSave={(v) => onValue(v === "" ? null : Number(v))}
          />
        </div>
        <Field
          label="Nombre"
          value={lead.name}
          onSave={(name) => name && onContact({ name })}
        />
        <Field
          label="Empresa"
          value={lead.company}
          onSave={(company) => onContact({ company })}
        />
        <Field
          label="Email"
          type="email"
          value={lead.email}
          onSave={(email) => onContact({ email })}
        />
        <Field
          label="Teléfono"
          type="tel"
          value={lead.phone ?? ""}
          placeholder="+54 9 299…"
          onSave={(phone) => onContact({ phone })}
        />
        {lead.phone && (
          <div className="col-span-2 flex flex-wrap gap-2">
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-[#25D366]/40 px-2.5 py-1 text-[12px] text-[#25D366] hover:bg-[#25D366]/10"
              >
                <MessageCircle size={13} /> Abrir WhatsApp
              </a>
            )}
            <a
              href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-muted hover:text-foreground"
            >
              <Phone size={13} /> Llamar
            </a>
          </div>
        )}
      </div>
    </>
  );
}
