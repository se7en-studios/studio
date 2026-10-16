"use client";

// Lo editable de la ficha de un cliente: datos, proyectos vinculados, cuentas
// de la caja fuerte (sin claves) y borrar. Cada cambio se guarda solo y queda
// en el Registro con el antes y el después.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X } from "lucide-react";
import { IVA, type Client, type ClientInput } from "@/lib/admin/client-shared";
import type { AccountLink } from "@/lib/admin/clients";
import { Card, btnDanger, btnGhost, cn, input, label } from "../../kit";
import { Dialog, useToast } from "../../overlay";
import {
  deleteClient,
  linkProject,
  linkVault,
  updateClientInfo,
} from "../actions";

export function ClientInfo({ initial }: { initial: Client }) {
  const flash = useToast();
  const [c, setC] = useState(initial);
  const [, start] = useTransition();

  function save(patch: ClientInput) {
    const before = c;
    setC({ ...c, ...patch } as Client);
    start(async () => {
      try {
        setC(await updateClientInfo(c.id, patch));
      } catch (e) {
        setC(before);
        flash(e instanceof Error ? e.message : "No se pudo guardar", "error");
      }
    });
  }

  return (
    <Card title="Datos del cliente">
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Field
          label="Nombre o empresa"
          value={c.name}
          onSave={(name) => name && save({ name })}
        />
        <Field
          label="Persona de contacto"
          value={c.contact}
          onSave={(contact) => save({ contact })}
        />
        <Field
          label="Email"
          type="email"
          value={c.email}
          onSave={(email) => save({ email })}
        />
        <Field
          label="WhatsApp"
          type="tel"
          value={c.whatsapp}
          onSave={(whatsapp) => save({ whatsapp })}
        />
        <Field
          label="CUIT (opcional)"
          value={c.cuit}
          placeholder="20-12345678-9"
          onSave={(cuit) => save({ cuit })}
        />
        <label className="block">
          <span className={label}>Condición IVA (opcional)</span>
          <select
            value={c.iva}
            onChange={(e) => save({ iva: e.target.value as Client["iva"] })}
            className={input}
          >
            {IVA.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
        <Notes value={c.notes} onSave={(notes) => save({ notes })} />
      </div>
    </Card>
  );
}

function Notes({
  value,
  onSave,
}: {
  value: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <label className="block sm:col-span-2">
      <span className={label}>Notas</span>
      <textarea
        rows={5}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== value && onSave(draft)}
        placeholder="Cómo trabaja, a quién hablarle, qué le importa… (se guarda al salir del campo)"
        className={input}
      />
    </label>
  );
}

function Field({
  label: text,
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft.trim() !== value && onSave(draft.trim())}
        onKeyDown={(e) =>
          e.key === "Enter" && (e.target as HTMLInputElement).blur()
        }
        className={input}
      />
    </label>
  );
}

export function ProjectLinks({
  clientId,
  options,
  linked,
}: {
  clientId: string;
  options: { slug: string; name: string; taken: boolean }[];
  linked: { slug: string; name: string }[];
}) {
  const flash = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (slug: string, on: boolean) =>
    start(async () => {
      const r = await linkProject(clientId, slug, on);
      if (r.error) flash(r.error, "error");
      else router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] px-4 py-3">
      <select
        aria-label="Vincular un proyecto"
        value=""
        disabled={pending}
        onChange={(e) => e.target.value && run(e.target.value, true)}
        className={cn(input, "w-auto min-w-[200px] flex-1")}
      >
        <option value="">Vincular un proyecto…</option>
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.name}
            {o.taken ? " (de otro cliente)" : ""}
          </option>
        ))}
      </select>
      {linked.map((p) => (
        <button
          key={p.slug}
          disabled={pending}
          onClick={() => run(p.slug, false)}
          className={btnGhost}
          title={`Desvincular ${p.name}`}
        >
          <X size={13} /> {p.name}
        </button>
      ))}
    </div>
  );
}

export function AccountLinks({
  clientId,
  initial,
}: {
  clientId: string;
  initial: AccountLink[];
}) {
  const flash = useToast();
  const [accounts, setAccounts] = useState(initial);
  const [pending, start] = useTransition();
  const mine = accounts.filter((a) => a.client_id === clientId);
  const others = accounts.filter((a) => a.client_id !== clientId);
  const name = (a: AccountLink) =>
    [a.service, a.label].filter(Boolean).join(" · ");

  const run = (id: string, on: boolean) =>
    start(async () => {
      const r = await linkVault(clientId, id, on);
      if (r.error || !r.account)
        return flash(r.error ?? "No se pudo guardar", "error");
      setAccounts((xs) => xs.map((a) => (a.id === id ? r.account! : a)));
    });

  return (
    <div>
      {mine.length ? (
        <ul className="divide-y divide-[var(--line)]">
          {mine.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <span className="min-w-0 truncate">
                {name(a)}
                {a.username && (
                  <span className="text-muted"> · {a.username}</span>
                )}
              </span>
              <button
                disabled={pending}
                onClick={() => run(a.id, false)}
                className={btnGhost}
                aria-label={`Desvincular ${name(a)}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-4 text-[13px] text-muted">
          Ninguna cuenta vinculada. Las claves se abren desde Cuentas.
        </p>
      )}
      {others.length > 0 && (
        <div className="border-t border-[var(--line)] px-4 py-3">
          <select
            aria-label="Vincular una cuenta"
            value=""
            disabled={pending}
            onChange={(e) => e.target.value && run(e.target.value, true)}
            className={input}
          >
            <option value="">Vincular una cuenta de la caja fuerte…</option>
            {others.map((a) => (
              <option key={a.id} value={a.id}>
                {name(a)}
                {a.client_id ? " (de otro cliente)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

export function DeleteClient({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end">
      <button
        onClick={() => setOpen(true)}
        className={cn(btnGhost, "text-red-400 hover:text-red-300")}
      >
        <Trash2 size={14} /> Borrar cliente
      </button>
      {open && (
        <Dialog onClose={() => setOpen(false)} label="Borrar cliente">
          <div className="p-6">
            <h2 className="adm-display text-[22px]">¿Borrar a {name}?</h2>
            <p className="mt-2 text-[13px] text-muted">
              Sus proyectos, cobros y cuentas no se borran: quedan sin cliente.
            </p>
            {error && <p className="mt-3 text-[13px] text-red-400">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setOpen(false)} className={btnGhost}>
                Cancelar
              </button>
              <button
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteClient(id);
                    if (r?.error) setError(r.error);
                  })
                }
                className={btnDanger}
              >
                {pending ? "Borrando…" : "Borrar"}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
