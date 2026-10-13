"use client";

// Formulario de una cuenta y el pedido de contraseña. La clave se escribe o se genera
// acá y viaja directo a la acción del servidor, que la cifra: el navegador no guarda
// nada. El chequeo de filtraciones usa Have I Been Pwned (gratis): sólo sale de acá
// los primeros 5 caracteres del hash de la clave, nunca la clave.
import { useState, useTransition } from "react";
import { Dices, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { type Owner } from "@/lib/admin/finance-shared";
import {
  MAX_NOTES,
  SERVICES,
  TWOFA,
  type Account,
} from "@/lib/admin/vault-shared";
import { btnPrimary, btnSecondary, cn, Chip, input, label } from "../kit";
import { Dialog, useToast } from "../overlay";
import { saveAccount } from "./actions";

const ALPHABET =
  "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_.!?";

/** Una clave al azar del navegador (sin letras que se confunden), sin sesgo hacia las primeras letras. */
export function generatePassword(length = 20): string {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const out: string[] = [];
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length))) {
      if (b < limit && out.length < length)
        out.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return out.join("");
}

/** Cuántas veces apareció esta clave en filtraciones conocidas (0 = no aparece). */
async function pwnedCount(password: string): Promise<number> {
  const digest = await crypto.subtle.digest(
    "SHA-1",
    new TextEncoder().encode(password),
  );
  const hex = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  )
    .join("")
    .toUpperCase();
  const res = await fetch(
    `https://api.pwnedpasswords.com/range/${hex.slice(0, 5)}`,
    { headers: { "Add-Padding": "true" } },
  );
  if (!res.ok) throw new Error("sin respuesta");
  const line = (await res.text())
    .split("\n")
    .find((l) => l.startsWith(hex.slice(5)));
  return line ? Number(line.split(":")[1]) || 0 : 0;
}

const OWNER_CHOICES: { id: Owner; label: string }[] = [
  { id: "ambos", label: "Los dos" },
  { id: "franco", label: "Franco" },
  { id: "federico", label: "Federico" },
];

