"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus } from "lucide-react";
import {
  APPROVAL_STATUS,
  type Approval,
  type ApprovalDecision,
  type ApprovalInput,
} from "@/lib/admin/portal-shared";
import {
  Card,
  Empty,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cn,
  input,
  label,
} from "../../kit";
import {
  approvalNewRound,
  deleteApproval,
  requestApproval,
} from "../../portal-actions";

const when = (iso: string) =>
  new Date(iso)
    .toLocaleString("es-AR", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(/\./g, "");

const EMPTY: ApprovalInput = {
  title: "",
  description: "",
  link: "",
  file_id: null,
};

/** Pedir una aprobación al cliente, ver qué respondió (quién, cuándo, IP, ronda) y mandar otra ronda. */
export function ApprovalsBoard({
  slug,
  initial,
  decisions,
  files,
}: {
  slug: string;
  initial: Approval[];
  decisions: ApprovalDecision[];
  files: { id: string; name: string }[];
}) {
  const router = useRouter();
  // `null` = cerrado; "new" = aprobación nueva; un id = nueva ronda de esa.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<ApprovalInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function open(a?: Approval) {
    setEditing(a?.id ?? "new");
    setDraft(
      a
        ? {
            title: a.title,
            description: a.description,
            link: a.link,
            file_id: a.file_id,
          }
        : EMPTY,
    );
    setError(null);
  }

  function save() {
    start(async () => {
      const r =
        editing === "new"
          ? await requestApproval(slug, draft)
          : await approvalNewRound(editing as string, slug, draft);
      if (r.error) return setError(r.error);
      setEditing(null);
      router.refresh();
    });
  }

  function cancel(a: Approval) {
    if (!confirm(`¿Cancelar el pedido de aprobación «${a.title}»?`)) return;
    start(async () => {
      const r = await deleteApproval(a.id, slug);
      if (r.error) return setError(r.error);
      router.refresh();
    });
  }

  return (
    <Card
      title="Aprobaciones del cliente"
      icon={<CheckCircle2 size={14} />}
      count={
        initial.filter((a) => a.status === "pendiente").length || undefined
      }
      action={
        editing === null && (
          <button type="button" onClick={() => open()} className={btnGhost}>
            <Plus size={14} /> Pedir aprobación
          </button>
        )
      }
    >
      {editing !== null && (
        <div className="space-y-2.5 border-b border-[var(--line)] p-4">
          <div>
            <label className={label} htmlFor="ap-title">
              Qué tiene que aprobar
            </label>
            <input
              id="ap-title"
              value={draft.title}
              maxLength={200}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className={input}
              placeholder="Diseño de la home"
            />
          </div>
          <div>
            <label className={label} htmlFor="ap-desc">
              Descripción
            </label>
            <textarea
              id="ap-desc"
              rows={3}
              value={draft.description}
              maxLength={4000}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
              className={input}
            />
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="ap-link">
                Link (Figma, preview…)
              </label>
              <input
                id="ap-link"
                type="url"
                value={draft.link}
                maxLength={500}
                onChange={(e) => setDraft({ ...draft, link: e.target.value })}
                className={input}
                placeholder="https://"
              />
            </div>
            <div>
              <label className={label} htmlFor="ap-file">
                Archivo del proyecto
              </label>
              <select
                id="ap-file"
                value={draft.file_id ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, file_id: e.target.value || null })
                }
                className={input}
              >
                <option value="">Ninguno</option>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !draft.title.trim()}
              className={btnPrimary}
            >
              {editing === "new" ? "Pedir aprobación" : "Mandar nueva ronda"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className={btnSecondary}
            >
              Cancelar
            </button>
          </div>
          <p className="text-[12px] text-muted">
            El cliente la ve en su portal. El archivo elegido se comparte con
            esta aprobación.
          </p>
        </div>
      )}
      {error && <p className="px-4 pt-3 text-[12px] text-red-400">{error}</p>}
      {initial.length ? (
        <ul className="divide-y divide-[var(--line)]">
          {initial.map((a) => {
            const mine = decisions.filter((d) => d.approval_id === a.id);
            return (
              <li key={a.id} className="space-y-1.5 px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{a.title}</span>
                  <span
                    className={cn(
                      "text-[12px]",
                      APPROVAL_STATUS[a.status].tone,
                    )}
                  >
                    {APPROVAL_STATUS[a.status].label} · ronda {a.round}
                  </span>
                </div>
                {mine.length > 0 && (
                  <ol className="space-y-1 text-[12px] text-muted">
                    {mine.map((d) => (
                      <li key={d.id}>
                        R{d.round}: {d.signer}{" "}
                        {d.decision === "aprobado" ? "aprobó" : "pidió cambios"}{" "}
                        · {when(d.created_at)} · IP {d.ip || "—"}
                        {d.comment && (
                          <span className="block whitespace-pre-line text-foreground/70">
                            «{d.comment}»
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="flex gap-3 text-[12px]">
                  {a.status === "cambios" && editing === null && (
                    <button
                      type="button"
                      onClick={() => open(a)}
                      className="focus-ring text-accent hover:underline"
                    >
                      Mandar nueva ronda
                    </button>
                  )}
                  {a.status === "pendiente" && !mine.length && (
                    <button
                      type="button"
                      onClick={() => cancel(a)}
                      disabled={pending}
                      className="focus-ring text-muted hover:text-red-400"
                    >
                      Cancelar pedido
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        editing === null && (
          <Empty title="Sin aprobaciones">
            Pedile al cliente que apruebe un diseño o una entrega: queda
            registro de quién, cuándo y en qué ronda.
          </Empty>
        )
      )}
    </Card>
  );
}
