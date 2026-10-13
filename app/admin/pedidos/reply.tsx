"use client";

// Responder a un pedido con una plantilla: se elige el texto (la etapa sugiere uno),
// se ve completo con el nombre y el proyecto del cliente, y se manda por WhatsApp o
// mail, o se copia. Mandarlo queda anotado en el historial de contactos.
import { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import type { Lead } from "@/lib/admin/db";
import {
  TEMPLATES,
  fill,
  leadVars,
  mailLink,
  suggestedTemplate,
  waLink,
  type TemplateId,
} from "@/lib/admin/templates";
import { Chip, btnPrimary, btnSecondary, label } from "../kit";
import { useToast } from "../overlay";

type Props = {
  lead: Pick<Lead, "name" | "email" | "phone" | "status" | "project_type">;
  /** Se abrió WhatsApp o el mail con la plantilla: para anotar el contacto. */
  onSent: (kind: "mail" | "whatsapp", templateLabel: string) => void;
};

export function Reply({ lead, onSent }: Props) {
  const flash = useToast();
  const [picked, setPicked] = useState<TemplateId | null>(null);
  const tpl =
    TEMPLATES.find(
      (t) => t.id === (picked ?? suggestedTemplate(lead.status)),
    ) ?? TEMPLATES[0];
  const vars = leadVars(lead);
  const body = fill(tpl.body, vars);
  const wa = waLink(lead.phone, body);

  async function copy() {
    try {
      await navigator.clipboard.writeText(body);
      flash("Mensaje copiado", "ok");
    } catch {
      flash("No se pudo copiar: seleccionalo a mano.", "error");
    }
  }

  return (
    <div className="mt-4">
      <p className={label}>Responder</p>
      <div
        className="flex flex-wrap gap-1.5"
        role="group"
        aria-label="Plantilla"
      >
        {TEMPLATES.map((t) => (
          <Chip key={t.id} on={t.id === tpl.id} onClick={() => setPicked(t.id)}>
            {t.label}
          </Chip>
        ))}
      </div>
      <p className="mt-1.5 text-[12px] text-muted">{tpl.hint}</p>
      <pre className="mt-2 max-h-44 overflow-auto rounded-lg border border-[var(--line)] bg-[var(--well)] p-3 font-sans text-[13px] leading-relaxed whitespace-pre-wrap">
        {body}
      </pre>
      <div className="mt-2 flex flex-wrap gap-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            onClick={() => onSent("whatsapp", tpl.label)}
            className={btnPrimary}
          >
            <WhatsAppLogo size={14} /> WhatsApp
          </a>
        )}
        {lead.email && (
          <a
            href={mailLink(lead.email, fill(tpl.subject, vars), body)}
            onClick={() => onSent("mail", tpl.label)}
            className={wa ? btnSecondary : btnPrimary}
          >
            <Mail size={14} /> Mail
          </a>
        )}
        <button type="button" onClick={copy} className={btnSecondary}>
          <Copy size={14} /> Copiar mensaje
        </button>
      </div>
      {lead.phone && !wa && (
        <p className="mt-1.5 text-[12px] text-muted">
          Con ese teléfono no se puede armar el link de WhatsApp. Copiá el
          mensaje y pegalo a mano.
        </p>
      )}
    </div>
  );
}
