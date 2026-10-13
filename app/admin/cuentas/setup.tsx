"use client";

// Lo que falta para activar la caja fuerte: la tabla (la corre Federico en Supabase) y la
// llave de cifrado (se carga en Vercel). La llave sugerida se genera en el servidor al abrir
// esta página y no se guarda en ningún lado.
import { useState } from "react";
import { Copy, Database, KeyRound } from "lucide-react";
import { useToast } from "../overlay";

const code = "rounded bg-white/[0.06] px-1 text-foreground";

export function VaultSetup({
  missing,
  keyReady,
  suggestion,
}: {
  missing: string | null;
  keyReady: boolean;
  suggestion: string | null;
}) {
  const flash = useToast();
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!suggestion) return;
    try {
      await navigator.clipboard.writeText(suggestion);
      setCopied(true);
      flash("Llave copiada", "ok");
    } catch {
      flash("No se pudo copiar: seleccionala a mano.", "error");
    }
  }
  return (
    <div className="space-y-4">
      {missing && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
          <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
            <Database size={16} /> Federico: falta activar Cuentas en Supabase.
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
            <li>
              En Supabase → SQL Editor, pegar y correr{" "}
              <code className={code}>supabase/vault.sql</code> del repo.
            </li>
            <li>Recargar esta página.</li>
          </ol>
        </div>
      )}
      {!keyReady && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.04] p-5">
          <p className="flex items-center gap-2 text-[13px] font-medium text-amber-300">
            <KeyRound size={16} /> Falta la llave de cifrado.
          </p>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[13px] text-muted">
            <li>
              Copiá esta llave nueva (se genera al abrir la página y no se
              guarda): quien tenga la llave y la base puede leer las claves.
            </li>
            <li>
              En Vercel → Settings → Environment Variables, creá{" "}
              <code className={code}>VAULT_KEY</code> con ese valor (Production)
              y volvé a deployar.
            </li>
            <li>
              <b className="text-foreground">
                Guardá una copia de la llave fuera de Vercel
              </b>{" "}
              (papel en un lugar seguro). Si se pierde, las claves guardadas no
              se pueden recuperar.
            </li>
          </ol>
          {suggestion && (
            <div className="mt-3 flex items-center gap-2">
              <code className="min-w-0 flex-1 rounded-lg border border-[var(--line-strong)] bg-[var(--well)] px-3 py-2 font-mono text-[12px] break-all select-all text-foreground">
                {suggestion}
              </code>
              <button
                type="button"
                onClick={copy}
                aria-label="Copiar la llave"
                className="focus-ring rounded-lg border border-[var(--line-strong)] p-2.5 text-muted hover:text-foreground"
              >
                <Copy size={15} />
              </button>
            </div>
          )}
          {copied && (
            <p className="mt-2 text-[12px] text-emerald-300">
              Copiada. Ahora cargala en Vercel.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
