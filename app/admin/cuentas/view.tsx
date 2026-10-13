"use client";

// Caja fuerte: una tarjeta por cuenta. La lista trae solo lo que no es secreto; la clave
// se pide al servidor de a una (con la contraseña del panel) y se oculta sola a los 30 s.
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { PEOPLE } from "@/lib/admin/people";
import {
  ageLabel,
  daysSince,
  isStale,
  twoFaLabel,
  weak2fa,
  type Account,
} from "@/lib/admin/vault-shared";
import {
  Card,
  Empty,
  Face,
  Kpi,
  btnGhost,
  btnPrimary,
  btnSecondary,
  cn,
  kpiRow,
  searchInput,
} from "../kit";
import { useToast } from "../overlay";
import { closeVault, deleteAccount, revealAccount } from "./actions";
import { AccountForm, PasswordPrompt } from "./form";

const HIDE_AFTER_MS = 30_000;

type Shown = { id: string; secret: string; notes: string | null };
type Prompt = {
  title: string;
  run: (password: string) => Promise<string | undefined>;
};

export function VaultView({
  accounts,
  today,
}: {
  accounts: Account[];
  today: string;
}) {
  const flash = useToast();
  const [items, setItems] = useState(accounts);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);

  // La clave a la vista se esconde sola.
  useEffect(() => {
    if (!shown) return;
    const id = window.setTimeout(() => setShown(null), HIDE_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [shown]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (a) =>
        !q || `${a.service} ${a.label} ${a.username}`.toLowerCase().includes(q),
    );
  }, [items, query]);

  const stale = items.filter((a) => isStale(a, today)).length;
  const weak = items.filter(weak2fa).length;

  async function reveal(
    id: string,
    password?: string,
  ): Promise<string | undefined> {
    const res = await revealAccount(id, password);
    if ("secret" in res) {
      setShown({ id, secret: res.secret, notes: res.notes });
      setPrompt(null);
      return;
    }
    if (res.needPassword && !password) {
      setPrompt({ title: "Ver la clave", run: (pw) => reveal(id, pw) });
      return;
    }
    if (password) return res.error;
    flash(res.error, "error");
  }

  async function remove(
    a: Account,
    password?: string,
  ): Promise<string | undefined> {
    const res = await deleteAccount(a.id, password);
    if ("ok" in res) {
      setItems((xs) => xs.filter((x) => x.id !== a.id));
      setPrompt(null);
      setShown((s) => (s?.id === a.id ? null : s));
      flash("Cuenta borrada", "ok");
      return;
    }
    if (res.needPassword && !password) {
      setPrompt({ title: `Borrar ${a.service}`, run: (pw) => remove(a, pw) });
      return;
    }
    if (password) return res.error;
    flash(res.error, "error");
  }

  function saved(a: Account) {
    setItems((xs) =>
      xs.some((x) => x.id === a.id)
        ? xs.map((x) => (x.id === a.id ? a : x))
        : [...xs, a],
    );
    setShown(null);
    setEditing(null);
  }

  async function copy(text: string, what: string, clearAfter = false) {
    try {
      await navigator.clipboard.writeText(text);
      flash(
        clearAfter
          ? `${what} copiada: se borra del portapapeles en 30 s`
          : `${what} copiado`,
        "ok",
      );
      // ponytail: borrar el portapapeles es a mejor esfuerzo; algunos navegadores no lo permiten.
      if (clearAfter)
        window.setTimeout(
          () => navigator.clipboard.writeText(" ").catch(() => {}),
          HIDE_AFTER_MS,
        );
    } catch {
      flash("No se pudo copiar: seleccionalo a mano.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className={cn(kpiRow, "md:grid-cols-3")}>
        <Kpi
          label="Cuentas guardadas"
          value={items.length}
          icon={<KeyRound size={14} />}
        />
        <Kpi
          label="Clave sin cambiar hace +6 meses"
          value={stale}
          tone={stale ? "amber" : undefined}
          hint={stale ? "Conviene rotarlas" : "Todas al día"}
          icon={<AlertTriangle size={14} />}
        />
        <Kpi
          label="Sin 2FA o con SMS"
          value={weak}
          tone={weak ? "red" : undefined}
          hint={weak ? "Pasarlas a app o llave" : "Todas protegidas"}
          icon={<ShieldAlert size={14} />}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[220px] flex-1 items-center">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por servicio, nombre o usuario…"
            aria-label="Buscar cuentas"
            className={searchInput}
          />
        </label>
        <button
          type="button"
          onClick={async () => {
            await closeVault();
            setShown(null);
            flash("Caja bloqueada", "ok");
          }}
          className={btnSecondary}
        >
          <Lock size={14} /> Bloquear ahora
        </button>
        <button
          type="button"
          onClick={() => setEditing("new")}
          className={btnPrimary}
        >
          <Plus size={14} /> Nueva cuenta
        </button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <Empty
            icon={<KeyRound size={18} />}
            title={items.length ? "Nada coincide" : "Todavía no hay cuentas"}
          >
            {items.length
              ? "Probá con otra palabra."
              : "Guardá acá las de Instagram, Vercel, Supabase, Gmail… Quedan cifradas y se abren con tu contraseña."}
          </Empty>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((a) => (
            <AccountCard
              key={a.id}
              a={a}
              today={today}
              shown={shown?.id === a.id ? shown : null}
              onReveal={() => reveal(a.id)}
              onHide={() => setShown(null)}
              onEdit={() => setEditing(a)}
              onDelete={() => remove(a)}
              onCopy={copy}
            />
          ))}
        </ul>
      )}

      {editing && (
        <AccountForm
          account={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={saved}
        />
      )}
      {prompt && (
        <PasswordPrompt
          title={prompt.title}
          onSubmit={prompt.run}
          onClose={() => setPrompt(null)}
        />
      )}
    </div>
  );
}

