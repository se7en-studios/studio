"use client";

// La propuesta del lado del cliente: alcance, opcionales que puede tildar (el
// total se recalcula), forma de pago y aceptar con nombre, email y «acepto»,
// o rechazar con un motivo.
import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  Clock,
  FileSignature,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import {
  daysOf,
  money,
  paymentPlan,
  totalOf,
  type ProposalContent,
  type ProposalStatus,
} from "@/lib/admin/proposal-shared";
import { acceptProposal, markSeen, rejectProposal } from "./actions";

export type PublicProposal = ProposalContent & {
  version: number;
  state: ProposalStatus | "anulada";
  selected: string[];
  accepted: { name: string; at: string; hash: string } | null;
};

const longDay = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
const field =
  "focus-ring w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:border-accent";

export function ProposalView({
  token,
  p,
  today,
}: {
  token: string;
  p: PublicProposal;
  today: string;
}) {
  const [state, setState] = useState(p.state);
  const [selected, setSelected] = useState<string[]>(p.selected);
  const [accepted, setAccepted] = useState(p.accepted);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (p.state === "enviada") void markSeen(token);
  }, [p.state, token]);

  const open = state === "enviada" || state === "vista";
  const total = totalOf(p, selected);
  const days = daysOf(p, selected);
  const plan = paymentPlan(total, p.payment, today, days);

  function toggle(id: string) {
    if (!open) return;
    setSelected((s) =>
      s.includes(id)
        ? s.filter((x) => x !== id)
        : p.optionals
            .filter((o) => o.id === id || s.includes(o.id))
            .map((o) => o.id),
    );
  }

  function accept(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      setError(null);
      const r = await acceptProposal(token, {
        name,
        email,
        agree,
        selected,
        total,
      }).catch(() => ({
        ok: false as const,
        error: "Sin conexión. Probá de nuevo.",
      }));
      if (!r.ok) return setError(r.error);
      setAccepted({ name: name.trim(), at: r.at, hash: r.hash });
      setState("aceptada");
    });
  }

  function reject() {
    start(async () => {
      setError(null);
      const r = await rejectProposal(token, reason).catch(() => ({
        ok: false as const,
        error: "Sin conexión. Probá de nuevo.",
      }));
      if (!r.ok) return setError(r.error);
      setState("rechazada");
    });
  }

  return (
    <main className="min-h-screen pt-28 pb-24 md:pt-36 md:pb-32">
      <Container>
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs text-muted">
            <FileSignature size={13} className="text-accent" />
            <span>
              Propuesta v{p.version} · válida hasta el {longDay(p.valid_until)}
            </span>
          </div>
          <h1 className="display mt-6 text-4xl text-foreground sm:text-5xl md:text-6xl">
            {p.title}
          </h1>
          {p.intro && (
            <p className="mt-6 text-lg leading-relaxed whitespace-pre-line text-muted">
              {p.intro}
            </p>
          )}
        </div>

        <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="space-y-10 lg:col-span-7">
            <section>
              <h2 className="mb-4 border-b border-border pb-3 font-mono text-xs font-bold tracking-wider text-muted uppercase">
                Alcance
              </h2>
              <ul className="space-y-2.5">
                {p.items.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground/90"
                  >
                    <CheckCircle2
                      size={16}
                      className="mt-0.5 shrink-0 text-accent"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {p.optionals.length > 0 && (
              <section>
                <h2 className="mb-4 border-b border-border pb-3 font-mono text-xs font-bold tracking-wider text-muted uppercase">
                  Opcionales {open && "· tildá los que quieras sumar"}
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {p.optionals.map((o) => {
                    const on = selected.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        disabled={!open}
                        onClick={() => toggle(o.id)}
                        className={`focus-ring rounded-2xl border p-4 text-left transition-all disabled:cursor-default ${
                          on
                            ? "border-accent bg-surface-2"
                            : "border-border bg-surface hover:border-foreground/30"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {o.name}
                          </span>
                          <span className="shrink-0 font-mono text-xs text-accent">
                            +{money(o.price, p.currency)}
                          </span>
                        </span>
                        {o.days > 0 && (
                          <span className="mt-1 block text-xs text-muted">
                            +{o.days} días hábiles
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 border-b border-border pb-3 font-mono text-xs font-bold tracking-wider text-muted uppercase">
                Forma de pago
              </h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
                {plan.map((part) => (
                  <li
                    key={part.label}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="text-foreground">
                      {part.label}
                      <span className="block text-xs text-muted">
                        {part.label === "Seña"
                          ? "Al aceptar"
                          : `Aprox. ${longDay(part.due)}`}
                      </span>
                    </span>
                    <span className="font-mono text-foreground">
                      {money(part.amount, p.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-28 rounded-3xl border border-accent/40 bg-gradient-to-b from-surface via-surface to-background p-6 shadow-2xl sm:p-8">
              <div className="rounded-2xl border border-border/80 bg-background/80 p-6 text-center">
                <span className="font-mono text-xs tracking-widest text-muted uppercase">
                  Inversión total
                </span>
                <div className="display mt-2 text-4xl font-bold text-accent sm:text-5xl">
                  {money(total, p.currency)}
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 font-mono text-xs text-muted">
                  <Clock size={13} className="text-accent" />
                  <span>
                    Plazo estimado: <strong>~{days} días hábiles</strong>
                  </span>
                </div>
              </div>

              <div className="mt-6" aria-live="polite">
                {state === "aceptada" && accepted ? (
                  <Note
                    icon={
                      <ShieldCheck size={18} className="text-emerald-400" />
                    }
                    title="Propuesta aceptada"
                  >
                    La aceptó {accepted.name} el{" "}
                    {new Date(accepted.at).toLocaleString("es-AR", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                    . Te escribimos para coordinar la seña y arrancar.
                    <span className="mt-3 block font-mono text-[11px] break-all text-muted">
                      Código de verificación: {accepted.hash}
                    </span>
                  </Note>
                ) : state === "rechazada" ? (
                  <Note
                    icon={<XCircle size={18} className="text-muted" />}
                    title="Propuesta rechazada"
                  >
                    Gracias por avisarnos. Si querés que la ajustemos,
                    escribinos.
                  </Note>
                ) : state === "vencida" ? (
                  <Note
                    icon={<Clock size={18} className="text-muted" />}
                    title="Esta propuesta venció"
                  >
                    Era válida hasta el {longDay(p.valid_until)}. Escribinos y
                    te mandamos una actualizada.
                  </Note>
                ) : state === "anulada" ? (
                  <Note
                    icon={<XCircle size={18} className="text-muted" />}
                    title="Esta propuesta ya no está vigente"
                  >
                    Fue reemplazada por una versión nueva o anulada. Pedinos el
                    link actualizado.
                  </Note>
                ) : rejecting ? (
                  <div className="space-y-3">
                    <label
                      className="block text-sm text-foreground"
                      htmlFor="motivo"
                    >
                      ¿Nos contás por qué? (opcional)
                    </label>
                    <textarea
                      id="motivo"
                      rows={3}
                      maxLength={1000}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={field}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={reject}
                        className="focus-ring flex-1 rounded-full border border-border px-4 py-3 text-sm text-foreground hover:border-foreground/40 disabled:opacity-50"
                      >
                        {pending ? "Enviando…" : "Rechazar propuesta"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejecting(false)}
                        className="focus-ring rounded-full px-4 py-3 text-sm text-muted hover:text-foreground"
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={accept} className="space-y-3">
                    <input
                      required
                      autoComplete="name"
                      placeholder="Nombre y apellido"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={field}
                      aria-label="Nombre y apellido"
                      maxLength={120}
                    />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={field}
                      aria-label="Email"
                      maxLength={200}
                    />
                    <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
                      <input
                        type="checkbox"
                        required
                        checked={agree}
                        onChange={(e) => setAgree(e.target.checked)}
                        className="mt-0.5 accent-[var(--accent)]"
                      />
                      <span>
                        Acepto esta propuesta (alcance, opcionales elegidos,
                        total de {money(total, p.currency)} y forma de pago).
                        Guardamos la fecha y hora, mi IP y un código de
                        verificación del contenido como constancia de la
                        aceptación.
                      </span>
                    </label>
                    <button
                      type="submit"
                      disabled={pending}
                      className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-medium text-background transition-all hover:bg-accent/90 disabled:opacity-50"
                    >
                      <CheckCircle2 size={16} />{" "}
                      {pending ? "Enviando…" : "Aceptar propuesta"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejecting(true)}
                      className="focus-ring w-full text-center text-xs text-muted hover:text-foreground"
                    >
                      No me interesa / rechazar
                    </button>
                  </form>
                )}
                {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}

function Note({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/60 p-5">
      <p className="flex items-center gap-2 font-medium text-foreground">
        {icon} {title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}
