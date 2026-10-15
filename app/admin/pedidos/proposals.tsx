"use client";

// En la ficha del pedido: sus propuestas (estado, link, cuándo la vio) y el
// armado de una nueva con los precios del cotizador de /pricing. Al enviarla,
// el pedido pasa solo a «Propuesta».
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileSignature,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { Lead, LeadStatus } from "@/lib/admin/db";
import { productBases, type DeliveryPace } from "@/data/pricing";
import {
  PROPOSAL_LABEL,
  daysOf,
  draftFromQuote,
  money,
  statusOf,
  totalOf,
  type ProposalContent,
  type ProposalStatus,
} from "@/lib/admin/proposal-shared";
import type { Currency } from "@/lib/admin/finance-shared";
import { dayKey } from "@/lib/admin/task-shared";
import type { PanelProposal } from "@/lib/admin/proposals";
import {
  Segmented,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cn,
  input,
  label as sectionLabel,
} from "../kit";
import {
  deleteDraft,
  loadProposals,
  revokeProposal,
  saveProposal,
  sendProposal,
} from "./proposal-actions";

const TONE: Record<ProposalStatus, string> = {
  borrador: "text-muted",
  enviada: "text-sky-300",
  vista: "text-amber-300",
  aceptada: "text-emerald-300",
  rechazada: "text-red-400",
  vencida: "text-muted",
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
const day = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("es-AR", {
    dateStyle: "medium",
  });

export function Proposals({
  lead,
  onStatus,
}: {
  lead: Lead;
  onStatus: (s: LeadStatus) => void;
}) {
  const [list, setList] = useState<PanelProposal[] | null>(null);
  const [setup, setSetup] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string | null;
    content: ProposalContent;
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const reload = useCallback(async () => {
    const r = await loadProposals(lead.id);
    setList(r.proposals ?? []);
    setSetup(r.setup ?? null);
    setError(r.error ?? null);
  }, [lead.id]);

  useEffect(() => {
    let alive = true;
    loadProposals(lead.id).then(
      (r) => {
        if (!alive) return;
        setList(r.proposals ?? []);
        setSetup(r.setup ?? null);
        setError(r.error ?? null);
      },
      () => alive && setError("Sin conexión"),
    );
    return () => {
      alive = false;
    };
  }, [lead.id]);

  const run = (fn: () => Promise<{ error?: string }>, then?: () => void) =>
    start(async () => {
      setError(null);
      const r = await fn().catch(() => ({ error: "Sin conexión" }));
      if (r.error) setError(r.error);
      else then?.();
      await reload();
    });

  const send = (id: string) =>
    run(
      () => sendProposal(id),
      () =>
        (lead.status === "nuevo" || lead.status === "contactado") &&
        onStatus("propuesta"),
    );

  function copy(p: PanelProposal) {
    if (!p.link) return;
    navigator.clipboard?.writeText(p.link).then(
      () => {
        setCopied(p.id);
        setTimeout(() => setCopied(null), 1500);
      },
      () => {},
    );
  }

  if (setup)
    return (
      <p className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3.5 py-3 text-[13px] text-amber-300">
        Propuestas: {setup}
      </p>
    );

  const today = dayKey();
  return (
    <>
      <div className="mt-6 flex items-center justify-between">
        <p className={cn(sectionLabel, "mb-0 flex items-center gap-1.5")}>
          <FileSignature size={12} /> Propuestas
        </p>
        {!editing && (
          <button
            className={btnGhost}
            onClick={() => {
              const base =
                productBases.find((b) => b.name === lead.project_type)?.id ??
                productBases[0].id;
              setEditing({
                id: null,
                content: draftFromQuote(base, "standard", "USD", today),
              });
            }}
          >
            <Plus size={14} /> Nueva
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[12px] text-red-400">{error}</p>}

      {editing && (
        <Builder
          key={editing.id ?? "nueva"}
          initial={editing.content}
          pending={pending}
          onCancel={() => setEditing(null)}
          onSave={(content, andSend) =>
            run(
              async () => {
                const r = await saveProposal(lead.id, editing.id, content);
                if (r.error || !r.id) return r;
                return andSend ? sendProposal(r.id) : {};
              },
              () => {
                setEditing(null);
                if (
                  andSend &&
                  (lead.status === "nuevo" || lead.status === "contactado")
                )
                  onStatus("propuesta");
              },
            )
          }
        />
      )}

      {list === null ? (
        <div className="admin-skeleton mt-2 h-12 rounded-lg" />
      ) : list.length === 0 ? (
        !editing && (
          <p className="mt-1 text-[13px] text-muted">
            Sin propuestas. Armá una con los precios del cotizador.
          </p>
        )
      ) : (
        <ul className="mt-2 divide-y divide-[var(--line)] overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--well-soft)]">
          {list.map((p) => {
            const st = statusOf(p, today);
            const open = !p.revoked_at && (st === "enviada" || st === "vista");
            return (
              <li key={p.id} className="px-3.5 py-3 text-[13px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate">
                    <span className="text-muted">v{p.version}</span> {p.title}
                  </p>
                  <p
                    className={cn(
                      "text-[12px] font-medium",
                      p.revoked_at ? "text-muted line-through" : TONE[st],
                    )}
                  >
                    {p.revoked_at ? "Anulada" : PROPOSAL_LABEL[st]}
                  </p>
                </div>
                <p className="mt-0.5 text-[12px] text-muted">
                  {p.total != null
                    ? money(p.total, p.currency)
                    : `desde ${money(p.base_amount, p.currency)}`}{" "}
                  · válida hasta {day(p.valid_until)}
                  {p.viewed_at && ` · la vio el ${when(p.viewed_at)}`}
                </p>
                {p.acceptance && (
                  <p className="mt-1 text-[12px] text-emerald-300">
                    Aceptó {p.acceptance.name} ({p.acceptance.email}) el{" "}
                    {when(p.acceptance.at)} ·{" "}
                    <span className="font-mono" title={p.acceptance.hash}>
                      {p.acceptance.hash.slice(0, 12)}…
                    </span>
                  </p>
                )}
                {p.reject_reason && (
                  <p className="mt-1 text-[12px] text-red-400">
                    Motivo: {p.reject_reason}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.status === "borrador" && (
                    <>
                      <button
                        className={btnPrimary}
                        disabled={pending}
                        onClick={() => send(p.id)}
                      >
                        <Send size={14} /> Enviar
                      </button>
                      <button
                        className={btnSecondary}
                        disabled={pending}
                        onClick={() => setEditing({ id: p.id, content: p })}
                      >
                        Editar
                      </button>
                      <button
                        className={btnGhost}
                        disabled={pending}
                        onClick={() => run(() => deleteDraft(p.id))}
                      >
                        <Trash2 size={14} /> Borrar
                      </button>
                    </>
                  )}
                  {p.link && !p.revoked_at && (
                    <>
                      <button className={btnSecondary} onClick={() => copy(p)}>
                        {copied === p.id ? (
                          <Check size={14} />
                        ) : (
                          <Copy size={14} />
                        )}{" "}
                        {copied === p.id ? "Copiado" : "Copiar link"}
                      </button>
                      <a
                        className={btnGhost}
                        href={p.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={14} /> Ver
                      </a>
                    </>
                  )}
                  {p.status !== "borrador" && !p.link && !p.revoked_at && (
                    <span className="text-[12px] text-muted">
                      El link no se puede rearmar (cambió el secreto del panel).
                    </span>
                  )}
                  {open && (
                    <button
                      className={btnGhost}
                      disabled={pending}
                      onClick={() => run(() => revokeProposal(p.id))}
                    >
                      <X size={14} /> Anular
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

const PACES = [
  { id: "standard", label: "Estándar" },
  { id: "express", label: "Express" },
] as const;
const CURRENCIES = [
  { id: "USD", label: "USD" },
  { id: "ARS", label: "ARS" },
] as const;

/** El formulario de una propuesta. «Cotizador» recarga precios y plazos desde /pricing. */
function Builder({
  initial,
  pending,
  onCancel,
  onSave,
}: {
  initial: ProposalContent;
  pending: boolean;
  onCancel: () => void;
  onSave: (c: ProposalContent, andSend: boolean) => void;
}) {
  const [c, setC] = useState(initial);
  const [baseId, setBaseId] = useState(
    productBases.find((b) => b.name === initial.title)?.id ??
      productBases[0].id,
  );
  const [pace, setPace] = useState<DeliveryPace>("standard");
  const set = <K extends keyof ProposalContent>(k: K, v: ProposalContent[K]) =>
    setC((x) => ({ ...x, [k]: v }));
  const fromQuote = (b: string, p: DeliveryPace, cur: Currency) =>
    setC((x) => ({
      ...draftFromQuote(b, p, cur, dayKey()),
      valid_until: x.valid_until,
      payment: x.payment,
    }));
  const all = c.optionals.map((o) => o.id);

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-accent/30 bg-[var(--well-soft)] p-3.5">
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className={sectionLabel}>Cotizador</span>
          <select
            className={input}
            value={baseId}
            onChange={(e) => {
              setBaseId(e.target.value);
              fromQuote(e.target.value, pace, c.currency);
            }}
          >
            {productBases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <Segmented
          label="Ritmo"
          value={pace}
          options={PACES}
          onChange={(v) => {
            setPace(v);
            fromQuote(baseId, v, c.currency);
          }}
        />
        <Segmented
          label="Moneda"
          value={c.currency}
          options={CURRENCIES}
          onChange={(v) => fromQuote(baseId, pace, v)}
        />
      </div>

      <label className="block">
        <span className={sectionLabel}>Título</span>
        <input
          className={input}
          value={c.title}
          maxLength={120}
          onChange={(e) => set("title", e.target.value)}
        />
      </label>
      <label className="block">
        <span className={sectionLabel}>Introducción</span>
        <textarea
          className={input}
          rows={2}
          maxLength={2000}
          value={c.intro}
          onChange={(e) => set("intro", e.target.value)}
        />
      </label>
      <label className="block">
        <span className={sectionLabel}>Alcance (un ítem por línea)</span>
        <textarea
          className={input}
          rows={5}
          value={c.items.join("\n")}
          onChange={(e) => set("items", e.target.value.split("\n"))}
        />
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <label>
          <span className={sectionLabel}>Monto base ({c.currency})</span>
          <input
            className={input}
            type="number"
            min={0}
            value={c.base_amount}
            onChange={(e) => set("base_amount", Number(e.target.value))}
          />
        </label>
        <label>
          <span className={sectionLabel}>Días hábiles</span>
          <input
            className={input}
            type="number"
            min={1}
            value={c.days}
            onChange={(e) => set("days", Number(e.target.value))}
          />
        </label>
        <label>
          <span className={sectionLabel}>Válida hasta</span>
          <input
            className={input}
            type="date"
            value={c.valid_until}
            onChange={(e) => set("valid_until", e.target.value)}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className={sectionLabel}>Seña %</span>
            <input
              className={input}
              type="number"
              min={0}
              max={100}
              value={c.payment.deposit_pct}
              onChange={(e) =>
                set("payment", {
                  ...c.payment,
                  deposit_pct: Number(e.target.value),
                })
              }
            />
          </label>
          <label>
            <span className={sectionLabel}>Pagos saldo</span>
            <input
              className={input}
              type="number"
              min={1}
              max={24}
              value={c.payment.installments}
              onChange={(e) =>
                set("payment", {
                  ...c.payment,
                  installments: Number(e.target.value),
                })
              }
            />
          </label>
        </div>
      </div>

      <div>
        <p className={sectionLabel}>Opcionales (el cliente los tilda)</p>
        <ul className="space-y-1.5">
          {c.optionals.map((o, i) => {
            const patch = (v: Partial<typeof o>) =>
              set(
                "optionals",
                c.optionals.map((x, j) => (j === i ? { ...x, ...v } : x)),
              );
            return (
              <li key={o.id} className="flex gap-1.5">
                <input
                  className={input}
                  aria-label="Opcional"
                  value={o.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
                <input
                  className={cn(input, "w-28")}
                  aria-label="Precio"
                  type="number"
                  min={0}
                  value={o.price}
                  onChange={(e) => patch({ price: Number(e.target.value) })}
                />
                <input
                  className={cn(input, "w-20")}
                  aria-label="Días"
                  type="number"
                  min={0}
                  value={o.days}
                  onChange={(e) => patch({ days: Number(e.target.value) })}
                />
                <button
                  className={btnGhost}
                  aria-label={`Quitar ${o.name}`}
                  onClick={() =>
                    set(
                      "optionals",
                      c.optionals.filter((_, j) => j !== i),
                    )
                  }
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          className={cn(btnGhost, "mt-1")}
          onClick={() =>
            set("optionals", [
              ...c.optionals,
              {
                id: `op-${Date.now().toString(36)}`,
                name: "",
                price: 0,
                days: 0,
              },
            ])
          }
        >
          <Plus size={14} /> Opcional
        </button>
      </div>

      <p className="text-[12px] text-muted">
        Total: {money(totalOf(c, []), c.currency)} ({daysOf(c, [])} días)
        {c.optionals.length > 0 &&
          ` · con todos los opcionales ${money(totalOf(c, all), c.currency)} (${daysOf(c, all)} días)`}
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <button className={btnGhost} onClick={onCancel}>
          Cancelar
        </button>
        <button
          className={btnSecondary}
          disabled={pending}
          onClick={() => onSave(c, false)}
        >
          Guardar borrador
        </button>
        <button
          className={btnPrimary}
          disabled={pending}
          onClick={() => onSave(c, true)}
        >
          <Send size={14} /> Guardar y enviar
        </button>
      </div>
    </div>
  );
}
