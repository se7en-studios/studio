// Cuentas de la caja fuerte: tipos, servicios conocidos y validación. Puro y sin
// dependencias de servidor: lo usan la página, las acciones y los componentes de cliente.
// Acá nunca viaja una clave: la lista lleva solo los datos que no son secretos.
import { OWNERS, type Owner } from "./finance-shared";

export type Service = { id: string; label: string; url: string };

/** Servicios del estudio con su pantalla de ingreso, para no tipearla cada vez. */
export const SERVICES: Service[] = [
  {
    id: "Instagram",
    label: "Instagram",
    url: "https://www.instagram.com/accounts/login/",
  },
  { id: "Gmail", label: "Gmail / Google", url: "https://accounts.google.com/" },
  { id: "Vercel", label: "Vercel", url: "https://vercel.com/login" },
  { id: "Supabase", label: "Supabase", url: "https://supabase.com/dashboard" },
  { id: "GitHub", label: "GitHub", url: "https://github.com/login" },
  { id: "Meta", label: "Meta Business", url: "https://business.facebook.com/" },
  { id: "Canva", label: "Canva", url: "https://www.canva.com/login" },
  { id: "Resend", label: "Resend", url: "https://resend.com/login" },
  { id: "Dominio", label: "Dominio / DNS", url: "" },
  { id: "Otro", label: "Otro", url: "" },
];

export const TWOFA = [
  { id: "app", label: "App de códigos" },
  { id: "llave", label: "Llave o passkey" },
  { id: "sms", label: "SMS" },
  { id: "ninguno", label: "Sin 2FA" },
] as const;
export type TwoFa = (typeof TWOFA)[number]["id"];

export const twoFaLabel = (id: string) =>
  TWOFA.find((t) => t.id === id)?.label ?? id;

export type Account = {
  id: string;
  created_at: string;
  updated_at: string;
  service: string;
  label: string;
  url: string | null;
  username: string;
  twofa: TwoFa;
  owner: Owner;
  /** YYYY-MM-DD: cuándo se cambió la clave por última vez. */
  rotated_on: string;
  created_by: "franco" | "federico" | null;
  has_notes: boolean;
};

/** Lo que llega de un formulario. `secret` y `notes` vacíos o ausentes = no cambiar. */
export type AccountInput = {
  service: string;
  label: string;
  url: string;
  username: string;
  twofa: string;
  owner: string;
  secret?: string;
  notes?: string;
};

export type CleanAccount = Omit<
  Account,
  "id" | "created_at" | "updated_at" | "rotated_on" | "created_by" | "has_notes"
> & {
  secret: string | null;
  notes: string | null;
};

export const MAX_SECRET = 500;
export const MAX_NOTES = 2000;

/** Se acepta solo https:// (las claves se usan en pantallas de ingreso: nada de http ni de otros esquemas). */
const HTTPS = /^https:\/\/[^\s]{3,290}$/i;

export function cleanAccount(
  input: AccountInput,
  { creating }: { creating: boolean },
): { ok: true; value: CleanAccount } | { ok: false; error: string } {
  const service = String(input.service ?? "")
    .trim()
    .slice(0, 40);
  if (!service) return { ok: false, error: "Elegí el servicio." };
  const url = String(input.url ?? "").trim();
  if (url && !HTTPS.test(url))
    return { ok: false, error: "El link tiene que empezar con https://." };
  const twofa = TWOFA.find((t) => t.id === input.twofa)?.id ?? "app";
  const owner = OWNERS.find((o) => o === input.owner) ?? "ambos";
  const secret = String(input.secret ?? "");
  if (creating && !secret) return { ok: false, error: "Falta la clave." };
  if (secret.length > MAX_SECRET)
    return { ok: false, error: "La clave es demasiado larga." };
  const notes = String(input.notes ?? "");
  if (notes.length > MAX_NOTES)
    return { ok: false, error: "Las notas son demasiado largas." };
  return {
    ok: true,
    value: {
      service,
      label: String(input.label ?? "")
        .trim()
        .slice(0, 80),
      url: url || null,
      username: String(input.username ?? "")
        .trim()
        .slice(0, 120),
      twofa,
      owner,
      secret: secret || null,
      notes: notes.trim() ? notes : null,
    },
  };
}

/** Días desde que se cambió la clave (YYYY-MM-DD, a mediodía para no depender de la zona). */
export function daysSince(day: string, today: string): number {
  const a = Date.parse(`${day}T12:00:00Z`);
  const b = Date.parse(`${today}T12:00:00Z`);
  return Number.isNaN(a) || Number.isNaN(b)
    ? 0
    : Math.max(0, Math.round((b - a) / 86_400_000));
}

/** Pasado este tiempo sin cambiar la clave, la cuenta pide rotarla. */
export const ROTATE_AFTER_DAYS = 180;

export const isStale = (a: Pick<Account, "rotated_on">, today: string) =>
  daysSince(a.rotated_on, today) > ROTATE_AFTER_DAYS;

/** Cuentas sin segundo paso o con SMS (el más fácil de robar), para el resumen de arriba. */
export const weak2fa = (a: Pick<Account, "twofa">) =>
  a.twofa === "ninguno" || a.twofa === "sms";

/** «hace 3 meses», «hace 12 días»: lo justo para decidir si toca rotar. */
export function ageLabel(days: number): string {
  if (days < 1) return "hoy";
  if (days < 30) return `hace ${days} ${days === 1 ? "día" : "días"}`;
  const months = Math.floor(days / 30);
  return months < 12
    ? `hace ${months} ${months === 1 ? "mes" : "meses"}`
    : `hace ${Math.floor(months / 12)} ${months < 24 ? "año" : "años"}`;
}