/** Pide la contraseña del panel para abrir la caja unos minutos. `onSubmit` devuelve el error, si hay. */
export function PasswordPrompt({
  title,
  onSubmit,
  onClose,
}: {
  title: string;
  onSubmit: (password: string) => Promise<string | undefined>;
  onClose: () => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog onClose={onClose} label={title} width="max-w-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const err = await onSubmit(password);
            if (err) setError(err);
          });
        }}
        className="space-y-4 p-5"
      >
        <div>
          <p className="flex items-center gap-2 text-[15px] font-semibold">
            <Lock size={16} className="text-accent" /> {title}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Por seguridad, poné la contraseña del panel. Queda abierta 5
            minutos.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="Contraseña del panel"
          aria-invalid={Boolean(error)}
          className={cn(input, "aria-[invalid=true]:border-red-500/60")}
        />
        {error && <p className="text-[13px] text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!password || pending}
            className={btnPrimary}
          >
            {pending ? "Verificando…" : "Continuar"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account: Account | null;
  onClose: () => void;
  onSaved: (a: Account) => void;
}) {
  const flash = useToast();
  const [service, setService] = useState(account?.service ?? "");
  const [name, setName] = useState(account?.label ?? "");
  const [url, setUrl] = useState(account?.url ?? "");
  const [username, setUsername] = useState(account?.username ?? "");
  const [secret, setSecret] = useState("");
  const [notes, setNotes] = useState("");
  const [twofa, setTwofa] = useState<string>(account?.twofa ?? "app");
  const [owner, setOwner] = useState<Owner>(account?.owner ?? "ambos");
  const [visible, setVisible] = useState(false);
  const [leak, setLeak] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  function pickService(value: string) {
    setService(value);
    const preset = SERVICES.find(
      (s) => s.id.toLowerCase() === value.trim().toLowerCase(),
    );
    // El link se completa solo, salvo que ya hayan puesto uno propio.
    if (preset?.url && (!url || SERVICES.some((s) => s.url === url)))
      setUrl(preset.url);
  }

  async function submit(password?: string): Promise<string | undefined> {
    const res = await saveAccount(
      account?.id ?? null,
      { service, label: name, url, username, twofa, owner, secret, notes },
      password,
    );
    if ("account" in res) {
      onSaved(res.account);
      flash(account ? "Cuenta actualizada" : "Cuenta guardada", "ok");
      return;
    }
    if (res.needPassword && !password) {
      setAsking(true);
      return;
    }
    if (password) return res.error;
    setError(res.error);
  }

  async function check() {
    setLeak("Revisando…");
    try {
      const n = await pwnedCount(secret);
      setLeak(
        n > 0
          ? `Esta clave apareció ${n.toLocaleString("es-AR")} veces en filtraciones. Cambiala.`
          : "No aparece en filtraciones conocidas.",
      );
    } catch {
      setLeak("No se pudo revisar ahora (sin conexión con el servicio).");
    }
  }

  const leaked = leak?.startsWith("Esta clave");

  return (
    <>
      <Dialog
        onClose={onClose}
        label={account ? "Editar cuenta" : "Nueva cuenta"}
        width="max-w-xl"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              await submit();
            });
          }}
          className="admin-scroll max-h-[88dvh] space-y-4 overflow-y-auto p-5"
        >
          <p className="text-[16px] font-semibold tracking-[-0.01em]">
            {account ? "Editar cuenta" : "Nueva cuenta"}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="v-service" className={label}>
                Servicio
              </label>
              <input
                id="v-service"
                list="v-services"
                value={service}
                onChange={(e) => pickService(e.target.value)}
                required
                maxLength={40}
                placeholder="Instagram, Vercel…"
                className={input}
              />
              <datalist id="v-services">
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id} />
                ))}
              </datalist>
            </div>
            <div>
              <label htmlFor="v-label" className={label}>
                Nombre (para distinguirla)
              </label>
              <input
                id="v-label"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="@se7en.studio"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="v-user" className={label}>
                Usuario o email
              </label>
              <input
                id="v-user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={120}
                autoComplete="off"
                className={input}
              />
            </div>
            <div>
              <label htmlFor="v-url" className={label}>
                Link de ingreso
              </label>
              <input
                id="v-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                maxLength={300}
                inputMode="url"
                placeholder="https://…"
                className={input}
              />
            </div>
          </div>

          <div>
            <label htmlFor="v-secret" className={label}>
              Clave
            </label>
            <div className="flex gap-2">
              <input
                id="v-secret"
                type={visible ? "text" : "password"}
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  setLeak(null);
                }}
                required={!account}
                maxLength={500}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={account ? "Dejá vacío para no cambiarla" : ""}
                className={cn(input, "font-mono")}
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                aria-label={visible ? "Ocultar la clave" : "Mostrar la clave"}
                className={cn(btnSecondary, "px-2.5")}
              >
                {visible ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSecret(generatePassword());
                  setVisible(true);
                  setLeak(null);
                }}
                className={btnSecondary}
              >
                <Dices size={15} /> Generar
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              <button
                type="button"
                onClick={check}
                disabled={!secret}
                className="focus-ring inline-flex items-center gap-1 rounded text-muted hover:text-foreground disabled:opacity-40"
              >
                <ShieldCheck size={13} /> Revisar si se filtró
              </button>
              {leak && (
                <span className={leaked ? "text-red-400" : "text-muted"}>
                  {leak}
                </span>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="v-notes" className={label}>
              Notas cifradas (códigos de recuperación, preguntas…)
            </label>
            <textarea
              id="v-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={MAX_NOTES}
              placeholder={
                account?.has_notes
                  ? "Ya hay notas guardadas: escribí acá para reemplazarlas"
                  : ""
              }
              className={cn(input, "resize-none font-mono")}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <span className={label}>Segundo paso (2FA)</span>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="Segundo paso"
              >
                {TWOFA.map((t) => (
                  <Chip
                    key={t.id}
                    on={twofa === t.id}
                    onClick={() => setTwofa(t.id)}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <span className={label}>De quién es</span>
              <div
                className="flex flex-wrap gap-1.5"
                role="group"
                aria-label="De quién es"
              >
                {OWNER_CHOICES.map((o) => (
                  <Chip
                    key={o.id}
                    on={owner === o.id}
                    onClick={() => setOwner(o.id)}
                  >
                    {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {account && (
            <p className="text-[12px] text-muted">
              Cambiar la clave o las notas pide la contraseña del panel. La
              clave actual está cifrada: no se muestra acá.
            </p>
          )}
          {error && <p className="text-[13px] text-red-400">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending || !service.trim()}
              className={btnPrimary}
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </Dialog>
      {asking && (
        <PasswordPrompt
          title="Confirmá que sos vos"
          onClose={() => setAsking(false)}
          onSubmit={async (pw) => {
            const err = await submit(pw);
            if (!err) setAsking(false);
            return err;
          }}
        />
      )}
    </>
  );
}
