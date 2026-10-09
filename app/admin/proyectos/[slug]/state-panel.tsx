"use client";

// Gestión de un proyecto: etapa, responsable, avance, fechas, cliente, monto,
// pedido de origen y notas. Cada cambio se guarda solo (optimista) y queda en
// el registro con el antes y el después.
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Pencil } from "lucide-react";
import type { LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { PROJECT_STATUS, PROJECT_STATUSES, type ProjectState, type ProjectStateInput } from "@/lib/admin/project-shared";
import { Card, Face, btnGhost, btnPrimary, cn, input, label } from "../../kit";
import { useToast } from "../../overlay";
import { updateProjectInfo, updateProjectState } from "../actions";
import { ProgressInput } from "../view";

export function StatePanel({
  slug,
  initial,
  accent,
  leads,
  editable,
}: {
  slug: string;
  initial: ProjectState;
  accent: string;
  leads: { id: string; name: string }[];
  editable: boolean;
}) {
  const flash = useToast();
  const [s, setS] = useState(initial);
  const [notes, setNotes] = useState(initial.notes);
  const [, start] = useTransition();

  function save(patch: ProjectStateInput) {
    if (!editable) return flash("Falta correr supabase/panel-v2.sql para guardar esto.", "error");
    const before = s;
    const next = { ...s, ...patch };
    if (patch.status === "entregado" && s.progress < 100 && patch.progress === undefined) {
      next.progress = 100;
      patch = { ...patch, progress: 100 };
    }
    setS(next);
    start(async () => {
      try {
        setS(await updateProjectState(slug, patch));
      } catch (e) {
        setS(before);
        flash(e instanceof Error ? e.message : "No se pudo guardar", "error");
      }
    });
  }

  const chip = (on: boolean) =>
    cn(
      "focus-ring inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] transition-colors disabled:opacity-50",
      on ? "border-accent/60 bg-accent/15 text-foreground" : "border-[var(--line-strong)] text-muted hover:text-foreground",
    );

  return (
    <Card title="Gestión del proyecto" action={s.updated_by && s.updated_at && <span className="text-[12px] text-muted">Último cambio: {PEOPLE[s.updated_by].name}</span>}>
      <div className="space-y-5 p-4">
        <div>
          <p className={label}>Etapa</p>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_STATUSES.map((st) => (
              <button key={st} disabled={!editable} onClick={() => save({ status: st })} aria-pressed={s.status === st} className={chip(s.status === st)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", PROJECT_STATUS[st].dot)} /> {PROJECT_STATUS[st].label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className={label}>Responsable</p>
            <div className="flex flex-wrap gap-1.5">
              {[...PEOPLE_IDS, null].map((o) => (
                <button
                  key={o ?? "nadie"}
                  disabled={!editable}
                  onClick={() => save({ owner: o as LeadOwner | null })}
                  aria-pressed={s.owner === o}
                  className={cn(chip(s.owner === o), o && "py-0.5 pl-0.5")}
                >
                  {o && <Face who={o} size={20} />} {o ? PEOPLE[o].name : "Nadie"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className={label}>Avance</p>
            <ProgressInput value={s.progress} accent={accent} disabled={!editable} onSave={(progress) => save({ progress })} />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente" value={s.client} disabled={!editable} placeholder="Nombre o empresa" onSave={(client) => save({ client })} />
          <Field
            label="Monto (USD)"
            type="number"
            value={s.budget == null ? "" : String(s.budget)}
            disabled={!editable}
            placeholder="Sin definir"
            onSave={(v) => save({ budget: v === "" ? null : Number(v) })}
          />
          <Field label="Inicio" type="date" value={s.start_date ?? ""} disabled={!editable} onSave={(v) => save({ start_date: v || null })} />
          <Field label="Entrega" type="date" value={s.due ?? ""} disabled={!editable} onSave={(v) => save({ due: v || null })} />
        </div>

        <div>
          <label className={label} htmlFor="ps-lead">
            Pedido de origen
          </label>
          <div className="flex items-center gap-2">
            <select
              id="ps-lead"
              value={s.lead_id ?? ""}
              disabled={!editable}
              onChange={(e) => save({ lead_id: e.target.value || null })}
              className={cn(input, "flex-1")}
            >
              <option value="">Sin vincular</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {s.lead_id && (
              <Link href={`/admin/pedidos?pedido=${s.lead_id}`} className={btnGhost}>
                Abrir <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </div>

        <div>
          <label className={label} htmlFor="ps-notes">
            Notas del proyecto
          </label>
          <textarea
            id="ps-notes"
            rows={5}
            value={notes}
            disabled={!editable}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => notes !== s.notes && save({ notes })}
            placeholder="Alcance, accesos, decisiones, links… (se guarda al salir del campo)"
            className={input}
          />
        </div>
      </div>
    </Card>
  );
}

function Field({
  label: text,
  value,
  onSave,
  type = "text",
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  return (
    <label className="block">
      <span className={label}>{text}</span>
      <input
        type={type}
        value={draft}
        disabled={disabled}
        min={type === "number" ? 0 : undefined}
        inputMode={type === "number" ? "decimal" : undefined}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          // Las fechas se eligen de un calendario: se guardan al elegir.
          if (type === "date" && e.target.value !== value) onSave(e.target.value);
        }}
        onBlur={() => type !== "date" && draft.trim() !== value && onSave(draft.trim())}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className={cn(input, type === "date" && "[color-scheme:dark]")}
      />
    </label>
  );
}

/** Nombre, tipo, sitio y color de un proyecto del panel. */
export function EditInfo({
  slug,
  initial,
}: {
  slug: string;
  initial: { name: string; category: string; url: string; accent: string };
}) {
  const flash = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [saving, start] = useTransition();
  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className={btnGhost}>
        <Pencil size={14} /> Editar datos
      </button>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await updateProjectInfo(slug, form);
          if (r.error) flash(r.error, "error");
          else {
            flash("Proyecto actualizado", "ok");
            setOpen(false);
            router.refresh();
          }
        });
      }}
      className="mt-3 grid w-full gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]"
    >
      <input aria-label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} required maxLength={80} />
      <input aria-label="Tipo" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={input} placeholder="Tipo" maxLength={80} />
      <input aria-label="Sitio" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={input} placeholder="Sitio" maxLength={300} />
      <input
        aria-label="Color"
        type="color"
        value={form.accent}
        onChange={(e) => setForm({ ...form, accent: e.target.value })}
        className="h-[34px] w-12 cursor-pointer rounded-lg border border-[var(--line-strong)] bg-[var(--well)] p-1"
      />
      <span className="flex gap-1">
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>
          Cancelar
        </button>
        <button disabled={saving} className={btnPrimary}>
          Guardar
        </button>
      </span>
    </form>
  );
}
