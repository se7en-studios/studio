"use server";

// Login del panel y las acciones de los pedidos que ya estaban acá (etapa,
// responsable, notas y borrar). Las demás del CRM están en pedidos/actions.ts.
//
// Ninguna llama a revalidatePath: el tablero ya muestra el cambio al instante
// (optimista) y las páginas del panel son dinámicas, así que al navegar se leen
// de nuevo. Revalidar obligaba a re-renderizar la página entera (500 pedidos,
// historial y tareas) en cada clic, y las acciones van en fila: eso era lo que
// trababa el panel. El registro de cambios se escribe con after(), después de
// responder.
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { after } from "next/server";
import { checkPassword, checkTotp, endSession, hasTotp, requireSession, startSession } from "@/lib/admin/auth";
import { OWNERS, STATUSES, patchLead, removeLead, type LeadOwner, type LeadStatus } from "@/lib/admin/db";
import { leadDiff, STATUS_LABEL } from "@/lib/admin/lead-changes";
import { logEvent } from "@/lib/admin/panel";
import { PEOPLE } from "@/lib/admin/people";
import { clearHits, clientIp, isLimitedStrict, recordHit } from "@/lib/rate-limit";

// Intentos por IP en 15 min, contando contraseñas y códigos (con segundo paso un ingreso
// bueno ya usa dos: la contraseña y el código).
const MAX_LOGIN_ATTEMPTS = 8;
// Códigos incorrectos por persona en 15 min, vengan de la IP que vengan.
const MAX_CODE_ATTEMPTS = 15;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

export type LoginState = { error?: string; needCode?: boolean };

export async function login(_: LoginState, form: FormData): Promise<LoginState> {
  const pass = String(form.get("password") ?? "");
  const who = String(form.get("who") ?? "") as LeadOwner;
  // Pausa fija: frena probar contraseñas a mano en ráfaga.
  await new Promise((r) => setTimeout(r, 400));
  if (!OWNERS.includes(who)) return { error: "Elegí quién sos." };
  // Se anota el intento ANTES de probar y se cuenta después: una ráfaga en paralelo no pasa
  // toda con el contador en cero. Si el ingreso sale bien, se limpian los intentos. Si no se
  // puede contar (base caída), en producción se bloquea en lugar de dejar pasar.
  const ip = clientIp(await headers());
  await recordHit("admin_login", ip);
  if (await isLimitedStrict("admin_login", ip, MAX_LOGIN_ATTEMPTS + 1, LOCKOUT_WINDOW_MS)) {
    return { error: "Demasiados intentos fallidos. Probá de nuevo en 15 minutos." };
  }
  if (!checkPassword(pass, who)) return { error: "Contraseña incorrecta." };
  // Segundo paso: con la contraseña bien, se pide el código de la app (si tiene uno activado).
  if (hasTotp(who)) {
    const code = String(form.get("code") ?? "").trim();
    if (!code) return { needCode: true };
    await recordHit("admin_totp", who);
    if (await isLimitedStrict("admin_totp", who, MAX_CODE_ATTEMPTS + 1, LOCKOUT_WINDOW_MS)) {
      return { needCode: true, error: "Demasiados códigos incorrectos en esta cuenta. Probá de nuevo en 15 minutos." };
    }
    if (!checkTotp(who, code)) return { needCode: true, error: "Código incorrecto o vencido." };
    await clearHits("admin_totp", who);
  }
  await clearHits("admin_login", ip);
  await startSession(who);
  // Acá sí: el layout tiene que pasar de la pantalla de login al panel.
  revalidatePath("/admin", "layout");
  return {};
}

export async function logout() {
  await endSession();
  revalidatePath("/admin", "layout");
}

const guard = requireSession;

const UUID = /^[0-9a-f-]{36}$/i;
function checkId(id: string) {
  if (!UUID.test(id)) throw new Error("Pedido inválido.");
}

export async function setStatus(id: string, status: LeadStatus) {
  const me = await guard();
  checkId(id);
  if (!STATUSES.includes(status)) throw new Error("Estado inválido");
  const { before, after: lead } = await patchLead(id, { status });
  const changes = leadDiff(before, { status });
  if (!changes.length) return;
  after(() =>
    logEvent({
      actor: me.who,
      kind: "pedido",
      text: `movió el pedido de ${lead.name} a ${STATUS_LABEL[status]}`,
      lead_id: id,
      changes,
    }),
  );
}

export async function setOwner(id: string, owner: LeadOwner | null) {
  const me = await guard();
  checkId(id);
  if (owner !== null && !OWNERS.includes(owner)) throw new Error("Responsable inválido");
  const { before, after: lead } = await patchLead(id, { owner });
  const changes = leadDiff(before, { owner });
  if (!changes.length) return;
  after(() =>
    logEvent({
      actor: me.who,
      kind: "pedido",
      text: owner ? `le asignó el pedido de ${lead.name} a ${PEOPLE[owner].name}` : `dejó sin asignar el pedido de ${lead.name}`,
      lead_id: id,
      changes,
    }),
  );
}

export async function setNotes(id: string, notes: string) {
  const me = await guard();
  checkId(id);
  const patch = { notes: notes.slice(0, 5000) };
  const { before, after: lead } = await patchLead(id, patch);
  const changes = leadDiff(before, patch);
  if (!changes.length) return;
  after(() =>
    logEvent({ actor: me.who, kind: "pedido", text: `editó las notas del pedido de ${lead.name}`, lead_id: id, changes }),
  );
}

export async function deleteLead(id: string) {
  const me = await guard();
  checkId(id);
  const name = await removeLead(id);
  after(() => logEvent({ actor: me.who, kind: "pedido", text: `borró el pedido de ${name}` }));
}