function AccountCard({
  a,
  today,
  shown,
  onReveal,
  onHide,
  onEdit,
  onDelete,
  onCopy,
}: {
  a: Account;
  today: string;
  shown: Shown | null;
  onReveal: () => void;
  onHide: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: (text: string, what: string, clearAfter?: boolean) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const stale = isStale(a, today);
  const weak = weak2fa(a);
  const who = a.owner === "ambos" ? null : a.owner;
  return (
    <li>
      <Card className="h-full">
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-white/[0.03] text-[15px] font-semibold">
              {a.service[0]?.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold">{a.service}</p>
              <p className="truncate text-[12px] text-muted">
                {a.label || "Sin nombre"}
              </p>
            </div>
            {who ? (
              <Face who={who} size={22} />
            ) : (
              <span
                className="inline-flex -space-x-1.5"
                title={`${PEOPLE.franco.name} y ${PEOPLE.federico.name}`}
              >
                <Face who="franco" size={22} ring alt="" />
                <Face who="federico" size={22} ring alt="" />
              </span>
            )}
          </div>

          {a.username && (
            <button
              type="button"
              onClick={() => onCopy(a.username, "Usuario")}
              title="Copiar usuario"
              className="focus-ring group flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--well-soft)] px-3 py-2 text-left text-[13px]"
            >
              <span className="truncate">{a.username}</span>
              <Copy
                size={13}
                className="shrink-0 text-muted transition-colors group-hover:text-foreground"
              />
            </button>
          )}

          {shown ? (
            <div className="space-y-2 rounded-lg border border-accent/40 bg-accent/[0.05] p-3">
              <div className="flex items-center justify-between gap-2">
                <code className="min-w-0 flex-1 font-mono text-[13px] break-all select-all">
                  {shown.secret}
                </code>
                <button
                  type="button"
                  onClick={() => onCopy(shown.secret, "Clave", true)}
                  aria-label="Copiar la clave"
                  className={cn(btnSecondary, "px-2.5")}
                >
                  <Copy size={14} />
                </button>
              </div>
              {shown.notes && (
                <p className="border-t border-[var(--line)] pt-2 font-mono text-[12px] whitespace-pre-wrap text-muted">
                  {shown.notes}
                </p>
              )}
              <button
                type="button"
                onClick={onHide}
                className="focus-ring text-[12px] text-muted hover:text-foreground"
              >
                Ocultar (se esconde sola en 30 s)
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onReveal}
              className={cn(btnSecondary, "w-full")}
            >
              <Lock size={14} /> Ver clave
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span
              className={cn(
                "rounded-full px-2 py-0.5",
                weak
                  ? "bg-red-500/10 text-red-300"
                  : "bg-emerald-400/10 text-emerald-300",
              )}
            >
              {twoFaLabel(a.twofa)}
            </span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5",
                stale
                  ? "bg-amber-400/10 text-amber-300"
                  : "bg-white/[0.06] text-muted",
              )}
            >
              Clave {ageLabel(daysSince(a.rotated_on, today))}
            </span>
            {a.has_notes && (
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-muted">
                Con notas
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-1 border-t border-[var(--line)] pt-3">
            {a.url && (
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className={btnGhost}
              >
                Abrir <ArrowUpRight size={13} />
              </a>
            )}
            <span className="ml-auto flex items-center gap-1">
              {confirm ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirm(false);
                      onDelete();
                    }}
                    className="focus-ring rounded-md bg-red-500/90 px-2.5 py-1 text-[12px] text-white"
                  >
                    <Check size={12} className="mr-1 inline" /> Borrar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(false)}
                    className={btnGhost}
                  >
                    No
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onEdit}
                    aria-label={`Editar ${a.service}`}
                    className={cn(btnGhost, "px-2")}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirm(true)}
                    aria-label={`Borrar ${a.service}`}
                    className={cn(btnGhost, "px-2 hover:text-red-400")}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </span>
          </div>
        </div>
      </Card>
    </li>
  );
}
