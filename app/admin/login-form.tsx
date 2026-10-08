"use client";

import { useActionState } from "react";
import Image from "next/image";
import { Lock, ArrowRight } from "lucide-react";
import { PEOPLE, PEOPLE_IDS } from "@/lib/admin/people";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form
      action={action}
      className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-[0_30px_80px_-40px_rgba(255,77,46,0.35)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-accent">
        <Lock size={18} />
      </span>
      <h1 className="mt-5 text-2xl text-foreground">Panel del estudio</h1>
      <p className="mt-1.5 text-sm text-muted">Sólo para Franco y Federico.</p>

      {/* La contraseña es compartida: esto es lo que le dice al feed quién hizo qué. */}
      <fieldset className="mt-7">
        <legend className="mb-2 block font-mono text-[11px] tracking-widest text-muted uppercase">¿Quién sos?</legend>
        <div className="grid grid-cols-2 gap-2">
          {PEOPLE_IDS.map((o) => (
            <label
              key={o}
              className="flex cursor-pointer items-center gap-2.5 rounded-full border border-border bg-background py-1.5 pr-4 pl-1.5 text-sm text-muted transition-colors hover:text-foreground has-[:checked]:border-accent has-[:checked]:bg-accent/10 has-[:checked]:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
            >
              <input type="radio" name="who" value={o} required className="sr-only" />
              {PEOPLE[o].image ? (
                <Image src={PEOPLE[o].image} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-white/10" />
              )}
              {PEOPLE[o].name}
            </label>
          ))}
        </div>
      </fieldset>

      <label htmlFor="password" className="mt-6 mb-2 block font-mono text-[11px] tracking-widest text-muted uppercase">
        Contraseña
      </label>
      <input
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        aria-invalid={Boolean(state.error)}
        className="focus-ring w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-accent aria-[invalid=true]:border-red-500/60"
      />
      {state.error && <p className="mt-2 text-sm text-red-400">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="focus-ring mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-background transition-opacity disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
        <ArrowRight size={15} />
      </button>
    </form>
  );
}
