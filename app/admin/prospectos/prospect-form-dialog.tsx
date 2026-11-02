"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ProspectLead } from "@/data/prospects";
import {
  DEFAULT_BUDGET_USD,
  KNOWN_CITIES,
  PROSPECT_CATEGORIES,
  PROVINCES,
  WEBSITE_STATUSES,
  cleanProspect,
  type ProspectInput,
} from "@/lib/admin/prospect-lead-shared";
import {
  btnGhost,
  btnPrimary,
  btnSecondary,
  input,
  label as labelCls,
} from "../kit";
import { Dialog, useToast } from "../overlay";
import { createProspect, deleteProspect, updateProspect } from "./lead-actions";

const fromLead = (l?: ProspectLead): Record<keyof ProspectInput, string> => ({
  name: l?.name ?? "",
  city: l?.city ?? "",
  province: l?.province ?? "",
  category: l?.category ?? "",
  address: l?.address ?? "",
  phone: l?.phone ?? "",
  current_site: l?.currentSite ?? "",
  website_status: l?.websiteStatus ?? WEBSITE_STATUSES[0],
  pain_point: l?.painPoint ?? "",
  recommended_solution: l?.recommendedSolution ?? "",
  estimated_budget_usd: String(l?.estimatedBudgetUsd ?? DEFAULT_BUDGET_USD),
});

function Field({
  id,
  label,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

/** Cargar un prospecto nuevo, o editar (y borrar) uno que se cargó desde el panel. */
export function ProspectFormDialog({
  lead,
  ready,
  cities,
  onClose,
  onSaved,
}: {
  /** Sin esto, es un prospecto nuevo. */
  lead?: ProspectLead;
  /** false si falta correr el SQL. */
  ready: boolean;
  /** Las ciudades que ya hay, para sugerirlas. */
  cities: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const flash = useToast();
  const [f, setF] = useState(() => fromLead(lead));
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set =
    (k: keyof ProspectInput) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) =>
      setF((prev) => ({ ...prev, [k]: e.target.value }));

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      flash(ok, "ok");
      onSaved();
      onClose();
    } catch (e) {
      flash(e instanceof Error ? e.message : "No se pudo guardar.", "error");
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    let clean: ProspectInput;
    try {
      clean = cleanProspect(f);
    } catch (e) {
      return flash(
        e instanceof Error ? e.message : "Revisá los datos.",
        "error",
      );
    }
    void run(
      () => (lead ? updateProspect(lead.id, clean) : createProspect(clean)),
      lead ? "Prospecto actualizado" : "Prospecto cargado",
    );
  };

  return (
    <Dialog
      onClose={onClose}
      label={lead ? "Editar prospecto" : "Nuevo prospecto"}
      width="max-w-2xl"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
        <div className="min-w-0">
          <h2 className="adm-title text-[20px] text-foreground">
            {lead ? "Editar prospecto" : "Nuevo prospecto"}
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Lo ven y lo usan los dos. Con el nombre, la ciudad y el WhatsApp
            alcanza; el resto ayuda a armar el mensaje.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="focus-ring shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-white/[0.05] hover:text-foreground"
        >
          <X size={18} />
        </button>
      </header>

      <div className="admin-scroll max-h-[52dvh] space-y-4 overflow-y-auto p-6">
        {!ready && (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] px-4 py-3 text-[13px] text-amber-300">
            Falta correr <code>supabase/prospectos-v3.sql</code> en Supabase
            para poder cargar prospectos.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="pf-name" label="Negocio" className="sm:col-span-2">
            <input
              id="pf-name"
              value={f.name}
              onChange={set("name")}
              maxLength={120}
              placeholder="Club Los Alerces"
              className={input}
            />
          </Field>
          <Field
            id="pf-phone"
            label="WhatsApp"
            hint="Con código de país, por ejemplo +54 9 299 …"
          >
            <input
              id="pf-phone"
              value={f.phone}
              onChange={set("phone")}
              maxLength={40}
              inputMode="tel"
              placeholder="+54 9 299 123-4567"
              className={input}
            />
          </Field>
          <Field id="pf-site" label="Web actual (si tiene)">
            <input
              id="pf-site"
              value={f.current_site}
              onChange={set("current_site")}
              maxLength={200}
              placeholder="clubalerces.com.ar"
              className={input}
            />
          </Field>
          <Field id="pf-city" label="Ciudad">
            <input
              id="pf-city"
              value={f.city}
              onChange={set("city")}
              maxLength={60}
              list="pf-cities"
              placeholder="Allen"
              className={input}
            />
            <datalist id="pf-cities">
              {[...new Set([...KNOWN_CITIES, ...cities])].map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="pf-province" label="Provincia">
            <input
              id="pf-province"
              value={f.province}
              onChange={set("province")}
              maxLength={60}
              list="pf-provinces"
              placeholder="Río Negro"
              className={input}
            />
            <datalist id="pf-provinces">
              {PROVINCES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
          <Field id="pf-category" label="Rubro">
            <input
              id="pf-category"
              value={f.category}
              onChange={set("category")}
              maxLength={80}
              list="pf-categories"
              placeholder="Club de Pádel & Deporte"
              className={input}
            />
            <datalist id="pf-categories">
              {PROSPECT_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field id="pf-address" label="Dirección">
            <input
              id="pf-address"
              value={f.address}
              onChange={set("address")}
              maxLength={200}
              placeholder="Calle 123"
              className={input}
            />
          </Field>
          <Field id="pf-status" label="Cómo está hoy su web">
            <select
              id="pf-status"
              value={f.website_status}
              onChange={set("website_status")}
              className={input}
            >
              {WEBSITE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field id="pf-budget" label="Monto estimado (USD)">
            <input
              id="pf-budget"
              value={f.estimated_budget_usd}
              onChange={set("estimated_budget_usd")}
              inputMode="numeric"
              className={input}
            />
          </Field>
          <Field
            id="pf-pain"
            label="Qué problema tiene"
            className="sm:col-span-2"
          >
            <textarea
              id="pf-pain"
              value={f.pain_point}
              onChange={set("pain_point")}
              maxLength={500}
              rows={2}
              placeholder="Reciben las reservas por WhatsApp y se les pisan los turnos."
              className={input}
            />
          </Field>
          <Field
            id="pf-solution"
            label="Qué le proponemos"
            className="sm:col-span-2"
          >
            <textarea
              id="pf-solution"
              value={f.recommended_solution}
              onChange={set("recommended_solution")}
              maxLength={500}
              rows={2}
              placeholder="Una web con turnero y seña por Mercado Pago."
              className={input}
            />
          </Field>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-[var(--line)] px-6 py-4">
        {lead ? (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              confirmDelete
                ? void run(() => deleteProspect(lead.id), "Prospecto borrado")
                : setConfirmDelete(true)
            }
            className={btnGhost}
          >
            {confirmDelete ? "¿Seguro? Se borra con sus notas" : "Borrar"}
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !ready}
            onClick={save}
            className={btnPrimary}
          >
            {lead ? "Guardar" : "Cargar prospecto"}
          </button>
        </div>
      </footer>
    </Dialog>
  );
}
