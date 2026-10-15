"use client";

// Formularios del portal. Mandan el token anti-CSRF que armó el servidor; el
// cliente y sus proyectos los vuelve a sacar la acción de la cookie.
import { useActionState, useState } from "react";
import { btnPrimary, btnSecondary, cn, input, label } from "../admin/kit";
import { createRequest, decide, redeemLink, type FormState } from "./actions";

function Note({ state }: { state: FormState }) {
  if (state.error)
    return (
      <p role="alert" className="text-[13px] text-red-400">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="text-[13px] text-emerald-300">
        {state.ok}
      </p>
    );
  return null;
}

export function RedeemForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(redeemLink, {});
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className={cn(btnPrimary, "w-full py-2.5 text-[14px]")}
      >
        {pending ? "Entrando…" : "Entrar al portal"}
      </button>
      <Note state={state} />
    </form>
  );
}

export function DecisionForm({
  approval,
  csrf,
}: {
  approval: string;
  csrf: string;
}) {
  const [state, action, pending] = useActionState(decide, {});
  const [changes, setChanges] = useState(false);
  if (state.ok) return <Note state={state} />;
  return (
    <form
      action={action}
      className="mt-4 space-y-3 rounded-xl border border-[var(--line)] bg-[var(--well-soft)] p-3 sm:p-4"
    >
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="approval" value={approval} />
      <input
        type="hidden"
        name="decision"
        value={changes ? "cambios" : "aprobado"}
      />
      <div>
        <label className={label} htmlFor={`signer-${approval}`}>
          Tu nombre
        </label>
        <input
          id={`signer-${approval}`}
          name="signer"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className={input}
        />
      </div>
      {changes && (
        <div>
          <label className={label} htmlFor={`comment-${approval}`}>
            Qué cambiarías
          </label>
          <textarea
            id={`comment-${approval}`}
            name="comment"
            required
            rows={4}
            maxLength={4000}
            className={input}
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {changes ? (
          <>
            <button type="submit" disabled={pending} className={btnPrimary}>
              Enviar cambios
            </button>
            <button
              type="button"
              onClick={() => setChanges(false)}
              className={btnSecondary}
            >
              Volver
            </button>
          </>
        ) : (
          <>
            <button type="submit" disabled={pending} className={btnPrimary}>
              Aprobar
            </button>
            <button
              type="button"
              onClick={() => setChanges(true)}
              className={btnSecondary}
            >
              Pedir cambios
            </button>
          </>
        )}
      </div>
      <p className="text-[12px] text-muted">
        Queda registrado con tu nombre, la fecha y la ronda.
      </p>
      <Note state={state} />
    </form>
  );
}

export function RequestForm({
  projects,
  csrf,
}: {
  projects: { slug: string; name: string }[];
  csrf: string;
}) {
  const [state, action, pending] = useActionState(createRequest, {});
  return (
    <form action={action} className="space-y-3 p-4">
      <input type="hidden" name="csrf" value={csrf} />
      {projects.length > 1 ? (
        <div>
          <label className={label} htmlFor="req-project">
            Proyecto
          </label>
          <select
            id="req-project"
            name="project"
            required
            className={input}
            defaultValue=""
          >
            <option value="" disabled>
              Elegí…
            </option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="project" value={projects[0]?.slug ?? ""} />
      )}
      <div>
        <label className={label} htmlFor="req-title">
          Qué necesitás
        </label>
        <input
          id="req-title"
          name="title"
          required
          minLength={3}
          maxLength={200}
          placeholder="Ej.: cambiar el teléfono del pie de página"
          className={input}
        />
      </div>
      <div>
        <label className={label} htmlFor="req-notes">
          Detalle (opcional)
        </label>
        <textarea
          id="req-notes"
          name="notes"
          rows={3}
          maxLength={4000}
          className={input}
        />
      </div>
      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Enviando…" : "Enviar pedido"}
      </button>
      <Note state={state} />
    </form>
  );
}
