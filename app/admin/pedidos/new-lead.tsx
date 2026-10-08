"use client";

// Alta manual de un pedido: los que llegan por WhatsApp, Instagram, un
// referido o una llamada y nunca pasan por los formularios del sitio.
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { Lead, LeadOwner } from "@/lib/admin/db";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { MANUAL_CHANNELS } from "@/lib/admin/activity-shared";
import { createLead, type ManualLead } from "./actions";

const CHANNEL_LABEL: Record<(typeof MANUAL_CHANNELS)[number], string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  referido: "Referido",
  email: "Email",
  llamada: "Llamada",
  otro: "Otro",
};

const input =
  "focus-ring mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted/50 focus:border-accent";
const label = "font-mono text-[10px] tracking-widest text-muted uppercase";

export function NewLeadButton({
  me,
  onCreated,
}: {
  me: LeadOwner;
  onCreated: (lead: Lead) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-background"
      >
        <Plus size={15} /> Nuevo pedido
      </button>
      {open && (
        <NewLeadDialog
          me={me}
          onClose={() => setOpen(false)}
          onCreated={(lead) => {
            onCreated(lead);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function NewLeadDialog({
  me,
  onClose,
  onCreated,
}: {
  me: LeadOwner;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [form, setForm] = useState<ManualLead>({
    name: "",
    channel: "whatsapp",
    owner: me,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, startTransition] = useTransition();
  const set = (p: Partial<ManualLead>) => setForm((f) => ({ ...f, ...p }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        onCreated(await createLead(form));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo guardar el pedido.",
        );
      }
    });
  }

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-end justify-center md:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <button
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <motion.form
        onSubmit={submit}
        role="dialog"
        aria-label="Nuevo pedido"
        initial={{ y: 24 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        className="relative max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-surface p-6 md:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-widest text-accent uppercase">
              Cargar a mano
            </p>
            <h2 className="mt-1.5 text-2xl text-foreground">Nuevo pedido</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="focus-ring rounded-full border border-border p-2 text-muted hover:text-foreground"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="col-span-2">
            <span className={label}>Nombre *</span>
            <input
              required
              autoFocus
              maxLength={120}
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              className={input}
            />
          </label>
          <label>
            <span className={label}>Empresa</span>
            <input
              maxLength={120}
              value={form.company ?? ""}
              onChange={(e) => set({ company: e.target.value })}
              className={input}
            />
          </label>
          <label>
            <span className={label}>Llegó por</span>
            <select
              value={form.channel}
              onChange={(e) => set({ channel: e.target.value })}
              className={input}
            >
              {MANUAL_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABEL[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>Teléfono</span>
            <input
              type="tel"
              maxLength={40}
              value={form.phone ?? ""}
              onChange={(e) => set({ phone: e.target.value })}
              placeholder="+54 9 299…"
              className={input}
            />
          </label>
          <label>
            <span className={label}>Email</span>
            <input
              type="email"
              maxLength={200}
              value={form.email ?? ""}
              onChange={(e) => set({ email: e.target.value })}
              className={input}
            />
          </label>
          <label>
            <span className={label}>Qué necesita</span>
            <input
              maxLength={120}
              value={form.project_type ?? ""}
              onChange={(e) => set({ project_type: e.target.value })}
              placeholder="Tienda online, landing…"
              className={input}
            />
          </label>
          <label>
            <span className={label}>Monto (USD)</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              value={form.value ?? ""}
              onChange={(e) => set({ value: e.target.value })}
              placeholder="Si ya se habló"
              className={input}
            />
          </label>
          <label className="col-span-2">
            <span className={label}>La idea</span>
            <textarea
              rows={3}
              maxLength={5000}
              value={form.idea ?? ""}
              onChange={(e) => set({ idea: e.target.value })}
              className={input}
            />
          </label>
          <div className="col-span-2">
            <span className={label}>Lo toma</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...PEOPLE_IDS, null].map((o) => (
                <button
                  key={o ?? "nadie"}
                  type="button"
                  onClick={() => set({ owner: o })}
                  aria-pressed={form.owner === o}
                  className={`focus-ring rounded-full border px-3 py-1 text-xs transition-colors ${
                    form.owner === o
                      ? "border-accent bg-accent/15 text-foreground"
                      : "border-border text-muted hover:text-foreground"
                  }`}
                >
                  {o ? PEOPLE[o].name : "Sin asignar"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="focus-ring rounded-full border border-border px-4 py-2 text-sm text-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="focus-ring rounded-full bg-accent px-4 py-2 text-sm font-medium text-background disabled:opacity-40"
          >
            {saving ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
