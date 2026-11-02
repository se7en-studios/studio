// Estado compartido de los prospectos (tabla prospect_state). Puro: lo usan las
// páginas y los componentes de cliente.
import type { LeadOwner } from "./db";
import { PEOPLE } from "./people";
import { dayLabel, timeLabel } from "./tz";

export const PROSPECT_STATUSES = [
  "nuevo",
  "contactado",
  "en_charla",
  "ganado",
  "descartado",
  "numero_equivocado",
] as const;
export type ProspectStatus = (typeof PROSPECT_STATUSES)[number];

export const NOTE_MAX = 2000;

export type ProspectState = {
  lead_id: string;
  status: ProspectStatus;
  contacted_by: LeadOwner | null;
  contacted_at: string | null;
  note: string;
  note_by: LeadOwner | null;
  note_at: string | null;
  updated_by: LeadOwner | null;
  updated_at: string;
};

export const isProspectStatus = (v: unknown): v is ProspectStatus =>
  typeof v === "string" && (PROSPECT_STATUSES as readonly string[]).includes(v);

/** «Franco · Hoy 14:05»: quién y cuándo, en hora de Argentina. */
export const whoWhen = (who: LeadOwner | null, at: string | null) =>
  [who ? PEOPLE[who].name : null, at ? `${dayLabel(at)} ${timeLabel(at)}` : null].filter(Boolean).join(" · ");
