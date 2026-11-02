"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  Copy,
  Edit3,
  ExternalLink,
  Inbox,
  MapPin,
  Snowflake,
  Sparkles,
} from "lucide-react";
import type { ProspectLead } from "@/data/prospects";
import { WhatsAppLogo } from "@/components/icons/whatsapp-logo";
import { PEOPLE } from "@/lib/admin/people";
import { whoWhen, type ProspectState } from "@/lib/admin/prospect-shared";
import { coldDays } from "@/lib/admin/prospect-followup";
import { Face, btnPrimary, btnSecondary, cn, input, usd } from "../kit";
import { STAGE, STAGES } from "./stages";
import type { LeadStatus } from "./prospectos-client";

/** La ficha completa de un prospecto en la vista de lista: todo a la vista, sin abrir nada. */
export function ProspectListCard({
  lead,
  status,
  meta,
  now,
  copied,
  onStatus,
  onNote,
  onWhatsApp,
  onCopy,
  onPromote,
  onEdit,
}: {
  lead: ProspectLead;
  status: LeadStatus;
  meta?: ProspectState;
  now: number;
  copied: boolean;
  onStatus: (id: string, status: LeadStatus) => void;
  onNote: (id: string, note: string) => void;
  onWhatsApp: (lead: ProspectLead) => void;
  onCopy: (lead: ProspectLead) => void;
  onPromote: (id: string) => void;
  /** Editar un prospecto cargado desde el panel. */
  onEdit: (lead: ProspectLead) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const note = meta?.note ?? "";
  const cold = coldDays(meta, now);

  const edit = () => {
    setDraft(note);
    setEditing(true);
  };
  const save = () => {
    onNote(lead.id, draft.trim());
    setEditing(false);
  };

  return (
    <article className="flex flex-col justify-between rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow-card)]">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="adm-title flex items-center gap-2 text-[14px] text-foreground">
              <span className="truncate">{lead.name}</span>
              {lead.currentSite && (
                <a
                  href={lead.currentSite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring shrink-0 text-muted transition-colors hover:text-accent"
                  title="Visitar la web actual"
                >
                  <ExternalLink size={13} />
                </a>
              )}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
              <MapPin size={12} className="shrink-0" />
              <span className="truncate">
                {lead.city}, {lead.province} · {lead.category}
              </span>
            </p>
            <p className="mt-0.5 text-[12px] text-muted">{lead.address}</p>
            {lead.custom && (
              <button type="button" onClick={() => onEdit(lead)} className="focus-ring mt-1 rounded-md text-[12px] text-muted underline-offset-2 hover:text-foreground hover:underline">
                Editar datos
              </button>
            )}
          </div>
          <span className="adm-num shrink-0 text-[14px] text-emerald-400">
            {usd(lead.estimatedBudgetUsd)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[var(--line)] py-2.5">
          <span className="flex items-center gap-2 text-[12px] text-muted">
            <span className={cn("h-2 w-2 rounded-full", STAGE[status].dot)} />
            Etapa
          </span>
          <select
            value={status}
            onChange={(e) => onStatus(lead.id, e.target.value as LeadStatus)}
            aria-label="Etapa del prospecto"
            className="focus-ring rounded-full border border-[var(--line-strong)] bg-[var(--well)] px-3 py-1 text-[12px] text-foreground"
          >
            {STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {meta?.pedido_id ? (
          <Link
            href={`/admin/pedidos?pedido=${meta.pedido_id}`}
            className="focus-ring flex items-center gap-1.5 rounded-md bg-emerald-400/[0.07] px-2 py-1 text-[11px] text-emerald-300 transition-colors hover:bg-emerald-400/10"
          >
            <Inbox size={12} className="shrink-0" /> Ya es un pedido · Ver →
          </Link>
        ) : (
          status === "en_charla" && (
            <button type="button" onClick={() => onPromote(lead.id)} className={cn(btnSecondary, "w-full")}>
              <Inbox size={14} /> Pasar a Pedidos
            </button>
          )
        )}

        {meta?.contacted_by && (
          <span className="flex items-center gap-1.5 rounded-md bg-sky-400/[0.07] px-2 py-1 text-[11px] text-sky-300">
            <Face who={meta.contacted_by} size={14} />
            <span className="truncate">
              Contactó {whoWhen(meta.contacted_by, meta.contacted_at)}
            </span>
          </span>
        )}

        {cold !== null && (
          <span className="flex items-center gap-1.5 rounded-md bg-amber-400/[0.07] px-2 py-1 text-[11px] text-amber-300">
            <Snowflake size={12} className="shrink-0" /> Sin respuesta hace {cold} días
          </span>
        )}

        <div className="rounded-lg border border-[var(--line)] bg-[var(--well)] p-3">
          <p className="adm-label flex items-center gap-1.5 text-amber-300">
            <Sparkles size={12} /> Problema detectado
          </p>
          <p className="mt-1.5 text-[13px] leading-snug text-muted">
            {lead.painPoint}
          </p>
          <p className="mt-2.5 border-t border-[var(--line)] pt-2.5 text-[13px] leading-snug text-foreground/85">
            <span className="text-accent">Propuesta Se7en:</span>{" "}
            {lead.recommendedSolution}
          </p>
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Feedback, objeciones o fecha de reunión…"
              rows={3}
              maxLength={2000}
              className={input}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className={btnSecondary}
              >
                Cancelar
              </button>
              <button type="button" onClick={save} className={btnPrimary}>
                Guardar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={edit}
            className="focus-ring group flex w-full items-start justify-between gap-2 rounded-lg border border-dashed border-[var(--line)] px-3 py-2 text-left transition-colors hover:border-[var(--line-strong)]"
          >
            {note ? (
              <span className="text-[13px] leading-snug text-muted">
                {meta?.note_by && (
                  <span className="text-foreground/85">
                    {PEOPLE[meta.note_by].name}:{" "}
                  </span>
                )}
                {note}
              </span>
            ) : (
              <span className="text-[13px] text-muted">Agregar una nota…</span>
            )}
            <Edit3
              size={14}
              className="mt-0.5 shrink-0 text-muted group-hover:text-foreground"
            />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-[var(--line)] pt-3">
        <button
          type="button"
          onClick={() => onCopy(lead)}
          className={cn(
            btnSecondary,
            "flex-1",
            copied && "border-emerald-500/40 text-emerald-400",
          )}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copiado" : "Copiar guion"}
        </button>
        <button
          type="button"
          onClick={() => onWhatsApp(lead)}
          className="focus-ring inline-flex items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-[13px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
        >
          <WhatsAppLogo className="h-3.5 w-3.5 fill-current" />
          WhatsApp
        </button>
      </div>
    </article>
  );
}
