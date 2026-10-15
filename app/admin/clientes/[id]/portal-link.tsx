"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Link2, MessageCircle } from "lucide-react";
import { waLink } from "@/lib/admin/templates";
import { btnGhost, btnPrimary, btnSecondary, input } from "../../kit";
import { generatePortalLink, revokePortalLink } from "../../portal-actions";

/** Generar, regenerar y revocar el link. La URL se ve una sola vez: después sólo queda el hash. */
export function PortalLinkControls({
  clientId,
  active,
  whatsapp,
  name,
}: {
  clientId: string;
  active: boolean;
  whatsapp: string;
  name: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  function generate() {
    if (
      active &&
      !confirm(
        "El link anterior deja de andar y se cierran las sesiones abiertas. ¿Generar uno nuevo?",
      )
    )
      return;
    start(async () => {
      const r = await generatePortalLink(clientId);
      setError(r.error ?? null);
      setUrl(r.url ?? null);
      setCopied(false);
      router.refresh();
    });
  }

  function revoke() {
    if (
      !confirm("El cliente deja de poder entrar al portal. ¿Revocar el link?")
    )
      return;
    start(async () => {
      const r = await revokePortalLink(clientId);
      setError(r.error ?? null);
      setUrl(null);
      router.refresh();
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("No se pudo copiar: seleccioná el link y copialo a mano.");
    }
  }

  const wa = url
    ? waLink(
        whatsapp,
        `Hola ${name}, este es tu acceso al portal de Se7en, donde vas a ver el estado del proyecto, aprobar entregas y pedirnos cambios: ${url}`,
      )
    : null;

  return (
    <div className="space-y-2">
      {url && (
        <div className="space-y-2 rounded-lg border border-[var(--line)] bg-[var(--well-soft)] p-3">
          <p className="text-[12px] text-muted">
            Copialo ahora: por seguridad no se puede volver a ver.
          </p>
          <input
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className={input}
            aria-label="Link del portal"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={btnSecondary}>
              <Copy size={14} /> {copied ? "Copiado" : "Copiar"}
            </button>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener"
                className={btnSecondary}
              >
                <MessageCircle size={14} /> Mandar por WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className={active ? btnSecondary : btnPrimary}
        >
          <Link2 size={14} /> {active ? "Generar link nuevo" : "Generar link"}
        </button>
        {active && (
          <button
            type="button"
            onClick={revoke}
            disabled={pending}
            className={btnGhost}
          >
            Revocar
          </button>
        )}
      </div>
      {error && <p className="text-[12px] text-red-400">{error}</p>}
    </div>
  );
}
