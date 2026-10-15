"use server";

// Lo que hace el cliente desde el link público de una propuesta: marcarla vista,
// aceptarla o rechazarla. Son endpoints abiertos: el token es lo único que
// autoriza, todo lo demás se valida acá y cada IP tiene un límite.
import { headers } from "next/headers";
import { after } from "next/server";
import { allowRequest, clientIp } from "@/lib/rate-limit";
import {
  acceptedContent,
  canonical,
  cleanSelection,
  cleanSigner,
  isOpen,
  sha256Hex,
} from "@/lib/admin/proposal-shared";
import {
  TOKEN_RE,
  findByToken,
  markAccepted,
  markRejected,
  markViewed,
  onAccepted,
  onRejected,
} from "@/lib/admin/proposals";
import { dayKey } from "@/lib/admin/task-shared";

const WINDOW_MS = 15 * 60 * 1000;
const CLOSED =
  "Esta propuesta ya no se puede responder. Recargá la página o escribinos.";
const FAILED =
  "No pudimos guardar tu respuesta. Probá de nuevo en un rato o escribinos.";

async function visitor() {
  const h = await headers();
  return { ip: clientIp(h), ua: (h.get("user-agent") ?? "").slice(0, 300) };
}

/** La primera vez que se abre (desde el navegador: las vistas previas de WhatsApp no corren JS). */
export async function markSeen(token: unknown): Promise<void> {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return;
  const { ip } = await visitor();
  if (!(await allowRequest("propuesta_vista", ip, 30, WINDOW_MS))) return;
  try {
    const p = await findByToken(token);
    if (p?.status === "enviada" && !p.revoked_at) await markViewed(p.id);
  } catch (e) {
    console.error("[propuesta] vista:", e instanceof Error ? e.message : e);
  }
}

export type AcceptResult =
  { ok: true; hash: string; at: string } | { ok: false; error: string };

export async function acceptProposal(
  token: unknown,
  input: {
    name?: unknown;
    email?: unknown;
    agree?: unknown;
    selected?: unknown;
    total?: unknown;
  },
): Promise<AcceptResult> {
  if (typeof token !== "string" || !TOKEN_RE.test(token))
    return { ok: false, error: CLOSED };
  if (input.agree !== true)
    return { ok: false, error: "Tildá «Acepto» para confirmar." };
  const signer = cleanSigner(input);
  if (!signer.ok) return signer;
  const { ip, ua } = await visitor();
  if (!(await allowRequest("propuesta", ip, 10, WINDOW_MS)))
    return {
      ok: false,
      error: "Recibimos varios intentos seguidos. Esperá unos minutos.",
    };
  try {
    const p = await findByToken(token);
    if (!p || !isOpen(p, dayKey())) return { ok: false, error: CLOSED };
    const selected = cleanSelection(
      p,
      Array.isArray(input.selected) ? input.selected.slice(0, 50) : [],
    );
    const at = new Date().toISOString();
    const content = acceptedContent(p, selected, { ...signer.value, at });
    // Lo que se acepta es lo que se vio: si el total no coincide, no se firma.
    if (Number(input.total) !== content.total)
      return {
        ok: false,
        error: "La propuesta cambió mientras la mirabas. Recargá la página.",
      };
    const hash = await sha256Hex(canonical(content));
    const saved = await markAccepted(p.id, selected, content.total, {
      ...signer.value,
      at,
      ip,
      user_agent: ua,
      hash,
    });
    if (!saved) return { ok: false, error: CLOSED };
    after(() =>
      onAccepted(saved, content.plan).catch((e) =>
        console.error("[propuesta] al aceptar:", e),
      ),
    );
    return { ok: true, hash, at };
  } catch (e) {
    console.error("[propuesta] aceptar:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}

export async function rejectProposal(
  token: unknown,
  reason: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (typeof token !== "string" || !TOKEN_RE.test(token))
    return { ok: false, error: CLOSED };
  const { ip } = await visitor();
  if (!(await allowRequest("propuesta", ip, 10, WINDOW_MS)))
    return {
      ok: false,
      error: "Recibimos varios intentos seguidos. Esperá unos minutos.",
    };
  try {
    const p = await findByToken(token);
    if (!p || !isOpen(p, dayKey())) return { ok: false, error: CLOSED };
    const saved = await markRejected(
      p.id,
      String(reason ?? "")
        .trim()
        .slice(0, 1000),
    );
    if (!saved) return { ok: false, error: CLOSED };
    after(() =>
      onRejected(saved).catch((e) =>
        console.error("[propuesta] al rechazar:", e),
      ),
    );
    return { ok: true };
  } catch (e) {
    console.error("[propuesta] rechazar:", e instanceof Error ? e.message : e);
    return { ok: false, error: FAILED };
  }
}
