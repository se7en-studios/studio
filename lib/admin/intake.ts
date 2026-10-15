// Lo que llega del sitio de alguien que puede haber escrito antes: el kickoff y
// la reserva de llamada. Si el email o el teléfono coinciden con un pedido, lo
// nuevo se guarda en ese pedido (que, si está ganado, es el de su proyecto) y
// no suena «pedido nuevo»; si no hay ninguno, recién ahí se crea uno. Solo servidor.
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { db, insertLead, withoutMissing, type Lead, type NewLead } from "./db";
import { findMatch, phoneKey } from "./sales-shared";
import { notificationsConfigured, notify } from "./notify";

type Candidate = Pick<Lead, "id" | "email" | "phone" | "status" | "created_at">;
const CANDIDATE_COLUMNS = "id, email, phone, status, created_at";

/** Los pedidos con ese email o ese teléfono, y el que corresponde de ellos. */
async function lookup(
  c: SupabaseClient,
  email: string,
  phone: string,
): Promise<Candidate | null> {
  const found: Candidate[] = [];
  if (email) {
    // ilike sin comodines: _ y % del email se escapan; findMatch compara exacto.
    const { data } = await c
      .from("leads")
      .select(CANDIDATE_COLUMNS)
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .limit(20);
    found.push(...((data ?? []) as Candidate[]));
  }
  if (phoneKey(phone)) {
    // ponytail: el teléfono se guarda como lo escribió cada uno, así que se compara
    // en código sobre los últimos 1000 con teléfono; columna normalizada si crece.
    const { data } = await c
      .from("leads")
      .select(CANDIDATE_COLUMNS)
      .neq("phone", "")
      .order("created_at", { ascending: false })
      .limit(1000);
    found.push(...((data ?? []) as Candidate[]));
  }
  return findMatch(found, { email, phone });
}

/** Lo que el pedido ya tiene cargado de kickoff y reunión (vacío si falta crm-v3.sql). */
async function currentExtra(c: SupabaseClient, id: string): Promise<Partial<Record<"kickoff" | "meeting_at", string | null>>> {
  const { data, error } = await c.from("leads").select("kickoff, meeting_at").eq("id", id).maybeSingle();
  return error || !data ? {} : (data as Partial<Record<"kickoff" | "meeting_at", string | null>>);
}

/** Tope del texto que se copia a la nota cuando no se pisa lo que había. */
const KEPT_NOTE_MAX = 1500;

export type Intake = {
  lead: NewLead;
  /** Qué agregar al pedido existente (kickoff, meeting_at). */
  extra: Pick<NewLead, "kickoff" | "meeting_at">;
  /** Línea para el historial del pedido. */
  note: string;
  /** Aviso al celular cuando se engancha a un pedido existente (sin nombres de clientes). */
  notice: { title: string; message: string };
};

export async function intakeLead({
  lead,
  extra,
  note,
  notice,
}: Intake): Promise<boolean> {
  const c = db();
  if (!c) return false;
  const match = await lookup(c, lead.email ?? "", lead.phone ?? "");
  if (!match) return insertLead({ ...lead, ...extra });

  // Lo nuevo va al pedido existente; si le faltaba el email o el teléfono, se completa.
  // Lo que el pedido ya tenía NO se pisa: cualquiera que sepa el email de un cliente
  // puede mandar el formulario. Lo nuevo queda en la nota del historial para revisarlo.
  const current = await currentExtra(c, match.id);
  const keys = Object.keys(extra) as (keyof Intake["extra"])[];
  const kept = keys.filter((k) => extra[k] && current[k]);
  const fresh = Object.fromEntries(keys.filter((k) => !kept.includes(k)).map((k) => [k, extra[k]]));
  let patch: Record<string, unknown> = {
    ...fresh,
    updated_at: new Date().toISOString(),
  };
  if (lead.email && !match.email) patch.email = lead.email;
  if (lead.phone && !match.phone) patch.phone = lead.phone;
  const update = () => c.from("leads").update(patch).eq("id", match.id);
  let { error } = await update();
  for (let i = 0; error && i < 3; i++) {
    const less = withoutMissing(patch, error.message);
    if (!less) break;
    patch = less;
    ({ error } = await update());
  }
  // Sin crm-v3.sql lo nuevo no tiene dónde guardarse en el pedido: se crea uno,
  // como antes, antes que perder el kickoff o la reunión.
  const lost = Object.keys(fresh).some((k) => !(k in patch));
  if (error || lost) {
    if (error) console.error("[leads] enganchar:", error.message);
    return insertLead({ ...lead, ...extra });
  }

  after(async () => {
    // Una nota (no cuenta como contacto: no toca «primera respuesta»). Sin crm.sql no hay historial.
    const res = await c
      .from("panel_lead_activity")
      .insert({
        lead_id: match.id,
        kind: "nota",
        text: kept.length
          ? `${note} · No se reemplazó lo que ya tenía (${kept.map((k) => (k === "kickoff" ? "kickoff" : "reunión")).join(", ")}); lo que llegó: ${kept
              .map((k) => String(extra[k]))
              .join(" | ")}`.slice(0, KEPT_NOTE_MAX)
          : note,
        at: new Date().toISOString(),
        actor: null,
      });
    if (res.error && !/panel_lead_activity/.test(res.error.message))
      console.error("[leads] historial:", res.error.message);
    if (notificationsConfigured()) {
      const sent = await notify(
        { ...notice, path: `/admin/pedidos?pedido=${match.id}` },
        3,
      );
      if (!sent.ok) console.error("[avisos] pedido existente:", sent.error);
    }
  });
  return true;
}
