"use client";

// Alta del segundo paso. El secreto se muestra una vez (QR o a mano), se comprueba con un
// código de la app y recién ahí se explica cómo cargarlo en Vercel: hasta entonces no cambia
// nada en el ingreso.
import { useState, useTransition } from "react";
import { Check, Copy, Smartphone } from "lucide-react";
import { Card, btnPrimary, btnSecondary, input } from "../kit";
import { useToast } from "../overlay";
import { checkSetupCode } from "./actions";

const code = "rounded bg-white/[0.06] px-1 text-foreground";

export function TotpSetup({
  secret: initialSecret,
  uri: initialUri,
  svg: initialSvg,
  envName,
}: {
  secret: string;
  uri: string;
  /** El QR ya dibujado en el servidor (SVG). */
  svg: string;
  envName: string;
}) {
  const flash = useToast();
  // Se fija al abrir: si la página se vuelve a pintar, la línea que se copia sigue siendo la que se comprobó.
  const [{ secret, uri, svg }] = useState({ secret: initialSecret, uri: initialUri, svg: initialSvg });
  const [digits, setDigits] = useState("");
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function copy(text: string, what: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`${what} copiado`, "ok");
    } catch {
      flash("No se pudo copiar: seleccionalo a mano.", "error");
    }
  }

  return (
    <Card title="Activar el segundo paso" icon={<Smartphone size={14} />}>
      <div className="space-y-4 p-4">
        <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
          <li>
            Instalá una app de autenticación (Google Authenticator, Aegis, o la
            de tu gestor de contraseñas).
          </li>
          <li>
            Escaneá este código, o tocá «Copiar clave» y cargala a mano en la
            app.
          </li>
          <li>
            Escribí abajo el código de 6 dígitos que muestra la app para
            comprobar que anda.
          </li>
        </ol>

        <div className="flex flex-wrap items-center gap-4">
          {/* El SVG lo arma qrcode-generator en el servidor a partir del enlace otpauth: no lleva HTML de nadie. */}
          <div
            className="h-40 w-40 shrink-0 rounded-xl bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
            role="img"
            aria-label="Código QR para la app de autenticación"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="min-w-0 space-y-2">
            <code className="block rounded-lg border border-[var(--line-strong)] bg-[var(--well)] px-3 py-2 font-mono text-[12px] break-all text-foreground select-all">
              {secret}
            </code>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => copy(secret, "Clave")}
                className={btnSecondary}
              >
                <Copy size={14} /> Copiar clave
              </button>
              <a href={uri} className={btnSecondary}>
                Abrir en el celular
              </a>
            </div>
          </div>
        </div>

        {verified ? (
          <div className="space-y-3 rounded-lg border border-emerald-400/30 bg-emerald-400/[0.05] p-3.5">
            <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-300">
              <Check size={14} /> Tu app genera los códigos bien. Falta un paso.
            </p>
            <p className="text-[13px] text-muted">
              En Vercel → Settings → Environment Variables (Production) creá{" "}
              <code className={code}>{envName}</code> con este valor y
              redeployá. Desde ese momento, entrar te pide la contraseña y el
              código.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 rounded-lg border border-[var(--line-strong)] bg-[var(--well)] px-3 py-2 font-mono text-[12px] break-all text-foreground select-all">
                {envName}={secret}
              </code>
              <button
                type="button"
                onClick={() => copy(`${envName}=${secret}`, "Línea")}
                aria-label="Copiar la línea"
                className={btnSecondary}
              >
                <Copy size={14} />
              </button>
            </div>
            <p className="text-[12px] text-muted">
              Si perdés el celular, borrá esa variable en Vercel y redeployá: el
              segundo paso se apaga y volvés a entrar solo con la contraseña.
            </p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await checkSetupCode(secret, digits);
                if ("ok" in res) setVerified(true);
                else setError(res.error);
              });
            }}
            className="space-y-2"
          >
            <label
              htmlFor="totp-code"
              className="block text-[11px] font-medium tracking-wide text-muted uppercase"
            >
              Código de la app
            </label>
            <div className="flex gap-2">
              <input
                id="totp-code"
                value={digits}
                onChange={(e) => setDigits(e.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={10}
                placeholder="123456"
                className={input}
              />
              <button
                type="submit"
                disabled={!digits.trim() || pending}
                className={btnPrimary}
              >
                {pending ? "Comprobando…" : "Comprobar"}
              </button>
            </div>
            {error && <p className="text-[13px] text-red-400">{error}</p>}
          </form>
        )}
      </div>
    </Card>
  );
}
