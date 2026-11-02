"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { prospectLeads } from "@/data/prospects";
import {
  BODY_MAX,
  NAME_MAX,
  TEMPLATE_VARIABLES,
  renderTemplate,
  templateVars,
  unknownVariables,
  type ProspectTemplate,
} from "@/lib/admin/prospect-template-shared";
import { Chip, btnGhost, btnPrimary, btnSecondary, input } from "../kit";
import { Dialog, useToast } from "../overlay";
import {
  createTemplate,
  deleteTemplate,
  updateTemplate,
} from "./template-actions";

const SAMPLE = prospectLeads[0];

/** Una plantilla: se edita, se ve cómo queda con un prospecto de ejemplo y se guarda. */
function TemplateRow({
  tpl,
  who,
  isNew,
  canDelete,
  onChanged,
  onDone,
}: {
  tpl: ProspectTemplate;
  who: string;
  isNew?: boolean;
  canDelete?: boolean;
  onChanged: () => void;
  onDone?: () => void;
}) {
  const flash = useToast();
  const [name, setName] = useState(tpl.name);
  const [body, setBody] = useState(tpl.body);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const dirty = isNew
    ? name.trim() !== "" && body.trim() !== ""
    : name !== tpl.name || body !== tpl.body;
  const unknown = unknownVariables(body);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      flash(ok, "ok");
      onChanged();
      onDone?.();
    } catch (e) {
      flash(e instanceof Error ? e.message : "No se pudo guardar.", "error");
    } finally {
      setBusy(false);
    }
  };

  const insert = (key: string) => {
    const tag = `{${key}}`;
    const el = area.current;
    if (!el) return setBody((b) => b + tag);
    const { selectionStart: from, selectionEnd: to } = el;
    setBody(body.slice(0, from) + tag + body.slice(to));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(from + tag.length, from + tag.length);
    });
  };

  return (
    <article className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--well-soft)] p-4">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          placeholder="Nombre (solo para vos)"
          aria-label="Nombre de la plantilla"
          className={input}
        />
        {!isNew && (
          <Chip
            on={tpl.active}
            onClick={() =>
              run(
                () => updateTemplate(tpl.id, { active: !tpl.active }),
                tpl.active ? "Pausada" : "Activa",
              )
            }
          >
            {tpl.active ? "Activa" : "Pausada"}
          </Chip>
        )}
      </div>

      <textarea
        ref={area}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={BODY_MAX}
        rows={4}
        placeholder="Hola, soy {yo} de Se7en Studio…"
        aria-label="Mensaje"
        className={input}
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[12px] text-muted">Insertar:</span>
        {TEMPLATE_VARIABLES.map((v) => (
          <Chip
            key={v.key}
            on={false}
            onClick={() => insert(v.key)}
            className="font-mono"
          >
            {`{${v.key}}`}
          </Chip>
        ))}
      </div>
      {unknown.length > 0 && (
        <p className="text-[12px] text-amber-300">
          {unknown.map((k) => `{${k}}`).join(", ")} no existe: va a salir tal
          cual. Revisá cómo está escrito.
        </p>
      )}

      <p className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-3 text-[13px] leading-snug whitespace-pre-wrap text-muted">
        <span className="adm-label mb-1 block">
          Así se ve para «{SAMPLE.name}»
        </span>
        {body.trim() ? renderTemplate(body, templateVars(SAMPLE, who)) : "—"}
      </p>

      <div className="flex items-center justify-between gap-2">
        {isNew ? (
          <button type="button" onClick={onDone} className={btnGhost}>
            Cancelar
          </button>
        ) : (
          <button
            type="button"
            disabled={!canDelete || busy}
            title={
              canDelete
                ? "Borrar la plantilla"
                : "Tiene que quedar al menos una"
            }
            onClick={() =>
              run(() => deleteTemplate(tpl.id), "Plantilla borrada")
            }
            className={btnGhost}
          >
            Borrar
          </button>
        )}
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() =>
            run(
              () =>
                isNew
                  ? createTemplate({ name, body })
                  : updateTemplate(tpl.id, { name, body }),
              isNew ? "Plantilla creada" : "Guardada",
            )
          }
          className={btnPrimary}
        >
          {isNew ? "Crear" : "Guardar"}
        </button>
      </div>
    </article>
  );
}

export function TemplatesDialog({
  templates,
  ready,
  who,
  onClose,
  onChanged,
}: {
  templates: ProspectTemplate[];
  /** false si falta correr el SQL: se usan las sugeridas pero no se pueden editar. */
  ready: boolean;
  /** El nombre de quien está usando el panel (para la variable {yo}). */
  who: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [creating, setCreating] = useState(false);
  return (
    <Dialog
      onClose={onClose}
      label="Plantillas del primer mensaje"
      width="max-w-2xl"
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-6 py-5">
        <div className="min-w-0">
          <h2 className="adm-title text-[20px] text-foreground">
            Plantillas del primer mensaje
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Al escribir, el radar usa una al azar entre las activas, para no
            arrancar siempre igual. Las ven y las editan los dos.
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

      <div className="admin-scroll max-h-[70dvh] space-y-3 overflow-y-auto p-6">
        {!ready && (
          <p className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] px-4 py-3 text-[13px] text-amber-300">
            Falta correr <code>supabase/prospect-templates.sql</code> en
            Supabase para poder crear y editar plantillas. Mientras tanto se
            usan estas sugeridas.
          </p>
        )}

        {ready ? (
          <>
            {templates.map((t) => (
              <TemplateRow
                key={t.id}
                tpl={t}
                who={who}
                canDelete={templates.length > 1}
                onChanged={onChanged}
              />
            ))}
            {creating ? (
              <TemplateRow
                tpl={{ id: "", name: "", body: "", active: true }}
                who={who}
                isNew
                onChanged={onChanged}
                onDone={() => setCreating(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={btnSecondary}
              >
                <Plus size={14} /> Nueva plantilla
              </button>
            )}
          </>
        ) : (
          templates.map((t) => (
            <p
              key={t.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--well-soft)] p-4 text-[13px] leading-snug whitespace-pre-wrap text-muted"
            >
              <span className="adm-title mb-1 block text-[13px] text-foreground">
                {t.name}
              </span>
              {t.body}
            </p>
          ))
        )}
      </div>
    </Dialog>
  );
}
